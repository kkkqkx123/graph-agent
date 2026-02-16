/**
 * TaskRegistry - 任务注册表
 * 
 * 职责：
 * - 存储和管理所有任务的信息
 * - 跟踪任务状态、执行结果、时间戳等
 * - 提供任务查询和清理功能
 * 
 * 设计原则：
 * - 有状态多实例，由TriggeredSubworkflowManager持有
 * - 线程安全的任务信息管理
 * - 支持定期清理过期任务
 */

import { generateId } from '@modular-agent/common-utils';
import type { ThreadContext } from '../context/thread-context';
import type { ThreadResult } from '@modular-agent/types';
import { TaskStatus, type TaskInfo } from '../types/task.types';

/**
 * TaskRegistry - 任务注册表
 */
export class TaskRegistry {
  /**
   * 任务映射
   */
  private tasks: Map<string, TaskInfo> = new Map();

  /**
   * 统计计数器
   */
  private stats = {
    completed: 0,
    failed: 0,
    cancelled: 0,
    timeout: 0
  };

  /**
   * 注册任务
   * @param threadContext 线程上下文
   * @param timeout 超时时间（毫秒）
   * @returns 任务ID
   */
  register(threadContext: ThreadContext, timeout?: number): string {
    const taskId = generateId();
    
    const taskInfo: TaskInfo = {
      id: taskId,
      threadContext,
      status: TaskStatus.QUEUED,
      submitTime: Date.now(),
      timeout
    };

    this.tasks.set(taskId, taskInfo);
    
    return taskId;
  }

  /**
   * 更新任务状态为运行中
   * @param taskId 任务ID
   */
  updateStatusToRunning(taskId: string): void {
    const taskInfo = this.tasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = TaskStatus.RUNNING;
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
      taskInfo.status = TaskStatus.COMPLETED;
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
      taskInfo.status = TaskStatus.FAILED;
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
      taskInfo.status = TaskStatus.CANCELLED;
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
      taskInfo.status = TaskStatus.TIMEOUT;
      taskInfo.completeTime = Date.now();
      this.stats.timeout++;
    }
  }

  /**
   * 获取任务信息
   * @param taskId 任务ID
   * @returns 任务信息，如果不存在则返回null
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
   * 删除任务
   * @param taskId 任务ID
   * @returns 是否删除成功
   */
  delete(taskId: string): boolean {
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
        (taskInfo.status === TaskStatus.COMPLETED ||
         taskInfo.status === TaskStatus.FAILED ||
         taskInfo.status === TaskStatus.CANCELLED ||
         taskInfo.status === TaskStatus.TIMEOUT) &&
        taskInfo.completeTime &&
        (now - taskInfo.completeTime) > retentionTime
      ) {
        this.tasks.delete(taskId);
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
      queued: tasks.filter(t => t.status === TaskStatus.QUEUED).length,
      running: tasks.filter(t => t.status === TaskStatus.RUNNING).length,
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