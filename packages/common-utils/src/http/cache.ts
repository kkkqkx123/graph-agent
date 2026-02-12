/**
 * HTTP缓存
 * 提供请求响应缓存功能
 */

/**
 * 缓存项
 */
interface CacheItem<T> {
  /** 缓存数据 */
  data: T;
  /** 时间戳 */
  timestamp: number;
  /** 生存时间（毫秒） */
  ttl: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 是否启用缓存 */
  enabled: boolean;
  /** 默认缓存时间（毫秒） */
  defaultTtl: number;
  /** 最大缓存条目数 */
  maxSize?: number;
}

/**
 * 缓存键生成器
 */
export type CacheKeyGenerator = (config: any) => string;

/**
 * 默认缓存键生成器
 */
export function defaultCacheKeyGenerator(config: any): string {
  return `${config.method}:${config.url}:${JSON.stringify(config.query || {})}`;
}

/**
 * HTTP缓存
 */
export class HttpCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private config: CacheConfig;
  private keyGenerator: CacheKeyGenerator;

  constructor(config: CacheConfig = { enabled: true, defaultTtl: 60000 }) {
    this.config = config;
    this.keyGenerator = defaultCacheKeyGenerator;
  }

  /**
   * 设置缓存键生成器
   */
  setKeyGenerator(generator: CacheKeyGenerator): void {
    this.keyGenerator = generator;
  }

  /**
   * 获取缓存
   */
  get<T>(config: any): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.keyGenerator(config);
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * 设置缓存
   */
  set(config: any, data: any, ttl?: number): void {
    if (!this.config.enabled) {
      return;
    }

    const key = this.keyGenerator(config);
    const cacheTtl = ttl ?? this.config.defaultTtl;

    // 检查缓存大小限制
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      // 删除最旧的缓存项
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTtl
    });
  }

  /**
   * 删除缓存
   */
  delete(config: any): void {
    const key = this.keyGenerator(config);
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除指定URL的缓存
   */
  clearByUrl(url: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(url)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 查找最旧的缓存键
   */
  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number | undefined;
    enabled: boolean;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      enabled: this.config.enabled
    };
  }
}

/**
 * 创建默认缓存实例
 */
export function createDefaultCache(): HttpCache {
  return new HttpCache({
    enabled: true,
    defaultTtl: 60000, // 1分钟
    maxSize: 100 // 最多100个缓存项
  });
}

/**
 * 创建禁用缓存的实例
 */
export function createDisabledCache(): HttpCache {
  return new HttpCache({
    enabled: false,
    defaultTtl: 0
  });
}