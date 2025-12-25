/**
 * 轮询池异常基类
 */
export abstract class PollingPoolError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PollingPoolError';
    this.code = code;
    this.details = details;
  }
}

/**
 * 轮询池未找到异常
 */
export class PollingPoolNotFoundError extends PollingPoolError {
  constructor(poolName: string) {
    super(
      `轮询池未找到: ${poolName}`,
      'POLLING_POOL_NOT_FOUND',
      { poolName }
    );
  }
}

/**
 * 轮询池初始化失败异常
 */
export class PollingPoolInitializationError extends PollingPoolError {
  constructor(poolName: string, reason: string) {
    super(
      `轮询池初始化失败: ${poolName} - ${reason}`,
      'POLLING_POOL_INITIALIZATION_FAILED',
      { poolName, reason }
    );
  }
}

/**
 * 轮询池实例不可用异常
 */
export class PollingPoolInstanceUnavailableError extends PollingPoolError {
  constructor(poolName: string, instanceId?: string) {
    super(
      `轮询池实例不可用: ${poolName}`,
      'POLLING_POOL_INSTANCE_UNAVAILABLE',
      { poolName, instanceId }
    );
  }
}

/**
 * 轮询池健康检查失败异常
 */
export class PollingPoolHealthCheckError extends PollingPoolError {
  constructor(poolName: string, instanceId: string, reason: string) {
    super(
      `轮询池健康检查失败: ${poolName} - ${instanceId} - ${reason}`,
      'POLLING_POOL_HEALTH_CHECK_FAILED',
      { poolName, instanceId, reason }
    );
  }
}

/**
 * 轮询池配置错误异常
 */
export class PollingPoolConfigurationError extends PollingPoolError {
  constructor(poolName: string, configKey: string, reason: string) {
    super(
      `轮询池配置错误: ${poolName} - ${configKey} - ${reason}`,
      'POLLING_POOL_CONFIGURATION_ERROR',
      { poolName, configKey, reason }
    );
  }
}

/**
 * 轮询池调度策略错误异常
 */
export class PollingPoolSchedulingError extends PollingPoolError {
  constructor(poolName: string, strategy: string, reason: string) {
    super(
      `轮询池调度策略错误: ${poolName} - ${strategy} - ${reason}`,
      'POLLING_POOL_SCHEDULING_ERROR',
      { poolName, strategy, reason }
    );
  }
}

/**
 * 轮询池并发控制错误异常
 */
export class PollingPoolConcurrencyError extends PollingPoolError {
  constructor(poolName: string, currentLoad: number, maxConcurrency: number) {
    super(
      `轮询池并发控制错误: ${poolName} - 当前负载: ${currentLoad}, 最大并发: ${maxConcurrency}`,
      'POLLING_POOL_CONCURRENCY_ERROR',
      { poolName, currentLoad, maxConcurrency }
    );
  }
}