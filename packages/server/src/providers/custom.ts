import { config } from '../config.js';
import {
  AIProvider,
  GenerateImageParams,
  EditImageParams,
  InpaintImageParams,
  UpscaleImageParams,
} from './base.js';

/**
 * 自定义 AI 提供商示例
 *
 * 这是一个通用的 HTTP API 提供商实现
 * 你可以根据自己的 API 格式修改此文件
 *
 * 配置方式（.env 文件）:
 *   AI_API_KEY=你的API密钥
 *   AI_API_BASE_URL=https://你的API地址
 *   AI_DEFAULT_MODEL=模型名称
 */
export class CustomProvider implements AIProvider {
  name = 'custom';

  private async callAPI(endpoint: string, body: Record<string, any>): Promise<any> {
    const url = `${config.ai.apiBaseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.ai.apiKey}`,
        // 根据你的 API 需要调整 headers
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 调用失败: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const { prompt, model, aspectRatio, size, options } = params;

    // TODO: 根据你的 API 格式调整请求体
    const result = await this.callAPI('/generate', {
      prompt,
      model: model || config.ai.defaultModel,
      aspect_ratio: aspectRatio || '1:1',
      size: size,  // 图片尺寸（1K/2K/4K 等）
      ...options,
    });

    // TODO: 根据你的 API 响应格式调整
    // 假设 API 返回 { image: "base64..." } 或 { data: { image: "base64..." } }
    const imageData = result.image || result.data?.image;

    if (!imageData) {
      throw new Error('API 未返回图片数据');
    }

    // 如果已经是 data URL 格式，直接返回
    if (imageData.startsWith('data:')) {
      return imageData;
    }

    // 否则添加前缀
    return `data:image/png;base64,${imageData}`;
  }

  async editImage(params: EditImageParams): Promise<string> {
    const { image, prompt, model, options } = params;

    // 移除 data URL 前缀（支持单张或多张图）
    const processImage = (img: string) => img.includes(',') ? img.split(',')[1] : img;
    const base64Data = Array.isArray(image) ? image.map(processImage) : processImage(image);

    // TODO: 根据你的 API 格式调整请求体
    const result = await this.callAPI('/edit', {
      image: base64Data,
      prompt,
      model: model || config.ai.defaultModel,
      ...options,
    });

    const imageData = result.image || result.data?.image;

    if (!imageData) {
      throw new Error('API 未返回图片数据');
    }

    if (imageData.startsWith('data:')) {
      return imageData;
    }

    return `data:image/png;base64,${imageData}`;
  }

  async inpaintImage(params: InpaintImageParams): Promise<string> {
    const { image, mask, prompt, model, options } = params;

    // 移除 data URL 前缀
    const processImage = (img: string) => img.includes(',') ? img.split(',')[1] : img;
    const imageBase64 = processImage(image);
    const maskBase64 = processImage(mask);

    // TODO: 根据你的 API 格式调整请求体
    const result = await this.callAPI('/inpaint', {
      image: imageBase64,
      mask: maskBase64,
      prompt: prompt || '智能填充擦除区域，保持图片整体风格一致',
      model: model || config.ai.defaultModel,
      ...options,
    });

    const imageData = result.image || result.data?.image;

    if (!imageData) {
      throw new Error('API 未返回图片数据');
    }

    if (imageData.startsWith('data:')) {
      return imageData;
    }

    return `data:image/png;base64,${imageData}`;
  }

  async upscaleImage(params: UpscaleImageParams): Promise<string> {
    const { image, resolution, options } = params;

    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    // TODO: 根据你的 API 格式调整请求体
    const result = await this.callAPI('/upscale', {
      image: base64Data,
      resolution: resolution || '4K',
      ...options,
    });

    const imageData = result.image || result.data?.image;

    if (!imageData) {
      throw new Error('API 未返回图片数据');
    }

    if (imageData.startsWith('data:')) {
      return imageData;
    }

    return `data:image/png;base64,${imageData}`;
  }
}
