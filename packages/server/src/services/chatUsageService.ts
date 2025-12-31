/**
 * 聊天使用量记录服务
 * 记录 AI 聊天的 token 使用量和费用
 */

import { supabase, isSupabaseAvailable } from '../lib/supabase.js';

// Token 价格配置（每百万 token 的美元价格）
// OpenRouter 价格参考: https://openrouter.ai/models
const TOKEN_PRICES: Record<string, {
  input: number;
  output: number;
  cacheRead?: number;   // 缓存读取价格
  cacheWrite?: number;  // 缓存写入价格
}> = {
  // MiniMax M2.1 - 输入 $0.30/M, 输出 $1.20/M, 缓存读 $0.03/M, 缓存写 $0.375/M
  'minimax/minimax-m2.1': { input: 0.30, output: 1.20, cacheRead: 0.03, cacheWrite: 0.375 },
  // Claude 系列（Anthropic 缓存：读 90% 折扣，写 25% 额外费用）
  'anthropic/claude-3.5-sonnet': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25, cacheRead: 0.025, cacheWrite: 0.3125 },
  // GPT 系列（OpenAI 缓存：读 50% 折扣）
  'openai/gpt-4o': { input: 2.5, output: 10, cacheRead: 1.25 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6, cacheRead: 0.075 },
  // 默认价格
  'default': { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1.25 },
};

// 积分换算：1 分钱 = 1 积分
const CENTS_TO_CREDITS = 1;

export interface ChatUsageRecord {
  userId?: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens?: number;   // 缓存命中的 tokens
  cacheWriteTokens?: number;  // 写入缓存的 tokens
}

/**
 * 计算聊天费用（分）
 * 返回输入费用、输出费用、缓存节省和总费用
 */
export function calculateChatCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cacheReadTokens: number = 0,
  cacheWriteTokens: number = 0
): {
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  cacheSavings: number;
  totalCost: number;
} {
  const prices = TOKEN_PRICES[model] || TOKEN_PRICES['default'];

  // 非缓存的输入 tokens = 总输入 - 缓存读取 - 缓存写入
  const regularInputTokens = Math.max(0, promptTokens - cacheReadTokens - cacheWriteTokens);

  // 计算各项费用（美元）
  const regularInputCostUsd = (regularInputTokens / 1000000) * prices.input;
  const outputCostUsd = (completionTokens / 1000000) * prices.output;
  const cacheReadCostUsd = (cacheReadTokens / 1000000) * (prices.cacheRead || prices.input * 0.1);
  const cacheWriteCostUsd = (cacheWriteTokens / 1000000) * (prices.cacheWrite || prices.input * 1.25);

  // 计算缓存节省（如果全部按标准输入计费的话）
  const fullInputCostUsd = (promptTokens / 1000000) * prices.input;
  const actualInputCostUsd = regularInputCostUsd + cacheReadCostUsd + cacheWriteCostUsd;
  const savingsUsd = fullInputCostUsd - actualInputCostUsd;

  // 转换为人民币分（汇率 7.03）
  const inputCost = Math.ceil(regularInputCostUsd * 703);
  const outputCost = Math.ceil(outputCostUsd * 703);
  const cacheReadCost = Math.ceil(cacheReadCostUsd * 703);
  const cacheWriteCost = Math.ceil(cacheWriteCostUsd * 703);
  const cacheSavings = Math.floor(savingsUsd * 703); // 节省用 floor
  const totalCost = inputCost + outputCost + cacheReadCost + cacheWriteCost;

  return { inputCost, outputCost, cacheReadCost, cacheWriteCost, cacheSavings, totalCost };
}

/**
 * 计算消耗的积分
 */
export function calculateCreditsUsed(costCents: number): number {
  return Math.ceil(costCents * CENTS_TO_CREDITS);
}

/**
 * 记录聊天使用量
 */
