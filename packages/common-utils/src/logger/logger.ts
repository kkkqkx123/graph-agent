/**
 * 日志器核心实现
 * 基于pino设计思想的轻量级日志系统
 * 支持child logger模式和性能优化
 */

import type { Logger, LogLevel, LoggerContext, LoggerOptions, PackageLoggerOptions } from './types';
import { createConsoleOutput, createAsyncOutput, mergeContext, shouldLog } from './utils';

/**
 * 基础日志器实现
 * 支持child logger模式和性能优化
 */
class BaseLogger implements Logger {
  protected level: LogLevel;
  protected context: LoggerContext;
  protected output: (level: LogLevel, message: string, context?: LoggerContext) => void;
  protected name?: string;

  constructor(options: LoggerOptions = {}, parentContext: LoggerContext = {}) {
    this.level = options.level || 'info';
    this.name = options.name;
    this.context = { ...parentContext };
    
    // 根据配置创建输出函数
    if (options.async) {
      this.output = createAsyncOutput(options);
    } else {
      this.output = createConsoleOutput(options);
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 检查指定级别是否启用
   */
  isLevelEnabled(level: LogLevel): boolean {
    return shouldLog(this.level, level);
  }

  /**
   * 调试级别日志
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled('debug')) {
      const mergedContext = mergeContext(this.context, context);
      this.output('debug', message, mergedContext);
    }
  }

  /**
   * 信息级别日志
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled('info')) {
      const mergedContext = mergeContext(this.context, context);
      this.output('info', message, mergedContext);
    }
  }

  /**
   * 警告级别日志
   */
  warn(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled('warn')) {
      const mergedContext = mergeContext(this.context, context);
      this.output('warn', message, mergedContext);
    }
  }

  /**
   * 错误级别日志
   */
  error(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled('error')) {
      const mergedContext = mergeContext(this.context, context);
      this.output('error', message, mergedContext);
    }
  }

  /**
   * 创建子记录器
   * 类似pino的child logger模式
   * @param name 子记录器名称
   * @param additionalContext 额外的上下文信息
   * @returns 子记录器实例
   */
  child(name: string, additionalContext: LoggerContext = {}): Logger {
    const childOptions: LoggerOptions = {
      level: this.level,
      name: this.name ? `${this.name}.${name}` : name,
      async: this.output === createAsyncOutput({}) // 简单判断是否异步
    };
    
    const childContext = mergeContext(this.context, {
      module: name,
      ...additionalContext
    });
    
    return new BaseLogger(childOptions, childContext);
  }
}

/**
 * 空操作日志器
 * 用于禁用日志输出
 */
class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  
  child(): Logger {
    return this;
  }
  
  setLevel(): void {}
  getLevel(): LogLevel {
    return 'off';
  }
  
  isLevelEnabled(): boolean {
    return false;
  }
}

// 全局日志器实例
let globalLogger: Logger = new BaseLogger({ level: 'info' });

/**
 * 创建日志器实例
 * @param options 日志器配置选项
 * @returns Logger实例
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new BaseLogger(options);
}

/**
 * 创建包级别日志器
 * 这是推荐的创建日志器的方式
 * @param pkg 包名
 * @param options 日志器配置选项
 * @returns Logger实例
 */
export function createPackageLogger(pkg: string, options: Omit<LoggerOptions, 'name'> = {}): Logger {
  const packageOptions: LoggerOptions = {
    ...options,
    name: pkg
  };
  
  const packageContext: LoggerContext = {
    pkg
  };
  
  return new BaseLogger(packageOptions, packageContext);
}

/**
 * 创建默认的console日志器
 * @param level 日志级别，默认为'info'
 * @returns Logger实例
 */
export function createConsoleLogger(level: LogLevel = 'info'): Logger {
  return new BaseLogger({ level });
}

/**
 * 创建空操作日志器
 * 用于禁用日志输出
 * @returns Logger实例
 */
export function createNoopLogger(): Logger {
  return new NoopLogger();
}

/**
 * 设置全局日志器
 * @param logger 日志器实例
 */
export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * 获取全局日志器
 * @returns 全局Logger实例
 */
export function getGlobalLogger(): Logger {
  return globalLogger;
}

/**
 * 设置全局日志级别
 * @param level 日志级别
 */
export function setGlobalLogLevel(level: LogLevel): void {
  if (globalLogger instanceof BaseLogger) {
    globalLogger.setLevel(level);
  } else {
    // 如果全局日志器不是BaseLogger实例，创建一个新的
    globalLogger = new BaseLogger({ level });
  }
}

/**
 * 获取全局日志级别
 * @returns 当前全局日志级别
 */
export function getGlobalLogLevel(): LogLevel {
  return globalLogger.getLevel();
}