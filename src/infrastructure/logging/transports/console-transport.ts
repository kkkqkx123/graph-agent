/**
 * 控制台日志传输器
 */

import { LogEntry, ConsoleLogOutputConfig } from '../interfaces';
import { BaseTransport } from './base-transport';
import { FormatterFactory } from '../formatters';

/**
 * 控制台传输器
 */
export class ConsoleTransport extends BaseTransport {
  readonly name = 'console';
  private formatterFactory: FormatterFactory;

  constructor(config: ConsoleLogOutputConfig) {
    super(config);
    this.formatterFactory = FormatterFactory.getInstance();
  }

  /**
   * 记录日志到控制台
   */
  async log(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formattedMessage = this.formatMessage(entry);
    this.writeToConsole(entry.level, formattedMessage);
  }

  /**
   * 格式化消息
   */
  private formatMessage(entry: LogEntry): string {
    const formatter = this.formatterFactory.createFormatter(this.config.format);
    return formatter.format(entry);
  }

  /**
   * 写入控制台
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

  /**
   * 获取控制台配置
   */
  getConsoleConfig(): ConsoleLogOutputConfig {
    return this.config as ConsoleLogOutputConfig;
  }
}