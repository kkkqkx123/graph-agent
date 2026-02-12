/**
 * 日志模块类型定义
 * 基于pino设计思想的轻量级日志系统
 */

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'off';

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
 * 日志上下文
 * 用于存储包名、模块名等元信息
 */
export interface LoggerContext {
  pkg?: string;
  module?: string;
  [key: string]: any;
}

/**
 * 日志输出函数类型
 * @param level 日志级别
 * @param message 日志消息
 * @param context 日志上下文
 */
export type LogOutput = (level: LogLevel, message: string, context?: LoggerContext) => void;

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

  /**
   * 是否异步输出，默认为false
   */
  async?: boolean;

  /**
   * 批量大小，仅在async=true时有效，默认为10
   */
  batchSize?: number;

  /**
   * 是否使用JSON格式输出，默认为false
   */
  json?: boolean;

  /**
   * 是否包含时间戳，默认为true
   */
  timestamp?: boolean;
}

/**
 * 日志接口
 * 提供统一的日志操作
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

  /**
   * 创建子记录器
   * @param name 子记录器名称
   * @param additionalContext 额外的上下文信息
   * @returns 子记录器实例
   */
  child(name: string, additionalContext?: LoggerContext): Logger;

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void;

  /**
   * 获取当前日志级别
   * @returns 当前日志级别
   */
  getLevel(): LogLevel;

  /**
   * 检查指定级别是否启用
   * @param level 日志级别
   * @returns 是否启用
   */
  isLevelEnabled(level: LogLevel): boolean;
}

/**
 * 包级别日志器配置
 */
export interface PackageLoggerOptions extends LoggerOptions {
  /**
   * 包名
   */
  pkg: string;
}