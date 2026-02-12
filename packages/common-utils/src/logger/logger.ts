/**
 * 日志器核心实现
 * 提供Logger类和工厂函数
 */

import type { Logger, LogLevel, LoggerOptions, LogOutput } from './types';
import { shouldLog } from './types';
import { createConsoleOutput, formatLogMessage } from './utils';

/**
 * Logger类实现
 */
class LoggerImpl implements Logger {
  private level: LogLevel;
  private name?: string;
  private output: LogOutput;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.name = options.name;
    this.output = options.output || createConsoleOutput();
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
   * 调试级别日志
   */
  debug(message: string, context?: Record<string, any>): void {
    if (shouldLog(this.level, 'debug')) {
      const formattedMessage = this.name ? formatLogMessage('debug', message, this.name) : message;
      this.output('debug', formattedMessage, context);
    }
  }

  /**
   * 信息级别日志
   */
  info(message: string, context?: Record<string, any>): void {
    if (shouldLog(this.level, 'info')) {
      const formattedMessage = this.name ? formatLogMessage('info', message, this.name) : message;
      this.output('info', formattedMessage, context);
    }
  }

  /**
   * 警告级别日志
   */
  warn(message: string, context?: Record<string, any>): void {
    if (shouldLog(this.level, 'warn')) {
      const formattedMessage = this.name ? formatLogMessage('warn', message, this.name) : message;
      this.output('warn', formattedMessage, context);
    }
  }

  /**
   * 错误级别日志
   */
  error(message: string, context?: Record<string, any>): void {
    if (shouldLog(this.level, 'error')) {
      const formattedMessage = this.name ? formatLogMessage('error', message, this.name) : message;
      this.output('error', formattedMessage, context);
    }
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
}

// 全局日志器实例
let globalLogger: Logger = new LoggerImpl({ level: 'info' });

/**
 * 创建日志器实例
 * @param options 日志器配置选项
 * @returns Logger实例
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new LoggerImpl(options);
}

/**
 * 创建默认的console日志器
 * @param level 日志级别，默认为'info'
 * @returns Logger实例
 */
export function createConsoleLogger(level: LogLevel = 'info'): Logger {
  return new LoggerImpl({ level, output: createConsoleOutput() });
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
  if (globalLogger instanceof LoggerImpl) {
    globalLogger.setLevel(level);
  } else {
    // 如果全局日志器不是LoggerImpl实例，创建一个新的
    globalLogger = new LoggerImpl({ level });
  }
}

/**
 * 获取全局日志级别
 * @returns 当前全局日志级别
 */
export function getGlobalLogLevel(): LogLevel {
  if (globalLogger instanceof LoggerImpl) {
    return globalLogger.getLevel();
  }
  return 'info';
}