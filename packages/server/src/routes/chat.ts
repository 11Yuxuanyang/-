/**
 * Chat API 路由
 *
 * 使用 LangGraph 模式：服务端维护对话历史，通过 threadId 区分会话
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, validateBody, schemas } from '../middleware/index.js';
import * as langGraphChat from '../services/langGraphChat.js';
import { recordChatUsage } from '../services/chatUsageService.js';
import { verifyToken } from '../services/authService.js';
import { config } from '../config.js';

export const chatRouter = Router();

/**
 * 获取当前日期信息
 */
function getCurrentDateInfo(): string {
  const now = new Date();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDay = weekDays[now.getDay()];
  return `${year}年${month}月${day}日，星期${weekDay}`;
}

/**
 * 构建系统提示词（精简版）
 */
function buildSystemPrompt(webSearchEnabled: boolean): string {
  const currentDate = getCurrentDateInfo();

  let prompt = `你是"三傻"，一个创意AI助手。今天是${currentDate}。

擅长：剧本创作、对白设计、视觉构思、AI绘图提示词

输出要求：
- 用###分模块，每模块3-5行
- **粗体**标记关键词
- 对白格式：角色名：「台词」
- 不用emoji、不用引用块、不用分隔线`;

  if (webSearchEnabled) {
    prompt += `\n- 联网搜索已启用，引用请标注来源`;
  }

  return prompt;
}

/**
 * POST /api/chat
 * 聊天对话端点（LangGraph 模式）
 */
chatRouter.post(
  '/',
  validateBody(schemas.chatMessage),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      message,
      threadId,
      webSearchEnabled,
      stream,
      canvasContext,
    } = req.body;

    // 验证必要参数
    if (!threadId || !message) {
      res.status(400).json({
        success: false,
        error: '缺少 threadId 或 message 参数',
      });
      return;
    }

    console.log(`[Chat] LangGraph 模式: threadId=${threadId}`);

    // 构建系统提示词
    let systemPrompt = buildSystemPrompt(webSearchEnabled);

    // 画布上下文提示
    if (canvasContext && canvasContext.items.length > 0) {
      systemPrompt += `\n\n<canvas_available>
  <instruction>用户正在使用画布编辑器，画布上有 ${canvasContext.items.length} 个元素。</instruction>
</canvas_available>`;
    }

    if (stream) {
      // 流式响应
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      let isClientConnected = true;
      res.on('close', () => {
        isClientConnected = false;
      });

      const heartbeat = setInterval(() => {
        if (isClientConnected) {
          res.write(': heartbeat\n\n');
        }
      }, 15000);

      let streamUsage: {
        promptTokens: number;
        completionTokens: number;
        cacheReadTokens?: number;
        cacheWriteTokens?: number;
      } | null = null;

      try {
        for await (const chunk of langGraphChat.chatStream({
          message,
          threadId,
          webSearchEnabled,
          canvasContext,
          systemPrompt,
        })) {
          if (!isClientConnected) break;

          // 检查是否是 usage 信息
          if (chunk.startsWith('[[USAGE]]')) {
            try {
              streamUsage = JSON.parse(chunk.slice(9));
            } catch {
              // 忽略解析错误
            }
            continue; // 不发送给客户端
          }

          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        if (isClientConnected) {
          res.write('data: [DONE]\n\n');
        }

        // 记录 token 使用量
        if (streamUsage) {
          let userId: string | undefined;
          const authHeader = req.headers.authorization;
          if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = verifyToken(token);
            userId = payload?.userId;
          }

          const chatModel = config.providers.openrouter?.chatModel || 'minimax/minimax-m2.1';
          recordChatUsage({
            userId,
            model: chatModel,
            provider: 'openrouter',
            promptTokens: streamUsage.promptTokens,
            completionTokens: streamUsage.completionTokens,
            cacheReadTokens: streamUsage.cacheReadTokens,
            cacheWriteTokens: streamUsage.cacheWriteTokens,
          }).catch(err => console.error('[Chat] 记录使用量失败:', err));
        }
      } catch (error) {
        if (isClientConnected) {
          const errorMessage = error instanceof Error ? error.message : '流式响应失败';
          res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        }
      } finally {
        clearInterval(heartbeat);
      }
      res.end();
    } else {
      // 非流式响应
      const response = await langGraphChat.chat({
        message,
        threadId,
        webSearchEnabled,
        canvasContext,
        systemPrompt,
      });

      res.json({
        success: true,
        data: { message: response },
      });
    }
  })
);

/**
 * GET /api/chat/health
 * Chat 服务健康检查
 */
chatRouter.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  const langGraphStatus = await langGraphChat.getLangGraphStatus();

  res.json({
    success: true,
    data: {
      provider: 'langgraph',
      status: 'ok',
      langGraph: langGraphStatus,
    },
  });
}));

/**
 * GET /api/chat/sessions/:threadId/history
 * 获取会话历史
 */
chatRouter.get('/sessions/:threadId/history', asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;

  const history = await langGraphChat.getSessionHistory(threadId);

  res.json({
    success: true,
    data: { messages: history },
  });
}));

/**
 * DELETE /api/chat/sessions/:threadId
 * 删除会话
 */
chatRouter.delete('/sessions/:threadId', asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;

  await langGraphChat.deleteSession(threadId);

  res.json({
    success: true,
    message: '会话已删除',
  });
}));
