import { getConfig } from '../../config/config';

export class RetryHandler {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  private backoffMultiplier: number;
  private retryableStatusCodes: Set<number>;
  private retryableErrors: Set<string>;

  // Stats
  private totalAttempts: number = 0;
  private successfulAttempts: number = 0;
  private failedAttempts: number = 0;
  private totalResponseTime: number = 0;

  constructor() {
    this.maxRetries = getConfig().get('http.retry.max_retries');
    this.baseDelay = getConfig().get('http.retry.base_delay');
    this.maxDelay = getConfig().get('http.retry.max_delay');
    this.backoffMultiplier = getConfig().get('http.retry.backoff_multiplier');

    this.retryableStatusCodes = new Set([
      408, // Request Timeout
      409, // Conflict (lock timeout)
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
      507, // Insufficient Storage
      509, // Bandwidth Limit Exceeded
      520, // Unknown Error
      521, // Web Server Is Down
      522, // Connection Timed Out
      523, // Origin Is Unreachable
      524, // A Timeout Occurred
    ]);

    this.retryableErrors = new Set([
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'NETWORK_ERROR',
      'TIMEOUT',
      'ABORT_ERR',
    ]);
  }

  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.totalAttempts++;
        const result = await fn();
        this.successfulAttempts++;

        const responseTime = Date.now() - startTime;
        this.totalResponseTime += responseTime;

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === this.maxRetries) {
          this.failedAttempts++;
          const responseTime = Date.now() - startTime;
          this.totalResponseTime += responseTime;
          throw error;
        }

        // Calculate delay for next retry
        const delay = this.calculateRetryDelay(error, attempt);

        // Log retry attempt if enabled
        if (getConfig().get('http.log.enabled')) {
          console.warn(
            `HTTP retry attempt ${attempt + 1}/${this.maxRetries + 1} after ${delay}ms`,
            {
              error: lastError.message,
              status: (error as any).response?.status,
            }
          );
        }

        // Wait before retry
        await this.delay(delay);
      }
    }

    this.failedAttempts++;
    const responseTime = Date.now() - startTime;
    this.totalResponseTime += responseTime;

    throw lastError || new Error('Unknown error occurred during retry');
  }

  private isRetryableError(error: any): boolean {
    // Check for server's retry suggestion
    if (error.response) {
      const shouldRetryHeader = error.response.headers?.get('x-should-retry');
      if (shouldRetryHeader === 'true') return true;
      if (shouldRetryHeader === 'false') return false;
    }

    // Check for retryable HTTP status codes
    if (error.response && this.retryableStatusCodes.has(error.response.status)) {
      return true;
    }

    // Check for retryable network errors
    if (error.code && this.retryableErrors.has(error.code)) {
      return true;
    }

    // Check for retryable error messages
    if (error.message && this.retryableErrors.has(error.message.toUpperCase())) {
      return true;
    }

    // Check for specific error patterns
    if (
      error.message &&
      (error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('connection') ||
        error.message.includes('abort'))
    ) {
      return true;
    }

    return false;
  }

  /**
   * 计算重试延迟
   * 优先使用服务器返回的重试建议
   */
  private calculateRetryDelay(error: any, attempt: number): number {
    // 检查服务器返回的重试建议
    if (error.response) {
      const retryAfterHeader = error.response.headers?.get('retry-after');
      if (retryAfterHeader) {
        const delay = this.parseRetryAfter(retryAfterHeader);
        if (delay !== null && delay >= 0 && delay < 60000) {
          return delay;
        }
      }

      const retryAfterMsHeader = error.response.headers?.get('retry-after-ms');
      if (retryAfterMsHeader) {
        const delay = parseFloat(retryAfterMsHeader);
        if (!isNaN(delay) && delay >= 0 && delay < 60000) {
          return delay;
        }
      }
    }

    // 使用默认的指数退避算法
    return this.calculateDefaultDelay(attempt);
  }

  /**
   * 解析 retry-after header
   * 支持秒数和 HTTP 日期格式
   */
  private parseRetryAfter(header: string): number | null {
    // 尝试解析为秒数
    const seconds = parseFloat(header);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    // 尝试解析为 HTTP 日期
    const date = new Date(header);
    if (!isNaN(date.getTime())) {
      return date.getTime() - Date.now();
    }

    return null;
  }

  /**
   * 计算默认延迟（指数退避 + 抖动）
   */
  private calculateDefaultDelay(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.25 * exponentialDelay; // 25% jitter
    const delay = exponentialDelay + jitter;

    return Math.min(delay, this.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats(): {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    successRate: number;
    averageResponseTime: number;
  } {
    const successRate =
      this.totalAttempts > 0 ? (this.successfulAttempts / this.totalAttempts) * 100 : 0;

    const averageResponseTime =
      this.totalAttempts > 0 ? this.totalResponseTime / this.totalAttempts : 0;

    return {
      totalAttempts: this.totalAttempts,
      successfulAttempts: this.successfulAttempts,
      failedAttempts: this.failedAttempts,
      successRate,
      averageResponseTime,
    };
  }

  resetStats(): void {
    this.totalAttempts = 0;
    this.successfulAttempts = 0;
    this.failedAttempts = 0;
    this.totalResponseTime = 0;
  }

  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries;
  }

  setBaseDelay(baseDelay: number): void {
    this.baseDelay = baseDelay;
  }

  setMaxDelay(maxDelay: number): void {
    this.maxDelay = maxDelay;
  }

  setBackoffMultiplier(backoffMultiplier: number): void {
    this.backoffMultiplier = backoffMultiplier;
  }

  addRetryableStatusCode(statusCode: number): void {
    this.retryableStatusCodes.add(statusCode);
  }

  removeRetryableStatusCode(statusCode: number): void {
    this.retryableStatusCodes.delete(statusCode);
  }

  addRetryableError(error: string): void {
    this.retryableErrors.add(error);
  }

  removeRetryableError(error: string): void {
    this.retryableErrors.delete(error);
  }
}
