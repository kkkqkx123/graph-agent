/**
 * 重试策略
 * 管理执行失败时的重试逻辑
 */

/**
 * 重试策略配置
 */
export interface RetryStrategyConfig {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 基础延迟（毫秒） */
  baseDelay?: number;
  /** 是否使用指数退避 */
  exponentialBackoff?: boolean;
  /** 最大延迟（毫秒） */
  maxDelay?: number;
}

/**
 * 重试策略
 */
export class RetryStrategy {
  private maxRetries: number;
  private baseDelay: number;
  private exponentialBackoff: boolean;
  private maxDelay: number;

  constructor(config: RetryStrategyConfig = {}) {
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelay = config.baseDelay ?? 1000;
    this.exponentialBackoff = config.exponentialBackoff ?? true;
    this.maxDelay = config.maxDelay ?? 30000;
  }

  /**
   * 判断是否应该重试
   * @param error 错误对象
   * @param attempt 当前尝试次数
   * @returns 是否应该重试
   */
  shouldRetry(error: Error, attempt: number): boolean {
    // 如果已经达到最大重试次数，不再重试
    if (attempt >= this.maxRetries) {
      return false;
    }

    // 检查错误类型，某些错误不应该重试
    const nonRetryableErrors = [
      'ValidationError',
      'ConfigurationError',
      'ScriptNotFoundError'
    ];

    return !nonRetryableErrors.some(errorType => 
      error.name.includes(errorType) || error.message.includes(errorType)
    );
  }

  /**
   * 获取重试延迟时间
   * @param attempt 当前尝试次数
   * @returns 延迟时间（毫秒）
   */
  getRetryDelay(attempt: number): number {
    if (this.exponentialBackoff) {
      // 指数退避：baseDelay * 2^attempt
      const delay = this.baseDelay * Math.pow(2, attempt);
      return Math.min(delay, this.maxDelay);
    } else {
      // 固定延迟
      return this.baseDelay;
    }
  }

  /**
   * 创建默认重试策略
   * @returns 默认重试策略实例
   */
  static createDefault(): RetryStrategy {
    return new RetryStrategy();
  }
}