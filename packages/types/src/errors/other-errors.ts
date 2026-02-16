/**
 * 其他错误类型定义
 * 定义配置、超时、工具和代码执行相关的错误类型
 */

import { SDKError, ErrorSeverity } from './base';

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
 * 工具调用错误类型
 */
export class ToolError extends SDKError {
  constructor(
    message: string,
    public readonly toolId?: string,
    public readonly toolType?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, toolId, toolType }, cause);
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