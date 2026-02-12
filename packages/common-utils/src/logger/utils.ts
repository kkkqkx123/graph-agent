/**
 * 日志工具函数
 * 基于pino设计思想的性能优化工具
 */

import type { LogLevel, LoggerContext, LogEntry } from './types';
import { LOG_LEVEL_PRIORITY } from './types';

/**
 * 检查日志级别是否应该输出
 * @param currentLevel 当前配置的日志级别
 * @param messageLevel 消息的日志级别
 * @returns 是否应该输出该日志
 */
export function shouldLog(currentLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[currentLevel];
}

/**
 * 格式化时间戳
 * @returns ISO格式的时间戳
 */
export function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 合并上下文对象
 * @param base 基础上下文
 * @param additional 额外上下文
 * @returns 合并后的上下文
 */
export function mergeContext(base: LoggerContext, additional: LoggerContext = {}): LoggerContext {
  return { ...base, ...additional };
}

/**
 * 创建日志条目
 * @param level 日志级别
 * @param message 日志消息
 * @param context 日志上下文
 * @param timestamp 是否包含时间戳
 * @returns 日志条目
 */
export function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LoggerContext,
  timestamp: boolean = true
): LogEntry {
  const entry: LogEntry = {
    level,
    message
  };

  if (timestamp) {
    entry.timestamp = formatTimestamp();
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  return entry;
}