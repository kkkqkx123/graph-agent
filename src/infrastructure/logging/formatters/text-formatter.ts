/**
 * 文本日志格式化器
 */

import { LogEntry } from '../interfaces';
import { BaseFormatter } from './base-formatter';
import { SensitiveDataUtils } from '../utils';

/**
 * 文本格式化器选项
 */
export interface TextFormatterOptions {
  /**
   * 是否使用颜色
   */
  colorize?: boolean;

  /**
   * 是否包含时间戳
   */
  includeTimestamp?: boolean;

  /**
   * 时间戳格式
   */
  timestampFormat?: 'iso' | 'locale' | 'unix';

  /**
   * 是否包含上下文
   */
  includeContext?: boolean;

  /**
   * 是否包含错误堆栈
   */
  includeStack?: boolean;

  /**
   * 是否脱敏敏感数据
   */
  sanitize?: boolean;

  /**
   * 分隔符
   */
  separator?: string;

  /**
   * 自定义前缀
   */
  prefix?: string;

  /**
   * 自定义后缀
   */
  suffix?: string;
}

/**
 * 文本日志格式化器
 */
export class TextFormatter extends BaseFormatter {
  readonly name = 'text';
  private options: TextFormatterOptions;

  constructor(options: TextFormatterOptions = {}) {
    super();
    this.options = {
      colorize: true,
      includeTimestamp: true,
      timestampFormat: 'iso',
      includeContext: true,
      includeStack: true,
      sanitize: true,
      separator: ' | ',
      ...options
    };
  }

  /**
   * 格式化日志条目为文本
   */
  format(entry: LogEntry): string {
    const parts: string[] = [];

    // 添加前缀
    if (this.options.prefix) {
      parts.push(this.options.prefix);
    }

    // 添加时间戳
    if (this.options.includeTimestamp) {
      parts.push(this.formatTimestampByFormat(entry.timestamp));
    }

    // 添加日志级别
    const level = this.formatLevel(entry.level.toUpperCase());
    if (this.options.colorize) {
      const colorCode = this.getLevelColorCode(entry.level);
      const resetCode = this.resetColor();
      parts.push(`${colorCode}${level}${resetCode}`);
    } else {
      parts.push(level);
    }

    // 添加消息
    let message = entry.message;
    if (this.options.sanitize) {
      const sensitiveConfig = SensitiveDataUtils.createDefaultConfig();
      message = SensitiveDataUtils.sanitize(message, sensitiveConfig);
    }
    parts.push(message);

    // 添加上下文
    if (this.options.includeContext && entry.context) {
      const context = this.formatContext(entry.context);
      if (context) {
        parts.push(context);
      }
    }

    // 添加错误信息
    if (entry.error) {
      const errorInfo = this.formatErrorInfo(entry.error);
      parts.push(errorInfo);
    }

    // 添加元数据
    if (entry.meta) {
      const meta = this.formatMeta(entry.meta);
      if (meta) {
        parts.push(meta);
      }
    }

    // 添加后缀
    if (this.options.suffix) {
      parts.push(this.options.suffix);
    }

    return parts.join(this.options.separator);
  }

  /**
   * 根据格式格式化时间戳
   */
  private formatTimestampByFormat(timestamp: Date): string {
    switch (this.options.timestampFormat) {
      case 'iso':
        return this.formatTimestamp(timestamp);
      case 'locale':
        return timestamp.toLocaleString();
      case 'unix':
        return timestamp.getTime().toString();
      default:
        return this.formatTimestamp(timestamp);
    }
  }

  /**
   * 格式化错误信息
   */
  private formatErrorInfo(error: Error): string {
    let errorInfo = `${error.name}: ${error.message}`;
    
    if (this.options.includeStack && error.stack) {
      errorInfo += `\n${error.stack}`;
    }

    if (this.options.sanitize) {
      const sensitiveConfig = SensitiveDataUtils.createDefaultConfig();
      errorInfo = SensitiveDataUtils.sanitize(errorInfo, sensitiveConfig);
    }

    return errorInfo;
  }

  /**
   * 格式化错误对象
   */
  formatError(error: Error): string {
    return this.formatErrorInfo(error);
  }
}