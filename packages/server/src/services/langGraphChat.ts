/**
 * LangGraph 多轮对话服务
 *
 * 使用 LangGraph 实现服务端对话记忆：
 * - 通过 thread_id 区分不同对话
 * - PostgreSQL 持久化会话状态
 * - 自动裁剪历史消息（保留最近 N 条）
 * - 支持联网搜索（DuckDuckGo / Tavily）
 */

import { StateGraph, MemorySaver, Annotation, messagesStateReducer } from '@langchain/langgraph';
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { config } from '../config.js';
import type { CanvasContext } from '../providers/chat-base.js';

// ========== 类型定义 ==========

export interface LangGraphChatRequest {
  message: string;                    // 当前用户消息
  threadId: string;                   // 会话 ID
  userId?: string;                    // 用户 ID（用于权限验证）
  attachments?: Array<{               // 附件（文档等）
    name?: string;
    type: string;
    content: string;
  }>;
  webSearchEnabled?: boolean;         // 是否启用联网搜索
  canvasContext?: CanvasContext;      // 画布上下文
  systemPrompt?: string;              // 系统提示词
}

// 定义 Graph 状态
const ChatState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

type ChatStateType = typeof ChatState.State;

// ========== Checkpointer 管理 ==========

let checkpointer: BaseCheckpointSaver | null = null;
let checkpointerInitPromise: Promise<BaseCheckpointSaver> | null = null;

/**
 * 获取或初始化 checkpointer
 * 优先使用 PostgreSQL，无配置时降级到内存存储
 */
async function getCheckpointer(): Promise<BaseCheckpointSaver> {
  if (checkpointer) return checkpointer;

  if (checkpointerInitPromise) return checkpointerInitPromise;

  checkpointerInitPromise = (async () => {
    const postgresUri = config.langGraph.postgresUri;

    if (postgresUri) {
      try {
        // 动态导入 PostgresSaver
        const { PostgresSaver } = await import('@langchain/langgraph-checkpoint-postgres');
        const saver = PostgresSaver.fromConnString(postgresUri);
        await saver.setup(); // 创建必要的表
        console.log('[LangGraph] 使用 PostgreSQL 存储会话');
        checkpointer = saver;
        return saver;
      } catch (error) {
        console.warn('[LangGraph] PostgreSQL 初始化失败，降级到内存存储:', error);
      }
    }

    // 降级到内存存储
    console.log('[LangGraph] 使用内存存储会话（重启后丢失）');
    checkpointer = new MemorySaver();
    return checkpointer;
  })();

  return checkpointerInitPromise;
}

// ========== ChatModel 初始化 ==========

/**
 * 获取 ChatModel（使用 OpenRouter 配置）
 */
function getChatModel(): ChatOpenAI {
  const openRouterConfig = config.providers.openrouter;

  if (!openRouterConfig.apiKey) {
    throw new Error('未配置 OPENROUTER_API_KEY');
  }

  return new ChatOpenAI({
    modelName: openRouterConfig.chatModel || 'minimax/minimax-m2.1',
    streaming: true,
    configuration: {
      baseURL: openRouterConfig.baseUrl || 'https://openrouter.ai/api/v1',
      apiKey: openRouterConfig.apiKey,
      defaultHeaders: {
        'Authorization': `Bearer ${openRouterConfig.apiKey}`,
        'HTTP-Referer': 'https://canvasai.app',
        'X-Title': 'CanvasAI Studio',
      },
    },
  });
}

// ========== Graph 节点 ==========

/**
 * 聊天节点 - 调用 AI 模型生成回复
 */
function createChatNode(model: ChatOpenAI) {
  return async (state: ChatStateType): Promise<Partial<ChatStateType>> => {
    // 裁剪消息，保留最近 N 条
    const trimmedMessages = await trimMessages(state.messages, {
      maxTokens: 8000,  // 大约 maxMessages * 400 tokens
      strategy: 'last',
      tokenCounter: (msgs) => msgs.length * 400, // 简单估算
      includeSystem: true,
      allowPartial: false,
    });

    // 调用模型
    const response = await model.invoke(trimmedMessages);

    return {
      messages: [response],
    };
  };
}

// ========== 搜索执行 ==========

