/**
 * 日志系统类型定义
 * 从shared/types/logger.ts迁移而来
 */

/**
 * 日志级别
 */
export enum LogLevel {
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
 * 日志条目接口
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: LogContext;
  error?: Error;
  meta?: Record<string, any>;
}

/**
 * 日志记录器接口 - 简化版本
 * 
 * 设计决策：为了保持接口简洁，不提供child()方法。
 * 如需为特定模块添加上下文，在模块中定义常量并显式传递。
 * 详见: LOGGER_CHILD_NECESSITY_ANALYSIS.md
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  fatal(message: string, error?: Error, context?: LogContext): void;

  // 刷新缓冲区
  flush?(): Promise<void>;

  // 关闭日志记录器
  close?(): Promise<void>;
}
