/**
 * 日志模块类型定义
 * 定义日志系统的核心类型和接口
 */

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'off';

/**
 * 日志接口
 * 与HttpLogger接口兼容，提供统一的日志操作
 */
export interface Logger {
  /**
   * 调试级别日志
   * @param message 日志消息
   * @param context 上下文信息（可选）
   */
  debug(message: string, context?: Record<string, any>): void;

  /**
   * 信息级别日志
   * @param message 日志消息
   * @param context 上下文信息（可选）
   */
  info(message: string, context?: Record<string, any>): void;

  /**
   * 警告级别日志
   * @param message 日志消息
   * @param context 上下文信息（可选）
   */
  warn(message: string, context?: Record<string, any>): void;

  /**
   * 错误级别日志
   * @param message 日志消息
   * @param context 上下文信息（可选）
   */
  error(message: string, context?: Record<string, any>): void;
}

/**
 * 日志输出函数类型
 * @param level 日志级别
 * @param message 日志消息
 * @param context 上下文信息
 */
export type LogOutput = (level: LogLevel, message: string, context?: Record<string, any>) => void;

/**
 * 日志器配置选项
 */
export interface LoggerOptions {
  /**
   * 日志级别，默认为'info'
   */
  level?: LogLevel;

  /**
   * 日志器名称/前缀，用于标识日志来源
   */
  name?: string;

  /**
   * 自定义输出函数，默认使用console
   */
  output?: LogOutput;
}

/**
 * 日志级别优先级映射
 * 用于比较日志级别的高低
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  off: 4
};

/**
 * 检查日志级别是否应该输出
 * @param currentLevel 当前配置的日志级别
 * @param messageLevel 消息的日志级别
 * @returns 是否应该输出该日志
 */
export function shouldLog(currentLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[currentLevel];
}