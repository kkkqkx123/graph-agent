/**
 * TaskRegistry - 任务注册表（全局单例服务）
 * 
 * 职责：
 * - 存储和管理所有任务的信息
 * - 跟踪任务状态、执行结果、时间戳等
 * - 提供任务查询和清理功能
 * - 路由任务操作到正确的管理器
 * 
 * 设计原则：
 * - 全局单例，通过 SingletonRegistry 访问
 * - 线程安全的任务信息管理
 * - 支持定期清理过期任务
 * - 提供管理器路由功能
 */

import { generateId } from '@modular-agent/common-utils';
import type { ThreadContext } from '../execution/context/thread-context';
import type { ThreadResult } from '@modular-agent/types';
import { TaskStatus, type TaskInfo } from '../execution/types/task.types';

/**
 * 任务管理器接口
 * 所有需要管理任务的管理器都必须实现此接口
 */
export interface TaskManager {
  /**
   * 取消任务
   * @param taskId 任务ID
   * @returns 是否取消成功
   */
  cancelTask(taskId: string): Promise<boolean>;

  /**
   * 获取任务状态
   * @param taskId 任务ID
   * @returns 任务信息
   */
  getTaskStatus(taskId: string): TaskInfo | null;
}

/**
 * TaskRegistry - 任务注册表（全局单例）
 */
export class TaskRegistry {
  private static instance: TaskRegistry;
  
  /**
   * 任务映射
   */
  private tasks: Map<string, TaskInfo> = new Map();

  /**
   * 任务ID到管理器的映射
   */
  private taskManagers: Map<string, TaskManager> = new Map();

  /**
   * 统计计数器
   */
  private stats = {
    completed: 0,
    failed: 0,
    cancelled: 0,
    timeout: 0
  };

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): TaskRegistry {
    if (!TaskRegistry.instance) {
      TaskRegistry.instance = new TaskRegistry();
    }
    return TaskRegistry.instance;
  }

  /**
   * 注册任务
   * @param threadContext 线程上下文
   * @param manager 任务管理器
   * @param timeout 超时时间（毫秒）
   * @returns 任务ID
   */
  register(
    threadContext: ThreadContext, 
    manager: TaskManager,
    timeout?: number
  ): string {
    const taskId = generateId();
    
    const taskInfo: TaskInfo = {
      id: taskId,
      threadContext,
      status: 'QUEUED',
      submitTime: Date.now(),
      timeout
    };

    this.tasks.set(taskId, taskInfo);
    this.taskManagers.set(taskId, manager);
    
    return taskId;
  }

  /**
   * 更新任务状态为运行中
   * @param taskId 任务ID
   */
  updateStatusToRunning(taskId: string): void {
    const taskInfo = this.tasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'RUNNING';
      taskInfo.startTime = Date.now();
    }
  }

  /**
   * 更新任务状态为完成
   * @param taskId 任务ID
   * @param result 执行结果
   */
  updateStatusToCompleted(taskId: string, result: ThreadResult): void {
    const taskInfo = this.tasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'COMPLETED';
      taskInfo.completeTime = Date.now();
      taskInfo.result = result;
      this.stats.completed++;
    }
  }

  /**
   * 更新任务状态为失败
   * @param taskId 任务ID
   * @param error 错误信息
   */
  updateStatusToFailed(taskId: string, error: Error): void {
    const taskInfo = this.tasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'FAILED';
      taskInfo.completeTime = Date.now();
      taskInfo.error = error;
      this.stats.failed++;
    }
  }

  /**
   * 更新任务状态为取消
   * @param taskId 任务ID
   */
  updateStatusToCancelled(taskId: string): void {
    const taskInfo = this.tasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'CANCELLED';
      taskInfo.completeTime = Date.now();
      this.stats.cancelled++;
    }
  }

  /**
   * 更新任务状态为超时
   * @param taskId 任务ID
   */
  updateStatusToTimeout(taskId: string): void {
    const taskInfo = this.tasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'TIMEOUT';
      taskInfo.completeTime = Date.now();
      this.stats.timeout++;
    }
  }

  /**
   * 取消任务（路由到正确的管理器）
   * @param taskId 任务ID
   * @returns 是否取消成功
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const manager = this.taskManagers.get(taskId);
    if (!manager) {
      return false;
    }

    const success = await manager.cancelTask(taskId);
    
    if (success) {
      this.updateStatusToCancelled(taskId);
      this.taskManagers.delete(taskId);
    }

    return success;
  }

  /**
   * 获取任务信息
   * @param taskId 任务ID
   * @returns 任务信息
   */
  get(taskId: string): TaskInfo | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 检查任务是否存在
   * @param taskId 任务ID
   * @returns 是否存在
   */
  has(taskId: string): boolean {
    return this.tasks.has(taskId);
  }

  /**
   * 获取所有任务
   * @returns 所有任务信息数组
   */
  getAll(): TaskInfo[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 根据状态获取任务
   * @param status 任务状态
   * @returns 指定状态的任务数组
   */
  getByStatus(status: TaskStatus): TaskInfo[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  /**
   * 根据线程ID获取任务
   * @param threadId 线程ID
   * @returns 任务信息
   */
  getByThreadId(threadId: string): TaskInfo | null {
    return this.getAll().find(task => task.threadContext.getThreadId() === threadId) || null;
  }

  /**
   * 删除任务
   * @param taskId 任务ID
   * @returns 是否删除成功
   */
  delete(taskId: string): boolean {
    this.taskManagers.delete(taskId);
    return this.tasks.delete(taskId);
  }

  /**
   * 清理过期任务
   * @param retentionTime 保留时间（毫秒），默认1小时
   * @returns 清理的任务数量
   */
  cleanup(retentionTime: number = 60 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [taskId, taskInfo] of this.tasks.entries()) {
      // 只清理已完成、失败、取消或超时的任务
      if (
        (taskInfo.status === 'COMPLETED' ||
          taskInfo.status === 'FAILED' ||
          taskInfo.status === 'CANCELLED' ||
          taskInfo.status === 'TIMEOUT') &&
        taskInfo.completeTime &&
        (now - taskInfo.completeTime) > retentionTime
      ) {
        this.tasks.delete(taskId);
        this.taskManagers.delete(taskId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      queued: tasks.filter(t => t.status === 'QUEUED').length,
      running: tasks.filter(t => t.status === 'RUNNING').length,
      completed: this.stats.completed,
      failed: this.stats.failed,
      cancelled: this.stats.cancelled,
      timeout: this.stats.timeout
    };
  }

  /**
   * 清空所有任务
   */
  clear(): void {
    this.tasks.clear();
    this.taskManagers.clear();
    this.stats = {
      completed: 0,
      failed: 0,
      cancelled: 0,
      timeout: 0
    };
  }

  /**
   * 获取任务数量
   * @returns 任务数量
   */
  size(): number {
    return this.tasks.size;
  }
}