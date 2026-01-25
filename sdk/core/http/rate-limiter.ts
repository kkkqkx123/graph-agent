/**
 * 限流器
 *
 * 使用令牌桶算法限制请求速率
 */

/**
 * 限流器配置
 */
export interface RateLimiterConfig {
  /** 令牌桶容量 */
  capacity: number;
  /** 填充速率（每秒） */
  refillRate: number;
}

/**
 * 限流器
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(config: RateLimiterConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * 等待令牌
   */
  async waitForToken(): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      // 计算等待时间
      const waitTime = this.calculateWaitTime();
      await this.sleep(waitTime);
    }
  }

  /**
   * 获取可用令牌数
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * 重置限流器
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * 填充令牌
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // 转换为秒
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * 计算等待时间
   */
  private calculateWaitTime(): number {
    const tokensNeeded = 1;
    const tokensDeficit = tokensNeeded - this.tokens;
    const waitTime = (tokensDeficit / this.refillRate) * 1000; // 转换为毫秒
    return Math.ceil(waitTime);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}