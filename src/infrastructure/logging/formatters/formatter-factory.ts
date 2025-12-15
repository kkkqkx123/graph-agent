/**
 * 日志格式化器工厂
 */

import { ILoggerFormatter, ILoggerFormatterFactory, LogFormatType } from '../interfaces';
import { JsonFormatter, JsonFormatterOptions } from './json-formatter';
import { TextFormatter, TextFormatterOptions } from './text-formatter';

/**
 * 格式化器工厂实现
 */
export class FormatterFactory implements ILoggerFormatterFactory {
  private static instance: FormatterFactory;
  private formatters: Map<LogFormatType, () => ILoggerFormatter> = new Map();

  private constructor() {
    this.registerDefaultFormatters();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): FormatterFactory {
    if (!FormatterFactory.instance) {
      FormatterFactory.instance = new FormatterFactory();
    }
    return FormatterFactory.instance;
  }

  /**
   * 创建格式化器
   */
  createFormatter(format: LogFormatType, options?: any): ILoggerFormatter {
    const factory = this.formatters.get(format);
    if (!factory) {
      throw new Error(`不支持的日志格式: ${format}`);
    }
    return factory();
  }

  /**
   * 检查是否支持指定格式
   */
  supports(format: LogFormatType): boolean {
    return this.formatters.has(format);
  }

  /**
   * 注册格式化器
   */
  registerFormatter(format: LogFormatType, factory: () => ILoggerFormatter): void {
    this.formatters.set(format, factory);
  }

  /**
   * 注册JSON格式化器
   */
  private registerJsonFormatter(): void {
    this.formatters.set(LogFormatType.JSON, () => {
      const options: JsonFormatterOptions = {
        pretty: false,
        includeTimestamp: true,
        includeLevel: true,
        includeContext: true,
        includeStack: true,
        sanitize: true
      };
      return new JsonFormatter(options);
    });
  }

  /**
   * 注册文本格式化器
   */
  private registerTextFormatter(): void {
    this.formatters.set(LogFormatType.TEXT, () => {
      const options: TextFormatterOptions = {
        colorize: true,
        includeTimestamp: true,
        timestampFormat: 'iso',
        includeContext: true,
        includeStack: true,
        sanitize: true,
        separator: ' | '
      };
      return new TextFormatter(options);
    });
  }

  /**
   * 注册默认格式化器
   */
  private registerDefaultFormatters(): void {
    this.registerJsonFormatter();
    this.registerTextFormatter();
  }

  /**
   * 获取所有支持的格式
   */
  getSupportedFormats(): LogFormatType[] {
    return Array.from(this.formatters.keys());
  }

  /**
   * 创建自定义JSON格式化器
   */
  createJsonFormatter(options: JsonFormatterOptions): JsonFormatter {
    return new JsonFormatter(options);
  }

  /**
   * 创建自定义文本格式化器
   */
  createTextFormatter(options: TextFormatterOptions): TextFormatter {
    return new TextFormatter(options);
  }
}