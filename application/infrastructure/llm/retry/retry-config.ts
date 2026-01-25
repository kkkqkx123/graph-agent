/**
 * 重试配置基础设施模块
 *
 * 提供统一的重试配置管理功能，支持多种重试策略和条件判断
 */

/**
 * 重试策略枚举
 */
export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  ADAPTIVE = 'adaptive',
}

/**
 * 重试配置
 *
 * 提供完整的重试配置管理，包括策略、延迟、条件等
 */
export class RetryConfig {
  // 基础配置
  enabled: boolean = true;
  maxAttempts: number = 3;

  // 延迟配置
  baseDelay: number = 1.0;
  maxDelay: number = 60.0;
  exponentialBase: number = 2.0;
  jitter: boolean = true;

  // 重试条件
  retryOnStatusCodes: Set<number> = new Set([429, 500, 502, 503, 504]);
  retryOnErrors: string[] = [
    'timeout',
    'rate_limit',
    'service_unavailable',
    'overloaded_error',
    'connection_error',
    'read_timeout',
    'write_timeout',
  ];
  retryableExceptions: any[] = [];

  // 策略配置
  strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF;

  // 超时配置
  totalTimeout?: number; // 总超时时间（秒）
  perAttemptTimeout?: number; // 每次尝试超时时间（秒）

  // 提供商特定配置
  providerConfig: Record<string, any> = {};

  constructor(config?: Partial<RetryConfig>) {
    if (config) {
      Object.assign(this, config);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  shouldRetryOnError(error: Error): boolean {
    const errorStr = error.message.toLowerCase();
    const errorType = error.constructor.name.toLowerCase();

    // 检查异常类型
    for (const exceptionType of this.retryableExceptions) {
      if (error instanceof exceptionType) {
        return true;
      }
    }

    // 检查错误字符串模式
    for (const errorPattern of this.retryOnErrors) {
      if (errorStr.includes(errorPattern) || errorType.includes(errorPattern)) {
        return true;
      }
    }

    // 检查HTTP状态码
    const response = (error as any).response;
    if (response) {
      const statusCode = response.status;
      if (statusCode && this.retryOnStatusCodes.has(statusCode)) {
        return true;
      }
    }

    // 默认情况下允许重试（向后兼容）
    return true;
  }

  calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = this.baseDelay * Math.pow(this.exponentialBase, attempt - 1);
        break;
      case RetryStrategy.LINEAR_BACKOFF:
        delay = this.baseDelay * attempt;
        break;
      case RetryStrategy.FIXED_DELAY:
        delay = this.baseDelay;
        break;
      case RetryStrategy.ADAPTIVE:
        // 自适应策略：根据错误类型调整延迟
        delay = this.baseDelay * Math.pow(this.exponentialBase, attempt - 1);
        // 可以根据错误类型进一步调整
        break;
      default:
        delay = this.baseDelay;
    }

    // 限制最大延迟
    delay = Math.min(delay, this.maxDelay);

    // 添加抖动
    if (this.jitter) {
      delay *= 0.5 + Math.random() * 0.5;
    }

    return delay;
  }

  shouldContinueRetry(attempt: number, startTime: number): boolean {
    // 检查尝试次数
    if (attempt >= this.maxAttempts) {
      return false;
    }

    // 检查总超时时间
    if (this.totalTimeout !== undefined) {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= this.totalTimeout) {
        return false;
      }
    }

