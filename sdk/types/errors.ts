/**
 * Errors类型定义
 * 定义SDK的错误类型体系
 */

/**
 * 错误码枚举
 */
export enum ErrorCode {
  /** 验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 执行错误 */
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  /** 配置错误 */
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  /** 超时错误 */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  /** 资源未找到错误 */
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** LLM调用错误 */
  LLM_ERROR = 'LLM_ERROR',
  /** 工具调用错误 */
  TOOL_ERROR = 'TOOL_ERROR',
  /** 限流错误 */
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  /** 熔断器打开错误 */
  CIRCUIT_BREAKER_OPEN_ERROR = 'CIRCUIT_BREAKER_OPEN_ERROR'
}

/**
 * SDK基础错误类
 */
export class SDKError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, any>,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'SDKError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined,
      stack: this.stack
    };
  }
}

/**
 * 验证错误类型
 */
export class ValidationError extends SDKError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    context?: Record<string, any>
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, context);
    this.name = 'ValidationError';
  }
}

/**
 * 验证结果类型
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误数组 */
  errors: ValidationError[];
  /** 警告数组 */
  warnings: ValidationError[];
}

/**
 * 执行错误类型
 */
export class ExecutionError extends SDKError {
  constructor(
    message: string,
    public readonly nodeId?: string,
    public readonly workflowId?: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'ExecutionError';
  }
}

/**
 * 配置错误类型
 */
export class ConfigurationError extends SDKError {
  constructor(
    message: string,
    public readonly configKey?: string,
    context?: Record<string, any>
  ) {
    super(ErrorCode.CONFIGURATION_ERROR, message, context);
    this.name = 'ConfigurationError';
  }
}

/**
 * 超时错误类型
 */
export class TimeoutError extends SDKError {
  constructor(
    message: string,
    public readonly timeout: number,
    context?: Record<string, any>
  ) {
    super(ErrorCode.TIMEOUT_ERROR, message, context);
    this.name = 'TimeoutError';
  }
}

/**
 * 资源未找到错误类型
 */
export class NotFoundError extends SDKError {
  constructor(
    message: string,
    public readonly resourceType: string,
    public readonly resourceId: string,
    context?: Record<string, any>
  ) {
    super(ErrorCode.NOT_FOUND_ERROR, message, context);
    this.name = 'NotFoundError';
  }
}

/**
 * 网络错误类型
 */
export class NetworkError extends SDKError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.NETWORK_ERROR, message, context, cause);
    this.name = 'NetworkError';
  }
}

/**
 * LLM调用错误类型
 */
export class LLMError extends NetworkError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly model?: string,
    statusCode?: number,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, statusCode, context, cause);
    this.name = 'LLMError';
  }
}

/**
 * 限流错误类型
 */
export class RateLimitError extends SDKError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(ErrorCode.RATE_LIMIT_ERROR, message, context);
    this.name = 'RateLimitError';
  }
}

/**
 * 熔断器打开错误类型
 */
export class CircuitBreakerOpenError extends SDKError {
  constructor(
    message: string,
    public readonly state?: string,
    context?: Record<string, any>
  ) {
    super(ErrorCode.CIRCUIT_BREAKER_OPEN_ERROR, message, context);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * 工具调用错误类型
 */
export class ToolError extends SDKError {
  constructor(
    message: string,
    public readonly toolName?: string,
    public readonly toolType?: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.TOOL_ERROR, message, context, cause);
    this.name = 'ToolError';
  }
}