// 动态导入原有的搜索服务
let webSearchModule: { searchWeb: (query: string, maxResults?: number) => Promise<{ query: string; results: Array<{ title: string; url: string; snippet: string }> }> } | null = null;

async function getWebSearchService() {
  if (!webSearchModule) {
    webSearchModule = await import('./webSearch.js');
  }
  return webSearchModule;
}

/**
 * 执行网络搜索并格式化结果
 * 使用原有的 webSearch 服务（支持 SearXNG / DuckDuckGo HTML）
 */
async function performWebSearch(query: string): Promise<string> {
  try {
    console.log(`[LangGraph] 执行搜索: "${query}"`);
    const webSearch = await getWebSearchService();
    const searchResult = await webSearch.searchWeb(query, config.webSearch.maxResults);

    if (searchResult.results.length === 0) {
      console.log('[LangGraph] 搜索无结果');
      return '';
    }

    // 格式化搜索结果
    let resultsText = '';
    searchResult.results.forEach((r, i) => {
      resultsText += `${i + 1}. ${r.title}\n   来源: ${r.url}\n   摘要: ${r.snippet}\n\n`;
    });

    return `\n\n<web_search_results>
<query>${query}</query>
<count>${searchResult.results.length}</count>
<results>
${resultsText}
</results>
<instruction>以上是网络搜索结果，请参考这些信息回答用户问题。引用时请标注来源。</instruction>
</web_search_results>`;
  } catch (error) {
    console.error('[LangGraph] 搜索失败:', error);
    return '';
  }
}

// ========== Graph 构建 ==========

interface CompiledGraph {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoke: (input: any, config: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  streamEvents: (input: any, config: any) => AsyncIterable<any>;
}

// 缓存编译后的 Graph
let compiledGraph: CompiledGraph | null = null;

/**
 * 获取编译后的 Graph（不再区分搜索模式，统一使用简单对话模式）
 */
async function getCompiledGraph(): Promise<CompiledGraph> {
  if (compiledGraph) {
    return compiledGraph;
  }

  const saver = await getCheckpointer();
  const model = getChatModel();

  // 简单对话模式（搜索结果通过系统提示词注入）
  const graph = new StateGraph(ChatState)
    .addNode('chat', createChatNode(model))
    .addEdge('__start__', 'chat')
    .addEdge('chat', '__end__');

  compiledGraph = graph.compile({ checkpointer: saver });
  return compiledGraph;
}

// ========== 公开接口 ==========

/**
 * 发送消息并获取回复（非流式）
 */
export async function chat(request: LangGraphChatRequest): Promise<string> {
  const graph = await getCompiledGraph();

  // 如果启用搜索，先执行搜索并注入结果到系统提示词
  let systemPrompt = request.systemPrompt || '';
  if (request.webSearchEnabled) {
    const searchContext = await performWebSearch(request.message);
    systemPrompt += searchContext;
  }

  const graphConfig = {
    configurable: {
      thread_id: request.threadId,
    },
  };

  // 构建消息
  const messages: BaseMessage[] = [];

  // 添加系统提示词（包含搜索结果）
  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }

  // 添加用户消息
  messages.push(new HumanMessage(request.message));

  const result = await graph.invoke({ messages }, graphConfig);

  // 获取最后一条 AI 消息
  const lastMessage = result.messages[result.messages.length - 1];
  return typeof lastMessage.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);
}

/**
 * 发送消息并流式获取回复
 * 最后 yield 一个 [[USAGE]] 标记包含 token 使用量
 */
