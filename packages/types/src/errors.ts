/**
 * Errors类型定义
 * 定义SDK的错误类型体系
 */

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 节点ID */
  nodeId?: string;
  /** 操作名称 */
  operation?: string;
  /** 工具名称 */
  toolName?: string;
  /** 工具类型 */
  toolType?: string;
  /** 字段名称 */
  field?: string;
  /** 字段值 */
  value?: any;
  /** 资源类型 */
  resourceType?: string;
  /** 资源ID */
  resourceId?: string;
  /** 严重程度 */
  severity?: 'error' | 'warning' | 'info';
  /** 额外上下文信息 */
  [key: string]: any;
}

/**
 * 错误处理结果
 */
export interface ErrorHandlingResult {
  /** 是否应该停止执行 */
  shouldStop: boolean;
  /** 标准化的错误对象 */
  error: SDKError;
}

/**
 * SDK基础错误类
 */
export class SDKError extends Error {
  constructor(
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
    super(message, context);
    this.name = 'ValidationError';
  }
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
    super(message, context, cause);
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
    super(message, context);
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
    super(message, context);
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
    super(message, context);
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
    super(message, context, cause);
    this.name = 'NetworkError';
  }
}

/**
 * LLM调用错误类型
 *
 * 说明：
 * 1. 继承自 NetworkError，表示 LLM API 调用相关的网络错误
 * 2. BaseLLMClient 在 generate/generateStream 方法中通过 try-catch 捕获所有上游错误
 *    （包括 HTTP 客户端抛出的 HttpError、BadRequestError、TimeoutError 等）
 * 3. handleError() 方法将这些异构错误统一转换为 LLMError，附加 provider 和 model 信息
 * 4. 原始错误保存在 context.originalError 中，不丢失错误细节
 * 5. 错误链通过 cause 属性保留，便于追踪根本原因
 *
 * 示例：
 * - HTTP 401 (BadRequestError) → LLMError (statusCode: 401)
 * - 请求超时 (TimeoutError) → LLMError (statusCode: undefined)
 * - JSON 解析错误 (Error) → LLMError (statusCode: undefined)
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
 * 熔断器打开错误类型
 */
export class CircuitBreakerOpenError extends SDKError {
  constructor(
    message: string,
    public readonly state?: string,
    context?: Record<string, any>
  ) {
    super(message, context);
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
    super(message, context, cause);
    this.name = 'ToolError';
  }
}

/**
 * HTTP错误类型
 * 用于精确区分HTTP状态码
 * 注意：具体的HTTP状态码错误类型定义在 sdk/core/http/errors.ts 中
 * 此类作为未定义状态码的回退逻辑
 */
export class HttpError extends NetworkError {
  constructor(
    message: string,
    public override readonly statusCode?: number,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, statusCode, context, cause);
    this.name = 'HttpError';
  }
}

/**
 * 脚本执行错误类型
 */
export class CodeExecutionError extends SDKError {
  constructor(
    message: string,
    public readonly scriptName?: string,
    public readonly scriptType?: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, context, cause);
    this.name = 'CodeExecutionError';
  }
}