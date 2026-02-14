/**
 * 超时控制器
 * 负责控制执行超时
 */

import { TimeoutError } from '@modular-agent/types';

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
    timeout?: number
  ): Promise<T> {
    const actualTimeout = timeout ?? this.defaultTimeout;
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new TimeoutError(
          `Tool execution timeout after ${actualTimeout}ms`,
          actualTimeout
        ));
      }, actualTimeout);
    });

    try {
      return await Promise.race([fn(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
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