import React, { useState, useCallback, useEffect } from 'react';
import { X, Plus, History, Maximize2, Minimize2, Trash2, ChevronLeft } from 'lucide-react';
import { ChatMessage, ChatAttachment, CanvasItem } from '@/types';
import { chatStream, CanvasContext, CanvasItemContext } from '@/services/api';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { generateId } from '@/utils/id';

// 会话类型
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// localStorage 键
const STORAGE_KEY = 'sansa_chat_sessions';
const CURRENT_SESSION_KEY = 'sansa_current_session';

// 加载会话列表
function loadSessions(): ChatSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 保存会话列表
function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// 生成会话标题（取第一条用户消息的前20字）
function generateTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    const text = firstUserMsg.content.slice(0, 20);
    return text + (firstUserMsg.content.length > 20 ? '...' : '');
  }
  return '新对话';
}

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  canvasItems?: CanvasItem[];
  selectedIds?: string[];
}

/**
 * 图片压缩配置
 */
const IMAGE_COMPRESS_CONFIG = {
  maxWidth: 800,      // 最大宽度
  maxHeight: 800,     // 最大高度
  quality: 0.7,       // JPEG 质量 (0-1)
  format: 'image/jpeg' as const,
};

/**
 * 压缩图片 - 缩小尺寸、转换格式、降低质量
 */
function compressImage(src: string): Promise<string> {
  return new Promise((resolve) => {
    // 如果不是有效的 base64 图片，直接返回
    if (!src || !src.startsWith('data:image')) {
      resolve(src);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const { maxWidth, maxHeight, quality, format } = IMAGE_COMPRESS_CONFIG;

      let { width, height } = img;

      // 计算缩放比例，保持宽高比
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // 创建 canvas 进行压缩
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }

      // 绘制并导出为 JPEG
      ctx.fillStyle = '#FFFFFF'; // 白色背景（处理透明图片）
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedData = canvas.toDataURL(format, quality);
      resolve(compressedData);
    };

    img.onerror = () => {
      resolve(src); // 加载失败返回原图
    };

    img.src = src;
  });
}

/**
 * 将画布元素转换为上下文格式（异步，需要压缩图片）
 */
async function buildCanvasContext(items: CanvasItem[], selectedIds: string[]): Promise<CanvasContext> {
  const contextItems: CanvasItemContext[] = await Promise.all(
    items.map(async (item) => {
      const baseContext: CanvasItemContext = {
        id: item.id,
        type: item.type,
        position: { x: item.x, y: item.y },
        size: { width: item.width, height: item.height },
      };

      // 图片：压缩后包含 base64 数据和提示词
      if (item.type === 'image' && item.src) {
        // 只对选中的图片进行压缩处理（节省性能）
        if (selectedIds.includes(item.id)) {
          baseContext.imageData = await compressImage(item.src);
        }
        if (item.prompt) {
          baseContext.prompt = item.prompt;
        }
      }

      // 文字：包含文字内容
      if (item.type === 'text') {
        baseContext.textContent = item.src;
      }

      // 形状：包含填充和描边颜色
      if (['rectangle', 'circle', 'line', 'arrow'].includes(item.type)) {
        if (item.fill) baseContext.fill = item.fill;
        if (item.stroke) baseContext.stroke = item.stroke;
      }

      return baseContext;
    })
  );

  return {
    items: contextItems,
    selectedIds,
  };
}

