/**
 * API装饰器
 * 提供缓存、日志、验证等功能的装饰器实现
 * 
 * 设计模式：
 * - Decorator模式：动态添加功能
 * - Proxy模式：拦截方法调用
 */

import { GenericResourceAPI } from '../resources/generic-resource-api';
import type { ExecutionResult } from '../types/execution-result';

/**
 * 缓存装饰器配置
 */
export interface CacheDecoratorOptions {
  /** 缓存TTL（毫秒） */
  ttl?: number;
  /** 缓存键前缀 */
  keyPrefix?: string;
}

/**
 * 日志装饰器配置
 */
export interface LoggingDecoratorOptions {
  /** 日志级别 */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** 是否记录参数 */
  logArgs?: boolean;
  /** 是否记录返回值 */
  logResult?: boolean;
  /** 是否记录执行时间 */
  logExecutionTime?: boolean;
  /** 自定义日志函数 */
  logger?: (level: string, message: string, data?: any) => void;
}

/**
 * 性能监控装饰器配置
 */
export interface PerformanceDecoratorOptions {
  /** 是否记录慢查询阈值（毫秒） */
  slowQueryThreshold?: number;
  /** 是否记录统计信息 */
  enableStats?: boolean;
}

/**
 * 重试装饰器配置
 */
export interface RetryDecoratorOptions {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 指数退避因子 */
  backoffFactor?: number;
  /** 可重试的错误码 */
  retryableErrors?: string[];
}

/**
 * 缓存装饰器
 * 为API实例添加增强的缓存功能
 * 
 * @param api API实例
 * @param options 配置选项
 * @returns 装饰后的API实例
 */
export function withCache<T extends GenericResourceAPI<any, any, any>>(
  api: T,
  options?: CacheDecoratorOptions
): T {
  const ttl = options?.ttl || 300000; // 默认5分钟
  const keyPrefix = options?.keyPrefix || 'cache';

  // 创建缓存存储
  const cache = new Map<string, { data: any; timestamp: number }>();

  // 代理get方法
  const originalGet = api.get.bind(api);
  api.get = async function(id: any): Promise<ExecutionResult<any>> {
    const cacheKey = `${keyPrefix}:${id}`;
    const cached = cache.get(cacheKey);

    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`[Cache] Hit for ${cacheKey}`);
      return cached.data;
    }

    // 调用原始方法
    const result = await originalGet(id);

    // 缓存成功的结果
    if (result.success && result.data !== null) {
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`[Cache] Set for ${cacheKey}`);
    }

    return result;
  };

  // 代理getAll方法
  const originalGetAll = api.getAll.bind(api);
  api.getAll = async function(filter?: any): Promise<ExecutionResult<any[]>> {
    const cacheKey = `${keyPrefix}:all:${JSON.stringify(filter || {})}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`[Cache] Hit for ${cacheKey}`);
      return cached.data;
    }

    const result = await originalGetAll(filter);

    if (result.success) {
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`[Cache] Set for ${cacheKey}`);
    }

    return result;
  };

  // 代理update和delete方法以清除相关缓存
  const originalUpdate = api.update.bind(api);
  api.update = async function(id: any, updates: any): Promise<ExecutionResult<void>> {
    const result = await originalUpdate(id, updates);
    
    // 清除相关缓存
    cache.delete(`${keyPrefix}:${id}`);
    cache.delete(`${keyPrefix}:all:{}`);
    
    console.log(`[Cache] Cleared for ${keyPrefix}:${id}`);
    return result;
  };

  const originalDelete = api.delete.bind(api);
  api.delete = async function(id: any): Promise<ExecutionResult<void>> {
    const result = await originalDelete(id);
    
    // 清除相关缓存
    cache.delete(`${keyPrefix}:${id}`);
    cache.delete(`${keyPrefix}:all:{}`);
    
    console.log(`[Cache] Cleared for ${keyPrefix}:${id}`);
    return result;
  };

  // 添加缓存统计方法
  (api as any).getCacheStats = () => {
    const now = Date.now();
    let hitCount = 0;
    let missCount = 0;

    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp < ttl) {
        hitCount++;
      } else {
        missCount++;
      }
    }

    return {
      size: cache.size,
      hitCount,
      missCount,
      hitRate: hitCount / (hitCount + missCount) || 0
    };
  };

  // 添加清除缓存方法
  (api as any).clearCache = () => {
    cache.clear();
    console.log(`[Cache] Cleared all for ${keyPrefix}`);
  };

  return api;
}

/**
 * 日志装饰器
 * 为API实例添加日志记录功能
 * 
 * @param api API实例
 * @param options 配置选项
 * @returns 装饰后的API实例
 */
export function withLogging<T extends GenericResourceAPI<any, any, any>>(
  api: T,
  options?: LoggingDecoratorOptions
): T {
  const level = options?.level || 'info';
  const logArgs = options?.logArgs ?? true;
  const logResult = options?.logResult ?? true;
  const logExecutionTime = options?.logExecutionTime ?? true;
  
  const logger = options?.logger || ((lvl: string, msg: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${lvl.toUpperCase()}] ${msg}`;
    if (data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  });

  // 装饰所有公共方法
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(api))
    .filter(name => typeof (api as any)[name] === 'function' && name !== 'constructor');

  for (const methodName of methods) {
    const originalMethod = (api as any)[methodName].bind(api);

    (api as any)[methodName] = async function(...args: any[]) {
      const startTime = Date.now();
      const className = api.constructor.name;

      // 记录方法调用
      if (logArgs) {
        logger(level, `${className}.${methodName} called`, { args });
      } else {
        logger(level, `${className}.${methodName} called`);
      }

      try {
        // 执行原始方法
        const result = await originalMethod(...args);
        const executionTime = Date.now() - startTime;

        // 记录执行结果
        if (logResult) {
          if (result && typeof result === 'object' && 'success' in result) {
            // ExecutionResult类型
            logger(level, `${className}.${methodName} completed`, {
              success: result.success,
              executionTime: logExecutionTime ? executionTime : undefined,
              error: result.success ? undefined : result.error
            });
          } else {
            // 其他类型
            logger(level, `${className}.${methodName} completed`, {
              result: logResult ? result : undefined,
              executionTime: logExecutionTime ? executionTime : undefined
            });
          }
        } else if (logExecutionTime) {
          logger(level, `${className}.${methodName} completed`, { executionTime });
        }

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        // 记录错误
        logger('error', `${className}.${methodName} failed`, {
          error: error instanceof Error ? error.message : String(error),
          executionTime: logExecutionTime ? executionTime : undefined
        });

        throw error;
      }
    };
  }

  return api;
}

