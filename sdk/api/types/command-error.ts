/**
 * CommandError - 命令错误类型定义
 *
 * 提供结构化的错误信息，包含错误码和上下文
 */

import { SDKError, ErrorSeverity } from '@modular-agent/types';

/**
 * 命令错误基类
 * 继承自 SDKError，添加错误码支持
 */
export class CommandError extends SDKError {
  constructor(
    message: string,
    public readonly code: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, code });
    this.name = 'CommandError';
  }

  /**
   * 转换为 JSON 格式
   */
  override toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * 验证错误
 * 当命令参数验证失败时抛出
 */
export class ValidationError extends CommandError {
  constructor(message: string, context?: Record<string, any>, severity?: ErrorSeverity) {
    super(message, 'VALIDATION_ERROR', context, severity);
    this.name = 'ValidationError';
  }
}

/**
 * 执行错误
 * 当命令执行过程中发生错误时抛出
 */
export class ExecutionError extends CommandError {
  constructor(message: string, context?: Record<string, any>, severity?: ErrorSeverity) {
    super(message, 'EXECUTION_ERROR', context, severity);
    this.name = 'ExecutionError';
  }
}

/**
 * 权限错误
 * 当用户没有执行命令的权限时抛出
 */
export class PermissionError extends CommandError {
  constructor(message: string, context?: Record<string, any>, severity?: ErrorSeverity) {
    super(message, 'PERMISSION_ERROR', context, severity);
    this.name = 'PermissionError';
  }
}

/**
 * 资源未找到错误
 * 当请求的资源不存在时抛出
 */
export class NotFoundError extends CommandError {
  constructor(message: string, context?: Record<string, any>, severity?: ErrorSeverity) {
    super(message, 'NOT_FOUND_ERROR', context, severity);
    this.name = 'NotFoundError';
  }
}

/**
 * 超时错误
 * 当命令执行超时时抛出
 */
export class TimeoutError extends CommandError {
  constructor(message: string, context?: Record<string, any>, severity?: ErrorSeverity) {
    super(message, 'TIMEOUT_ERROR', context, severity);
    this.name = 'TimeoutError';
  }
}

/**
 * 取消错误
 * 当命令被取消时抛出
 */
export class CancelledError extends CommandError {
  constructor(message: string, context?: Record<string, any>, severity?: ErrorSeverity) {
    super(message, 'CANCELLED_ERROR', context, severity);
    this.name = 'CancelledError';
  }
}

/**
 * 状态错误
 * 当命令在错误的状态下执行时抛出
 */
export class StateError extends CommandError {
  constructor(message: string, context?: Record<string, any>, severity?: ErrorSeverity) {
    super(message, 'STATE_ERROR', context, severity);
    this.name = 'StateError';
  }
}

/**
 * 依赖错误
 * 当命令依赖的服务不可用时抛出
 */
export class DependencyError extends CommandError {
  constructor(message: string, context?: Record<string, any>, severity?: ErrorSeverity) {
    super(message, 'DEPENDENCY_ERROR', context, severity);
    this.name = 'DependencyError';
  }
}