/**
 * 基础日志格式化器 - 简化为只包含通用辅助方法
 */

import { ILoggerFormatter, LogEntry } from '../interfaces';
import { LogLevelUtils } from '../utils';

/**
 * 基础日志格式化器抽象类 - 仅包含共用的工具方法
 */
export abstract class BaseFormatter implements ILoggerFormatter {
  abstract readonly name: string;

  /**
   * 格式化时间戳为ISO字符串
   */
  protected formatTimestamp(timestamp: Date): string {
    return timestamp.toISOString();
  }

  /**
   * 格式化日志级别（左对齐，5字符宽）
   */
  protected formatLevel(level: string): string {
    return level.padEnd(5, ' ');
  }

  /**
   * 格式化上下文对象为JSON字符串
   */
  protected formatContext(context?: Record<string, any>): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }
    try {
      return JSON.stringify(context);
    } catch {
      return '[无法序列化的上下文]';
    }
  }

  /**
   * 格式化元数据对象为JSON字符串
   */
  protected formatMeta(meta?: Record<string, any>): string {
    if (!meta || Object.keys(meta).length === 0) {
      return '';
    }
    try {
      return JSON.stringify(meta);
    } catch {
      return '[无法序列化的元数据]';
    }
  }

  /**
   * 格式化错误对象（包含堆栈）
   */
  public formatError(error?: Error): string {
    if (!error) {
      return '';
    }
    let result = `${error.name}: ${error.message}`;
    if (error.stack) {
      result += `\n${error.stack}`;
    }
    return result;
  }

  /**
   * 获取日志级别的ANSI颜色代码
   */
  protected getLevelColorCode(level: string): string {
    return LogLevelUtils.getColorCode(level as any);
  }

  /**
   * 获取ANSI颜色重置代码
   */
  protected resetColor(): string {
    return LogLevelUtils.getResetCode();
  }

  /**
   * 格式化日志条目（抽象方法，子类必须实现）
   */
  abstract format(entry: LogEntry): string;
}
