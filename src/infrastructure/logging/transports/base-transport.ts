/**
 * 基础日志传输器
 */

import { ILoggerTransport, LogEntry, LogOutputConfig } from '../interfaces';
import { LogLevelUtils } from '../utils';

/**
 * 基础日志传输器抽象类
 */
export abstract class BaseTransport implements ILoggerTransport {
  abstract readonly name: string;
  readonly config: LogOutputConfig;

  constructor(config: LogOutputConfig) {
    this.config = config;
  }

  /**
   * 检查是否应该记录指定级别的日志
   */
  shouldLog(level: string): boolean {
    return LogLevelUtils.shouldLog(this.config.level, level);
  }

  /**
   * 记录日志（抽象方法，子类必须实现）
   */
  abstract log(entry: LogEntry): Promise<void>;

  /**
   * 刷新缓冲区（可选实现）
   */
  async flush(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 关闭传输器（可选实现）
   */
  async close(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 检查传输器是否已启用
   */
  isEnabled(): boolean {
    return this.config.enabled !== false;
  }

  /**
   * 获取传输器级别
   */
  getLevel(): string {
    return this.config.level;
  }

  /**
   * 获取传输器类型
   */
  getType(): string {
    return this.config.type;
  }
}