import { BaseError } from './base-error';

/**
 * 执行错误
 * 用于表示执行过程中的错误
 */
export class ExecutionError extends BaseError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super('EXECUTION_ERROR', message, options);
  }
}

/**
 * 执行超时错误
 * 用于表示执行超时
 */
export class ExecutionTimeoutError extends ExecutionError {
  constructor(
    timeout: number,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`执行超时: ${timeout}ms`, {
      ...options,
      context: { ...options?.context, timeout }
    });
  }
}

/**
 * 执行取消错误
 * 用于表示执行被取消
 */
export class ExecutionCancelledError extends ExecutionError {
  constructor(
    reason?: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(reason || '执行被取消', options);
  }
}

/**
 * 执行失败错误
 * 用于表示执行失败
 */
export class ExecutionFailedError extends ExecutionError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, options);
  }
}