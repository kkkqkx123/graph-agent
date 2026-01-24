/**
 * 日志级别工具类
 */

import { LogLevel } from '../../../domain/common/types/logger-types';

/**
 * 日志级别权重映射（用于日志级别判断）
 */
const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4,
};

/**
 * 日志级别颜色映射（ANSI颜色代码）
 */
const LOG_LEVEL_COLOR_CODES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[90m', // 灰色
  [LogLevel.INFO]: '\x1b[94m',  // 蓝色
  [LogLevel.WARN]: '\x1b[93m',  // 黄色
  [LogLevel.ERROR]: '\x1b[91m', // 红色
  [LogLevel.FATAL]: '\x1b[95m', // 紫色
};

/**
 * 日志级别工具类 - 消除过度设计，只保留必要方法
 */
export class LogLevelUtils {
  /**
   * 检查是否应该记录指定级别的日志
   * 这是唯一核心方法，被Logger和BaseTransport使用
   */
  static shouldLog(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
    return LOG_LEVEL_WEIGHTS[targetLevel] >= LOG_LEVEL_WEIGHTS[currentLevel];
  }

  /**
   * 获取日志级别的ANSI颜色代码
   */
  static getColorCode(level: LogLevel): string {
    return LOG_LEVEL_COLOR_CODES[level] || '\x1b[0m';
  }

  /**
   * 获取颜色重置代码
   */
  static getResetCode(): string {
    return '\x1b[0m';
  }

  /**
   * 验证日志级别字符串
   */
  static isValid(level: string): boolean {
    return Object.values(LogLevel).includes(level.toUpperCase() as LogLevel);
  }
}
