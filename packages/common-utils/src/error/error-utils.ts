/**
 * 错误处理工具函数
 * 提供统一的错误处理能力，减少重复的类型检查代码
 */

import { AbortError, ThreadInterruptedException } from '@modular-agent/types';
import { err } from '../utils/result-utils';
import type { Result } from '@modular-agent/types';

/**
 * 提取错误消息
 * @param error 错误对象
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error === null || error === undefined) {
    return 'Unknown error';
  }
  
  if (typeof error === 'object') {
    return (error as any).message || 
           (error as any).toString() || 
           JSON.stringify(error);
  }
  
  return String(error);
}

/**
 * 标准化错误为 Error 对象
 * @param error 错误对象
 * @returns Error 对象
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  if (error === null || error === undefined) {
    return new Error('Unknown error');
  }
  
  if (typeof error === 'object') {
    const message = (error as any).message || 
                    (error as any).toString() || 
                    JSON.stringify(error);
    return new Error(message);
  }
  
  return new Error(String(error));
}

/**
 * 类型守卫：判断是否为 Error 对象
 * @param error 错误对象
 * @returns 是否为 Error 对象
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * 获取错误对象或 undefined
 * @param error 错误对象
 * @returns Error 对象或 undefined
 */
export function getErrorOrUndefined(error: unknown): Error | undefined {
  return error instanceof Error ? error : undefined;
}

/**
 * 获取错误对象或创建新的 Error
 * @param error 错误对象
 * @returns Error 对象
 */
export function getErrorOrNew(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * 创建AbortError
 * @param message 错误消息
 * @param signal AbortSignal（可选）
 * @returns AbortError实例
 */
export function createAbortError(
  message: string,
  signal?: AbortSignal
): AbortError {
  const cause = signal?.reason as any;
  return new AbortError(message, cause);
}

/**
 * 检查是否是AbortError（支持嵌套检查）
 * @param error 错误对象
 * @returns 是否是AbortError
 */
export function isAbortError(error: unknown): error is AbortError {
  if (error instanceof AbortError) {
    return true;
  }
  
  // 检查嵌套的cause
  if (error instanceof Error && error.cause instanceof AbortError) {
    return true;
  }
  
  return false;
}

/**
 * 将 AbortError 转换为包含 ThreadInterruptedException 的 Result
 *
 * 说明：
 * 1. 检查错误是否为 AbortError
 * 2. 如果是 AbortError，提取 cause 中的 ThreadInterruptedException
 * 3. 如果没有 ThreadInterruptedException，创建一个新的
 * 4. 返回包含 ThreadInterruptedException 的 Err Result
 *
 * @param error 错误对象
 * @returns 包含 ThreadInterruptedException 的 Result
 */
export function abortErrorToResult<T>(error: unknown): Result<T, ThreadInterruptedException> {
  if (isAbortError(error)) {
    const cause = error.cause;
    if (cause instanceof ThreadInterruptedException) {
      return err(cause);
    }
    // 如果没有获取到 ThreadInterruptedException，创建一个新的
    return err(new ThreadInterruptedException(
      'Operation aborted',
      'STOP',
      undefined,
      undefined
    ));
  }
  // 如果不是 AbortError，创建一个通用的 ThreadInterruptedException
  return err(new ThreadInterruptedException(
    'Unknown abort error',
    'STOP',
    undefined,
    undefined
  ));
}