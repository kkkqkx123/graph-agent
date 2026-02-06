/**
 * ThreadRegistryAPI - 线程管理API
 * 封装ThreadRegistry，提供线程查询和管理
 * 重构版本：继承GenericResourceAPI，提高代码复用性和一致性
 */

import { threadRegistry as globalThreadRegistry, type ThreadRegistry } from '../../../core/services/thread-registry';
import type { Thread, ThreadResult, ThreadStatus } from '../../../types/thread';
import type { ThreadFilter, ThreadSummary } from '../../types/registry-types';
import { GenericResourceAPI, type ResourceAPIOptions } from '../generic-resource-api';

/**
 * ThreadRegistryAPI配置选项
 */
export interface ThreadRegistryAPIOptions extends ResourceAPIOptions {
  /** 是否启用缓存（默认true） */
  enableCache?: boolean;
  /** 缓存TTL（毫秒，默认5000） */
  cacheTTL?: number;
  /** 是否启用日志（默认false） */
  enableLogging?: boolean;
  /** 是否启用验证（默认true） */
  enableValidation?: boolean;
}

/**
 * ThreadRegistryAPI - 线程管理API
 * 默认使用全局线程注册表单例
 * 
 * 重构说明：
 * - 继承GenericResourceAPI，复用通用CRUD操作
 * - 实现所有抽象方法以适配ThreadRegistry
 * - 保留所有原有API方法以保持向后兼容
 * - 新增缓存、日志、验证等增强功能
 */
export class ThreadRegistryAPI extends GenericResourceAPI<Thread, string, ThreadFilter> {
  private registry: ThreadRegistry;

  /**
   * 创建 ThreadRegistryAPI 实例
   * @param threadRegistry 线程注册表（可选，默认使用全局单例）
   * @param options 配置选项（可选）
   */
  constructor(threadRegistry?: ThreadRegistry, options?: ThreadRegistryAPIOptions) {
    const apiOptions: Required<ResourceAPIOptions> = {
      enableCache: options?.enableCache ?? true,
      cacheTTL: options?.cacheTTL ?? 5000,
      enableLogging: options?.enableLogging ?? false,
      enableValidation: options?.enableValidation ?? true
    };
    super(apiOptions);
    this.registry = threadRegistry || globalThreadRegistry;
  }

  /**
   * 获取单个线程
   * @param id 线程ID
   * @returns 线程实例，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<Thread | null> {
    const threadContext = this.registry.get(id);
    if (!threadContext) {
      return null;
    }
    return threadContext.thread;
  }

  /**
   * 获取所有线程
   * @returns 线程实例数组
   */
  protected async getAllResources(): Promise<Thread[]> {
    return this.registry.getAll().map(ctx => ctx.thread);
  }

  /**
   * 创建线程（线程由工作流执行引擎创建，此方法抛出错误）
   * @param resource 线程实例
   * @throws Error - 线程不能通过API直接创建
   */
  protected async createResource(resource: Thread): Promise<void> {
    throw new Error('线程不能通过API直接创建，请使用工作流执行引擎');
  }

  /**
   * 更新线程（线程由工作流执行引擎更新，此方法抛出错误）
   * @param id 线程ID
   * @param updates 更新内容
   * @throws Error - 线程不能通过API直接更新
   */
  protected async updateResource(id: string, updates: Partial<Thread>): Promise<void> {
    throw new Error('线程不能通过API直接更新，请使用工作流执行引擎');
  }

  /**
   * 删除线程
   * @param id 线程ID
   */
  protected async deleteResource(id: string): Promise<void> {
    this.registry.delete(id);
  }

