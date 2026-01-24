/**
 * 配置缓存管理器
 * 统一管理配置加载过程中的缓存操作
 */

import { ILogger } from '../../../domain/common/types';

/**
 * 缓存条目接口
 */
interface CacheEntry {
  value: any;
  timestamp: number;
  ttl?: number;
}

/**
 * 缓存管理器选项
 */
export interface CacheManagerOptions {
  maxSize?: number; // 最大缓存条目数
  defaultTTL?: number; // 默认过期时间（毫秒）
}

/**
 * 配置缓存管理器
 * 提供统一的缓存管理功能，支持过期时间和大小限制
 */
export class ConfigCacheManager {
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly logger: ILogger;
  private readonly options: Required<CacheManagerOptions>;

  constructor(logger: ILogger, options: CacheManagerOptions = {}) {
    this.logger = logger;
    this.options = {
      maxSize: options.maxSize || 100,
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 默认5分钟
    };
  }

  /**
   * 获取缓存值
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    const ttl = entry.ttl || this.options.defaultTTL;
    
    if (now - entry.timestamp > ttl) {
      this.cache.delete(key);
      this.logger.debug('缓存已过期', { key });
      return null;
    }

    this.logger.debug('从缓存获取值', { key });
    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: any, ttl?: number): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldestEntry();
    }

    this.cache.set(key, {
      value: this.deepClone(value),
      timestamp: Date.now(),
      ttl,
    });

    this.logger.debug('缓存值已设置', { key, size: this.cache.size });
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 删除缓存条目
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.logger.debug('缓存条目已删除', { key });
    }
    return existed;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.logger.debug('缓存已清空', { count });
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    defaultTTL: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      defaultTTL: this.options.defaultTTL,
    };
  }

  /**
   * 删除最旧的缓存条目
   */
  private evictOldestEntry(): void {
    if (this.cache.size === 0) return;

    // 找到最旧的条目（时间戳最小的）
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug('缓存已满，删除最旧的条目', { key: oldestKey });
    }
  }

  /**
   * 深度克隆对象
   * 用于缓存值的复制，防止外部修改影响缓存
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * 生成缓存键
   * 用于从配置文件列表生成统一的缓存键
   */
  static generateCacheKey(moduleType: string, files: Array<{ path: string; priority: number }>): string {
    const fileHash = files
      .map(f => `${f.path}:${f.priority}`)
      .sort()
      .join('|');
    return `${moduleType}:${fileHash}`;
  }

  /**
   * 从ConfigFile数组生成缓存键
   */
  static generateCacheKeyFromConfigFiles(moduleType: string, files: Array<{ path: string; priority: number }>): string {
    return ConfigCacheManager.generateCacheKey(moduleType, files);
  }
}