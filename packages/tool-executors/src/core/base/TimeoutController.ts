/**
 * 超时控制器
 * 负责控制执行超时
 */

import { TimeoutError } from '@modular-agent/types';
import { createAbortError } from '@modular-agent/common-utils';

/**
 * 超时控制器
 */
export class TimeoutController {
  constructor(private defaultTimeout: number = 30000) {}

  /**
   * 带超时的执行
   * @param fn 要执行的函数
   * @param timeout 超时时间（毫秒），默认使用构造函数设置的值
   * @returns 执行结果
   * @throws TimeoutError 如果超时
   */
  async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout?: number,
    signal?: AbortSignal
  ): Promise<T> {
    const actualTimeout = timeout ?? this.defaultTimeout;
    let timeoutId: NodeJS.Timeout | undefined;
    let abortListener: (() => void) | undefined;

    // 创建超时Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new TimeoutError(
          `Tool execution timeout after ${actualTimeout}ms`,
          actualTimeout
        ));
      }, actualTimeout);
    });

    // 创建中止Promise
    let abortPromise: Promise<never> | undefined;
    if (signal) {
      abortPromise = new Promise<never>((_, reject) => {
        const onAbort = () => {
          reject(createAbortError('Tool execution aborted', signal));
        };

        if (signal.aborted) {
          onAbort();
        } else {
          abortListener = () => {
            onAbort();
          };
          signal.addEventListener('abort', abortListener);
        }
      });
    }

    try {
      // 竞争执行、超时和中止
      const promises: Array<Promise<T | never>> = [fn(), timeoutPromise];
      if (abortPromise) {
        promises.push(abortPromise);
      }
      return await Promise.race(promises);
    } finally {
      // 清理资源
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (abortListener && signal) {
        signal.removeEventListener('abort', abortListener);
      }
    }
  }

  /**
   * 创建默认超时控制器
   */
  static createDefault(): TimeoutController {
    return new TimeoutController(30000);
  }

  /**
   * 创建无超时控制器
   */
  static createNoTimeout(): TimeoutController {
    return new TimeoutController(0);
  }
}