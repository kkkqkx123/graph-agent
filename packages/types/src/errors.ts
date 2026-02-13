/**
 * Errors类型定义
 * 定义SDK的错误类型体系
 */

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  /**
   * 严重错误 - 导致执行停止
   * 适用于：配置错误、验证错误、不可恢复的逻辑错误
   */
  ERROR = 'error',

  /**
   * 警告错误 - 继续执行
   * 适用于：网络超时、临时故障、可重试的错误
   */
  WARNING = 'warning',

  /**
   * 信息错误 - 继续执行
   * 适用于：调试信息、非关键警告、监控事件
   */
  INFO = 'info'
}

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
 * 提供默认的严重程度，子类可以覆盖
 */
export class SDKError extends Error {
  /**
   * 获取默认的严重程度
   * 子类可以覆盖此方法以提供不同的默认值
   */
  protected getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }

  constructor(
    message: string,
    severity?: ErrorSeverity,
    public readonly context?: Record<string, any>,
    public override readonly cause?: Error
  ) {
    super(message);
    // 使用传入的 severity，如果没有则使用默认值
    this.severity = severity ?? this.getDefaultSeverity();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 错误严重程度
   */
  public readonly severity: ErrorSeverity;

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, any> {
    return {
      name: this.constructor.name,
      message: this.message,
      severity: this.severity,
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
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, field, value });
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
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
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, nodeId, workflowId }, cause);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}

/**
 * 配置错误类型
 */
export class ConfigurationError extends SDKError {
  constructor(
    message: string,
    public readonly configKey?: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, configKey });
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}

/**
 * 超时错误类型
 */
export class TimeoutError extends SDKError {
  constructor(
    message: string,
    public readonly timeout: number,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, timeout });
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
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
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, resourceType, resourceId });
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}

/**
 * 网络错误类型
 * 表示通用的网络连接问题（如 DNS 解析失败、连接超时、网络不可达等）
 * 注意：HTTP 协议错误应使用 HttpError 及其子类
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
    return ErrorSeverity.WARNING;
  }
}

/**
 * HTTP 错误类型
 * 表示 HTTP 协议层面的错误（如 4xx, 5xx 状态码）
 * 具体的 HTTP 状态码错误类型定义在 packages/common-utils/src/http/errors.ts 中
 * 此类作为未定义状态码的回退逻辑
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
    return ErrorSeverity.WARNING;
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
    return ErrorSeverity.WARNING;
  }
}

/**
 * 熔断器打开错误类型
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
    return ErrorSeverity.WARNING;
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
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, toolName, toolType }, cause);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
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
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, scriptName, scriptType }, cause);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}