/**
 * 豆包 (Doubao) 聊天提供商
 * 基于火山引擎 Ark API，支持多模态对话（文本 + 图片）
 */

import { config } from '../config.js';
import { ChatProvider, ChatRequest, ChatResponse, ChatMessageInput } from './chat-base.js';
import { uploadToTOS, isTOSConfigured } from '../services/tosUpload.js';

// 安全日志：生产环境不输出敏感详情
const isDev = config.nodeEnv === 'development';

// 豆包 API 消息内容格式
type DoubaoContentItem =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface DoubaoMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | DoubaoContentItem[];
}

export class DoubaoChatProvider implements ChatProvider {
  name = 'doubao-chat';

  private get cfg() {
    return config.providers.doubao;
  }

  /**
   * 获取聊天 API Key（优先使用专用 key）
   */
  private get apiKey(): string {
    return this.cfg.chatApiKey || this.cfg.apiKey;
  }

  /**
   * 转换消息格式为豆包 API 所需格式
   * 处理多模态消息（文本 + 图片）
   */
  private async convertMessages(messages: ChatMessageInput[]): Promise<DoubaoMessage[]> {
    const result: DoubaoMessage[] = [];

    for (const msg of messages) {
      // 如果没有附件，直接使用字符串格式
      if (!msg.attachments || msg.attachments.length === 0) {
        result.push({
          role: msg.role,
          content: msg.content,
        });
        continue;
      }

      // 有附件，需要构建 content 数组
      const contentItems: DoubaoContentItem[] = [];

      // 处理图片附件
      for (const attachment of msg.attachments) {
        if (attachment.type.startsWith('image/')) {
          try {
            // 上传图片到 TOS 获取公网 URL
            let imageUrl: string;
            if (attachment.content.startsWith('http://') || attachment.content.startsWith('https://')) {
              imageUrl = attachment.content;
            } else if (isTOSConfigured()) {
              if (isDev) console.log('[Doubao Chat] 上传图片到 TOS...');
              imageUrl = await uploadToTOS(attachment.content);
              if (isDev) console.log('[Doubao Chat] 图片上传成功');
            } else {
              console.warn('[Doubao Chat] TOS 未配置，跳过图片');
              continue;
            }

            contentItems.push({
              type: 'image_url',
              image_url: { url: imageUrl },
            });
          } catch (error) {
            console.error('[Doubao Chat] 图片上传失败:', error);
            // 继续处理其他内容，不中断
          }
        }
      }

      // 添加文本内容
      if (msg.content) {
        contentItems.push({
          type: 'text',
          text: msg.content,
        });
      }

      result.push({
        role: msg.role,
        content: contentItems.length > 0 ? contentItems : msg.content,
      });
    }

    return result;
  }

  /**
   * 普通聊天（非流式）
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages } = request;

    if (!this.apiKey) {
      throw new Error('未配置豆包聊天 API Key，请在 .env 中设置 DOUBAO_CHAT_API_KEY');
    }

    const model = this.cfg.chatModel || 'doubao-seed-1-6-251015';
    console.log(`[Doubao Chat] 开始对话: model=${model}, messages=${messages.length}`);

    const convertedMessages = await this.convertMessages(messages);

    const response = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: convertedMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (isDev) {
        console.error('[Doubao Chat] API 错误:', errorText);
      } else {
        console.error('[Doubao Chat] API 错误:', response.status);
      }
      throw new Error(`豆包聊天 API 失败: ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    console.log('[Doubao Chat] 响应成功');

    return {
      message: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
      } : undefined,
    };
  }

  /**
   * 流式聊天
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const { messages } = request;

    if (!this.apiKey) {
      throw new Error('未配置豆包聊天 API Key，请在 .env 中设置 DOUBAO_CHAT_API_KEY');
    }

    const model = this.cfg.chatModel || 'doubao-seed-1-6-251015';
    console.log(`[Doubao Chat] 开始流式对话: model=${model}, messages=${messages.length}`);

    const convertedMessages = await this.convertMessages(messages);

    const response = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: convertedMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (isDev) {
        console.error('[Doubao Chat] 流式 API 错误:', errorText);
      } else {
        console.error('[Doubao Chat] 流式 API 错误:', response.status);
      }
      throw new Error(`豆包聊天 API 失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('无法读取响应流');
    }

    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6);
          if (data === '[DONE]') {
            console.log('[Doubao Chat] 流式响应完成');
            return;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 忽略 JSON 解析错误
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
