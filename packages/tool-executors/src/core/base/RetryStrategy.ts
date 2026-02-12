/**
 * 重试策略
 * 基于 common-utils 的 executeWithRetry 实现，提供便捷的接口
 */

import { TimeoutError, HttpError, NetworkError } from '@modular-agent/types/errors';
import { RateLimitError, executeWithRetry, type RetryConfig } from '@modular-agent/common-utils';

/**
 * 重试策略配置
 */
export interface RetryStrategyConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟时间（毫秒） */
  baseDelay: number;
  /** 是否使用指数退避 */
  exponentialBackoff: boolean;
  /** 最大延迟时间（毫秒） */
  maxDelay?: number;
}

/**
 * 重试策略
 * 包装 common-utils 的 executeWithRetry，提供更友好的接口
 */
export class RetryStrategy {
  private config: RetryStrategyConfig;

  constructor(config: RetryStrategyConfig) {
    this.config = config;
  }

  /**
   * 判断是否应该重试
   * @param error 错误对象
   * @param retryCount 当前重试次数
   * @returns 是否应该重试
   */
  shouldRetry(error: Error, retryCount: number): boolean {
    // 超过最大重试次数
    if (retryCount >= this.config.maxRetries) {
      return false;
    }

    // TimeoutError - 超时重试
    if (error instanceof TimeoutError) {
      return true;
    }

    // HttpError - 精确判断状态码
    if (error instanceof HttpError) {
      return error.statusCode === 429 || 
             (error.statusCode != null && error.statusCode >= 500 && error.statusCode < 600);
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
   * 获取重试延迟时间
   * @param retryCount 当前重试次数
   * @returns 延迟时间（毫秒）
   */
  getRetryDelay(retryCount: number): number {
    let delay: number;

    if (this.config.exponentialBackoff) {
      // 指数退避：baseDelay * 2^retryCount
      delay = this.config.baseDelay * Math.pow(2, retryCount);
    } else {
      // 固定延迟
      delay = this.config.baseDelay;
    }

    // 应用最大延迟限制
    if (this.config.maxDelay && delay > this.config.maxDelay) {
      delay = this.config.maxDelay;
    }

    return delay;
  }

  /**
   * 执行带重试的函数
   * @param fn 要执行的异步函数
   * @returns 函数的返回值
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const retryConfig: RetryConfig = {
      maxRetries: this.config.maxRetries,
      baseDelay: this.config.baseDelay,
      maxDelay: this.config.maxDelay
    };

    return executeWithRetry(fn, retryConfig);
  }

  /**
   * 创建默认重试策略
   */
  static createDefault(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 3,
      baseDelay: 1000,
      exponentialBackoff: true,
      maxDelay: 30000
    });
  }

  /**
   * 创建无重试策略
   */
  static createNoRetry(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 0,
      baseDelay: 0,
      exponentialBackoff: false
    });
  }

  /**
   * 创建自定义重试策略
   */
  static createCustom(config: Partial<RetryStrategyConfig>): RetryStrategy {
    return new RetryStrategy({
      maxRetries: config.maxRetries ?? 3,
      baseDelay: config.baseDelay ?? 1000,
      exponentialBackoff: config.exponentialBackoff ?? true,
      maxDelay: config.maxDelay ?? 30000
    });
  }
}