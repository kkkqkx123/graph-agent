/**
 * 网络相关错误类型定义
 * 定义网络、HTTP和LLM调用相关的错误类型
 *
 * 注意：这些错误默认为警告级别（warning），因为它们通常表示可重试的临时性错误
 * 如果需要记录警告但不中断执行，请使用 ContextualLogger.networkWarning()
 */

import { SDKError, ErrorSeverity } from './base.js';

/**
 * 网络错误类型
 * 表示通用的网络连接问题（如 DNS 解析失败、连接超时、网络不可达等）
 * 注意：HTTP 协议错误应使用 HttpError 及其子类
 *
 * 默认严重程度：warning（可重试的临时性错误）
 */
export class NetworkError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, severity, context, cause);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'warning';
  }
}

/**
 * HTTP 错误类型
 * 表示 HTTP 协议层面的错误（如 4xx, 5xx 状态码）
 * 具体的 HTTP 状态码错误类型定义在 packages/common-utils/src/http/errors.ts 中
 * 此类作为未定义状态码的回退逻辑
 *
 * 默认严重程度：warning（可重试的临时性错误）
 */
export class HttpError extends SDKError {
  constructor(
    message: string,
    public readonly statusCode: number,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, statusCode }, cause);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'warning';
  }
}

/**
 * LLM 调用错误类型
 *
 * 说明：
 * 1. 继承自 HttpError，因为 LLM API 调用本质是 HTTP 请求
 * 2. BaseLLMClient 在 generate/generateStream 方法中通过 try-catch 捕获所有上游错误
 *    （包括 HTTP 客户端抛出的 HttpError、BadRequestError、TimeoutError 等）
 * 3. handleError() 方法将这些异构错误统一转换为 LLMError，附加 provider 和 model 信息
 * 4. 原始错误保存在 cause 属性中，不丢失错误细节
 * 5. 错误链通过 cause 属性保留，便于追踪根本原因
 *
 * 示例：
 * - HTTP 401 (UnauthorizedError) → LLMError (statusCode: 401)
 * - HTTP 429 (RateLimitError) → LLMError (statusCode: 429)
 * - HTTP 500 (InternalServerError) → LLMError (statusCode: 500)
 * - 请求超时 (TimeoutError) → LLMError (statusCode: undefined)
 * - JSON 解析错误 (Error) → LLMError (statusCode: undefined)
 *
 * 默认严重程度：warning（可重试的临时性错误）
 */
export class LLMError extends HttpError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly model?: string,
    statusCode?: number,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    // 如果没有 statusCode，使用 0 表示非 HTTP 错误
    super(message, statusCode ?? 0, { ...context, provider, model }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'warning';
  }
}

/**
 * 熔断器打开错误类型
 *
 * 默认严重程度：warning（可重试的临时性错误）
 */
export class CircuitBreakerOpenError extends SDKError {
  constructor(
    message: string,
    public readonly state?: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, state });
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'warning';
  }
}