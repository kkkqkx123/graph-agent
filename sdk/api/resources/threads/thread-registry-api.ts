/**
 * ThreadRegistryAPI - 线程管理API
 * 封装ThreadRegistry，提供线程查询和管理
 * 重构版本：继承GenericResourceAPI，提高代码复用性和一致性
 */

import { threadRegistry as globalThreadRegistry, type ThreadRegistry } from '../../../core/services/thread-registry';
import type { Thread, ThreadResult, ThreadStatus } from '../../../types/thread';
import type { ThreadFilter, ThreadSummary } from '../../types/registry-types';
import { GenericResourceAPI } from '../generic-resource-api';
import { getErrorMessage } from '../../types/execution-result';
import type { APIDependencies } from '../../core/api-dependencies';


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
  private dependencies: APIDependencies;

  /**
   * 创建 ThreadRegistryAPI 实例
   * @param dependencies API依赖项
   */
  constructor(dependencies: APIDependencies) {
    super();
    this.dependencies = dependencies;
  }

  /**
   * 获取单个线程
   * @param id 线程ID
   * @returns 线程实例，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<Thread | null> {
    const threadContext = this.dependencies.getThreadRegistry().get(id);
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
    return this.dependencies.getThreadRegistry().getAll().map(ctx => ctx.thread);
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
    this.dependencies.getThreadRegistry().delete(id);
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
      return true;
    });
  }

  /**
   * 获取线程摘要列表
   * @param filter 过滤条件
   * @returns 线程摘要数组
   */
  async getThreadSummaries(filter?: ThreadFilter): Promise<ThreadSummary[]> {
    const result = await this.getAll(filter);
    if (!result.success) {
      throw new Error(getErrorMessage(result) || 'Failed to get thread summaries');
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
      executionTime: thread.endTime ? thread.endTime - thread.startTime : undefined
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
      throw new Error(getErrorMessage(result) || 'Failed to get thread status');
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
      throw new Error(getErrorMessage(result) || 'Failed to get thread result');
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
      output: thread.output,
      executionTime: thread.endTime ? thread.endTime - thread.startTime : 0,
      nodeResults: thread.nodeResults,
      metadata: {
        status: thread.status as ThreadStatus,
        startTime: thread.startTime,
        endTime: thread.endTime || 0,
        executionTime: thread.endTime ? thread.endTime - thread.startTime : 0,
        nodeCount: thread.nodeResults.length,
        errorCount: thread.errors.length
      }
    };
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
      throw new Error(getErrorMessage(result) || 'Failed to get thread statistics');
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
    return this.dependencies.getThreadRegistry();
  }
}