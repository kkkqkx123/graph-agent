/**
 * CLI 日志工具
 * 基于项目通用日志系统，提供 CLI 特定的日志功能
 */

import { createPackageLogger, type Logger } from '@modular-agent/common-utils';
import chalk from 'chalk';

export interface LoggerOptions {
  verbose?: boolean;
  debug?: boolean;
}

/**
 * 创建 CLI 日志记录器实例
 */
export function createLogger(options: LoggerOptions = {}): CLILogger {
  const baseLogger = createPackageLogger('cli-app', {
    level: options.debug ? 'debug' : options.verbose ? 'info' : 'warn',
    pretty: true,
    timestamp: true
  });

  return new CLILogger(baseLogger, options);
}

/**
 * CLI 日志记录器
 * 扩展基础日志器，添加 CLI 特定的功能
 */
class CLILogger {
  private logger: Logger;
  private options: LoggerOptions;

  constructor(logger: Logger, options: LoggerOptions) {
    this.logger = logger;
    this.options = options;
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
    return new CLILogger(childLogger, this.options);
  }
}