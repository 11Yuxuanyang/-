/**
 * AI 提供商接口
 *
 * 实现此接口以支持不同的 AI 模型提供商
 * 例如：豆包、香蕉pro、Stability AI、OpenAI 等
 */

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  size?: string;        // 尺寸: '1K' | '2K' | '4K'
  watermark?: boolean;  // 是否添加水印
  options?: Record<string, any>;
}

export interface EditImageParams {
  image: string | string[];  // 支持单张或多张参考图 (base64 或 URL)
  prompt: string;
  model?: string;
  options?: Record<string, any>;
}

export interface UpscaleImageParams {
  image: string;  // base64
  resolution?: '2K' | '4K';
  options?: Record<string, any>;
}

export interface AIProvider {
  /** 提供商名称 */
  name: string;

  /**
   * 生成图片
   * @returns base64 编码的图片数据
   */
  generateImage(params: GenerateImageParams): Promise<string>;

  /**
   * 编辑图片
   * @returns base64 编码的图片数据
   */
  editImage(params: EditImageParams): Promise<string>;

  /**
   * 放大图片（可选）
   * @returns base64 编码的图片数据
   */
  upscaleImage?(params: UpscaleImageParams): Promise<string>;
}

/**
 * AI 提供商响应格式
 */
export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
