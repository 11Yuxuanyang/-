/**
 * 管理后台 API 路由
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import * as adminService from '../services/adminService';
import { getChatUsageStats } from '../services/chatUsageService';

export const adminRouter = Router();

// 所有管理后台路由都需要管理员认证
adminRouter.use(adminAuthMiddleware);

// ============ 仪表盘统计 ============

/**
 * GET /api/admin/stats/overview
 * 获取概览统计数据
 */
adminRouter.get('/stats/overview', async (_req: Request, res: Response) => {
  try {
    const stats = await adminService.getOverviewStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Admin] 获取概览统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败',
    });
  }
});

/**
 * GET /api/admin/stats/users
 * 获取用户趋势数据
 */
adminRouter.get('/stats/users', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const data = await adminService.getUserStats(period);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Admin] 获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户统计失败',
    });
  }
});

/**
 * GET /api/admin/stats/revenue
 * 获取收入趋势数据
 */
adminRouter.get('/stats/revenue', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '30d';
    const data = await adminService.getRevenueStats(period);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Admin] 获取收入统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取收入统计失败',
    });
  }
});

/**
 * GET /api/admin/stats/usage
 * 获取使用统计数据
 */
adminRouter.get('/stats/usage', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const data = await adminService.getUsageStats(period);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Admin] 获取使用统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取使用统计失败',
    });
  }
});

/**
 * GET /api/admin/stats/chat
 * 获取聊天使用统计
 */
adminRouter.get('/stats/chat', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const data = await getChatUsageStats(period);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Admin] 获取聊天统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取聊天统计失败',
    });
  }
});

// ============ 用户管理 ============

/**
 * GET /api/admin/users
 * 获取用户列表
 */
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const status = req.query.status as string;
    const membershipType = req.query.membershipType as string;

    const result = await adminService.getUserList({
      page,
      limit,
      search,
      status,
      membershipType,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Admin] 获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败',
    });
  }
});

/**
 * GET /api/admin/users/:id
 * 获取用户详情
 */
adminRouter.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await adminService.getUserDetail(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('[Admin] 获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户详情失败',
    });
  }
});

// 积分调整请求验证
const adjustCreditsSchema = z.object({
  amount: z.number().int(),
  reason: z.string().min(1, '请填写原因'),
});

/**
 * POST /api/admin/users/:id/credits
 * 调整用户积分
 */
adminRouter.post('/users/:id/credits', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = adjustCreditsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || '参数错误',
      });
    }

    const { amount, reason } = validation.data;
    await adminService.adjustUserCredits(id, amount, reason, req.admin!.userId);

    res.json({
      success: true,
      message: '积分调整成功',
    });
  } catch (error) {
    console.error('[Admin] 调整积分失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '调整积分失败',
    });
  }
});

// 封禁请求验证
const banUserSchema = z.object({
  reason: z.string().min(1, '请填写封禁原因'),
});

/**
 * POST /api/admin/users/:id/ban
 * 封禁用户
 */
adminRouter.post('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = banUserSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || '参数错误',
      });
    }

    const { reason } = validation.data;
    await adminService.banUser(id, reason, req.admin!.userId);

    res.json({
      success: true,
      message: '用户已封禁',
    });
  } catch (error) {
    console.error('[Admin] 封禁用户失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '封禁用户失败',
    });
  }
});

/**
 * POST /api/admin/users/:id/unban
 * 解封用户
 */
adminRouter.post('/users/:id/unban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await adminService.unbanUser(id, req.admin!.userId);

    res.json({
      success: true,
      message: '用户已解封',
    });
  } catch (error) {
    console.error('[Admin] 解封用户失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '解封用户失败',
    });
  }
});

// ============ 订单管理 ============

/**
 * GET /api/admin/orders
 * 获取订单列表
 */
adminRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await adminService.getOrderList({
      page,
      limit,
      status,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Admin] 获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单列表失败',
    });
  }
});

// 退款请求验证
const refundOrderSchema = z.object({
  reason: z.string().min(1, '请填写退款原因'),
  refundCredits: z.boolean().optional().default(false),
});

/**
 * POST /api/admin/orders/:id/refund
 * 处理退款
 */
adminRouter.post('/orders/:id/refund', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = refundOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0]?.message || '参数错误',
      });
    }

    const { reason, refundCredits } = validation.data;
    await adminService.refundOrder(id, reason, refundCredits, req.admin!.userId);

    res.json({
      success: true,
      message: '退款处理成功',
    });
  } catch (error) {
    console.error('[Admin] 处理退款失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '处理退款失败',
    });
  }
});
