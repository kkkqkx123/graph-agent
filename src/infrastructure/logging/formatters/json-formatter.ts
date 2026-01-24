/**
 * JSON日志格式化器
 */

import { LogEntry } from '../../../domain/common/types/logger-types';
import { BaseFormatter } from './base-formatter';
import { RedactorUtils } from '../utils';

/**
 * JSON格式化器选项
 */
export interface JsonFormatterOptions {
  /**
   * 是否美化输出
   */
  pretty?: boolean;

  /**
   * 是否包含时间戳
   */
  includeTimestamp?: boolean;

  /**
   * 是否包含级别
   */
  includeLevel?: boolean;

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
   * 自定义字段
   */
  customFields?: Record<string, any>;
}

/**
 * JSON日志格式化器
 */
export class JsonFormatter extends BaseFormatter {
  readonly name = 'json';
  private options: JsonFormatterOptions;

  constructor(options: JsonFormatterOptions = {}) {
    super();
    this.options = {
      pretty: false,
      includeTimestamp: true,
      includeLevel: true,
      includeContext: true,
      includeStack: true,
      sanitize: true,
      ...options,
    };
  }

  /**
   * 格式化日志条目为JSON
   */
  format(entry: LogEntry): string {
    const logObject: Record<string, any> = {};

    // 添加时间戳
    if (this.options.includeTimestamp) {
      logObject['timestamp'] = this.formatTimestamp(entry.timestamp);
    }

    // 添加日志级别
    if (this.options.includeLevel) {
      logObject['level'] = entry.level;
    }

    // 添加消息
    logObject['message'] = entry.message;

    // 添加上下文
    if (this.options.includeContext && entry.context) {
      logObject['context'] = entry.context;
    }

    // 添加错误信息
    if (entry.error) {
      logObject['error'] = {
        name: entry.error.name,
        message: entry.error.message,
      };

      if (this.options.includeStack && entry.error.stack) {
        logObject['error']['stack'] = entry.error.stack;
      }
    }

    // 添加元数据
    if (entry.meta) {
      logObject['meta'] = entry.meta;
    }

    // 添加自定义字段
    if (this.options.customFields) {
      Object.assign(logObject, this.options.customFields);
    }

    // 脱敏敏感数据
    if (this.options.sanitize) {
      const sensitiveConfig = RedactorUtils.createDefaultConfig();
      return JSON.stringify(
        RedactorUtils.sanitizeObject(logObject, sensitiveConfig),
        null,
        this.options.pretty ? 2 : 0
      );
    }

    return JSON.stringify(logObject, null, this.options.pretty ? 2 : 0);
  }

  /**
   * 格式化错误对象
   */
  override formatError(error: Error): string {
    const errorObject: Record<string, any> = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      errorObject['stack'] = error.stack;
    }

    // 添加其他属性
    for (const key in error) {
      if (error.hasOwnProperty(key) && key !== 'name' && key !== 'message' && key !== 'stack') {
        errorObject[key] = (error as any)[key];
      }
    }

    return JSON.stringify(errorObject);
  }
}