    return true;
  }

  static fromDict(configDict: Record<string, any>): RetryConfig {
    const strategyStr = configDict['strategy'] || 'exponential_backoff';
    let strategy: RetryStrategy;

    try {
      strategy = strategyStr as RetryStrategy;
    } catch (error) {
      strategy = RetryStrategy.EXPONENTIAL_BACKOFF;
    }

    return new RetryConfig({
      enabled: configDict['enabled'] ?? true,
      maxAttempts: configDict['max_attempts'] ?? 3,
      baseDelay: configDict['base_delay'] ?? 1.0,
      maxDelay: configDict['max_delay'] ?? 60.0,
      exponentialBase: configDict['exponential_base'] ?? 2.0,
      jitter: configDict['jitter'] ?? true,
      retryOnStatusCodes: new Set(configDict['retry_on_status_codes'] || [429, 500, 502, 503, 504]),
      retryOnErrors: configDict['retry_on_errors'] || [
        'timeout',
        'rate_limit',
        'service_unavailable',
        'overloaded_error',
        'connection_error',
        'read_timeout',
        'write_timeout',
      ],
      retryableExceptions: configDict['retryable_exceptions'] || [],
      strategy,
      totalTimeout: configDict['total_timeout'],
      perAttemptTimeout: configDict['per_attempt_timeout'],
      providerConfig: configDict['provider_config'] || {},
    });
  }

  toDict(): Record<string, any> {
    return {
      enabled: this.enabled,
      max_attempts: this.maxAttempts,
      base_delay: this.baseDelay,
      max_delay: this.maxDelay,
      exponential_base: this.exponentialBase,
      jitter: this.jitter,
      retry_on_status_codes: Array.from(this.retryOnStatusCodes),
      retry_on_errors: this.retryOnErrors,
      retryable_exceptions: this.retryableExceptions.map(exc => exc.name),
      strategy: this.strategy,
      total_timeout: this.totalTimeout,
      per_attempt_timeout: this.perAttemptTimeout,
      provider_config: this.providerConfig,
    };
  }
}

/**
 * 重试尝试记录
 */
export class RetryAttempt {
  constructor(
    public attemptNumber: number,
    public error?: Error,
    public timestamp: number = Date.now(),
    public delay: number = 0.0,
    public success: boolean = false,
    public result?: any,
    public duration?: number
  ) {}

  toDict(): Record<string, any> {
    return {
      attempt_number: this.attemptNumber,
      error: this.error ? this.error.message : null,
      error_type: this.error ? this.error.constructor.name : null,
      timestamp: this.timestamp,
      delay: this.delay,
      success: this.success,
      duration: this.duration,
    };
  }
}

/**
 * 重试会话记录
 */
export class RetrySession {
  attempts: RetryAttempt[] = [];

  constructor(
    public funcName: string,
    public startTime: number = Date.now(),
    public endTime?: number,
    public success: boolean = false,
    public finalResult?: any,
    public finalError?: Error
  ) {}

  addAttempt(attempt: RetryAttempt): void {
    this.attempts.push(attempt);
  }

  markSuccess(result: any): void {
    this.success = true;
    this.finalResult = result;
    this.endTime = Date.now();
  }

  markFailure(error: Error): void {
    this.success = false;
    this.finalError = error;
    this.endTime = Date.now();
  }

  getTotalDuration(): number | undefined {
    if (this.endTime !== undefined) {
      return this.endTime - this.startTime;
    }
    return undefined;
  }

  getTotalAttempts(): number {
    return this.attempts.length;
  }

  getSuccessfulAttempt(): RetryAttempt | undefined {
    return this.attempts.find(attempt => attempt.success);
  }

  getTotalDelay(): number {
    return this.attempts.reduce((total, attempt) => total + attempt.delay, 0);
  }

  toDict(): Record<string, any> {
    return {
      func_name: this.funcName,
      start_time: this.startTime,
      end_time: this.endTime,
      total_duration: this.getTotalDuration(),
      total_attempts: this.getTotalAttempts(),
      total_delay: this.getTotalDelay(),
      success: this.success,
      final_error: this.finalError ? this.finalError.message : null,
      attempts: this.attempts.map(attempt => attempt.toDict()),
    };
  }
}

/**
 * 重试统计信息
 */
export class RetryStats {
  totalSessions: number = 0;
  successfulSessions: number = 0;
  failedSessions: number = 0;
  totalAttempts: number = 0;
  totalDelay: number = 0.0;
  averageAttempts: number = 0.0;
  successRate: number = 0.0;

  update(session: RetrySession): void {
    this.totalSessions += 1;
    if (session.success) {
      this.successfulSessions += 1;
    } else {
      this.failedSessions += 1;
    }

    this.totalAttempts += session.getTotalAttempts();
    this.totalDelay += session.getTotalDelay();

    // 重新计算平均值
    this.averageAttempts = this.totalAttempts / this.totalSessions;
    this.successRate = this.successfulSessions / this.totalSessions;
  }

  toDict(): Record<string, any> {
    return {
      total_sessions: this.totalSessions,
      successful_sessions: this.successfulSessions,
      failed_sessions: this.failedSessions,
      total_attempts: this.totalAttempts,
      total_delay: this.totalDelay,
      average_attempts: this.averageAttempts,
      success_rate: this.successRate,
    };
  }
}
