import { Router, Request, Response } from 'express';
import { getProvider, getAvailableProviders } from '../providers/index.js';
import { asyncHandler, validateBody, schemas, HttpError } from '../middleware/index.js';
import { config } from '../config.js';
import { creditCheckMiddleware, deductCreditsAfterSuccess } from '../middleware/creditCheck.js';

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
 * 积分消耗：720p=2, 1K=4, 2K=6, 4K=8
 */
aiRouter.post(
  '/generate',
  validateBody(schemas.generateImage),
  creditCheckMiddleware('generate'),
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

    // 生成成功后扣除积分
    const deductResult = await deductCreditsAfterSuccess(req, {
      provider: provider.name,
      aspectRatio,
      size,
      hasReferenceImage: !!referenceImage,
    });

    res.json({
      success: true,
      data: {
        image,
        provider: provider.name,
        creditsUsed: req.creditCost,
        newBalance: deductResult?.newBalance,
      },
    });
  })
);

/**
 * POST /api/ai/edit
 * 编辑图片（图生图）
 * 支持通过 provider 参数指定提供商
 * 积分消耗：固定 4 积分
 */
aiRouter.post(
  '/edit',
  validateBody(schemas.editImage),
  creditCheckMiddleware('edit'),
  asyncHandler(async (req: Request, res: Response) => {
    const { image, prompt, model, provider: providerName } = req.body;

    const provider = getProvider(providerName);
    const resultImage = await provider.editImage({
      image,
      prompt,
      model,
    });

    // 成功后扣除积分
    const deductResult = await deductCreditsAfterSuccess(req, {
      provider: provider.name,
      imageCount: Array.isArray(image) ? image.length : 1,
    });

    res.json({
      success: true,
      data: {
        image: resultImage,
        provider: provider.name,
        creditsUsed: req.creditCost,
        newBalance: deductResult?.newBalance,
      },
    });
  })
);

/**
 * POST /api/ai/inpaint
 * 图片修复/擦除
 * 使用遮罩指定要擦除或编辑的区域
 * 支持通过 provider 参数指定提供商
 * 积分消耗：固定 2 积分
 */
aiRouter.post(
  '/inpaint',
  validateBody(schemas.inpaintImage),
  creditCheckMiddleware('inpaint'),
  asyncHandler(async (req: Request, res: Response) => {
    const { image, mask, prompt, model, provider: providerName } = req.body;

    let provider = getProvider(providerName);

    // 如果当前提供商不支持 inpaint，自动选择支持的提供商
    if (!provider.inpaintImage) {
      console.log(`[Inpaint] ${provider.name} 不支持 inpaint，尝试使用 doubao`);
      try {
        const doubaoProvider = getProvider('doubao');
        if (doubaoProvider.inpaintImage) {
          provider = doubaoProvider;
        }
      } catch {
        // doubao 不可用，尝试 custom
      }

      if (!provider.inpaintImage) {
        try {
          const customProvider = getProvider('custom');
          if (customProvider.inpaintImage) {
            provider = customProvider;
          }
        } catch {
          // custom 也不可用
        }
      }

      if (!provider.inpaintImage) {
        throw HttpError.badRequest(
          '没有可用的图片修复提供商，请配置 doubao 或 custom 提供商',
          'NO_INPAINT_PROVIDER'
        );
      }
      console.log(`[Inpaint] 已切换到 ${provider.name} 提供商`);
    }

    const resultImage = await provider.inpaintImage({
      image,
      mask,
      prompt,
      model,
    });

    // 成功后扣除积分
    const deductResult = await deductCreditsAfterSuccess(req, {
      provider: provider.name,
      hasPrompt: !!prompt,
    });

    res.json({
      success: true,
      data: {
        image: resultImage,
        provider: provider.name,
        creditsUsed: req.creditCost,
        newBalance: deductResult?.newBalance,
      },
    });
  })
);

/**
 * POST /api/ai/upscale
 * 放大图片
 * 支持通过 provider 参数指定提供商
 * 积分消耗：2K=2, 4K=4
 */
aiRouter.post(
  '/upscale',
  validateBody(schemas.upscaleImage),
  creditCheckMiddleware('upscale'),
  asyncHandler(async (req: Request, res: Response) => {
    const { image, resolution, provider: providerName } = req.body;

    const provider = getProvider(providerName);

    if (!provider.upscaleImage) {
      throw HttpError.badRequest(
        `提供商 ${provider.name} 不支持图片放大功能`,
        'UNSUPPORTED_OPERATION'
      );
    }

    const resultImage = await provider.upscaleImage({
      image,
      resolution,
    });

    // 成功后扣除积分
    const deductResult = await deductCreditsAfterSuccess(req, {
      provider: provider.name,
      targetResolution: resolution || '2K',
    });

    res.json({
      success: true,
      data: {
        image: resultImage,
        provider: provider.name,
        creditsUsed: req.creditCost,
        newBalance: deductResult?.newBalance,
      },
    });
  })
);
