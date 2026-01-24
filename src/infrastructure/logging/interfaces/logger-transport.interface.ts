/**
 * 日志传输器接口定义 - 简化版本
 */

import { LogLevel, LogContext } from '../../../domain/common/types/logger-types';
import { LogOutputConfig, LogFormatType } from './logger-config.interface';

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
 * 日志传输器接口
 */
export interface ILoggerTransport {
  /**
   * 传输器名称
   */
  readonly name: string;

  /**
   * 传输器配置
   */
  readonly config: LogOutputConfig;

  /**
   * 记录日志（同步方法）
   */
  log(entry: LogEntry): void;

  /**
   * 关闭传输器（可选）
   */
  close?(): Promise<void>;

  /**
   * 检查是否应该处理此日志（可选）
   */
  shouldLog?(level: LogLevel): boolean;
}

/**
 * 日志格式化器接口
 */
export interface ILoggerFormatter {
  /**
   * 格式化器名称
   */
  readonly name: string;

  /**
   * 格式化日志条目
   */
  format(entry: LogEntry): string;

  /**
   * 格式化错误对象
   */
  formatError?(error: Error): string;
}

/**
 * 日志过滤器接口
 */
export interface ILoggerFilter {
  /**
   * 过滤器名称
   */
  readonly name: string;

  /**
   * 检查是否应该记录此日志条目
   */
  shouldLog(entry: LogEntry): boolean;
}
