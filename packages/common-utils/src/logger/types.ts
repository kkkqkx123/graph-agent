/**
 * 日志模块类型定义
 * 基于pino设计思想的流式日志系统
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
 * 日志条目
 * 流式输出的标准数据格式
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp?: string;
  context?: LoggerContext;
  [key: string]: any;
}

/**
 * LogStream接口
 * 统一的日志输出抽象
 */
export interface LogStream {
  /**
   * 写入日志条目
   * @param entry 日志条目
   */
  write(entry: LogEntry): void;

  /**
   * 刷新缓冲区（可选）
   * @param callback 完成回调
   */
  flush?(callback?: () => void): void;

  /**
   * 结束stream（可选）
   */
  end?(): void;

  /**
   * 事件监听（可选）
   * @param event 事件名称
   * @param handler 事件处理器
   */
  on?(event: string, handler: (...args: any[]) => void): void;

  /**
   * 移除事件监听（可选）
   * @param event 事件名称
   * @param handler 事件处理器
   */
  off?(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Stream配置选项
 */
export interface StreamOptions {
  /**
   * 是否使用JSON格式输出
   */
  json?: boolean;

  /**
   * 是否包含时间戳
   */
  timestamp?: boolean;

  /**
   * 是否使用彩色输出（仅console）
   */
  pretty?: boolean;

  /**
   * 批量大小（仅async stream）
   */
  batchSize?: number;

  /**
   * 文件路径（仅file stream）
   */
  filePath?: string;

  /**
   * 是否追加到文件（仅file stream）
   */
  append?: boolean;
}

/**
 * Multistream配置
 */
export interface MultistreamOptions {
  /**
   * 是否去重
   */
  dedupe?: boolean;

  /**
   * 自定义级别映射
   */
  levels?: Record<string, number>;
}

/**
 * StreamEntry
 * Multistream中的stream条目
 */
export interface StreamEntry {
  /**
   * Stream实例
   */
  stream: LogStream;

  /**
   * 日志级别
   */
  level?: LogLevel | number;

  /**
   * 级别数值
   */
  levelVal?: number;

  /**
   * Stream ID（用于移除）
   */
  id?: number;
}

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
   * 日志输出stream
   */
  stream?: LogStream;

  /**
   * 是否使用JSON格式输出（当使用默认stream时）
   */
  json?: boolean;

  /**
   * 是否包含时间戳（当使用默认stream时）
   */
  timestamp?: boolean;

  /**
   * 是否使用彩色输出（当使用默认stream时）
   */
  pretty?: boolean;

  /**
   * 基础上下文
   */
  base?: LoggerContext;
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

  /**
   * 刷新日志缓冲区
   * @param callback 完成回调
   */
  flush?(callback?: () => void): void;
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