/**
 * 性能监控装饰器
 * 为API实例添加性能监控功能
 * 
 * @param api API实例
 * @param options 配置选项
 * @returns 装饰后的API实例
 */
export function withPerformance<T extends GenericResourceAPI<any, any, any>>(
  api: T,
  options?: PerformanceDecoratorOptions
): T {
  const slowQueryThreshold = options?.slowQueryThreshold || 1000; // 默认1秒
  const enableStats = options?.enableStats ?? true;

  const stats = new Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    slowQueries: number;
  }>();

  // 装饰所有公共方法
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(api))
    .filter(name => typeof (api as any)[name] === 'function' && name !== 'constructor');

  for (const methodName of methods) {
    const originalMethod = (api as any)[methodName].bind(api);

    (api as any)[methodName] = async function(...args: any[]) {
      const startTime = Date.now();
      const className = api.constructor.name;

      try {
        const result = await originalMethod(...args);
        const executionTime = Date.now() - startTime;

        // 记录统计信息
        if (enableStats) {
          const key = `${className}.${methodName}`;
          const stat = stats.get(key) || {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            slowQueries: 0
          };

          stat.count++;
          stat.totalTime += executionTime;
          stat.minTime = Math.min(stat.minTime, executionTime);
          stat.maxTime = Math.max(stat.maxTime, executionTime);

          if (executionTime > slowQueryThreshold) {
            stat.slowQueries++;
            console.warn(`[Performance] Slow query detected: ${key} took ${executionTime}ms`);
          }

          stats.set(key, stat);
        }

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        if (executionTime > slowQueryThreshold) {
          console.warn(`[Performance] Slow query detected: ${className}.${methodName} took ${executionTime}ms`);
        }

        throw error;
      }
    };
  }

  // 添加获取统计信息的方法
  (api as any).getPerformanceStats = () => {
    const result: Record<string, any> = {};
    for (const [key, stat] of stats.entries()) {
      result[key] = {
        count: stat.count,
        avgTime: stat.totalTime / stat.count,
        minTime: stat.minTime === Infinity ? 0 : stat.minTime,
        maxTime: stat.maxTime,
        slowQueries: stat.slowQueries
      };
    }
    return result;
  };

  // 添加重置统计信息的方法
  (api as any).resetPerformanceStats = () => {
    stats.clear();
  };

  return api;
}

/**
 * 重试装饰器
 * 为API实例添加自动重试功能
 * 
 * @param api API实例
 * @param options 配置选项
 * @returns 装饰后的API实例
 */
export function withRetry<T extends GenericResourceAPI<any, any, any>>(
  api: T,
  options?: RetryDecoratorOptions
): T {
  const maxRetries = options?.maxRetries || 3;
  const retryDelay = options?.retryDelay || 1000;
  const backoffFactor = options?.backoffFactor || 2;
  const retryableErrors = options?.retryableErrors || [
    'TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'INTERNAL_ERROR'
  ];

  // 装饰所有公共方法
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(api))
    .filter(name => typeof (api as any)[name] === 'function' && name !== 'constructor');

  for (const methodName of methods) {
    const originalMethod = (api as any)[methodName].bind(api);

    (api as any)[methodName] = async function(...args: any[]) {
      let lastError: any;
      let delay = retryDelay;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod(...args);
        } catch (error) {
          lastError = error;

          // 检查是否可重试
          const errorCode = (error as any).code || (error as any).message;
          const isRetryable = retryableErrors.some(code => 
            errorCode.includes(code)
          );

          if (!isRetryable || attempt === maxRetries) {
            throw error;
          }

          console.warn(
            `[Retry] ${api.constructor.name}.${methodName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
            { error: error instanceof Error ? error.message : String(error) }
          );

          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= backoffFactor;
        }
      }

      throw lastError;
    };
  }

  return api;
}

/**
 * 组合装饰器
 * 一次性应用多个装饰器
 * 
 * @param api API实例
 * @param decorators 装饰器数组
 * @returns 装饰后的API实例
 */
export function decorate<T extends GenericResourceAPI<any, any, any>>(
  api: T,
  decorators: Array<(api: T, options?: any) => T>
): T {
  return decorators.reduce((decoratedApi, decorator) => decorator(decoratedApi), api);
}