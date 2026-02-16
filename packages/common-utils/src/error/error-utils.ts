/**
 * 错误处理工具函数
 * 提供统一的错误处理能力，减少重复的类型检查代码
 */

import { AbortError } from '@modular-agent/types';

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