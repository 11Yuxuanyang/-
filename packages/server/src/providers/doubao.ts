/**
 * 豆包 (Doubao) 图像生成提供商
 * 基于火山引擎 (VolcEngine) Ark API - Seedream 4.0
 * 文档: https://www.volcengine.com/docs/82379
 */

import { AIProvider, GenerateImageParams, EditImageParams, UpscaleImageParams } from './base.js';
import { config } from '../config.js';
import { uploadImages } from '../services/imageUpload.js';

// 安全日志：生产环境不输出敏感详情
const isDev = config.nodeEnv === 'development';
const debugLog = (message: string, data?: unknown) => {
  if (isDev && data !== undefined) {
    console.log(message, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  } else {
    console.log(message);
  }
};

export class DoubaoProvider implements AIProvider {
  name = 'doubao';

  private get cfg() {
    return config.providers.doubao;
  }

  /**
   * 生成图片（文生图）
   * 使用 Seedream 4.0 模型
   */
  async generateImage(params: GenerateImageParams): Promise<string> {
    const model = params.model || this.cfg.imageModel || 'doubao-seedream-4-0-250828';

    if (!this.cfg.apiKey) {
      throw new Error('未配置豆包 API Key，请在 .env 中设置 DOUBAO_API_KEY');
    }

    console.log(`[Doubao] 文生图: model=${model}, size=${params.size || '2K'}, prompt="${params.prompt.slice(0, 50)}..."`);

    const requestBody = {
      model: model,
      prompt: params.prompt,
      sequential_image_generation: 'disabled',  // 禁用组图生成，只生成单张
      response_format: 'url',                   // 返回 URL
      size: params.size || '2K',                // 使用 size 参数
      stream: false,
      watermark: params.watermark ?? true,      // 默认添加水印
    };

    debugLog('[Doubao] 请求体:', requestBody);

    const response = await fetch(`${this.cfg.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      console.error('[Doubao] API 错误:', error);
      throw new Error(error.error?.message || `豆包 API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    debugLog('[Doubao] 响应:', data);

    // 尝试获取 base64 数据
    const b64 = data.data?.[0]?.b64_json;
    if (b64) {
      return `data:image/png;base64,${b64}`;
    }

    // 如果返回的是 URL，需要下载并转换
    const url = data.data?.[0]?.url;
    if (url) {
      console.log('[Doubao] 返回 URL，正在下载转换为 base64...');
      return await this.urlToBase64(url);
    }

    throw new Error('豆包未返回图片数据');
  }

  /**
   * 编辑图片（图生图）
   * 支持单张或多张参考图
   * 注意：豆包 API 要求图片为 URL 格式，base64 图片需要先上传到图床
   */
  async editImage(params: EditImageParams): Promise<string> {
    const model = params.model || this.cfg.imageModel || 'doubao-seedream-4-0-250828';

    if (!this.cfg.apiKey) {
      throw new Error('未配置豆包 API Key，请在 .env 中设置 DOUBAO_API_KEY');
    }

    // 处理图片：支持单张或多张
    const images = Array.isArray(params.image) ? params.image : [params.image];

    if (images.length === 0) {
      throw new Error('图生图需要至少一张参考图');
    }

    if (images.length > 5) {
      throw new Error('参考图数量超过限制（最多5张）');
    }

    console.log(`[Doubao] 图生图: model=${model}, 参考图数量=${images.length}, prompt="${params.prompt.slice(0, 50)}..."`);

    // 豆包 API 要求图片为 URL 格式，需要先上传 base64 图片
    let imageUrls: string[];
    try {
      console.log('[Doubao] 上传参考图到图床...');
      imageUrls = await uploadImages(images);
      console.log(`[Doubao] 上传完成，获取到 ${imageUrls.length} 个 URL`);

      // 验证所有 URL 都是有效的
      for (const url of imageUrls) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          throw new Error(`图片上传返回了无效的 URL: ${url}`);
        }
      }
    } catch (uploadError: any) {
      console.error('[Doubao] 参考图上传失败:', uploadError.message);
      throw new Error(`参考图上传失败: ${uploadError.message}。请检查 TOS 配置是否正确。`);
    }

    // 构建请求体
    const requestBody: Record<string, any> = {
      model: model,
      prompt: params.prompt,
      // 单张图传字符串，多张图传数组
      image: imageUrls.length === 1 ? imageUrls[0] : imageUrls,
      sequential_image_generation: 'disabled',  // 禁用组图生成，只生成单张
      response_format: 'url',
      stream: false,
      watermark: true,
    };

    debugLog('[Doubao] 图生图请求体:', {
      ...requestBody,
      image: Array.isArray(requestBody.image)
        ? `[${requestBody.image.length} 张图片]`
        : '[1 张图片]'
    });

    const response = await fetch(`${this.cfg.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      if (isDev) {
        console.error('[Doubao] 图生图 API 错误:', JSON.stringify(error, null, 2));
      } else {
        console.error('[Doubao] 图生图 API 错误:', error.error?.code || response.status);
      }

      // 提供更详细的错误信息
      const errorMessage = error.error?.message || error.message || `HTTP ${response.status}`;
      const errorCode = error.error?.code || '';

      if (response.status === 401) {
        throw new Error('豆包 API Key 无效或已过期，请检查 DOUBAO_API_KEY 配置');
      } else if (response.status === 400) {
        throw new Error(`豆包 API 请求参数错误: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error('豆包 API 请求频率过高，请稍后重试');
      }

      throw new Error(`豆包图生图失败 [${errorCode}]: ${errorMessage}`);
    }

    const data = await response.json();
    debugLog('[Doubao] 图生图响应:', data);

    // 尝试获取 base64 数据
    const b64 = data.data?.[0]?.b64_json;
    if (b64) {
      console.log('[Doubao] 图生图成功，返回 base64 格式');
      return `data:image/png;base64,${b64}`;
    }

    // 如果返回的是 URL，需要下载并转换
    const url = data.data?.[0]?.url;
    if (url) {
      console.log('[Doubao] 图生图成功，返回 URL，正在下载转换为 base64...');
      try {
        return await this.urlToBase64(url);
      } catch (downloadError: any) {
        console.error('[Doubao] 下载生成的图片失败:', downloadError.message);
        throw new Error(`生成成功但下载图片失败: ${downloadError.message}`);
      }
    }

    if (isDev) {
      console.error('[Doubao] 响应中未找到图片数据:', data);
    } else {
      console.error('[Doubao] 响应中未找到图片数据');
    }
    throw new Error('豆包 API 响应格式异常，未返回图片数据');
  }

  /**
   * 放大图片
   * 豆包 Seedream 暂不支持
   */
  async upscaleImage(_params: UpscaleImageParams): Promise<string> {
    throw new Error('豆包 Seedream 暂不支持图片放大功能');
  }

  /**
   * 将 URL 图片转换为 base64
   */
  private async urlToBase64(url: string): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // 尝试从 Content-Type 获取格式
    const contentType = response.headers.get('content-type') || 'image/png';

    return `data:${contentType};base64,${base64}`;
  }
}
