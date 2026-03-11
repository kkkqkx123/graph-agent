/**
 * CLI 日志工具
 * 基于项目通用日志系统，提供 CLI 特定的日志功能
 */

import {
  createPackageLogger,
  createMultistream,
  createFileStream,
  type Logger,
  type LogStream
} from '@modular-agent/common-utils';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import { initializeLogTerminal, getLogTerminal } from '../terminal/log-terminal.js';

export interface LoggerOptions {
  verbose?: boolean;
  debug?: boolean;
  logFile?: string;  // 日志文件路径
  useTerminal?: boolean;  // 是否使用独立终端显示日志
}

// 全局 logger 实例
let globalLogger: CLILogger | null = null;

/**
 * 获取默认日志文件路径
 */
function getDefaultLogFilePath(): string {
  // 在项目根目录下创建 logs 文件夹
  const logDir = path.join(process.cwd(), 'logs');
  
  // 确保日志目录存在
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // 使用日期作为日志文件名
  const date = new Date().toISOString().split('T')[0];
  return path.join(logDir, `cli-app-${date}.log`);
}

/**
 * 初始化全局日志记录器
 * 应该在程序启动时调用一次
 */
export function initializeLogger(options: LoggerOptions = {}): CLILogger {
  if (globalLogger) {
    return globalLogger;
  }

  const logLevel = options.debug ? 'debug' : options.verbose ? 'info' : 'warn';
  const logFilePath = options.logFile || getDefaultLogFilePath();
  
  // 如果启用独立终端，启动日志终端
  if (options.useTerminal !== false) {
    try {
      initializeLogTerminal({ logFile: logFilePath });
    } catch (error) {
      // 如果无法启动独立终端，继续使用文件日志
      console.error(`无法启动日志终端: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // 创建文件输出流 - 记录所有日志到文件
  const fileStream = createFileStream({
    filePath: logFilePath,
    json: false,
    timestamp: true,
    append: true
  });

  const baseLogger = createPackageLogger('cli-app', {
    level: logLevel,
    stream: fileStream,
    timestamp: true
  });

  globalLogger = new CLILogger(baseLogger, options, fileStream);
  return globalLogger;
}

/**
 * 获取全局日志记录器实例
 * 如果未初始化，会使用默认配置初始化
 */
export function getLogger(): CLILogger {
  if (!globalLogger) {
    return initializeLogger();
  }
  return globalLogger;
}

/**
 * CLI 日志记录器
 * 扩展基础日志器，添加 CLI 特定的功能
 */
export class CLILogger {
  private logger: Logger;
  private options: LoggerOptions;
  private stream: LogStream;

  constructor(logger: Logger, options: LoggerOptions, stream: LogStream) {
    this.logger = logger;
    this.options = options;
    this.stream = stream;
  }

  /**
   * 调试级别日志
   */
  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, context);
  }

  /**
   * 信息级别日志
   */
  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, context);
  }

  /**
   * 警告级别日志
   */
  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, context);
  }

  /**
   * 错误级别日志
   */
  error(message: string, context?: Record<string, any>): void {
    this.logger.error(message, context);
  }

  /**
   * 成功消息（绿色）
   */
  success(message: string): void {
    console.log(chalk.green.bold('✓') + ' ' + message);
  }

  /**
   * 失败消息（红色）
   */
  fail(message: string): void {
    console.log(chalk.red.bold('✗') + ' ' + message);
  }

  /**
   * 信息提示（蓝色）
   */
  tip(message: string): void {
    console.log(chalk.blue.bold('ℹ') + ' ' + message);
  }

  /**
   * 警告提示（黄色）
   */
  warning(message: string): void {
    console.log(chalk.yellow.bold('⚠') + ' ' + message);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logger.setLevel(level);
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): string {
    return this.logger.getLevel();
  }

  /**
   * 创建子记录器
   */
  child(name: string): CLILogger {
    const childLogger = this.logger.child(name);
    return new CLILogger(childLogger, this.options, this.stream);
  }

  /**
   * 刷新日志缓冲区
   */
  flush(callback?: () => void): void {
    if (this.logger.flush) {
      this.logger.flush(callback);
    } else if (callback) {
      setImmediate(callback);
    }
  }

  /**
   * 结束日志流
   */
  end(): void {
    if (this.stream.end) {
      this.stream.end();
    }
    // 关闭日志终端
    try {
      getLogTerminal().close();
    } catch {
      // 忽略关闭错误
    }
  }
}