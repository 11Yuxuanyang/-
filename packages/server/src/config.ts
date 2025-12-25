import 'dotenv/config';

/**
 * 单个 AI 提供商配置接口
 */
export interface ProviderConfig {
  apiKey: string;
  chatApiKey?: string;  // 聊天专用 API Key（可选，不设置则使用 apiKey）
  baseUrl: string;
  imageModel: string;
  chatModel: string;
}

/**
 * 应用配置
 */
export const config = {
  // 服务器配置
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',

  // ========== 多 AI 提供商配置 ==========
  providers: {
    // OpenAI 配置
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      imageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
    } as ProviderConfig,

    // 豆包 (火山引擎) 配置
    doubao: {
      apiKey: process.env.DOUBAO_API_KEY || '',
      chatApiKey: process.env.DOUBAO_CHAT_API_KEY || '',  // 聊天专用 API Key
      baseUrl: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      imageModel: process.env.DOUBAO_IMAGE_MODEL || '',
      chatModel: process.env.DOUBAO_CHAT_MODEL || '',
    } as ProviderConfig,

    // 通义千问 (阿里云百炼) 配置
    qwen: {
      apiKey: process.env.QWEN_API_KEY || '',
      baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
      imageModel: process.env.QWEN_IMAGE_MODEL || '',
      chatModel: process.env.QWEN_CHAT_MODEL || '',
    } as ProviderConfig,

    // OpenRouter 配置 (支持多种模型)
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      imageModel: process.env.OPENROUTER_IMAGE_MODEL || '',
      chatModel: process.env.OPENROUTER_CHAT_MODEL || 'minimax/minimax-m2.1',
    } as ProviderConfig,

    // 自定义提供商（向后兼容）
    custom: {
      apiKey: process.env.AI_API_KEY || '',
      baseUrl: process.env.AI_API_BASE_URL || '',
      imageModel: process.env.AI_DEFAULT_MODEL || 'default',
      chatModel: process.env.AI_DEFAULT_MODEL || 'default',
    } as ProviderConfig,
  },

  // 默认提供商
  defaultImageProvider: process.env.DEFAULT_IMAGE_PROVIDER || 'openai',
  defaultChatProvider: process.env.DEFAULT_CHAT_PROVIDER || 'openai',

  // ========== 旧配置（向后兼容）==========
  ai: {
    provider: process.env.AI_PROVIDER || 'custom',
    apiKey: process.env.AI_API_KEY || '',
    apiBaseUrl: process.env.AI_API_BASE_URL || '',
    defaultModel: process.env.AI_DEFAULT_MODEL || 'default',
  },

  // 微信登录配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    // 微信回调地址（需要和开放平台配置一致）
    redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:3001/api/auth/wechat/callback',
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    expiresIn: '7d',
  },
};

/**
 * 获取指定提供商的配置
 */
export function getProviderConfig(name: string): ProviderConfig | undefined {
  return config.providers[name as keyof typeof config.providers];
}

/**
 * 配置验证函数
 */
function validateConfig() {
  const errors: string[] = [];

  // 验证端口
  if (config.port < 1 || config.port > 65535) {
    errors.push(`无效的端口号: ${config.port} (必须在 1-65535 之间)`);
  }

  if (config.port < 1024 && process.platform !== 'win32') {
    console.warn(`⚠️  警告: 端口 ${config.port} < 1024 可能需要管理员权限`);
  }

  // 验证 AI 提供商配置
  const imageProvider = config.defaultImageProvider;
  const chatProvider = config.defaultChatProvider;

  const imageConfig = config.providers[imageProvider as keyof typeof config.providers];
  const chatConfig = config.providers[chatProvider as keyof typeof config.providers];

  if (!imageConfig || !imageConfig.apiKey) {
    console.warn(`⚠️  警告: 默认图片提供商 "${imageProvider}" 未配置 API 密钥`);
  }

  if (!chatConfig || !chatConfig.apiKey) {
    console.warn(`⚠️  警告: 默认对话提供商 "${chatProvider}" 未配置 API 密钥`);
  }

  // 生产环境安全检查
  if (config.nodeEnv === 'production') {
    // JWT 密钥必须修改
    if (config.jwt.secret.includes('change-in-production') || config.jwt.secret.length < 32) {
      errors.push('生产环境必须设置强 JWT_SECRET（至少 32 字符）');
    }

    // CORS 不应该是 localhost
    if (config.corsOrigin.includes('localhost')) {
      console.warn('⚠️  警告: 生产环境 CORS_ORIGIN 不应该包含 localhost');
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ 配置错误:');
    errors.forEach(err => console.error(`   - ${err}`));
    console.error('\n💡 请检查 packages/server/.env 文件\n');
    process.exit(1);
  }
}

// 启动时验证配置
validateConfig();
