/**
 * 统一的执行结果类型
 * 所有Core API的执行方法都返回此类型
 *
 * 基于 packages/types 的 Result 类型，添加 executionTime 支持
 */

import type { Result, ExecutionError } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * 执行结果包装器
 * 包含 Result 和执行时间
 */
export interface ExecutionResult<T> {
  /** 执行结果 */
  result: Result<T, ExecutionError>;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 创建成功结果
 */
export function success<T>(data: T, executionTime: number): ExecutionResult<T> {
  return {
    result: ok(data),
    executionTime
  };
}

/**
 * 创建失败结果
 */
export function failure<T>(error: ExecutionError, executionTime: number): ExecutionResult<T> {
  return {
    result: err(error),
    executionTime
  };
}

/**
 * 检查结果是否成功
 */
export function isSuccess<T>(result: ExecutionResult<T>): boolean {
  return result.result.isOk();
}

/**
 * 检查结果是否失败
 */
export function isFailure<T>(result: ExecutionResult<T>): boolean {
  return result.result.isErr();
}

/**
 * 获取结果数据（如果成功）
 */
export function getData<T>(result: ExecutionResult<T>): T | null {
  return result.result.isOk() ? result.result.value : null;
}

/**
 * 获取错误信息（如果失败）
 */
export function getError<T>(result: ExecutionResult<T>): ExecutionError | null {
  return result.result.isErr() ? result.result.error : null;
}

/**
 * 获取错误消息（如果失败）
 */
export function getErrorMessage<T>(result: ExecutionResult<T>): string | null {
  if (!result.result.isErr()) return null;
  return result.result.error.message;
}