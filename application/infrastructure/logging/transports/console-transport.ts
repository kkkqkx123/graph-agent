/**
 * 控制台日志传输器
 */

import { LogEntry } from '../../../domain/common/types/logger-types';
import { ConsoleLogOutputConfig } from '../logger-config';
import { BaseTransport } from './base-transport';
import { FormatterFactory } from '../formatters/formatter-factory';

/**
 * 控制台传输器
 */
export class ConsoleTransport extends BaseTransport {
  readonly name = 'console';
  private formatter: any;

  constructor(config: ConsoleLogOutputConfig) {
    super(config);
    this.formatter = FormatterFactory.createConsoleFormatter(config);
  }

  /**
   * 记录日志到控制台
   */
  log(entry: LogEntry): void {
    // 移除日志级别检查，由Logger统一处理
    const formattedMessage = this.formatter.format(entry);
    this.writeToConsole(entry.level, formattedMessage);
  }

  /**
   * 写入控制台（按级别选择不同的console方法）
   */
  private writeToConsole(level: string, message: string): void {
    switch (level.toLowerCase()) {
      case 'error':
      case 'fatal':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'debug':
      case 'trace':
        console.debug(message);
        break;
      default:
        console.log(message);
        break;
    }
  }
}
