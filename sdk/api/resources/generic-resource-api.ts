/**
 * GenericResourceAPI - 通用资源API基类
 * 提供统一的CRUD操作接口，支持缓存、错误处理等通用功能
 * 
 * 设计模式：
 * - Template Method模式：定义通用流程，具体实现由子类提供
 * - Strategy模式：通过抽象方法支持不同的资源类型
 */

import type { ExecutionResult } from '../types/execution-result';
import { success, failure } from '../types/execution-result';

/**
 * 资源API配置选项
 */
export interface ResourceAPIOptions {
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存过期时间（毫秒），默认5分钟 */
  cacheTTL?: number;
  /** 是否启用验证 */
  enableValidation?: boolean;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * 通用资源API基类
 * 
 * @template T - 资源类型
 * @template ID - 资源ID类型（string或number）
 * @template Filter - 过滤器类型
 */
export abstract class GenericResourceAPI<T, ID extends string | number, Filter = any> {
  /** 配置选项 */
  protected readonly options: Required<ResourceAPIOptions>;
  
  /** 资源缓存 */
  protected readonly cache: Map<ID, T> = new Map();
  
  /** 缓存时间戳 */
  protected readonly cacheTimestamps: Map<ID, number> = new Map();

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options?: ResourceAPIOptions) {
    this.options = {
      enableCache: options?.enableCache ?? true,
      cacheTTL: options?.cacheTTL ?? 300000, // 默认5分钟
      enableValidation: options?.enableValidation ?? true,
      enableLogging: options?.enableLogging ?? false
    };
  }

  // ============================================================================
  // 抽象方法 - 子类必须实现
  // ============================================================================

  /**
   * 从注册表获取单个资源
   * @param id 资源ID
   * @returns 资源对象，如果不存在则返回null
   */
  protected abstract getResource(id: ID): Promise<T | null>;

  /**
   * 从注册表获取所有资源
   * @returns 资源数组
   */
  protected abstract getAllResources(): Promise<T[]>;

  /**
   * 创建新资源
   * @param resource 资源对象
   */
  protected abstract createResource(resource: T): Promise<void>;

  /**
   * 更新资源
   * @param id 资源ID
   * @param updates 更新内容
   */
  protected abstract updateResource(id: ID, updates: Partial<T>): Promise<void>;

  /**
   * 删除资源
   * @param id 资源ID
   */
  protected abstract deleteResource(id: ID): Promise<void>;

  /**
   * 应用过滤条件
   * @param resources 资源数组
   * @param filter 过滤条件
   * @returns 过滤后的资源数组
   */
  protected abstract applyFilter(resources: T[], filter: Filter): T[];

  // ============================================================================
  // 通用方法 - 提供标准实现
  // ============================================================================

  /**
   * 获取单个资源
   * @param id 资源ID
   * @returns 执行结果
   */
  async get(id: ID): Promise<ExecutionResult<T | null>> {
    const startTime = Date.now();
    
    try {
      // 缓存检查
      if (this.options.enableCache && this.isCacheValid(id)) {
        const cached = this.cache.get(id) || null;
        this.log('GET', `Cache hit for ${id}`);
        return success(cached, Date.now() - startTime);
      }

      // 从注册表获取
      const resource = await this.getResource(id);
      
      // 更新缓存
      if (resource && this.options.enableCache) {
        this.updateCache(id, resource);
      }

      this.log('GET', `Retrieved ${id}`);
      return success(resource, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'GET', startTime);
    }
  }

  /**
   * 获取所有资源
   * @param filter 过滤条件（可选）
   * @returns 执行结果
   */
  async getAll(filter?: Filter): Promise<ExecutionResult<T[]>> {
    const startTime = Date.now();
    
    try {
      let resources = await this.getAllResources();
      
      // 应用过滤条件
      if (filter) {
        resources = this.applyFilter(resources, filter);
      }

      this.log('GET_ALL', `Retrieved ${resources.length} resources`);
      return success(resources, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'GET_ALL', startTime);
    }
  }

  /**
   * 创建新资源
   * @param resource 资源对象
   * @returns 执行结果
   */
  async create(resource: T): Promise<ExecutionResult<void>> {
    const startTime = Date.now();
    
    try {
      // 验证资源
      if (this.options.enableValidation) {
        const validation = this.validateResource(resource);
        if (!validation.valid) {
          return failure(
            `Validation failed: ${validation.errors.join(', ')}`,
            Date.now() - startTime
          );
        }
      }

      await this.createResource(resource);
      
      // 清理相关缓存
      this.clearRelatedCache();
      
      this.log('CREATE', `Created resource`);
      return success(undefined, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'CREATE', startTime);
    }
  }

