/**
 * 存储错误类型定义
 */

import { SDKError, type ErrorSeverity } from '@modular-agent/types';

/**
 * 存储错误基类
 */
export class StorageError extends SDKError {
  constructor(
    message: string,
    public readonly operation: string,
    context?: Record<string, unknown>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, operation }, cause);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 存储配额超限错误
 */
export class StorageQuotaExceededError extends StorageError {
  constructor(
    message: string,
    public readonly requiredBytes: number,
    public readonly availableBytes: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'quota', { ...context, requiredBytes, availableBytes });
  }
}

/**
 * 实体未找到错误
 */
export class EntityNotFoundError extends StorageError {
  constructor(
    message: string,
    public readonly entityId: string,
    public readonly entityType: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'load', { ...context, entityId, entityType });
  }
}

/**
 * 存储初始化错误
 */
export class StorageInitializationError extends StorageError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'initialize', context, cause);
  }
}

/**
 * 序列化错误
 */
export class SerializationError extends StorageError {
  constructor(
    message: string,
    public readonly entityId: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'serialize', { ...context, entityId }, cause);
  }
}
