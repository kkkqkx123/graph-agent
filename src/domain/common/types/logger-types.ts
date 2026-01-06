/**
 * 日志系统类型定义
 * 从shared/types/logger.ts迁移而来
 */

/**
 * 日志级别
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * 日志上下文
 */
export interface LogContext {
  [key: string]: any;
}

/**
 * 日志记录器接口
 */
export interface ILogger {
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  fatal(message: string, error?: Error, context?: LogContext): void;

  // 创建子日志记录器
  child(context: LogContext): ILogger;

  // 刷新缓冲区
  flush?(): Promise<void>;

  // 关闭日志记录器
  close?(): Promise<void>;
}
