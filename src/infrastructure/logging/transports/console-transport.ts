/**
 * 控制台日志传输器
 */

import { LogEntry, ConsoleLogOutputConfig, LogFormatType } from '../interfaces';
import { BaseTransport } from './base-transport';
import { JsonFormatter, JsonFormatterOptions } from '../formatters/json-formatter';
import { TextFormatter, TextFormatterOptions } from '../formatters/text-formatter';

/**
 * 控制台传输器
 */
export class ConsoleTransport extends BaseTransport {
  readonly name = 'console';

  constructor(config: ConsoleLogOutputConfig) {
    super(config);
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
    const formatter = this.createFormatter(this.config.format);
    return formatter.format(entry);
  }

  /**
   * 创建格式化器
   */
  private createFormatter(format: LogFormatType) {
    switch (format) {
      case LogFormatType.JSON:
        const jsonOptions: JsonFormatterOptions = {
          pretty: false,
          includeTimestamp: true,
          includeLevel: true,
          includeContext: true,
          includeStack: true,
          sanitize: true
        };
        return new JsonFormatter(jsonOptions);
      
      case LogFormatType.TEXT:
        const consoleConfig = this.config as ConsoleLogOutputConfig;
        const textOptions: TextFormatterOptions = {
          colorize: consoleConfig.colorize !== false, // 默认启用颜色
          includeTimestamp: true,
          timestampFormat: 'iso',
          includeContext: true,
          includeStack: true,
          sanitize: true,
          separator: ' | '
        };
        return new TextFormatter(textOptions);
      
      default:
        throw new Error(`不支持的日志格式: ${format}`);
    }
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