import { Router, Request, Response } from 'express';
import { getProvider, getAvailableProviders } from '../providers/index.js';
import { asyncHandler, validateBody, schemas, HttpError } from '../middleware/index.js';
import { config } from '../config.js';

export const aiRouter = Router();

/**
 * GET /api/ai/providers
 * 获取可用的图像生成提供商列表
 * 注意：不返回任何敏感信息（API 密钥等）
 */
aiRouter.get('/providers', (_req: Request, res: Response) => {
  const available = getAvailableProviders();

  res.json({
    success: true,
    data: {
      available,
      default: config.defaultImageProvider,
      count: available.length,
    },
  });
});

/**
 * POST /api/ai/generate
 * 生成图片
 * 支持通过 provider 参数指定提供商
 * 如果提供了 referenceImage，则使用图生图模式（AI 融合）
 */
aiRouter.post(
  '/generate',
  validateBody(schemas.generateImage),
  asyncHandler(async (req: Request, res: Response) => {
    const { prompt, model, aspectRatio, size, provider: providerName, referenceImage } = req.body;

    const provider = getProvider(providerName);
    let image: string;

    if (referenceImage) {
      // 有参考图时使用图生图模式（AI 融合）
      image = await provider.editImage({
        image: referenceImage,
        prompt,
        model,
      });
    } else {
      // 无参考图时使用文生图模式
      image = await provider.generateImage({
        prompt,
        model,
        aspectRatio,
        size,
      });
    }

    res.json({
      success: true,
      data: {
        image,
        provider: provider.name,
      },
    });
  })
);

/**
 * POST /api/ai/edit
 * 编辑图片
 * 支持通过 provider 参数指定提供商
 */
aiRouter.post(
  '/edit',
  validateBody(schemas.editImage),
  asyncHandler(async (req: Request, res: Response) => {
    const { image, prompt, model, provider: providerName } = req.body;

    const provider = getProvider(providerName);
    const resultImage = await provider.editImage({
      image,
      prompt,
      model,
    });

    res.json({
      success: true,
      data: {
        image: resultImage,
        provider: provider.name,
      },
    });
  })
);

/**
 * POST /api/ai/inpaint
 * 图片修复/擦除
 * 使用遮罩指定要擦除或编辑的区域
 * 支持通过 provider 参数指定提供商
 */
aiRouter.post(
  '/inpaint',
  validateBody(schemas.inpaintImage),
  asyncHandler(async (req: Request, res: Response) => {
    const { image, mask, prompt, model, provider: providerName } = req.body;

    const provider = getProvider(providerName);

    if (!provider.inpaintImage) {
      throw HttpError.badRequest(
        `提供商 ${provider.name} 不支持图片修复/擦除功能`,
        'UNSUPPORTED_OPERATION'
      );
    }

    const resultImage = await provider.inpaintImage({
      image,
      mask,
      prompt,
      model,
    });

    res.json({
      success: true,
      data: {
        image: resultImage,
        provider: provider.name,
      },
    });
  })
);

/**
 * POST /api/ai/upscale
 * 放大图片
 * 支持通过 provider 参数指定提供商
 */
aiRouter.post(
  '/upscale',
  validateBody(schemas.upscaleImage),
  asyncHandler(async (req: Request, res: Response) => {
    const { image, provider: providerName } = req.body;

    const provider = getProvider(providerName);

    if (!provider.upscaleImage) {
      throw HttpError.badRequest(
        `提供商 ${provider.name} 不支持图片放大功能`,
        'UNSUPPORTED_OPERATION'
      );
    }

    const resultImage = await provider.upscaleImage({
      image,
    });

    res.json({
      success: true,
      data: {
        image: resultImage,
        provider: provider.name,
      },
    });
  })
);
