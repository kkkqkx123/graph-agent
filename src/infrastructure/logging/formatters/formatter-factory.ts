/**
 * 日志格式化器工厂 - 消除transport中的重复formatter创建代码
 */

import { LogFormatType, ConsoleLogOutputConfig, FileLogOutputConfig } from '../logger-config';
import { JsonFormatter, JsonFormatterOptions } from './json-formatter';
import { TextFormatter, TextFormatterOptions } from './text-formatter';
import { InvalidConfigurationError } from '../../../common/exceptions';

/**
 * Formatter工厂 - 统一管理formatter创建逻辑
 */
export class FormatterFactory {
  /**
   * 为控制台输出创建formatter
   */
  static createConsoleFormatter(config: ConsoleLogOutputConfig) {
    switch (config.format) {
      case LogFormatType.JSON:
        return new JsonFormatter({
          pretty: false,
          includeTimestamp: true,
          includeLevel: true,
          includeContext: true,
          includeStack: true,
          sanitize: true,
        });

      case LogFormatType.TEXT:
        return new TextFormatter({
          colorize: config.colorize !== false,
          includeTimestamp: config.timestamp !== false,
          timestampFormat: 'iso',
          includeContext: true,
          includeStack: true,
          sanitize: true,
          separator: ' | ',
        });

      default:
        throw new InvalidConfigurationError('format', `不支持的日志格式: ${config.format}`);
    }
  }

  /**
   * 为文件输出创建formatter
   */
  static createFileFormatter(config: FileLogOutputConfig) {
    switch (config.format) {
      case LogFormatType.JSON:
        return new JsonFormatter({
          pretty: false,
          includeTimestamp: true,
          includeLevel: true,
          includeContext: true,
          includeStack: true,
          sanitize: true,
        });

      case LogFormatType.TEXT:
        return new TextFormatter({
          colorize: false, // 文件输出不需要颜色
          includeTimestamp: true,
          timestampFormat: 'iso',
          includeContext: true,
          includeStack: true,
          sanitize: true,
          separator: ' | ',
        });

      default:
        throw new InvalidConfigurationError('format', `不支持的日志格式: ${config.format}`);
    }
  }
}
