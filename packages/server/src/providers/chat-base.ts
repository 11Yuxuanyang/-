/**
 * Chat Provider 基础接口定义
 */

export type ChatRole = 'user' | 'assistant' | 'system';

// 多模态内容类型
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessageInput {
  role: ChatRole;
  content: string | ContentPart[];
  attachments?: Array<{
    type: string;
    content: string;
  }>;
}

// 画布元素上下文
export interface CanvasItemContext {
  id: string;
  type: 'image' | 'text' | 'rectangle' | 'circle' | 'brush' | 'line' | 'arrow';
  position: { x: number; y: number };
  size: { width: number; height: number };
  imageData?: string;
  prompt?: string;
  textContent?: string;
  fill?: string;
  stroke?: string;
}

export interface CanvasContext {
  items: CanvasItemContext[];
  selectedIds: string[];
}

export interface ChatRequest {
  messages: ChatMessageInput[];
  webSearchEnabled?: boolean;
  stream?: boolean;
  canvasContext?: CanvasContext;
}

export interface ChatResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ChatProvider {
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<string, void, unknown>;
}
