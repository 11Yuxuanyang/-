/**
 * 图片上传服务
 * 将 base64 图片上传到图床获取公网 URL
 * 用于豆包等需要 URL 格式图片的 AI 服务
 *
 * 优先级：TOS > imgbb > catbox
 */

import { uploadToTOS, isTOSConfigured } from './tosUpload.js';

interface UploadResult {
  url: string;
  deleteUrl?: string;
}

/**
 * 将 base64 图片上传到 imgbb 图床
 * 需要配置 IMGBB_API_KEY 环境变量
 */
async function uploadToImgbb(base64Data: string): Promise<UploadResult> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 IMGBB_API_KEY，请在 .env 中设置');
  }

  // 移除 data URL 前缀
  const pureBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  const formData = new FormData();
  formData.append('key', apiKey);
  formData.append('image', pureBase64);

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`imgbb 上传失败: ${error}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`imgbb 上传失败: ${data.error?.message || '未知错误'}`);
  }

  return {
    url: data.data.url,
    deleteUrl: data.data.delete_url,
  };
}

/**
 * 将 base64 图片上传到 catbox.moe（免费，无需 API key）
 * 备用方案
 */
async function uploadToCatbox(base64Data: string): Promise<UploadResult> {
  // 移除 data URL 前缀，获取 MIME 类型
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('无效的 base64 图片格式');
  }

  const ext = matches[1];
  const pureBase64 = matches[2];

  // 将 base64 转为 Blob
  const buffer = Buffer.from(pureBase64, 'base64');
  const blob = new Blob([buffer], { type: `image/${ext}` });

  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', blob, `image.${ext}`);

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`catbox 上传失败: ${response.statusText}`);
  }

  const url = await response.text();
  if (!url.startsWith('http')) {
    throw new Error(`catbox 上传失败: ${url}`);
  }

  return { url: url.trim() };
}

/**
 * 上传图片获取公网 URL
 * 优先级：TOS > imgbb > catbox
 */
export async function uploadImage(base64Data: string): Promise<string> {
  console.log('[ImageUpload] 开始上传图片...');

  // 如果已经是 URL，直接返回
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    console.log('[ImageUpload] 图片已是 URL 格式，跳过上传');
    return base64Data;
  }

  try {
    // 优先使用火山引擎 TOS（最稳定）
    if (isTOSConfigured()) {
      console.log('[ImageUpload] 使用火山引擎 TOS 上传');
      const url = await uploadToTOS(base64Data);
      return url;
    }

    // 其次使用 imgbb
    if (process.env.IMGBB_API_KEY) {
      console.log('[ImageUpload] 使用 imgbb 上传');
      const result = await uploadToImgbb(base64Data);
      console.log(`[ImageUpload] imgbb 上传成功: ${result.url}`);
      return result.url;
    }

    // 备用方案：catbox（免费但不稳定）
    console.log('[ImageUpload] 未配置 TOS/IMGBB，使用 catbox.moe 备用方案');
    const result = await uploadToCatbox(base64Data);
    console.log(`[ImageUpload] catbox 上传成功: ${result.url}`);
    return result.url;
  } catch (error) {
    console.error('[ImageUpload] 上传失败:', error);
    throw error;
  }
}

/**
 * 批量上传图片
 */
export async function uploadImages(base64Images: string[]): Promise<string[]> {
  console.log(`[ImageUpload] 批量上传 ${base64Images.length} 张图片...`);

  const results = await Promise.all(
    base64Images.map(async (img, index) => {
      try {
        const url = await uploadImage(img);
        console.log(`[ImageUpload] 第 ${index + 1} 张上传成功`);
        return url;
      } catch (error) {
        console.error(`[ImageUpload] 第 ${index + 1} 张上传失败:`, error);
        throw error;
      }
    })
  );

  return results;
}
