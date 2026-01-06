/**
 * 基础日志格式化器
 */

import { ILoggerFormatter, LogEntry } from '../interfaces';
import { LogLevelUtils } from '../utils';

/**
 * 基础日志格式化器抽象类
 */
export abstract class BaseFormatter implements ILoggerFormatter {
  abstract readonly name: string;

  /**
   * 格式化时间戳
   */
  protected formatTimestamp(timestamp: Date): string {
    return timestamp.toISOString();
  }

  /**
   * 格式化日志级别
   */
  protected formatLevel(level: string): string {
    return level.padEnd(5, ' ');
  }

  /**
   * 格式化上下文
   */
  protected formatContext(context?: Record<string, any>): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }

    try {
      return JSON.stringify(context);
    } catch (error) {
      return '[无法序列化的上下文]';
    }
  }

  /**
   * 格式化错误对象
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
   * 格式化元数据
   */
  protected formatMeta(meta?: Record<string, any>): string {
    if (!meta || Object.keys(meta).length === 0) {
      return '';
    }

    try {
      return JSON.stringify(meta);
    } catch (error) {
      return '[无法序列化的元数据]';
    }
  }

  /**
   * 获取日志级别的颜色代码（ANSI）
   */
  protected getLevelColorCode(level: string): string {
    const colors: Record<string, string> = {
      [LogLevelUtils.getLowestLevel() as string]: '\x1b[90m', // 灰色
      [LogLevelUtils.getAllLevels()[1] as string]: '\x1b[94m', // 蓝色
      [LogLevelUtils.getAllLevels()[2] as string]: '\x1b[92m', // 绿色
      [LogLevelUtils.getAllLevels()[3] as string]: '\x1b[93m', // 黄色
      [LogLevelUtils.getAllLevels()[4] as string]: '\x1b[91m', // 红色
      [LogLevelUtils.getHighestLevel() as string]: '\x1b[95m', // 紫色
    };

    return colors[level] || '\x1b[0m';
  }

  /**
   * 重置颜色代码
   */
  protected resetColor(): string {
    return '\x1b[0m';
  }

  /**
   * 格式化日志条目（抽象方法，子类必须实现）
   */
  abstract format(entry: LogEntry): string;
}