  /**
   * 应用过滤条件
   * @param resources 线程数组
   * @param filter 过滤条件
   * @returns 过滤后的线程数组
   */
  protected applyFilter(resources: Thread[], filter: ThreadFilter): Thread[] {
    return resources.filter(thread => {
      if (filter.threadId && !thread.id.includes(filter.threadId)) {
        return false;
      }
      if (filter.workflowId && thread.workflowId !== filter.workflowId) {
        return false;
      }
      if (filter.status && thread.status !== filter.status) {
        return false;
      }
      if (filter.startTimeFrom && thread.startTime < filter.startTimeFrom) {
        return false;
      }
      if (filter.startTimeTo && thread.startTime > filter.startTimeTo) {
        return false;
      }
      if (filter.tags && thread.metadata?.tags) {
        if (!filter.tags.every(tag => thread.metadata?.tags?.includes(tag))) {
          return false;
        }
      }
      if (filter.creator && thread.metadata?.creator !== filter.creator) {
        return false;
      }
      return true;
    });
  }

  // ==================== 向后兼容的API方法 ====================

  /**
   * 获取线程（向后兼容）
   * @param threadId 线程ID
   * @returns 线程实例，如果不存在则返回null
   */
  async getThread(threadId: string): Promise<Thread | null> {
    const result = await this.get(threadId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get thread');
    }
    return result.data;
  }

