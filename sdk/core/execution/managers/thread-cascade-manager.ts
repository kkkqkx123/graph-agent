/**
 * ThreadCascadeManager - Thread级联管理器
 * 
 * 职责：
 * - 处理Thread的级联操作（如级联取消）
 * - 管理父子线程之间的关系
 * - 提供线程树的遍历和操作能力
 * 
 * 设计原则：
 * - 有状态设计：维护线程关系信息
 * - 依赖注入：通过构造函数接收依赖
 * - 错误隔离：单个子线程操作失败不影响其他子线程
 */

import type { ThreadRegistry } from '../../services/thread-registry';
import { ThreadLifecycleManager } from './thread-lifecycle-manager';
import type { Thread } from '@modular-agent/types/thread';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '@modular-agent/types/events';

/**
 * ThreadCascadeManager - Thread级联管理器
 */
export class ThreadCascadeManager {
  constructor(
    private threadRegistry: ThreadRegistry,
    private lifecycleManager: ThreadLifecycleManager,
    private eventManager: EventManager
  ) { }

  /**
   * 级联取消所有子线程
   * 
   * @param parentThreadId 父线程ID
   * @returns 取消的子线程数量
   */
  async cascadeCancel(parentThreadId: string): Promise<number> {
    const parentContext = this.threadRegistry.get(parentThreadId);
    if (!parentContext) {
      return 0;
    }

    // 从 triggeredSubworkflowContext 获取子线程ID列表
    const childThreadIds = parentContext.thread.triggeredSubworkflowContext?.childThreadIds || [];
    if (childThreadIds.length === 0) {
      return 0;
    }

    let cancelledCount = 0;

    // 遍历所有子线程并取消
    for (const childThreadId of childThreadIds) {
      try {
        const success = await this.cancelChildThread(childThreadId);
        if (success) {
          cancelledCount++;
        }
      } catch (error) {
        // 继续取消其他子线程，不中断
        console.error(`Failed to cancel child thread ${childThreadId}:`, error);
      }
    }

    return cancelledCount;
  }

  /**
   * 取消单个子线程
   * 
   * @param childThreadId 子线程ID
   * @returns 是否成功取消
   * @private
   */
  private async cancelChildThread(childThreadId: string): Promise<boolean> {
    const childContext = this.threadRegistry.get(childThreadId);
    if (!childContext) {
      return false;
    }

    const childThread = childContext.thread;
    const childStatus = childContext.getStatus();

    // 只取消运行中或暂停的子线程
    if (childStatus === 'RUNNING' || childStatus === 'PAUSED') {
      await this.lifecycleManager.cancelThread(childThread, 'parent_cancelled');
      return true;
    }

    return false;
  }

  /**
   * 获取所有子线程的状态
   * 
   * @param parentThreadId 父线程ID
   * @returns 子线程状态映射
   */
  getChildThreadsStatus(parentThreadId: string): Map<string, string> {
    const parentContext = this.threadRegistry.get(parentThreadId);
    if (!parentContext) {
      return new Map();
    }

    // 从 triggeredSubworkflowContext 获取子线程ID列表
    const childThreadIds = parentContext.thread.triggeredSubworkflowContext?.childThreadIds || [];
    const statusMap = new Map<string, string>();

    for (const childThreadId of childThreadIds) {
      const childContext = this.threadRegistry.get(childThreadId);
      if (childContext) {
        statusMap.set(childThreadId, childContext.getStatus());
      }
    }

    return statusMap;
  }

  /**
   * 检查是否有活跃的子线程
   * 
   * @param parentThreadId 父线程ID
   * @returns 是否有活跃的子线程
   */
  hasActiveChildThreads(parentThreadId: string): boolean {
    const statusMap = this.getChildThreadsStatus(parentThreadId);

    for (const status of statusMap.values()) {
      if (status === 'RUNNING' || status === 'PAUSED') {
        return true;
      }
    }

    return false;
  }

