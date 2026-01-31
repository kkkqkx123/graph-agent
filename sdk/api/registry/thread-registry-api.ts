/**
 * ThreadRegistryAPI - 线程管理API
 * 封装ThreadRegistry，提供线程查询和管理
 */

import { threadRegistry as globalThreadRegistry, type ThreadRegistry } from '../../core/services/thread-registry';
import type { Thread, ThreadResult, ThreadStatus } from '../../types/thread';
import type { ThreadFilter, ThreadSummary } from '../types/registry-types';
import { NotFoundError } from '../../types/errors';

/**
 * ThreadRegistryAPI - 线程管理API
 * 默认使用全局线程注册表单例
 */
export class ThreadRegistryAPI {
  private registry: ThreadRegistry;

  /**
   * 创建 ThreadRegistryAPI 实例
   * @param threadRegistry 线程注册表（可选，默认使用全局单例）
   */
  constructor(threadRegistry?: ThreadRegistry) {
    // 默认使用全局单例，支持依赖注入用于测试
    this.registry = threadRegistry || globalThreadRegistry;
  }

  /**
   * 获取线程
   * @param threadId 线程ID
   * @returns 线程实例，如果不存在则返回null
   */
  async getThread(threadId: string): Promise<Thread | null> {
    const threadContext = this.registry.get(threadId);
    if (!threadContext) {
      return null;
    }
    return threadContext.thread;
  }

  /**
   * 获取线程列表
   * @param filter 过滤条件
   * @returns 线程实例数组
   */
  async getThreads(filter?: ThreadFilter): Promise<Thread[]> {
    const allThreads = this.registry.getAll();

    if (!filter) {
      return allThreads.map(ctx => ctx.thread);
    }

    // 应用过滤条件
    return allThreads
      .map(ctx => ctx.thread)
      .filter(thread => this.applyFilter(thread, filter));
  }

  /**
   * 获取线程摘要列表
   * @param filter 过滤条件
   * @returns 线程摘要数组
   */
  async getThreadSummaries(filter?: ThreadFilter): Promise<ThreadSummary[]> {
    const threads = await this.getThreads(filter);

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
    const threadContext = this.registry.get(threadId);
    if (!threadContext) {
      return null;
    }
    return threadContext.thread.status as ThreadStatus;
  }

  /**
   * 获取线程执行结果
   * @param threadId 线程ID
   * @returns 线程执行结果，如果不存在或未完成则返回null
   */
  async getThreadResult(threadId: string): Promise<ThreadResult | null> {
    const threadContext = this.registry.get(threadId);
    if (!threadContext) {
      return null;
    }

    const thread = threadContext.thread;

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
   * 删除线程
   * @param threadId 线程ID
   */
  async deleteThread(threadId: string): Promise<void> {
    // 删除线程（Core层会检查线程是否存在）
    this.registry.delete(threadId);
  }

  /**
   * 批量删除线程
   * @param threadIds 线程ID数组
   */
  async deleteThreads(threadIds: string[]): Promise<void> {
    for (const threadId of threadIds) {
      this.registry.delete(threadId);
    }
  }

  /**
   * 按工作流ID获取线程列表
   * @param workflowId 工作流ID
   * @returns 线程实例数组
   */
  async getThreadsByWorkflow(workflowId: string): Promise<Thread[]> {
    return this.getThreads({ workflowId });
  }

  /**
   * 按状态获取线程列表
   * @param status 线程状态
   * @returns 线程实例数组
   */
  async getThreadsByStatus(status: ThreadStatus): Promise<Thread[]> {
    return this.getThreads({ status });
  }

  /**
   * 按创建者获取线程列表
   * @param creator 创建者
   * @returns 线程实例数组
   */
  async getThreadsByCreator(creator: string): Promise<Thread[]> {
    return this.getThreads({ creator });
  }

  /**
   * 按时间范围获取线程列表
   * @param startTimeFrom 开始时间戳
   * @param startTimeTo 结束时间戳
   * @returns 线程实例数组
   */
  async getThreadsByTimeRange(startTimeFrom: number, startTimeTo: number): Promise<Thread[]> {
    return this.getThreads({ startTimeFrom, startTimeTo });
  }

  /**
   * 检查线程是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  async hasThread(threadId: string): Promise<boolean> {
    return this.registry.has(threadId);
  }

  /**
   * 获取线程数量
   * @returns 线程数量
   */
  async getThreadCount(): Promise<number> {
    return this.registry.getAll().length;
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
   * 清空所有线程
   */
  async clearThreads(): Promise<void> {
    this.registry.clear();
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
    const threads = this.registry.getAll();
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

    for (const threadContext of threads) {
      const thread = threadContext.thread;
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

  /**
   * 应用过滤条件
   * @param thread 线程实例
   * @param filter 过滤条件
   * @returns 是否匹配
   */
  private applyFilter(thread: Thread, filter: ThreadFilter): boolean {
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
  }
}