  /**
   * 获取线程列表（向后兼容）
   * @param filter 过滤条件
   * @returns 线程实例数组
   */
  async getThreads(filter?: ThreadFilter): Promise<Thread[]> {
    const result = await this.getAll(filter);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get threads');
    }
    return result.data;
  }

  /**
   * 获取线程摘要列表
   * @param filter 过滤条件
   * @returns 线程摘要数组
   */
  async getThreadSummaries(filter?: ThreadFilter): Promise<ThreadSummary[]> {
    const result = await this.getAll(filter);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get thread summaries');
    }
    const threads = result.data;

    return threads.map(thread => ({
      threadId: thread.id,
      workflowId: thread.workflowId,
      workflowVersion: thread.workflowVersion,
      status: thread.status,
      currentNodeId: thread.currentNodeId,
      startTime: thread.startTime,
      endTime: thread.endTime,
      executionTime: thread.endTime ? thread.endTime - thread.startTime : undefined,
      metadata: thread.metadata
    }));
  }

  /**
   * 获取线程状态
   * @param threadId 线程ID
   * @returns 线程状态，如果不存在则返回null
   */
  async getThreadStatus(threadId: string): Promise<ThreadStatus | null> {
    const result = await this.get(threadId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get thread status');
    }
    const thread = result.data;
    if (!thread) {
      return null;
    }
    return thread.status as ThreadStatus;
  }

  /**
   * 获取线程执行结果
   * @param threadId 线程ID
   * @returns 线程执行结果，如果不存在或未完成则返回null
   */
  async getThreadResult(threadId: string): Promise<ThreadResult | null> {
    const result = await this.get(threadId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get thread result');
    }
    const thread = result.data;
    if (!thread) {
      return null;
    }

    // 只有已完成、失败或取消的线程才有结果
    if (thread.status !== 'COMPLETED' && thread.status !== 'FAILED' && thread.status !== 'CANCELLED') {
      return null;
    }

    return {
      threadId: thread.id,
      success: thread.status === 'COMPLETED',
      output: thread.output,
      error: thread.errors.length > 0 ? thread.errors[0] : undefined,
      executionTime: thread.endTime ? thread.endTime - thread.startTime : 0,
      nodeResults: thread.nodeResults,
      metadata: thread.metadata
    };
  }

  /**
   * 删除线程（向后兼容）
   * @param threadId 线程ID
   */
  async deleteThread(threadId: string): Promise<void> {
    const result = await this.delete(threadId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete thread');
    }
  }

  /**
   * 批量删除线程
   * @param threadIds 线程ID数组
   */
  async deleteThreads(threadIds: string[]): Promise<void> {
    for (const threadId of threadIds) {
      await this.delete(threadId);
    }
  }

  /**
   * 按工作流ID获取线程列表
   * @param workflowId 工作流ID
   * @returns 线程实例数组
   */
  async getThreadsByWorkflow(workflowId: string): Promise<Thread[]> {
    const result = await this.getAll({ workflowId });
    if (!result.success) {
      throw new Error(result.error || 'Failed to get threads by workflow');
    }
    return result.data;
  }

  /**
   * 按状态获取线程列表
   * @param status 线程状态
   * @returns 线程实例数组
   */
  async getThreadsByStatus(status: ThreadStatus): Promise<Thread[]> {
    const result = await this.getAll({ status });
    if (!result.success) {
      throw new Error(result.error || 'Failed to get threads by status');
    }
    return result.data;
  }

  /**
   * 按创建者获取线程列表
   * @param creator 创建者
   * @returns 线程实例数组
   */
  async getThreadsByCreator(creator: string): Promise<Thread[]> {
    const result = await this.getAll({ creator });
    if (!result.success) {
      throw new Error(result.error || 'Failed to get threads by creator');
    }
    return result.data;
  }

  /**
   * 按时间范围获取线程列表
   * @param startTimeFrom 开始时间戳
   * @param startTimeTo 结束时间戳
   * @returns 线程实例数组
   */
  async getThreadsByTimeRange(startTimeFrom: number, startTimeTo: number): Promise<Thread[]> {
    const result = await this.getAll({ startTimeFrom, startTimeTo });
    if (!result.success) {
      throw new Error(result.error || 'Failed to get threads by time range');
    }
    return result.data;
  }

  /**
   * 检查线程是否存在（向后兼容）
   * @param threadId 线程ID
   * @returns 是否存在
   */
  async hasThread(threadId: string): Promise<boolean> {
    const result = await this.has(threadId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to check thread existence');
    }
    return result.data;
  }

  /**
   * 获取线程数量（向后兼容）
   * @returns 线程数量
   */
  async getThreadCount(): Promise<number> {
    const result = await this.count();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get thread count');
    }
    return result.data;
  }

  /**
   * 获取指定工作流的线程数量
   * @param workflowId 工作流ID
   * @returns 线程数量
   */
  async getThreadCountByWorkflow(workflowId: string): Promise<number> {
    const threads = await this.getThreadsByWorkflow(workflowId);
    return threads.length;
  }

  /**
   * 获取指定状态的线程数量
   * @param status 线程状态
   * @returns 线程数量
   */
  async getThreadCountByStatus(status: ThreadStatus): Promise<number> {
    const threads = await this.getThreadsByStatus(status);
    return threads.length;
  }

  /**
   * 清空所有线程（向后兼容）
   */
  async clearThreads(): Promise<void> {
    const result = await this.clear();
    if (!result.success) {
      throw new Error(result.error || 'Failed to clear threads');
    }
  }

  /**
   * 获取线程统计信息
   * @returns 统计信息
   */
  async getThreadStatistics(): Promise<{
    total: number;
    byStatus: Record<ThreadStatus, number>;
    byWorkflow: Record<string, number>;
  }> {
    const result = await this.getAll();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get thread statistics');
    }
    const threads = result.data;
    const byStatus: Record<ThreadStatus, number> = {
      CREATED: 0,
      RUNNING: 0,
      PAUSED: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
      TIMEOUT: 0
    };
    const byWorkflow: Record<string, number> = {};

    for (const thread of threads) {
      const status = thread.status as ThreadStatus;

      // 统计按状态
      byStatus[status]++;

      // 统计按工作流
      const workflowId = thread.workflowId;
      byWorkflow[workflowId] = (byWorkflow[workflowId] || 0) + 1;
    }

    return {
      total: threads.length,
      byStatus,
      byWorkflow
    };
  }

  /**
   * 获取底层ThreadRegistry实例
   * @returns ThreadRegistry实例
   */
  getRegistry(): ThreadRegistry {
    return this.registry;
  }
}