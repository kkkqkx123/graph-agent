import { BaseError } from './base-error';

/**
 * 状态转换错误
 * 用于表示状态转换失败的情况
 */
export class StateTransitionError extends BaseError {
  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super('STATE_TRANSITION_ERROR', message, options);
  }
}

/**
 * 无效状态转换错误
 * 用于表示不允许的状态转换
 */
export class InvalidStateTransitionError extends StateTransitionError {
  constructor(
    fromState: string,
    toState: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`不允许的状态转换: ${fromState} -> ${toState}`, {
      ...options,
      context: { ...options?.context, fromState, toState }
    });
  }
}

/**
 * 无效状态错误
 * 用于表示当前状态无效
 */
export class InvalidStatusError extends StateTransitionError {
  constructor(
    currentStatus: string,
    expectedStatus: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`当前状态无效: ${currentStatus}，期望状态: ${expectedStatus}`, {
      ...options,
      context: { ...options?.context, currentStatus, expectedStatus }
    });
  }
}