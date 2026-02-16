/**
 * 基础错误类型定义
 * 定义错误体系的基础类型和基类
 */

/**
 * 错误严重程度
 */
export type ErrorSeverity =
  /**
   * 严重错误 - 导致执行停止
   * 适用于：配置错误、验证错误、不可恢复的逻辑错误
   */
  'error' |
  /**
   * 警告错误 - 继续执行
   * 适用于：网络超时、临时故障、可重试的错误
   */
  'warning' |
  /**
   * 信息错误 - 继续执行
   * 适用于：调试信息、非关键警告、监控事件
   */
  'info';

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
  /** 工具ID */
  toolId?: string;
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
    return 'error';
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
    return 'error';
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
    return 'error';
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
    return 'warning';
  }
}