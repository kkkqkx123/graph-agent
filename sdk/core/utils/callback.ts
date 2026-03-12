/**
 * 回调工具函数
 * 提供辅助功能，包括回调包装、错误处理、超时控制等
 *
 * 设计原则：
 * - 无状态，纯函数导出
 * - 提供通用的回调处理工具
 * - 支持错误处理和超时控制
 */

import { getErrorOrNew, now, diffTimestamp } from '@modular-agent/common-utils';
import { logger } from '../../utils/logger.js';

/**
 * 包装回调函数，添加错误处理
 * @param callback 原始回调函数
 * @returns 包装后的回调函数
 */
export function wrapCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  return ((...args: any[]) => {
    try {
      return callback(...args);
    } catch (error) {
      logger.error('Error in callback', { error: getErrorOrNew(error) });
      throw error;
    }
  }) as T;
}

/**
 * 创建超时Promise
 * @param timeout 超时时间（毫秒）
 * @param errorMessage 超时错误消息
 * @returns 超时Promise
 */
export function createTimeoutPromise(
  timeout: number,
  errorMessage: string = 'Operation timed out'
): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeout);
  });
}

/**
 * 带超时的Promise执行
 * @param promise 要执行的Promise
 * @param timeout 超时时间（毫秒）
 * @param errorMessage 超时错误消息
 * @returns Promise结果
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    createTimeoutPromise(timeout, errorMessage)
  ]);
}

/**
 * 验证回调函数有效性
 * @param callback 回调函数
 * @returns 是否有效
 */
export function validateCallback(callback: any): boolean {
  return typeof callback === 'function';
}

/**
 * 创建安全的回调函数
 * @param callback 原始回调函数
 * @param defaultValue 默认返回值
 * @returns 安全的回调函数
 */
export function createSafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  defaultValue: ReturnType<T>
): T {
  return ((...args: any[]) => {
    try {
      if (validateCallback(callback)) {
        return callback(...args);
      }
      return defaultValue;
    } catch (error) {
      logger.error('Error in safe callback', { error: getErrorOrNew(error) });
      return defaultValue;
    }
  }) as T;
}

/**
 * 批量执行回调函数
 * @param callbacks 回调函数数组
 * @param args 回调参数
 * @returns 执行结果数组
 */
export function executeCallbacks<T extends (...args: any[]) => any>(
  callbacks: T[],
  ...args: Parameters<T>
): Array<ReturnType<T> | Error> {
  return callbacks.map(callback => {
    try {
      return callback(...args);
    } catch (error) {
      return getErrorOrNew(error);
    }
  });
}

/**
 * 创建重试回调
 * @param callback 原始回调函数
 * @param maxRetries 最大重试次数
 * @param delay 重试延迟（毫秒）
 * @returns 带重试的回调函数
 */
export function createRetryCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  maxRetries: number = 3,
  delay: number = 1000
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await callback(...args);
      } catch (error) {
        lastError = getErrorOrNew(error);
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }) as T;
}

/**
 * 创建节流回调
 * @param callback 原始回调函数
 * @param delay 节流延迟（毫秒）
 * @returns 节流后的回调函数
 */
export function createThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): T {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    const currentTime = now();
    const timeSinceLastCall = currentTime - lastCallTime;

    if (timeSinceLastCall >= delay) {
      lastCallTime = currentTime;
      return callback(...args);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCallTime = now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T;
}

/**
 * 创建防抖回调
 * @param callback 原始回调函数
 * @param delay 防抖延迟（毫秒）
 * @returns 防抖后的回调函数
 */
export function createDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  }) as T;
}

/**
 * 创建一次性回调
 * @param callback 原始回调函数
 * @returns 一次性回调函数
 */
export function createOnceCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  let called = false;

  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true;
      return callback(...args);
    }
  }) as T;
}

/**
 * 创建带缓存的回调
 * @param callback 原始回调函数
 * @param keyGenerator 缓存键生成函数
 * @param ttl 缓存生存时间（毫秒）
 * @returns 带缓存的回调函数
 */
export function createCachedCallback<T extends (...args: any[]) => any>(
  callback: T,
  keyGenerator: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args),
  ttl: number = 60000
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    if (cached && diffTimestamp(cached.timestamp, now()) < ttl) {
      return cached.value;
    }

    const result = callback(...args);
    cache.set(key, { value: result, timestamp: now() });
    return result;
  }) as T;
}

/**
 * 清理缓存
 * @param cache 缓存Map
 * @param ttl 缓存生存时间（毫秒）
 */
export function cleanupCache<T>(
  cache: Map<string, { value: T; timestamp: number }>,
  ttl: number
): void {
  const currentTime = now();
  const keysToDelete: string[] = [];

  cache.forEach((entry, key) => {
    if (currentTime - entry.timestamp >= ttl) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => cache.delete(key));
}
