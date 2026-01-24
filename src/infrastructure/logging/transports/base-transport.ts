/**
 * 基础日志传输器 - 简化版本，移除重复的日志级别检查和不必要的getter
 */

import { LogLevel, LogEntry } from '../../../domain/common/types/logger-types';
import { LogOutputConfig } from '../logger-config';

/**
 * 基础日志传输器抽象类
 */
export abstract class BaseTransport {
  abstract readonly name: string;
  readonly config: LogOutputConfig;

  constructor(config: LogOutputConfig) {
    this.config = config;
  }

  /**
   * 记录日志（同步方法）
   * 日志级别检查由Logger统一处理
   */
  abstract log(entry: LogEntry): void;

  /**
   * 关闭传输器
   */
  async close?(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 检查是否应该记录指定级别的日志
   * 保留此方法用于transport的可选过滤
   */
  shouldLog(level: LogLevel): boolean {
    return this.config.enabled !== false;
  }
}