export const ChatbotPanel: React.FC<ChatbotPanelProps> = ({
  isOpen,
  onClose,
  canvasItems = [],
  selectedIds = [],
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [canvasContext, setCanvasContext] = useState<CanvasContext | undefined>(undefined);

  // 会话管理状态
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // 初始化：加载会话列表
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    // 恢复上次的会话
    const lastSessionId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (lastSessionId) {
      const session = loaded.find(s => s.id === lastSessionId);
      if (session) {
        setCurrentSessionId(session.id);
        setMessages(session.messages);
      }
    }
  }, []);

  // 保存当前会话到列表
  const saveCurrentSession = useCallback(() => {
    if (messages.length === 0) return;

    const now = Date.now();
    const title = generateTitle(messages);

    setSessions(prev => {
      let updated: ChatSession[];
      if (currentSessionId) {
        // 更新现有会话
        updated = prev.map(s =>
          s.id === currentSessionId
            ? { ...s, messages, title, updatedAt: now }
            : s
        );
      } else {
        // 创建新会话
        const newSession: ChatSession = {
          id: generateId(),
          title,
          messages,
          createdAt: now,
          updatedAt: now,
        };
        setCurrentSessionId(newSession.id);
        localStorage.setItem(CURRENT_SESSION_KEY, newSession.id);
        updated = [newSession, ...prev];
      }
      saveSessions(updated);
      return updated;
    });
  }, [messages, currentSessionId]);

  // 消息变化时自动保存（防抖）
  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(saveCurrentSession, 500);
    return () => clearTimeout(timer);
  }, [messages, saveCurrentSession]);

  // 异步构建画布上下文（包含图片压缩）
  useEffect(() => {
    if (canvasItems.length === 0) {
      setCanvasContext(undefined);
      return;
    }

    // 异步压缩图片并构建上下文
    buildCanvasContext(canvasItems, selectedIds).then(setCanvasContext);
  }, [canvasItems, selectedIds]);

  const handleSend = useCallback(async (content: string, attachments: ChatAttachment[]) => {
    if (isLoading) return;

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: Date.now(),
    };

    // 创建助手消息占位符
    const assistantMessageId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      // 使用 LangGraph 模式：只发送当前消息 + threadId
      // 服务端会自动管理对话历史
      const threadId = currentSessionId || userMessage.id; // 新对话使用消息 ID 作为会话 ID

      // 如果是新对话，设置当前会话 ID
      if (!currentSessionId) {
        setCurrentSessionId(threadId);
        localStorage.setItem(CURRENT_SESSION_KEY, threadId);
      }

      // 转换附件格式用于 API
      const apiAttachments = attachments.length > 0
        ? attachments.map(att => ({
            name: att.name,
            type: att.type,
            content: att.content,
          }))
        : undefined;

      // 流式获取响应
      let fullContent = '';
      for await (const chunk of chatStream({
        message: content,
        threadId,
        webSearchEnabled,
        canvasContext,
        attachments: apiAttachments,
      })) {
        fullContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: fullContent }
              : m
          )
        );
      }

      // 完成流式响应
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, isStreaming: false }
            : m
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : '发送失败，请重试';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: `错误: ${errorMessage}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, webSearchEnabled, isLoading, canvasContext]);

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt, []);
  };

  // 新建对话
  const handleNewChat = () => {
    // 保存当前会话（如果有内容）
    if (messages.length > 0) {
      saveCurrentSession();
    }
    // 开始新对话
    setMessages([]);
    setCurrentSessionId(null);
    localStorage.removeItem(CURRENT_SESSION_KEY);
    setShowHistory(false);
  };

  // 切换到历史会话
  const handleSwitchSession = (session: ChatSession) => {
    // 先保存当前会话
    if (messages.length > 0 && currentSessionId !== session.id) {
      saveCurrentSession();
    }
    // 切换
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    localStorage.setItem(CURRENT_SESSION_KEY, session.id);
    setShowHistory(false);
  };

  // 删除会话
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    // 如果删除的是当前会话，清空
    if (sessionId === currentSessionId) {
      setMessages([]);
      setCurrentSessionId(null);
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  };

  // 获取当前会话标题
  const currentTitle = currentSessionId
    ? sessions.find(s => s.id === currentSessionId)?.title || '新对话'
    : '新对话';

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-4 top-16 bottom-4 bg-[#fafafa] border border-gray-200/80 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 rounded-2xl overflow-hidden ${
        isMaximized ? 'left-4' : 'w-[420px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {showHistory ? (
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 -ml-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft size={20} />
            </button>
          ) : null}
          <span className="font-medium text-gray-700 truncate max-w-[180px]">
            {showHistory ? '历史记录' : currentTitle}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="新建对话"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg transition-colors ${showHistory ? 'text-gray-700 bg-gray-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="历史记录"
          >
            <History size={18} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={isMaximized ? "缩小" : "最大化"}
          >
            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1"
            title="关闭"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* History List */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <History size={32} className="mb-2 opacity-50" />
              <span className="text-sm">暂无历史记录</span>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => handleSwitchSession(session)}
                  className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                    session.id === currentSessionId
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(session.updatedAt).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Message List */}
          <MessageList
            messages={messages}
            onQuickPrompt={handleQuickPrompt}
          />

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            onWebSearchToggle={setWebSearchEnabled}
            webSearchEnabled={webSearchEnabled}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
};
