/**
 * 网络相关错误类型定义
 * 定义网络、HTTP和LLM调用相关的错误类型
 *
 * 注意：这些错误默认为警告级别（warning），因为它们通常表示可重试的临时性错误
 * 如果需要记录警告但不中断执行，请使用 ContextualLogger.networkWarning()
 */

import { SDKError, ErrorSeverity } from './base.js';

/**
 * LLM错误类型枚举
 *
 * 用于区分不同类型的LLM错误，便于错误处理和重试决策
 */
export enum LLMErrorType {
  /** 配置错误 - 不应重试 */
  CONFIG_ERROR = 'CONFIG_ERROR',
  /** 网络错误 - 可重试 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** API错误 - 可重试 */
  API_ERROR = 'API_ERROR',
  /** 解析错误 - 不应重试 */
  PARSE_ERROR = 'PARSE_ERROR',
  /** 超时错误 - 可重试 */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  /** 用户取消 - 不应重试 */
  CANCELLED_ERROR = 'CANCELLED_ERROR',
  /** 限流错误 - 可重试（带延迟） */
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  /** 验证错误 - 不应重试 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 未知错误 - 默认可重试 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

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
 * - HTTP 401 (UnauthorizedError) → LLMError (type: API_ERROR, statusCode: 401)
 * - HTTP 429 (RateLimitError) → LLMError (type: RATE_LIMIT_ERROR, statusCode: 429)
 * - HTTP 500 (InternalServerError) → LLMError (type: API_ERROR, statusCode: 500)
 * - 请求超时 (TimeoutError) → LLMError (type: TIMEOUT_ERROR, statusCode: undefined)
 * - JSON 解析错误 (Error) → LLMError (type: PARSE_ERROR, statusCode: undefined)
 * - 用户取消 (AbortError) → LLMError (type: CANCELLED_ERROR, statusCode: undefined)
 *
 * 默认严重程度：warning（可重试的临时性错误）
 */
export class LLMError extends HttpError {
  /**
   * 错误类型
   */
  public readonly type: LLMErrorType;

  constructor(
    message: string,
    public readonly provider: string,
    public readonly model?: string,
    type?: LLMErrorType,
    statusCode?: number,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    // 如果没有 statusCode，使用 0 表示非 HTTP 错误
    super(message, statusCode ?? 0, { ...context, provider, model, type }, cause, severity);
    // 如果没有提供 type，根据 statusCode 推断
    this.type = type ?? LLMError.inferErrorType(statusCode, cause);
  }

  /**
   * 根据 HTTP 状态码和原始错误推断错误类型
   */
  private static inferErrorType(statusCode?: number, cause?: Error): LLMErrorType {
    // 如果有原始错误，检查是否为取消错误
    if (cause) {
      const errorName = cause.name?.toLowerCase() || '';
      const errorMessage = cause.message?.toLowerCase() || '';
      if (
        errorName === 'aborterror' ||
        errorName.includes('abort') ||
        errorMessage.includes('abort') ||
        errorMessage.includes('cancel')
      ) {
        return LLMErrorType.CANCELLED_ERROR;
      }
    }

    // 根据 HTTP 状态码推断
    if (statusCode) {
      if (statusCode === 429) {
        return LLMErrorType.RATE_LIMIT_ERROR;
      }
      if (statusCode === 401 || statusCode === 403) {
        return LLMErrorType.CONFIG_ERROR;
      }
      if (statusCode === 400) {
        return LLMErrorType.VALIDATION_ERROR;
      }
      if (statusCode >= 500) {
        return LLMErrorType.API_ERROR;
      }
      if (statusCode >= 400) {
        return LLMErrorType.API_ERROR;
      }
    }

    // 检查是否为超时错误
    if (cause) {
      const errorName = cause.name?.toLowerCase() || '';
      if (errorName.includes('timeout')) {
        return LLMErrorType.TIMEOUT_ERROR;
      }
    }

    return LLMErrorType.UNKNOWN_ERROR;
  }

  /**
   * 判断错误是否可重试
   *
   * @returns true 表示可以重试，false 表示不应重试
   */
  isRetryable(): boolean {
    switch (this.type) {
      case LLMErrorType.CONFIG_ERROR:
      case LLMErrorType.PARSE_ERROR:
      case LLMErrorType.CANCELLED_ERROR:
      case LLMErrorType.VALIDATION_ERROR:
        return false;
      case LLMErrorType.NETWORK_ERROR:
      case LLMErrorType.API_ERROR:
      case LLMErrorType.TIMEOUT_ERROR:
      case LLMErrorType.RATE_LIMIT_ERROR:
      case LLMErrorType.UNKNOWN_ERROR:
        return true;
      default:
        return true;
    }
  }

  /**
   * 获取重试延迟（毫秒）
   *
   * 对于限流错误，建议使用更长的延迟
   */
  getRetryDelay(): number {
    if (this.type === LLMErrorType.RATE_LIMIT_ERROR) {
      // 限流错误：建议等待更长时间
      return 5000;
    }
    return 1000;
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    // 配置错误和验证错误是严重错误
    if (this.type === LLMErrorType.CONFIG_ERROR || this.type === LLMErrorType.VALIDATION_ERROR) {
      return 'error';
    }
    // 用户取消是信息级别
    if (this.type === LLMErrorType.CANCELLED_ERROR) {
      return 'info';
    }
    // 其他错误默认为警告级别
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