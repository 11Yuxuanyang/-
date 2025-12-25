/**
 * Chat Provider 注册和管理
 */

import { config } from '../config.js';
import { ChatProvider } from './chat-base.js';
import { MockChatProvider } from './chat-mock.js';
import { CustomChatProvider } from './chat-custom.js';
import { DoubaoChatProvider } from './chat-doubao.js';
import { OpenRouterChatProvider } from './chat-openrouter.js';

type ChatProviderFactory = () => ChatProvider;

const chatProviders: Record<string, ChatProviderFactory> = {
  mock: () => new MockChatProvider(),
  custom: () => new CustomChatProvider(),
  doubao: () => new DoubaoChatProvider(),
  openrouter: () => new OpenRouterChatProvider(),
};

let chatProviderInstance: ChatProvider | null = null;

/**
 * 检查 API key 是否有效（不是占位符）
 */
function isValidApiKey(apiKey: string): boolean {
  if (!apiKey) return false;
  const placeholders = ['your_api_key_here', 'your_api_key', 'sk-xxx', ''];
  return !placeholders.includes(apiKey.toLowerCase());
}

/**
 * 获取 Chat Provider 实例
 * 优先使用 defaultChatProvider 配置，如果没有有效配置则降级到 mock
 */
export function getChatProvider(): ChatProvider {
  if (!chatProviderInstance) {
    const defaultProvider = config.defaultChatProvider;

    // 检查是否有对应的提供商配置
    let providerName = 'mock';

    if (defaultProvider === 'doubao') {
      // 豆包：检查聊天专用 key 或通用 key
      const doubaoConfig = config.providers.doubao;
      const hasDoubaoConfig = isValidApiKey(doubaoConfig.chatApiKey || doubaoConfig.apiKey);
      if (hasDoubaoConfig) {
        providerName = 'doubao';
      }
    } else if (defaultProvider === 'openrouter') {
      // OpenRouter：检查 API key
      const openrouterConfig = config.providers.openrouter;
      if (isValidApiKey(openrouterConfig.apiKey)) {
        providerName = 'openrouter';
      }
    } else if (defaultProvider === 'custom' || defaultProvider === 'openai') {
      // 自定义/OpenAI：检查旧配置
      const hasValidConfig = isValidApiKey(config.ai.apiKey) &&
                            config.ai.apiBaseUrl &&
                            !config.ai.apiBaseUrl.includes('example.com');
      if (hasValidConfig) {
        providerName = 'custom';
      }
    }

    const factory = chatProviders[providerName] || chatProviders['mock'];
    chatProviderInstance = factory();
    console.log(`[Chat] 已加载提供商: ${chatProviderInstance.name}`);
  }
  return chatProviderInstance;
}

/**
 * 注册新的 Chat Provider
 */
export function registerChatProvider(name: string, factory: ChatProviderFactory): void {
  chatProviders[name] = factory;
}

/**
 * 重置 Provider 实例（用于测试）
 */
export function resetChatProvider(): void {
  chatProviderInstance = null;
}
