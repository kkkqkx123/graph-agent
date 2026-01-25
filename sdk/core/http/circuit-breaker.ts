/**
 * 熔断器
 *
 * 防止级联故障，当失败次数达到阈值时打开熔断器
 */

/**
 * 熔断器状态
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * 熔断器配置
 */
export interface CircuitBreakerConfig {
  /** 失败阈值 */
  failureThreshold: number;
  /** 成功阈值（用于从HALF_OPEN恢复到CLOSED） */
  successThreshold?: number;
  /** 重置超时时间（毫秒） */
  resetTimeout?: number;
}

/**
 * 熔断器
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeout: number;

  constructor(config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold;
    this.successThreshold = config.successThreshold || 3;
    this.resetTimeout = config.resetTimeout || 60000; // 默认60秒
  }

  /**
   * 执行函数（带熔断保护）
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * 检查熔断器是否打开
   */
  isOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      // 检查是否可以尝试恢复
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * 获取状态
   */
  getState(): string {
    return this.state;
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
  }

  /**
   * 记录成功
   */
  private recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  /**
   * 记录失败
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}