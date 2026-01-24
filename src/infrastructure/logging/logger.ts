/**
 * 日志记录器实现 - 简化为同步日志记录
 */

import { ILogger, LogLevel, LogContext } from '../../domain/common/types/logger-types';
import { LoggerConfig, LogEntry, LogOutputType } from './interfaces';
import { ConsoleTransport } from './transports/console-transport';
import { FileTransport } from './transports/file-transport';
import { LogLevelUtils } from './utils';

/**
 * Winston日志记录器实现
 */
export class Logger implements ILogger {
  private transports: any[] = [];
  private config: LoggerConfig;
  private context: LogContext;

  constructor(config: LoggerConfig, context: LogContext = {}) {
    this.config = config;
    this.context = context;
    this.initializeTransports();
  }

  /**
   * 记录DEBUG级别日志
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  /**
   * 记录INFO级别日志
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  /**
   * 记录WARN级别日志
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, undefined, context);
  }

  /**
   * 记录ERROR级别日志
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, error, context);
  }

  /**
   * 记录FATAL级别日志
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, error, context);
  }

  /**
   * 记录日志方法
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: LogContext
  ): void {
    // 在Logger层检查日志级别，避免不必要的对象创建
    if (!LogLevelUtils.shouldLog(this.config.level, level)) {
      return;
    }

    // 创建日志条目
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: { ...this.context, ...context },
      error,
      meta: this.config.meta,
    };

    // 同步分发到所有启用的传输器（Fire-and-Forget）
    for (const transport of this.transports) {
      if (transport.shouldLog?.(level) !== false) {
        try {
          transport.log(entry);
        } catch (err) {
          console.error(`Transport ${transport.name} 日志写入失败:`, err);
        }
      }
    }
  }

  /**
   * 初始化传输器
   */
  private initializeTransports(): void {
    this.transports = this.config.outputs
      .filter(outputConfig => outputConfig.enabled !== false)
      .map(outputConfig => this.createTransport(outputConfig));
  }

  /**
   * 创建传输器实例
   */
  private createTransport(config: any) {
    switch (config.type) {
      case LogOutputType.CONSOLE:
        return new ConsoleTransport(config);
      case LogOutputType.FILE:
        return new FileTransport(config);
      default:
        throw new Error(`不支持的日志传输器类型: ${config.type}`);
    }
  }

  /**
   * 关闭日志记录器和所有传输器
   */
  async close(): Promise<void> {
    const promises = this.transports
      .filter(transport => transport.close)
      .map(transport => transport.close());

    await Promise.all(promises);
    this.transports = [];
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 获取当前上下文
   */
  getContext(): LogContext {
    return { ...this.context };
  }
}
