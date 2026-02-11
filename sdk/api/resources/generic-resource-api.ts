/**
 * GenericResourceAPI - 通用资源API基类
 * 提供统一的CRUD操作接口，支持缓存、错误处理等通用功能
 * 
 * 设计模式：
 * - Template Method模式：定义通用流程，具体实现由子类提供
 * - Strategy模式：通过抽象方法支持不同的资源类型
 */

import type { ExecutionResult } from '@modular-agent/types/execution-result';
import { success, failure } from '@modular-agent/types/execution-result';
import { SDKError } from '@modular-agent/types/errors';

/**
 * 通用资源API基类
 * 
 * @template T - 资源类型
 * @template ID - 资源ID类型（string或number）
 * @template Filter - 过滤器类型
 */
export abstract class GenericResourceAPI<T, ID extends string | number, Filter = any> {
  /**
   * 构造函数
   */
  constructor() {
    // 无配置选项
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
      const resource = await this.getResource(id);
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
      // 验证资源（始终启用）
      const validation = await this.validateResource(resource);
      if (!validation.valid) {
        return failure(
          {
            message: `Validation failed: ${validation.errors.join(', ')}`,
            code: 'VALIDATION_ERROR'
          },
          Date.now() - startTime
        );
      }

      await this.createResource(resource);
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
      // 验证更新内容（始终启用）
      const validation = await this.validateUpdate(updates);
      if (!validation.valid) {
        return failure(
          {
            message: `Validation failed: ${validation.errors.join(', ')}`,
            code: 'VALIDATION_ERROR'
          },
          Date.now() - startTime
        );
      }

      await this.updateResource(id, updates);
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
      return success(undefined, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, 'CLEAR', startTime);
    }
  }

  // ============================================================================
  // 受保护的辅助方法
  // ============================================================================

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
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected async validateResource(
    resource: T,
    context?: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    // 默认实现：子类可以重写此方法
    return { valid: true, errors: [] };
  }

  /**
   * 验证更新内容（子类可以重写）
   * @param updates 更新内容
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected async validateUpdate(
    updates: Partial<T>,
    context?: any
  ): Promise<{ valid: boolean; errors: string[] }> {
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
    // 直接使用SDKError，不做任何转换
    const sdkError = error instanceof SDKError ? error : new Error(String(error));
    
    // 返回包含详细错误信息的失败结果
    return failure({
      message: sdkError.message,
      code: sdkError instanceof SDKError ? sdkError.code : 'UNKNOWN_ERROR',
      details: sdkError instanceof SDKError ? sdkError.context : undefined,
      timestamp: Date.now(),
      cause: sdkError.cause ? {
        name: (sdkError.cause as Error).name,
        message: (sdkError.cause as Error).message,
        stack: (sdkError.cause as Error).stack
      } : undefined
    }, Date.now() - startTime);
  }

}