/**
 * 超时控制器
 * 管理脚本执行的超时控制
 */

/**
 * 超时控制器配置
 */
export interface TimeoutControllerConfig {
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
}

/**
 * 超时控制器
 */
export class TimeoutController {
  private defaultTimeout: number;

  constructor(config: TimeoutControllerConfig = {}) {
    this.defaultTimeout = config.defaultTimeout ?? 30000;
  }

  /**
   * 执行函数并应用超时控制
   * @param fn 要执行的函数
   * @param timeout 超时时间（毫秒）
   * @param signal 中止信号（可选）
   * @returns 函数执行结果
   * @throws Error 如果超时或被中止
   */
  async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number = this.defaultTimeout,
    signal?: AbortSignal
  ): Promise<T> {
    // 创建超时Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);

      // 如果提供了中止信号，监听中止事件
      if (signal) {
        const abortHandler = () => {
          clearTimeout(timeoutId);
          reject(new Error('Execution aborted by signal'));
        };

        signal.addEventListener('abort', abortHandler, { once: true });
      }
    });

    // 执行函数并应用超时
    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * 创建默认超时控制器
   * @returns 默认超时控制器实例
   */
  static createDefault(): TimeoutController {
    return new TimeoutController();
  }
}