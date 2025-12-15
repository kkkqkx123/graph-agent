/**
 * 日志级别工具类
 */

import { LogLevel } from '@shared/types/logger';

/**
 * 日志级别权重映射
 */
const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  [LogLevel.TRACE]: 0,
  [LogLevel.DEBUG]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.WARN]: 3,
  [LogLevel.ERROR]: 4,
  [LogLevel.FATAL]: 5
};

/**
 * 日志级别颜色映射
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'gray',
  [LogLevel.DEBUG]: 'blue',
  [LogLevel.INFO]: 'green',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red',
  [LogLevel.FATAL]: 'magenta'
};

/**
 * 日志级别工具类
 */
export class LogLevelUtils {
  /**
   * 比较两个日志级别
   * @param level1 第一个日志级别
   * @param level2 第二个日志级别
   * @returns -1 如果 level1 < level2, 0 如果相等, 1 如果 level1 > level2
   */
  static compare(level1: LogLevel, level2: LogLevel): number {
    const weight1 = LOG_LEVEL_WEIGHTS[level1];
    const weight2 = LOG_LEVEL_WEIGHTS[level2];
    
    if (weight1 < weight2) return -1;
    if (weight1 > weight2) return 1;
    return 0;
  }

  /**
   * 检查是否应该记录指定级别的日志
   * @param currentLevel 当前日志级别
   * @param targetLevel 目标日志级别
   * @returns 如果应该记录返回 true
   */
  static shouldLog(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
    return LOG_LEVEL_WEIGHTS[targetLevel] >= LOG_LEVEL_WEIGHTS[currentLevel];
  }

  /**
   * 获取日志级别的权重
   * @param level 日志级别
   * @returns 权重值
   */
  static getWeight(level: LogLevel): number {
    return LOG_LEVEL_WEIGHTS[level];
  }

  /**
   * 获取日志级别的颜色
   * @param level 日志级别
   * @returns 颜色名称
   */
  static getColor(level: LogLevel): string {
    return LOG_LEVEL_COLORS[level];
  }

  /**
   * 解析字符串为日志级别
   * @param levelStr 日志级别字符串
   * @returns 日志级别
   */
  static parse(levelStr: string): LogLevel {
    const upperLevel = levelStr.toUpperCase();
    
    if (Object.values(LogLevel).includes(upperLevel as LogLevel)) {
      return upperLevel as LogLevel;
    }
    
    throw new Error(`无效的日志级别: ${levelStr}`);
  }

  /**
   * 获取所有日志级别
   * @returns 日志级别数组
   */
  static getAllLevels(): LogLevel[] {
    return Object.values(LogLevel);
  }

  /**
   * 获取最低日志级别
   * @returns 最低日志级别
   */
  static getLowestLevel(): LogLevel {
    return LogLevel.TRACE;
  }

  /**
   * 获取最高日志级别
   * @returns 最高日志级别
   */
  static getHighestLevel(): LogLevel {
    return LogLevel.FATAL;
  }

  /**
   * 检查是否为有效的日志级别
   * @param level 日志级别
   * @returns 如果有效返回 true
   */
  static isValid(level: string): boolean {
    try {
      LogLevelUtils.parse(level);
      return true;
    } catch {
      return false;
    }
  }
}