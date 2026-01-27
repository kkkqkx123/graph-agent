/**
 * 重试处理器
 *
 * 提供指数退避重试策略，自动处理可重试的错误
 */

import { TimeoutError, NetworkError, RateLimitError, HttpError } from '../../types/errors';

/**
 * 重试处理器配置
 */
export interface RetryHandlerConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟时间（毫秒） */
  baseDelay: number;
  /** 最大延迟时间（毫秒） */
  maxDelay?: number;
}

/**
 * 重试处理器
 */
export class RetryHandler {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor(config: RetryHandlerConfig) {
    this.maxRetries = config.maxRetries;
    this.baseDelay = config.baseDelay;
    this.maxDelay = config.maxDelay || 30000; // 默认30秒
  }

  /**
   * 执行带重试的函数
   */
  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否应该重试
        if (!this.shouldRetry(error) || attempt === this.maxRetries) {
          throw error;
        }

        // 计算延迟并等待
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * 判断错误是否可重试
   */
  private shouldRetry(error: any): boolean {
    // TimeoutError - 超时重试
    if (error instanceof TimeoutError) {
      return true;
    }

    // HttpError - 精确判断状态码
    if (error instanceof HttpError) {
      return error.statusCode === 429 || (error.statusCode >= 500 && error.statusCode < 600);
    }

    // NetworkError - 其他网络错误重试
    if (error instanceof NetworkError) {
      return true;
    }

    // RateLimitError - 限流重试
    if (error instanceof RateLimitError) {
      return true;
    }

    return false;
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}