/**
 * Command中间件接口和实现
 * 提供命令执行的横切关注点处理
 */

import type { Command } from './command';
import type { ExecutionResult } from '../types/execution-result';

/**
 * Command中间件接口
 */
export interface CommandMiddleware {
  /**
   * 命令执行前调用
   * @param command 命令
   */
  beforeExecute<T>(command: Command<T>): Promise<void>;
  
  /**
   * 命令执行后调用
   * @param command 命令
   * @param result 执行结果
   */
  afterExecute<T>(command: Command<T>, result: ExecutionResult<T>): Promise<void>;
  
  /**
   * 命令执行出错时调用
   * @param command 命令
   * @param error 错误
   */
  onError<T>(command: Command<T>, error: Error): Promise<void>;
}

/**
 * 日志中间件
 * 记录命令执行的日志
 */
export class LoggingMiddleware implements CommandMiddleware {
  private readonly logger: Logger;
  
  constructor(logger?: Logger) {
    this.logger = logger || createDefaultLogger();
  }
  
  async beforeExecute<T>(command: Command<T>): Promise<void> {
    const metadata = command.getMetadata();
    this.logger.info(`Executing command: ${metadata.name}`, {
      category: metadata.category,
      version: metadata.version
    });
  }
  
  async afterExecute<T>(command: Command<T>, result: ExecutionResult<T>): Promise<void> {
    const metadata = command.getMetadata();
    if (result.success) {
      this.logger.info(`Command succeeded: ${metadata.name}`, {
        executionTime: result.executionTime
      });
    } else {
      this.logger.error(`Command failed: ${metadata.name}`, {
        error: result.error,
        executionTime: result.executionTime
      });
    }
  }
  
  async onError<T>(command: Command<T>, error: Error): Promise<void> {
    const metadata = command.getMetadata();
    this.logger.error(`Command error: ${metadata.name}`, {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * 验证中间件
 * 在命令执行前进行额外的验证
 */
export class ValidationMiddleware implements CommandMiddleware {
  async beforeExecute<T>(command: Command<T>): Promise<void> {
    const validation = command.validate();
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
  }
  
  async afterExecute<T>(command: Command<T>, result: ExecutionResult<T>): Promise<void> {
    // 不需要后置处理
  }
  
  async onError<T>(command: Command<T>, error: Error): Promise<void> {
    // 不需要错误处理
  }
}

/**
 * 缓存中间件
 * 缓存命令执行结果
 */
export class CacheMiddleware implements CommandMiddleware {
  private readonly cache: Map<string, { result: ExecutionResult<any>; timestamp: number }>;
  private readonly ttl: number;
  
  constructor(ttl: number = 300000) { // 默认5分钟
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  async beforeExecute<T>(command: Command<T>): Promise<void> {
    const cacheKey = this.getCacheKey(command);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      // 将缓存结果附加到命令上，供后续使用
      (command as any)._cachedResult = cached.result;
    }
  }
  
  async afterExecute<T>(command: Command<T>, result: ExecutionResult<T>): Promise<void> {
    const cacheKey = this.getCacheKey(command);
    this.cache.set(cacheKey, { result, timestamp: Date.now() });
  }
  
  async onError<T>(command: Command<T>, error: Error): Promise<void> {
    // 不需要错误处理
  }
  
  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * 生成缓存键
   */
  private getCacheKey(command: Command<any>): string {
    const metadata = command.getMetadata();
    return `${metadata.category}:${metadata.name}:${JSON.stringify(command)}`;
  }
}

/**
 * 指标收集中间件
 * 收集命令执行的指标
 */
export class MetricsMiddleware implements CommandMiddleware {
  private readonly metrics: Map<string, CommandMetrics> = new Map();
  
  async beforeExecute<T>(command: Command<T>): Promise<void> {
    // 记录开始时间
    (command as any)._startTime = Date.now();
  }
  
  async afterExecute<T>(command: Command<T>, result: ExecutionResult<T>): Promise<void> {
    const metadata = command.getMetadata();
    const key = `${metadata.category}:${metadata.name}`;
    
    let metrics = this.metrics.get(key);
    if (!metrics) {
      metrics = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0
      };
      this.metrics.set(key, metrics);
    }
    
    metrics.totalExecutions++;
    metrics.totalExecutionTime += result.executionTime;
    metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
    
    if (result.success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }
  }
  
  async onError<T>(command: Command<T>, error: Error): Promise<void> {
    const metadata = command.getMetadata();
    const key = `${metadata.category}:${metadata.name}`;
    
    let metrics = this.metrics.get(key);
    if (!metrics) {
      metrics = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0
      };
      this.metrics.set(key, metrics);
    }
    
    metrics.totalExecutions++;
    metrics.failedExecutions++;
  }
  
  /**
   * 获取指标
   */
  getMetrics(): Map<string, CommandMetrics> {
    return new Map(this.metrics);
  }
  
  /**
   * 清空指标
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * 重试中间件
 * 自动重试失败的命令
 */
export class RetryMiddleware implements CommandMiddleware {
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  
  constructor(maxRetries: number = 3, retryDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }
  
  async beforeExecute<T>(command: Command<T>): Promise<void> {
    // 不需要前置处理
  }
  
  async afterExecute<T>(command: Command<T>, result: ExecutionResult<T>): Promise<void> {
    // 不需要后置处理
  }
  
  async onError<T>(command: Command<T>, error: Error): Promise<void> {
    const retryCount = (command as any)._retryCount || 0;
    
    if (retryCount < this.maxRetries) {
      (command as any)._retryCount = retryCount + 1;
      await this.delay(this.retryDelay * Math.pow(2, retryCount)); // 指数退避
      throw error; // 重新抛出错误，让执行器重试
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Logger接口
 */
export interface Logger {
  info(message: string, data?: any): void;
  error(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}

/**
 * 默认Logger实现
 */
function createDefaultLogger(): Logger {
  return {
    info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
    error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
    warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
    debug: (message: string, data?: any) => console.debug(`[DEBUG] ${message}`, data || '')
  };
}

/**
 * 命令指标
 */
export interface CommandMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
}