  /**
   * 等待所有子线程完成（基于事件驱动）
   *
   * @param parentThreadId 父线程ID
   * @param timeout 超时时间（毫秒）
   * @returns 是否所有子线程都已完成
   */
  async waitForAllChildrenCompleted(parentThreadId: string, timeout: number = 30000): Promise<boolean> {
    const parentContext = this.threadRegistry.get(parentThreadId);
    if (!parentContext) {
      return false;
    }

    // 获取子线程ID列表
    const childThreadIds = parentContext.thread.triggeredSubworkflowContext?.childThreadIds || [];
    if (childThreadIds.length === 0) {
      return true;
    }

    // 为每个子线程创建完成Promise
    const completionPromises = childThreadIds.map(childThreadId => {
      return this.waitForChildThreadCompletion(childThreadId, timeout);
    });

    try {
      // 等待所有子线程完成
      await Promise.all(completionPromises);
      return true;
    } catch (error) {
      // 超时或其他错误
      return false;
    }
  }

  /**
   * 等待单个子线程完成
   *
   * @param childThreadId 子线程ID
   * @param timeout 超时时间（毫秒）
   * @returns Promise，当子线程完成时解析
   * @private
   */
  private async waitForChildThreadCompletion(childThreadId: string, timeout: number): Promise<void> {
    const childContext = this.threadRegistry.get(childThreadId);
    if (!childContext) {
      throw new Error(`Child thread ${childThreadId} not found`);
    }

    const currentStatus = childContext.getStatus();

    // 如果已经完成，直接返回
    if (this.isTerminalStatus(currentStatus)) {
      return;
    }

    // 创建超时Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout waiting for child thread ${childThreadId}`)), timeout);
    });

    // 创建事件监听Promise
    const eventPromise = new Promise<void>((resolve) => {
      // 监听线程完成事件
      const unregisterCompleted = this.eventManager.on(
        EventType.THREAD_COMPLETED,
        (event) => {
          if (event.threadId === childThreadId) {
            unregisterCompleted();
            unregisterFailed();
            unregisterCancelled();
            resolve();
          }
        }
      );

      // 监听线程失败事件
      const unregisterFailed = this.eventManager.on(
        EventType.THREAD_FAILED,
        (event) => {
          if (event.threadId === childThreadId) {
            unregisterCompleted();
            unregisterFailed();
            unregisterCancelled();
            resolve();
          }
        }
      );

      // 监听线程取消事件
      const unregisterCancelled = this.eventManager.on(
        EventType.THREAD_CANCELLED,
        (event) => {
          if (event.threadId === childThreadId) {
            unregisterCompleted();
            unregisterFailed();
            unregisterCancelled();
            resolve();
          }
        }
      );
    });

    // 等待事件或超时
    await Promise.race([eventPromise, timeoutPromise]);
  }

  /**
   * 检查状态是否为终止状态
   *
   * @param status 线程状态
   * @returns 是否为终止状态
   * @private
   */
  private isTerminalStatus(status: string): boolean {
    return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
  }

  /**
   * 获取线程树深度
   * 
   * @param threadId 线程ID
   * @returns 线程树深度
   */
  getThreadTreeDepth(threadId: string): number {
    const context = this.threadRegistry.get(threadId);
    if (!context) {
      return 0;
    }

    // 从 triggeredSubworkflowContext 获取父线程ID
    const parentThreadId = context.thread.triggeredSubworkflowContext?.parentThreadId;
    if (!parentThreadId) {
      return 1;
    }

    return 1 + this.getThreadTreeDepth(parentThreadId);
  }

  /**
   * 获取所有后代线程ID
   *
   * @param threadId 线程ID
   * @returns 所有后代线程ID数组
   */
  getAllDescendantThreadIds(threadId: string): string[] {
    const context = this.threadRegistry.get(threadId);
    if (!context) {
      return [];
    }

    // 从 triggeredSubworkflowContext 获取子线程ID列表
    const childThreadIds = context.thread.triggeredSubworkflowContext?.childThreadIds || [];
    const allDescendants: string[] = [...childThreadIds];

    // 递归获取所有子线程的后代
    for (const childThreadId of childThreadIds) {
      const childDescendants = this.getAllDescendantThreadIds(childThreadId);
      allDescendants.push(...childDescendants);
    }

    return allDescendants;
  }
}