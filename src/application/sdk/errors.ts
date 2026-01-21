/**
 * SDK 错误类
 *
 * 提供统一的错误处理机制，包含错误代码和详细信息
 */

/**
 * SDK 基础错误类
 */
export class SDKError extends Error {
  /**
   * 错误代码
   */
  public readonly code: string;

  /**
   * 错误详情
   */
  public readonly details?: any;

  /**
   * 错误时间戳
   */
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    details?: any
  ) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // 维护正确的原型链
    Object.setPrototypeOf(this, SDKError.prototype);
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * 转换为字符串
   */
  override toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

/**
 * 验证错误
 * 在配置验证失败时抛出
 */
export class ValidationError extends SDKError {
  /**
   * 验证错误列表
   */
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[], details?: any) {
    super(message, 'VALIDATION_ERROR', {
      ...details,
      validationErrors,
    });
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;

    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * 获取所有错误消息
   */
  getAllErrors(): string[] {
    return [this.message, ...this.validationErrors];
  }

  /**
   * 检查是否有特定错误
   */
  hasError(errorPattern: string): boolean {
    return this.validationErrors.some(error =>
      error.toLowerCase().includes(errorPattern.toLowerCase())
    );
  }
}

/**
 * 构建错误
 * 在构建工作流或节点时抛出
 */
export class BuildError extends SDKError {
  /**
   * 导致错误的配置
   */
  public readonly config: any;

  constructor(message: string, config: any, details?: any) {
    super(message, 'BUILD_ERROR', {
      ...details,
      config,
    });
    this.name = 'BuildError';
    this.config = config;

    Object.setPrototypeOf(this, BuildError.prototype);
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(): string {
    try {
      return JSON.stringify(this.config, null, 2);
    } catch {
      return String(this.config);
    }
  }
}

/**
 * 执行错误
 * 在工作流执行过程中抛出
 */
export class ExecutionError extends SDKError {
  /**
   * 执行ID
   */
  public readonly executionId: string;

  /**
   * 工作流ID
   */
  public readonly workflowId?: string;

  /**
   * 节点ID
   */
  public readonly nodeId?: string;

  constructor(
    message: string,
    executionId: string,
    details?: {
      workflowId?: string;
      nodeId?: string;
      [key: string]: any;
    }
  ) {
    super(message, 'EXECUTION_ERROR', details);
    this.name = 'ExecutionError';
    this.executionId = executionId;
    this.workflowId = details?.workflowId;
    this.nodeId = details?.nodeId;

    Object.setPrototypeOf(this, ExecutionError.prototype);
  }

  /**
   * 获取执行上下文信息
   */
  getExecutionContext(): Record<string, any> {
    return {
      executionId: this.executionId,
      workflowId: this.workflowId,
      nodeId: this.nodeId,
      timestamp: this.timestamp,
    };
  }
}

/**
 * 超时错误
 * 在执行超时时抛出
 */
export class TimeoutError extends ExecutionError {
  /**
   * 超时时间（毫秒）
   */
  public readonly timeout: number;

  constructor(
    message: string,
    executionId: string,
    timeout: number,
    details?: {
      workflowId?: string;
      nodeId?: string;
      [key: string]: any;
    }
  ) {
    super(message, executionId, {
      ...details,
      timeout,
    });
    this.name = 'TimeoutError';
    this.timeout = timeout;

    Object.setPrototypeOf(this, TimeoutError.prototype);
  }

  /**
   * 获取超时信息
   */
  getTimeoutInfo(): string {
    const seconds = (this.timeout / 1000).toFixed(2);
    return `执行超时：${seconds}秒`;
  }
}

/**
 * 取消错误
 * 在执行被取消时抛出
 */
export class CancellationError extends ExecutionError {
  /**
   * 取消原因
   */
  public readonly reason?: string;

  constructor(
    message: string,
    executionId: string,
    reason?: string,
    details?: {
      workflowId?: string;
      nodeId?: string;
      [key: string]: any;
    }
  ) {
    super(message, executionId, {
      ...details,
      reason,
    });
    this.name = 'CancellationError';
    this.reason = reason;

    Object.setPrototypeOf(this, CancellationError.prototype);
  }

  /**
   * 获取取消信息
   */
  getCancellationInfo(): string {
    return this.reason ? `取消原因：${this.reason}` : '执行已取消';
  }
}

/**
 * 配置错误
 * 在配置无效时抛出
 */
export class ConfigError extends SDKError {
  /**
   * 配置路径
   */
  public readonly configPath?: string;

  constructor(
    message: string,
    configPath?: string,
    details?: any
  ) {
    super(message, 'CONFIG_ERROR', {
      ...details,
      configPath,
    });
    this.name = 'ConfigError';
    this.configPath = configPath;

    Object.setPrototypeOf(this, ConfigError.prototype);
  }

  /**
   * 获取配置路径信息
   */
  getConfigPathInfo(): string {
    return this.configPath ? `配置路径：${this.configPath}` : '配置错误';
  }
}

/**
 * 依赖注入错误
 * 在依赖注入失败时抛出
 */
export class DependencyError extends SDKError {
  /**
   * 依赖名称
   */
  public readonly dependencyName: string;

  constructor(
    message: string,
    dependencyName: string,
    details?: any
  ) {
    super(message, 'DEPENDENCY_ERROR', {
      ...details,
      dependencyName,
    });
    this.name = 'DependencyError';
    this.dependencyName = dependencyName;

    Object.setPrototypeOf(this, DependencyError.prototype);
  }

  /**
   * 获取依赖信息
   */
  getDependencyInfo(): string {
    return `依赖：${this.dependencyName}`;
  }
}

/**
 * 检查错误是否为 SDK 错误
 */
export function isSDKError(error: any): error is SDKError {
  return error instanceof SDKError;
}

/**
 * 检查错误是否为验证错误
 */
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * 检查错误是否为构建错误
 */
export function isBuildError(error: any): error is BuildError {
  return error instanceof BuildError;
}

/**
 * 检查错误是否为执行错误
 */
export function isExecutionError(error: any): error is ExecutionError {
  return error instanceof ExecutionError;
}

/**
 * 检查错误是否为超时错误
 */
export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * 检查错误是否为取消错误
 */
export function isCancellationError(error: any): error is CancellationError {
  return error instanceof CancellationError;
}

/**
 * 检查错误是否为配置错误
 */
export function isConfigError(error: any): error is ConfigError {
  return error instanceof ConfigError;
}

/**
 * 检查错误是否为依赖注入错误
 */
export function isDependencyError(error: any): error is DependencyError {
  return error instanceof DependencyError;
}

/**
 * 格式化错误消息
 */
export function formatError(error: any): string {
  if (isSDKError(error)) {
    return error.toString();
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

/**
 * 获取错误堆栈
 */
export function getErrorStack(error: any): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}