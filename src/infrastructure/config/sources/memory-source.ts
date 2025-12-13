/**
 * 内存配置源实现
 */

import { IConfigSource, ConfigSourceType } from '@shared/types/config';
import { ILogger } from '@shared/types/logger';

/**
 * 内存配置源选项
 */
export interface MemoryConfigSourceOptions {
  initialConfig?: Record<string, any>;
}

/**
 * 内存配置源
 */
export class MemoryConfigSource implements IConfigSource {
  readonly type = ConfigSourceType.MEMORY;
  readonly priority: number;
  
  private config: Record<string, any>;
  private readonly logger: ILogger;

  constructor(
    options: MemoryConfigSourceOptions,
    priority: number,
    logger: ILogger
  ) {
    this.config = options.initialConfig || {};
    this.priority = priority;
    this.logger = logger.child({ module: 'MemoryConfigSource' });
  }

  /**
   * 加载内存配置
   */
  async load(): Promise<Record<string, any>> {
    this.logger.debug('加载内存配置', { keyCount: Object.keys(this.config).length });
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Record<string, any>): void {
    this.logger.debug('更新内存配置');
    this.config = { ...newConfig };
  }

  /**
   * 设置配置值
   */
  setValue(key: string, value: any): void {
    this.logger.debug('设置配置值', { key });
    this.setNestedValue(this.config, key, value);
  }

  /**
   * 获取配置值
   */
  getValue(key: string): any {
    return this.getNestedValue(this.config, key);
  }

  /**
   * 删除配置值
   */
  deleteValue(key: string): void {
    this.logger.debug('删除配置值', { key });
    this.deleteNestedValue(this.config, key);
  }

  /**
   * 清空配置
   */
  clear(): void {
    this.logger.debug('清空内存配置');
    this.config = {};
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * 删除嵌套值
   */
  private deleteNestedValue(obj: Record<string, any>, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      return current && current[key] ? current[key] : null;
    }, obj);

    if (target && target.hasOwnProperty(lastKey)) {
      delete target[lastKey];
    }
  }
}