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
 * 线程中断异常类型
 *
 * 说明：
 * 1. 用于表示线程执行被用户请求中断（暂停或停止）
 * 2. 这是一个控制流异常，不是真正的错误
 * 3. 执行器捕获此异常后，会根据中断类型进行相应处理
 * 4. 中断类型：PAUSE（暂停，可恢复）或 STOP（停止，不可恢复）
 *
 * 使用场景：
 * - 用户调用 pauseThread() 时，执行器在安全点抛出此异常
 * - 用户调用 stopThread() 时，执行器在安全点抛出此异常
 * - NodeExecutionCoordinator 和 LLMExecutionCoordinator 检测到中断标志时抛出
 * - LLMExecutor 和 ToolCallExecutor 捕获 AbortError 后转换为 ThreadInterruptedException
 */
export class ThreadInterruptedException extends SDKError {
  constructor(
    message: string,
    public readonly interruptionType: 'PAUSE' | 'STOP',
    public readonly threadId?: string,
    public readonly nodeId?: string,
    context?: Record<string, any>
  ) {
    super(message, ErrorSeverity.INFO, { ...context, interruptionType, threadId, nodeId });
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.INFO;
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

// ============================================================================
// 细分的验证错误类型
// ============================================================================

/**
 * 配置验证错误选项
 */
export interface ConfigurationValidationErrorOptions {
  /** 配置路径 */
  configPath?: string;
  /** 配置类型 */
  configType?: 'workflow' | 'node' | 'trigger' | 'edge' | 'variable' | 'tool' | 'script' | 'schema' | 'llm';
  /** 字段名称 */
  field?: string;
  /** 字段值 */
  value?: any;
  /** 额外上下文 */
  context?: Record<string, any>;
  /** 错误严重程度 */
  severity?: ErrorSeverity;
}

/**
 * 配置验证错误类型
 *
 * 专门用于工作流、节点、触发器等静态配置的验证错误
 * 继承自 ValidationError
 */
export class ConfigurationValidationError extends ValidationError {
  constructor(
    message: string,
    options?: ConfigurationValidationErrorOptions
  ) {
    const { configPath, configType, field, value, context, severity } = options || {};
    super(message, field, value, { ...context, configPath, configType }, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}

/**
 * 运行时验证错误选项
 */
export interface RuntimeValidationErrorOptions {
  /** 操作名称 */
  operation?: string;
  /** 字段名称 */
  field?: string;
  /** 字段值 */
  value?: any;
  /** 额外上下文 */
  context?: Record<string, any>;
  /** 错误严重程度 */
  severity?: ErrorSeverity;
}

/**
 * 运行时验证错误类型
 *
 * 专门用于运行时参数和状态的验证错误
 * 继承自 ValidationError
 */
export class RuntimeValidationError extends ValidationError {
  constructor(
    message: string,
    options?: RuntimeValidationErrorOptions
  ) {
    const { operation, field, value, context, severity } = options || {};
    super(message, field, value, { ...context, operation }, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}

/**
 * Schema验证错误选项
 */
export interface SchemaValidationErrorOptions {
  /** Schema路径 */
  schemaPath?: string;
  /** 验证错误列表 */
  validationErrors?: Array<{ path: string; message: string }>;
  /** 字段名称 */
  field?: string;
  /** 字段值 */
  value?: any;
  /** 额外上下文 */
  context?: Record<string, any>;
  /** 错误严重程度 */
  severity?: ErrorSeverity;
}

/**
 * Schema验证错误类型
 *
 * 专门用于JSON Schema验证失败
 * 继承自 ValidationError
 */
export class SchemaValidationError extends ValidationError {
  constructor(
    message: string,
    options?: SchemaValidationErrorOptions
  ) {
    const { schemaPath, validationErrors, field, value, context, severity } = options || {};
    super(message, field, value, { ...context, schemaPath, validationErrors }, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}

// ============================================================================
// 细分的执行错误类型
// ============================================================================

/**
 * 业务逻辑错误类型
 *
 * 专门用于业务逻辑相关的执行错误（如路由不匹配、条件不满足等）
 * 继承自 ExecutionError，保持向后兼容性
 */
export class BusinessLogicError extends ExecutionError {
  constructor(
    message: string,
    public readonly businessContext?: string,
    public readonly ruleName?: string,
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, businessContext, ruleName }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}

/**
 * 系统执行错误类型
 *
 * 专门用于系统级别的执行错误（如状态管理失败、上下文丢失等）
 * 继承自 ExecutionError，保持向后兼容性
 */
export class SystemExecutionError extends ExecutionError {
  constructor(
    message: string,
    public readonly systemComponent?: string,
    public readonly failurePoint?: string,
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, systemComponent, failurePoint }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}

/**
 * 资源访问错误类型
 *
 * 专门用于资源访问相关的执行错误
 * 继承自 ExecutionError，保持向后兼容性
 */
export class ResourceAccessError extends ExecutionError {
  constructor(
    message: string,
    public readonly resourceType?: string,
    public readonly resourceId?: string,
    public readonly accessType?: 'read' | 'write' | 'delete' | 'update',
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, resourceType, resourceId, accessType }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.ERROR;
  }
}

// ============================================================================
// 细分的未找到错误类型
// ============================================================================

/**
 * 工作流未找到错误类型
 *
 * 专门用于工作流未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class WorkflowNotFoundError extends NotFoundError {
  constructor(
    message: string,
    workflowId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Workflow', workflowId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}

/**
 * 节点未找到错误类型
 *
 * 专门用于节点未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class NodeNotFoundError extends NotFoundError {
  constructor(
    message: string,
    nodeId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Node', nodeId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}

/**
 * 工具未找到错误类型
 *
 * 专门用于工具未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class ToolNotFoundError extends NotFoundError {
  constructor(
    message: string,
    toolName: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Tool', toolName, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}

/**
 * 脚本未找到错误类型
 *
 * 专门用于脚本未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class ScriptNotFoundError extends NotFoundError {
  constructor(
    message: string,
    scriptName: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Script', scriptName, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}

/**
 * 线程上下文未找到错误类型
 *
 * 专门用于线程上下文未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class ThreadContextNotFoundError extends NotFoundError {
  constructor(
    message: string,
    threadId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'ThreadContext', threadId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}

/**
 * 检查点未找到错误类型
 *
 * 专门用于检查点未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class CheckpointNotFoundError extends NotFoundError {
  constructor(
    message: string,
    checkpointId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Checkpoint', checkpointId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}

/**
 * 触发器模板未找到错误类型
 *
 * 专门用于触发器模板未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class TriggerTemplateNotFoundError extends NotFoundError {
  constructor(
    message: string,
    templateName: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'TriggerTemplate', templateName, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}

/**
 * 节点模板未找到错误类型
 *
 * 专门用于节点模板未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class NodeTemplateNotFoundError extends NotFoundError {
  constructor(
    message: string,
    templateName: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'NodeTemplate', templateName, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return ErrorSeverity.WARNING;
  }
}