  /**
   * 更新资源
   * @param id 资源ID
   * @param updates 更新内容
   * @returns 执行结果
   */
  async update(id: ID, updates: Partial<T>): Promise<ExecutionResult<void>> {
    const startTime = Date.now();
    
    try {
      // 验证更新内容
      if (this.options.enableValidation) {
        const validation = this.validateUpdate(updates);
        if (!validation.valid) {
          return failure(
            `Validation failed: ${validation.errors.join(', ')}`,
            Date.now() - startTime
          );
        }
      }

      await this.updateResource(id, updates);
      
      // 更新或清除缓存
      if (this.options.enableCache) {
        this.cache.delete(id);
        this.cacheTimestamps.delete(id);
      }
      
      this.log('UPDATE', `Updated ${id}`);
      return success(undefined, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'UPDATE', startTime);
    }
  }

  /**
   * 删除资源
   * @param id 资源ID
   * @returns 执行结果
   */
  async delete(id: ID): Promise<ExecutionResult<void>> {
    const startTime = Date.now();
    
    try {
      await this.deleteResource(id);
      
      // 清除缓存
      if (this.options.enableCache) {
        this.cache.delete(id);
        this.cacheTimestamps.delete(id);
      }
      
      this.log('DELETE', `Deleted ${id}`);
      return success(undefined, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'DELETE', startTime);
    }
  }

  /**
   * 检查资源是否存在
   * @param id 资源ID
   * @returns 执行结果
   */
  async has(id: ID): Promise<ExecutionResult<boolean>> {
    const startTime = Date.now();
    
    try {
      const resource = await this.getResource(id);
      return success(resource !== null, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'HAS', startTime);
    }
  }

  /**
   * 获取资源数量
   * @returns 执行结果
   */
  async count(): Promise<ExecutionResult<number>> {
    const startTime = Date.now();
    
    try {
      const resources = await this.getAllResources();
      return success(resources.length, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'COUNT', startTime);
    }
  }

  /**
   * 清空所有资源
   * @returns 执行结果
   */
  async clear(): Promise<ExecutionResult<void>> {
    const startTime = Date.now();
    
    try {
      // 子类可以重写此方法来清理注册表
      await this.clearResources();
      
      // 清空缓存
      this.cache.clear();
      this.cacheTimestamps.clear();
      
      this.log('CLEAR', 'Cleared all resources');
      return success(undefined, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'CLEAR', startTime);
    }
  }

  // ============================================================================
  // 受保护的辅助方法
  // ============================================================================

  /**
   * 检查缓存是否有效
   * @param id 资源ID
   * @returns 是否有效
   */
  protected isCacheValid(id: ID): boolean {
    if (!this.cache.has(id)) return false;
    
    const timestamp = this.cacheTimestamps.get(id);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.options.cacheTTL;
  }

  /**
   * 更新缓存
   * @param id 资源ID
   * @param resource 资源对象
   */
  protected updateCache(id: ID, resource: T): void {
    this.cache.set(id, resource);
    this.cacheTimestamps.set(id, Date.now());
  }

  /**
   * 清理相关缓存
   * 子类可以重写此方法来清理特定的缓存
   */
  protected clearRelatedCache(): void {
    // 默认清空所有缓存
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * 清空资源（子类实现）
   */
  protected async clearResources(): Promise<void> {
    // 默认实现：子类应该重写此方法
    throw new Error('clearResources must be implemented by subclass');
  }

  /**
   * 验证资源（子类可以重写）
   * @param resource 资源对象
   * @returns 验证结果
   */
  protected validateResource(resource: T): { valid: boolean; errors: string[] } {
    // 默认实现：子类可以重写此方法
    return { valid: true, errors: [] };
  }

  /**
   * 验证更新内容（子类可以重写）
   * @param updates 更新内容
   * @returns 验证结果
   */
  protected validateUpdate(updates: Partial<T>): { valid: boolean; errors: string[] } {
    // 默认实现：子类可以重写此方法
    return { valid: true, errors: [] };
  }

  /**
   * 处理错误
   * @param error 错误对象
   * @param operation 操作名称
   * @param startTime 开始时间
   * @returns 执行结果
   */
  protected handleError(error: unknown, operation: string, startTime: number): ExecutionResult<any> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (this.options.enableLogging) {
      console.error(`[${this.constructor.name}] ${operation} failed:`, errorMessage);
    }
    
    return failure(errorMessage, Date.now() - startTime);
  }

  /**
   * 记录日志
   * @param operation 操作名称
   * @param message 日志消息
   */
  protected log(operation: string, message: string): void {
    if (this.options.enableLogging) {
      console.log(`[${this.constructor.name}] ${operation}: ${message}`);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const timestamps = Array.from(this.cacheTimestamps.values());
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : null;

    return {
      size: this.cache.size,
      hitRate: 0, // 子类可以重写此方法来计算命中率
      oldestEntry,
      newestEntry
    };
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}