export async function recordChatUsage(record: ChatUsageRecord): Promise<void> {
  if (!isSupabaseAvailable()) {
    console.warn('[ChatUsage] Supabase 不可用，跳过记录');
    return;
  }

  const { userId, model, provider, promptTokens, completionTokens, cacheReadTokens = 0, cacheWriteTokens = 0 } = record;
  const totalTokens = promptTokens + completionTokens;
  const { inputCost, outputCost, cacheReadCost, cacheWriteCost, cacheSavings, totalCost } = calculateChatCost(
    model, promptTokens, completionTokens, cacheReadTokens, cacheWriteTokens
  );
  const creditsUsed = calculateCreditsUsed(totalCost);

  try {
    await supabase!.from('chat_consumptions').insert({
      user_id: userId || null,
      model,
      provider,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cache_read_tokens: cacheReadTokens,
      cache_write_tokens: cacheWriteTokens,
      input_cost_cents: inputCost,
      output_cost_cents: outputCost,
      cache_read_cost_cents: cacheReadCost,
      cache_write_cost_cents: cacheWriteCost,
      cache_savings_cents: cacheSavings,
      cost_cents: totalCost,
      credits_used: creditsUsed,
    });

    const cacheInfo = cacheReadTokens > 0 ? `, 缓存命中=${cacheReadTokens}, 节省=${cacheSavings}分` : '';
    console.log(`[ChatUsage] 已记录: ${model}, tokens=${totalTokens}, 总费用=${totalCost}分${cacheInfo}`);
  } catch (error) {
    console.error('[ChatUsage] 记录失败:', error);
  }
}

/**
 * 获取聊天使用统计
 */
export async function getChatUsageStats(period: string = '7d') {
  if (!isSupabaseAvailable()) {
    return { totalChats: 0, totalTokens: 0, totalCost: 0, byModel: [] };
  }

  const days = period === '30d' ? 30 : 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const { data, error } = await supabase!
      .from('chat_consumptions')
      .select('model, prompt_tokens, completion_tokens, total_tokens, cache_read_tokens, cache_write_tokens, input_cost_cents, output_cost_cents, cache_savings_cents, cost_cents, credits_used')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // 统计汇总
    let totalChats = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;
    let totalInputCost = 0;
    let totalOutputCost = 0;
    let totalCacheSavings = 0;
    let totalCost = 0;
    let totalCredits = 0;
    const byModel: Record<string, {
      count: number;
      promptTokens: number;
      completionTokens: number;
      tokens: number;
      cacheReadTokens: number;
      inputCost: number;
      outputCost: number;
      cacheSavings: number;
      cost: number;
    }> = {};

    for (const row of data || []) {
      totalChats++;
      totalPromptTokens += row.prompt_tokens || 0;
      totalCompletionTokens += row.completion_tokens || 0;
      totalTokens += row.total_tokens || 0;
      totalCacheReadTokens += row.cache_read_tokens || 0;
      totalCacheWriteTokens += row.cache_write_tokens || 0;
      totalInputCost += row.input_cost_cents || 0;
      totalOutputCost += row.output_cost_cents || 0;
      totalCacheSavings += row.cache_savings_cents || 0;
      totalCost += row.cost_cents || 0;
      totalCredits += row.credits_used || 0;

      const model = row.model || 'unknown';
      if (!byModel[model]) {
        byModel[model] = { count: 0, promptTokens: 0, completionTokens: 0, tokens: 0, cacheReadTokens: 0, inputCost: 0, outputCost: 0, cacheSavings: 0, cost: 0 };
      }
      byModel[model].count++;
      byModel[model].promptTokens += row.prompt_tokens || 0;
      byModel[model].completionTokens += row.completion_tokens || 0;
      byModel[model].tokens += row.total_tokens || 0;
      byModel[model].cacheReadTokens += row.cache_read_tokens || 0;
      byModel[model].inputCost += row.input_cost_cents || 0;
      byModel[model].outputCost += row.output_cost_cents || 0;
      byModel[model].cacheSavings += row.cache_savings_cents || 0;
      byModel[model].cost += row.cost_cents || 0;
    }

    // 计算缓存命中率
    const cacheHitRate = totalPromptTokens > 0
      ? Math.round((totalCacheReadTokens / totalPromptTokens) * 100)
      : 0;

    return {
      totalChats,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalCacheReadTokens,
      totalCacheWriteTokens,
      cacheHitRate,
      totalInputCost,
      totalOutputCost,
      totalCacheSavings,
      totalCost,
      totalCredits,
      byModel: Object.entries(byModel).map(([model, stats]) => ({
        model,
        ...stats,
      })),
    };
  } catch (error) {
    console.error('[ChatUsage] 获取统计失败:', error);
    return { totalChats: 0, totalTokens: 0, totalCost: 0, totalCredits: 0, byModel: [] };
  }
}
