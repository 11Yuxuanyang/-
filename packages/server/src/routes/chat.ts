/**
 * Chat API 路由
 */

import { Router, Request, Response } from 'express';
import { getChatProvider } from '../providers/chat-index.js';
import { ChatMessageInput } from '../providers/chat-base.js';
import { asyncHandler, validateBody, schemas } from '../middleware/index.js';
import { searchWeb, formatSearchResultsForContext } from '../services/webSearch.js';

export const chatRouter = Router();

// 注意：画布上下文类型通过工具调用（Function Calling）处理
// CanvasItemContext 和 CanvasContext 定义在 chat-base.ts 中

/**
 * 从用户消息中提取搜索关键词
 */
function extractSearchQuery(messages: ChatMessageInput[]): string {
  // 获取最后一条用户消息
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMessage) return '';

  // 处理多模态内容：提取文本部分
  let query: string;
  if (typeof lastUserMessage.content === 'string') {
    query = lastUserMessage.content;
  } else {
    // 多模态消息：提取第一个文本内容
    const textPart = lastUserMessage.content.find(p => p.type === 'text');
    query = textPart && 'text' in textPart ? textPart.text : '';
  }

  // 限制长度
  if (query.length > 100) {
    query = query.substring(0, 100);
  }

  return query.trim();
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(webSearchEnabled: boolean): string {
  let prompt = `<assistant>
  <identity>
    <name>三傻</name>
    <personality>充满创意和灵感的 AI 助手，名字虽"傻"但很聪明，热爱创作</personality>
  </identity>

  <capabilities>
    <skill name="剧本创作">故事大纲、分镜脚本、场景描写、人物塑造</skill>
    <skill name="对白设计">角色台词、情感表达、语言风格</skill>
    <skill name="视觉构思">场景画面、镜头语言、AI绘图提示词</skill>
    <skill name="创意激发">头脑风暴、灵感碰撞、打破创作瓶颈</skill>
  </capabilities>

  <output_format>
    <rule>使用 Markdown 格式输出，结构清晰</rule>
    <elements>
      <element name="标题">用 ## 和 ### 组织层次</element>
      <element name="列表">有序或无序列表列举要点</element>
      <element name="强调">**粗体** 标记关键词</element>
      <element name="术语">\`反引号\` 包裹专业名词</element>
      <element name="对白">> 引用角色台词</element>
      <element name="分隔">--- 分隔不同模块</element>
      <element name="表格">适时用表格整理对比信息</element>
    </elements>
    <structure>
      <step order="1">概述：核心观点一句话说清</step>
      <step order="2">展开：分点详细论述</step>
      <step order="3">建议：可执行的具体方案</step>
      <step order="4">延展：后续可探索的方向（可选）</step>
    </structure>
  </output_format>

  <style>
    <trait>热情有活力，但不失专业</trait>
    <trait>语言简洁，直击要点</trait>
    <trait>善于用比喻和例子解释复杂概念</trait>
    <trait>适度幽默，让创作更有趣</trait>
    <trait>主动提供延展思路和创意建议</trait>
  </style>

  <guidelines>
    <do>主动分模块组织复杂内容</do>
    <do>为视觉场景提供 AI 绘图提示词</do>
    <do>用引用块展示对白和台词</do>
    <do>复杂信息用表格呈现</do>
    <dont>不要过于冗长啰嗦</dont>
    <dont>不要生硬机械，要有温度</dont>
  </guidelines>
</assistant>`;

  if (webSearchEnabled) {
    prompt += `
<web_search enabled="true">
  <instruction>联网搜索已启用，可引用最新信息辅助创作</instruction>
  <requirement>引用时请标注来源</requirement>
</web_search>`;
  }

  return prompt;
}

/**
 * POST /api/chat
 * 聊天对话端点
 */
chatRouter.post(
  '/',
  validateBody(schemas.chatMessage),
  asyncHandler(async (req: Request, res: Response) => {
    const { messages, webSearchEnabled, stream, canvasContext } = req.body;

    const provider = getChatProvider();

    // 构建系统提示词
    let systemPrompt = buildSystemPrompt(webSearchEnabled);

    // 如果有画布上下文，添加提示让模型知道可以使用工具
    if (canvasContext && canvasContext.items.length > 0) {
      systemPrompt += `\n\n<canvas_available>
  <instruction>用户正在使用画布编辑器，画布上有 ${canvasContext.items.length} 个元素。</instruction>
  <tool>如果用户询问关于画布内容的问题，请使用 view_canvas 工具查看画布详情。</tool>
</canvas_available>`;
      console.log(`[Chat] 画布上下文可用: ${canvasContext.items.length} 个元素, ${canvasContext.selectedIds.length} 个选中`);
    }

    // 如果启用了联网搜索，先执行搜索
    if (webSearchEnabled) {
      const searchQuery = extractSearchQuery(messages);
      if (searchQuery) {
        try {
          const searchResults = await searchWeb(searchQuery, 5);
          const searchContext = formatSearchResultsForContext(searchResults);
          if (searchContext) {
            systemPrompt += searchContext;
          }
        } catch (error) {
          console.error('[Chat] 搜索失败:', error);
          // 搜索失败不影响对话继续
        }
      }
    }

    // 添加系统消息
    const fullMessages: ChatMessageInput[] = [{ role: 'system', content: systemPrompt }, ...messages];

    if (stream) {
      // 流式响应
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // 处理客户端断开连接
      let isClientConnected = true;
      res.on('close', () => {
        isClientConnected = false;
      });

      // 心跳定时器
      const heartbeat = setInterval(() => {
        if (isClientConnected) {
          res.write(': heartbeat\n\n');
        }
      }, 15000);

      try {
        for await (const chunk of provider.chatStream({ messages: fullMessages, webSearchEnabled, canvasContext })) {
          if (!isClientConnected) break;
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        if (isClientConnected) {
          res.write('data: [DONE]\n\n');
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
      // 普通响应
      const response = await provider.chat({ messages: fullMessages, webSearchEnabled, canvasContext });

      res.json({
        success: true,
        data: {
          message: response.message,
          usage: response.usage,
        },
      });
    }
  })
);

/**
 * GET /api/chat/health
 * Chat 服务健康检查
 */
chatRouter.get('/health', (_req: Request, res: Response) => {
  const provider = getChatProvider();
  res.json({
    success: true,
    data: {
      provider: provider.name,
      status: 'ok',
    },
  });
});
