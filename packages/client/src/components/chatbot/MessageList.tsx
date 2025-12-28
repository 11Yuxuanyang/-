import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ChatMessage } from '@/types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  onQuickPrompt?: (prompt: string) => void;
}

// 快捷提示分组 - 贴合画布产品
const quickPromptGroups = [
  [
    '画布上这几张图能怎么玩？',
    '帮我想个脑洞大开的画面',
    '给选中的图来点创意建议',
  ],
  [
    '这个配色太普通了，换个风格',
    '把这几张图融合成一个故事',
    '三傻你觉得这构图行不行？',
  ],
  [
    '灵感枯竭了，救救我',
    '选中的图怎么改更有冲击力？',
    '帮我写段图片描述词',
  ],
];

export const MessageList: React.FC<MessageListProps> = ({ messages, onQuickPrompt }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [promptGroupIndex, setPromptGroupIndex] = useState(0);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRefreshPrompts = () => {
    setPromptGroupIndex((prev) => (prev + 1) % quickPromptGroups.length);
  };

  const currentPrompts = quickPromptGroups[promptGroupIndex];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto overflow-x-hidden">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2 text-violet-600">
            嘿，灵感来了吗？
          </h1>
          <p className="text-base text-gray-400">
            选几张图、聊聊想法，三傻帮你搞定
          </p>
        </div>

        {/* Quick Prompts */}
        <div className="space-y-3">
          {currentPrompts.map((prompt, index) => (
            <button
              key={`${promptGroupIndex}-${index}`}
              onClick={() => onQuickPrompt?.(prompt)}
              className="w-fit px-5 py-3 rounded-2xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 text-sm font-medium transition-all duration-200 hover:shadow-sm animate-in fade-in slide-in-from-left duration-300"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefreshPrompts}
          className="flex items-center gap-2 mt-6 text-gray-400 hover:text-gray-600 text-sm transition-colors group"
        >
          <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
          <span>换一换</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
