/**
 * Winston日志记录器实现
 */

import { ILogger, LogLevel, LogContext } from '@shared/types/logger';
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
   * 记录TRACE级别日志
   */
  trace(message: string, context?: LogContext): void {
    this.log(LogLevel.TRACE, message, undefined, context);
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
   * 创建子日志记录器
   */
  child(context: LogContext): ILogger {
    const mergedContext = { ...this.context, ...context };
    return new Logger(this.config, mergedContext);
  }

  /**
   * 记录日志的核心方法
   */
  private async log(level: LogLevel, message: string, error?: Error, context?: LogContext): Promise<void> {
    // 检查是否应该记录此级别的日志
    if (!this.shouldLog(level)) {
      return;
    }

    // 创建日志条目
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: { ...this.context, ...context },
      error,
      meta: this.config.meta
    };

    // 异步写入所有传输器
    const promises = this.transports
      .filter(transport => transport.shouldLog(level))
      .map(transport => transport.log(entry));

    try {
      await Promise.all(promises);
    } catch (error) {
      // 如果日志写入失败，输出到控制台
      console.error('日志写入失败:', error);
    }
  }

  /**
   * 检查是否应该记录指定级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    return LogLevelUtils.shouldLog(this.config.level, level);
  }

  /**
   * 初始化传输器
   */
  private initializeTransports(): void {
    this.transports = this.config.outputs.map(outputConfig => {
      return this.createTransport(outputConfig);
    });
  }

  /**
   * 创建传输器
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
   * 刷新所有传输器
   */
  async flush(): Promise<void> {
    const promises = this.transports
      .filter(transport => transport.flush)
      .map(transport => transport.flush());

    await Promise.all(promises);
  }

  /**
   * 关闭日志记录器
   */
  async close(): Promise<void> {
    const promises = this.transports
      .filter(transport => transport.close)
      .map(transport => transport.close());

    await Promise.all(promises);
    this.transports = [];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 重新初始化传输器
    this.transports.forEach(transport => {
      if (transport.close) {
        transport.close();
      }
    });
    
    this.initializeTransports();
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

  /**
   * 检查是否有启用的传输器
   */
  hasEnabledTransports(): boolean {
    return this.transports.some(transport => transport.isEnabled());
  }

  /**
   * 获取传输器数量
   */
  getTransportCount(): number {
    return this.transports.length;
  }
}