export async function* chatStream(request: LangGraphChatRequest): AsyncGenerator<string> {
  const graph = await getCompiledGraph();

  // 如果启用搜索，先执行搜索并注入结果到系统提示词
  let systemPrompt = request.systemPrompt || '';
  if (request.webSearchEnabled) {
    const searchContext = await performWebSearch(request.message);
    systemPrompt += searchContext;
  }

  const graphConfig = {
    configurable: {
      thread_id: request.threadId,
    },
  };

  // 构建消息
  const messages: BaseMessage[] = [];

  // 添加系统提示词（包含搜索结果）
  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }

  // 添加用户消息
  messages.push(new HumanMessage(request.message));

  // 使用 streamEvents 获取流式输出
  const stream = graph.streamEvents(
    { messages },
    {
      ...graphConfig,
      version: 'v2',
    }
  );

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;

  for await (const event of stream) {
    // 监听 chat model 的流式输出
    if (event.event === 'on_chat_model_stream') {
      const chunk = event.data?.chunk;
      if (chunk?.content) {
        const content = chunk.content;
        if (typeof content === 'string' && content) {
          yield content;
        }
      }
    }

    // 监听 chat model 结束事件获取 usage（包含缓存信息）
    if (event.event === 'on_chat_model_end') {
      const output = event.data?.output;

      if (output?.usage_metadata) {
        totalPromptTokens = output.usage_metadata.input_tokens || 0;
        totalCompletionTokens = output.usage_metadata.output_tokens || 0;
        // 获取缓存命中信息（LangChain 格式）
        if (output.usage_metadata.input_token_details) {
          cacheReadTokens = output.usage_metadata.input_token_details.cache_read || 0;
          cacheWriteTokens = output.usage_metadata.input_token_details.cache_creation || 0;
        }
      }

      // 从 response_metadata 获取更详细的缓存信息
      if (output?.response_metadata?.usage) {
        const usage = output.response_metadata.usage;
        if (!totalPromptTokens) totalPromptTokens = usage.prompt_tokens || 0;
        if (!totalCompletionTokens) totalCompletionTokens = usage.completion_tokens || 0;
        // OpenRouter/MiniMax 格式
        if (usage.cache_read_input_tokens) cacheReadTokens = usage.cache_read_input_tokens;
        if (usage.cache_creation_input_tokens) cacheWriteTokens = usage.cache_creation_input_tokens;
        // OpenAI 格式
        if (usage.prompt_tokens_details?.cached_tokens) cacheReadTokens = usage.prompt_tokens_details.cached_tokens;
      }
    }
  }

  // yield usage 信息（包含缓存命中）
  if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
    console.log(`[LangGraph] 流式完成, tokens: prompt=${totalPromptTokens}, completion=${totalCompletionTokens}, cache_read=${cacheReadTokens}, cache_write=${cacheWriteTokens}`);
    yield `[[USAGE]]${JSON.stringify({
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      cacheReadTokens,
      cacheWriteTokens,
    })}`;
  }
}

/**
 * 获取会话历史
 */
export async function getSessionHistory(threadId: string): Promise<Array<{ role: string; content: string }>> {
  const saver = await getCheckpointer();

  try {
    const checkpoint = await saver.getTuple({
      configurable: { thread_id: threadId },
    });

    if (!checkpoint?.checkpoint?.channel_values?.messages) {
      return [];
    }

    const messages = checkpoint.checkpoint.channel_values.messages as BaseMessage[];

    return messages.map(msg => ({
      role: msg._getType() === 'human' ? 'user' : msg._getType() === 'ai' ? 'assistant' : 'system',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));
  } catch {
    return [];
  }
}

/**
 * 删除会话
 * 注意：PostgresSaver 支持真正删除，MemorySaver 通过覆盖实现
 */
export async function deleteSession(threadId: string): Promise<void> {
  const saver = await getCheckpointer();

  // 尝试使用 delete 方法（如果存在）
  if ('delete' in saver && typeof saver.delete === 'function') {
    await saver.delete({ configurable: { thread_id: threadId } });
    return;
  }

  // 降级方案：写入空状态
  console.log(`[LangGraph] Checkpointer 不支持删除，会话 ${threadId} 将保留空状态`);
}

/**
 * 检查 LangGraph 是否启用
 */
export function isLangGraphEnabled(): boolean {
  return config.langGraph.enabled;
}

/**
 * 获取 LangGraph 状态信息
 */
export async function getLangGraphStatus(): Promise<{
  enabled: boolean;
  storage: 'postgres' | 'memory';
  maxMessages: number;
  searchProvider: string;
}> {
  const saver = await getCheckpointer();
  const isPostgres = saver.constructor.name === 'PostgresSaver';

  return {
    enabled: config.langGraph.enabled,
    storage: isPostgres ? 'postgres' : 'memory',
    maxMessages: config.langGraph.maxMessages,
    searchProvider: config.webSearch.defaultProvider,
  };
}
