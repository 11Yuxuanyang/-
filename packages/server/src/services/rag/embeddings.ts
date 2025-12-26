/**
 * 向量嵌入服务
 * 支持 OpenAI 和 OpenRouter 的嵌入 API
 */

import { config } from '../../config.js';

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}

/**
 * OpenAI 兼容的嵌入服务
 * 可用于 OpenAI、OpenRouter 等兼容 API
 */
export class OpenAIEmbeddings implements EmbeddingService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private dimension: number;

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }) {
    // 优先使用 OpenAI，如果没有则使用 OpenRouter
    const openaiKey = config.providers.openai?.apiKey;
    const openrouterKey = config.providers.openrouter?.apiKey;

    if (options?.apiKey) {
      this.apiKey = options.apiKey;
      this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    } else if (openaiKey) {
      this.apiKey = openaiKey;
      this.baseUrl = config.providers.openai?.baseUrl || 'https://api.openai.com/v1';
    } else if (openrouterKey) {
      this.apiKey = openrouterKey;
      this.baseUrl = config.providers.openrouter?.baseUrl || 'https://openrouter.ai/api/v1';
    } else {
      throw new Error('未配置嵌入 API Key，请设置 OPENAI_API_KEY 或 OPENROUTER_API_KEY');
    }

    this.model = options?.model || 'text-embedding-3-small';
    this.dimension = 1536; // text-embedding-3-small 默认维度
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // 过滤空文本
    const validTexts = texts.map(t => t.trim()).filter(t => t.length > 0);
    if (validTexts.length === 0) {
      return texts.map(() => new Array(this.dimension).fill(0));
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: validTexts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Embeddings] API 错误:', error);
        throw new Error(`嵌入 API 失败: ${response.status}`);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      // 按原始顺序返回
      const embeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map(d => d.embedding);

      // 如果有空文本被过滤，需要填充零向量
      if (validTexts.length !== texts.length) {
        const result: number[][] = [];
        let validIndex = 0;
        for (const text of texts) {
          if (text.trim().length > 0) {
            result.push(embeddings[validIndex++]);
          } else {
            result.push(new Array(this.dimension).fill(0));
          }
        }
        return result;
      }

      return embeddings;
    } catch (error) {
      console.error('[Embeddings] 嵌入失败:', error);
      throw error;
    }
  }

  getDimension(): number {
    return this.dimension;
  }
}

// 导出默认实例（延迟初始化）
let embeddingService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new OpenAIEmbeddings();
  }
  return embeddingService;
}
