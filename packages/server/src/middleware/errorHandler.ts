import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

/**
 * 敏感信息模式 - 用于过滤日志和错误信息
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /api[_-]?secret/i,
  /password/i,
  /token/i,
  /bearer\s+\S+/i,
  /sk-[a-zA-Z0-9]+/i,           // OpenAI 密钥格式
  /authorization:\s*\S+/i,
  /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,  // UUID 格式密钥（如豆包）
  /AKLT[a-zA-Z0-9]{40,}/i,      // 火山引擎 TOS Access Key
  /[A-Za-z0-9+/]{40,}={0,2}/,   // Base64 编码的密钥（长度>=40）
  /secret[_-]?key/i,
  /access[_-]?key/i,
];

/**
 * 过滤错误信息中的敏感内容
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export class HttpError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  static badRequest(message: string, code?: string) {
    return new HttpError(message, 400, code);
  }

  static unauthorized(message: string = '未授权', code?: string) {
    return new HttpError(message, 401, code);
  }

  static forbidden(message: string = '禁止访问', code?: string) {
    return new HttpError(message, 403, code);
  }

  static notFound(message: string = '资源未找到', code?: string) {
    return new HttpError(message, 404, code);
  }

  static tooManyRequests(message: string = '请求过于频繁', code?: string) {
    return new HttpError(message, 429, code);
  }

  static internal(message: string = '服务器内部错误', code?: string) {
    return new HttpError(message, 500, code);
  }
}

/**
 * 生成简单的请求 ID（用于日志追踪）
 */
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Global error handler middleware
 * 安全增强：
 * - 生产环境隐藏堆栈信息
 * - 过滤敏感信息
 * - 添加请求 ID 用于追踪
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';
  const requestId = generateRequestId();

  // 过滤敏感信息
  const safeMessage = sanitizeErrorMessage(err.message);

  // 安全日志记录（不记录敏感请求头）
  console.error(`[${new Date().toISOString()}] [${requestId}] Error:`, {
    message: safeMessage,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    ...(isDev && { stack: err.stack }),
  });

  // 确定返回给客户端的错误信息
  let clientError: string;
  if (isDev) {
    // 开发环境：显示过滤后的详细错误
    clientError = safeMessage;
  } else if (err.isOperational) {
    // 生产环境 + 操作性错误：显示过滤后的错误信息
    clientError = safeMessage;
  } else {
    // 生产环境 + 程序错误：显示通用错误信息
    clientError = '服务器内部错误';
  }

  // 发送响应
  res.status(statusCode).json({
    success: false,
    error: clientError,
    requestId, // 用于用户反馈问题时追踪
    ...(err.code && { code: err.code }),
    // 生产环境永远不返回堆栈信息
    ...(isDev && { stack: err.stack }),
  });
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `路由 ${req.method} ${req.path} 不存在`,
  });
};
