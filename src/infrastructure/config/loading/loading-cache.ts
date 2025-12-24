/**
 * 加载缓存实现
 */

import { ILoadingCache } from './types';
import { ILogger } from '../../../domain/common/types';

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

/**
 * 加载缓存实现
 */
export class LoadingCache implements ILoadingCache {
  private readonly cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL: number;
  private readonly logger: ILogger;

  constructor(defaultTTL: number = 300000, logger: ILogger) { // 默认5分钟TTL
    this.defaultTTL = defaultTTL;
    this.logger = logger.child({ module: 'LoadingCache' });
  }

  /**
   * 获取缓存值
   */
  get(key: string): any {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.logger.debug('缓存已过期，已删除', { key });
      return undefined;
    }

    this.logger.debug('缓存命中', { key });
    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: any, ttl?: number): void {
    const entry: CacheEntry<any> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, entry);
    this.logger.debug('缓存已设置', { key, ttl: entry.ttl });
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.logger.debug('缓存已清空', { count });
  }

  /**
   * 存储配置对象
   */
  async store(configs: Record<string, any>): Promise<void> {
    this.set('all_configs', configs);
    this.logger.debug('配置已存储到缓存', { 
      moduleCount: Object.keys(configs).length 
    });
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(): Record<string, any> | undefined {
    return this.get('all_configs');
  }

  /**
   * 获取模块配置
   */
  getModuleConfig(moduleType: string): any {
    const allConfigs = this.getAllConfigs();
    return allConfigs?.[moduleType];
  }

  /**
   * 设置模块配置
   */
  setModuleConfig(moduleType: string, config: any): void {
    const allConfigs = this.getAllConfigs() || {};
    allConfigs[moduleType] = config;
    this.set('all_configs', allConfigs);
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug('缓存项已删除', { key });
    }
    return deleted;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('清理过期缓存', { count: cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    const keys = this.keys();
    let memoryUsage = 0;

    for (const [key, entry] of this.cache.entries()) {
      // 估算内存使用量
      memoryUsage += this.estimateSize(key) + this.estimateSize(entry.value);
    }

    return {
      size: this.cache.size,
      keys,
      memoryUsage
    };
  }

  /**
   * 检查缓存条目是否过期
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    if (!entry.ttl) {
      return false;
    }

    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 估算对象大小（简单实现）
   */
  private estimateSize(obj: any): number {
    if (obj === null || obj === undefined) {
      return 0;
    }

    if (typeof obj === 'string') {
      return obj.length * 2; // UTF-16
    }

    if (typeof obj === 'number') {
      return 8; // 64位数字
    }

    if (typeof obj === 'boolean') {
      return 4;
    }

    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }

    if (typeof obj === 'object') {
      return Object.entries(obj).reduce((sum, [key, value]) => {
        return sum + this.estimateSize(key) + this.estimateSize(value);
      }, 0);
    }

    return 0;
  }
}
