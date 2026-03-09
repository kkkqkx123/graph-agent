/**
 * TaskQueueManager - 任务队列管理器
 * 
 * 职责：
 * - 管理待执行的 ThreadContext 队列
 * - 协调任务分配给线程池
 * - 支持同步和异步任务提交
 * - 处理任务完成和失败
 * 
 * 设计原则：
 * - 有状态多实例，由TriggeredSubworkflowManager持有
 * - 支持同步和异步执行模式
 * - 自动处理队列和线程池协调
 */

import { ThreadExecutor } from '../thread-executor.js';
import { TaskRegistry } from '../../services/task-registry.js';
import { ThreadPoolService } from '../../../core/services/thread-pool-service.js';
import type { EventManager } from '../../../core/services/event-manager.js';
import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { ThreadResult } from '@modular-agent/types';
import { type QueueTask, type ExecutedSubgraphResult, type TaskSubmissionResult } from '../types/triggered-subworkflow.types.js';
import { now, diffTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import { emit } from '../utils/event/event-emitter.js';
import {
  buildTriggeredSubgraphCompletedEvent,
  buildTriggeredSubgraphFailedEvent
} from '../utils/event/event-builder.js';

/**
 * TaskQueueManager - 任务队列管理器
 */
export class TaskQueueManager {
  /**
   * 待执行队列
   */
  private pendingQueue: QueueTask[] = [];

  /**
   * 运行中任务映射
   */
  private runningTasks: Map<string, QueueTask> = new Map();

  /**
   * 任务注册表
   */
  private taskRegistry: TaskRegistry;

  /**
   * 线程池服务
   */
  private threadPoolService: ThreadPoolService;

  /**
   * 事件管理器
   */
  private eventManager: EventManager;

  /**
   * 是否正在处理队列
   */
  private isProcessing: boolean = false;

  /**
   * 构造函数
   * @param taskRegistry 任务注册表
   * @param threadPoolService 线程池服务
   * @param eventManager 事件管理器
   */
  constructor(
    taskRegistry: TaskRegistry,
    threadPoolService: ThreadPoolService,
    eventManager: EventManager
  ) {
    this.taskRegistry = taskRegistry;
    this.threadPoolService = threadPoolService;
    this.eventManager = eventManager;
  }

  /**
   * 提交同步任务
   * @param taskId 任务ID（已由管理器注册）
   * @param threadEntity 线程实体
   * @param timeout 超时时间（毫秒）
   * @returns 执行结果
   */
  async submitSync(taskId: string, threadEntity: ThreadEntity, timeout?: number): Promise<ExecutedSubgraphResult> {
    return new Promise((resolve, reject) => {
      const queueTask: QueueTask = {
        taskId,
        threadEntity,
        resolve: resolve as any,
        reject,
        submitTime: now(),
        timeout
      };

      this.pendingQueue.push(queueTask);

      // 触发队列处理
      this.processQueue();
    });
  }

  /**
   * 提交异步任务
   * @param taskId 任务ID（已由管理器注册）
   * @param threadEntity 线程实体
   * @param timeout 超时时间（毫秒）
   * @returns 任务提交结果
   */
  submitAsync(taskId: string, threadEntity: ThreadEntity, timeout?: number): TaskSubmissionResult {
    const queueTask: QueueTask = {
      taskId,
      threadEntity,
      resolve: () => { }, // 异步任务不需要 resolve
      reject: () => { }, // 异步任务不需要 reject
      submitTime: now(),
      timeout
    };

    this.pendingQueue.push(queueTask);

    // 触发队列处理
    this.processQueue();

    return {
      taskId,
      status: 'QUEUED',
      message: 'Task submitted successfully',
      submitTime: now()
    };
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.pendingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.pendingQueue.length > 0) {
        // 从队列取出第一个任务
        const queueTask = this.pendingQueue.shift()!;

        // 分配执行器
        const executor = await this.threadPoolService.allocateExecutor();

        // 更新任务状态
        this.taskRegistry.updateStatusToRunning(queueTask.taskId);
        this.runningTasks.set(queueTask.taskId, queueTask);

        // 执行任务
        this.executeTask(executor, queueTask);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 执行任务
   * @param executor 执行器
   * @param queueTask 队列任务
   */
  private async executeTask(executor: ThreadExecutor, queueTask: QueueTask): Promise<void> {
    const startTime = now();

    try {
      // 执行线程
      const threadResult = await executor.executeThread(queueTask.threadEntity);

      const executionTime = diffTimestamp(startTime, now());

      // 处理任务完成
      await this.handleTaskCompleted(queueTask, threadResult, executionTime);
    } catch (error) {
      const executionTime = diffTimestamp(startTime, now());

      // 处理任务失败
      await this.handleTaskFailed(queueTask, error as Error, executionTime);
    } finally {
      // 释放执行器
      await this.threadPoolService.releaseExecutor(executor);

      // 继续处理队列
      this.processQueue();
    }
  }

  /**
   * 处理任务完成
   * @param queueTask 队列任务
   * @param threadResult 执行结果
   * @param executionTime 执行时间
   */
  private async handleTaskCompleted(
    queueTask: QueueTask,
    threadResult: ThreadResult,
    executionTime: number
  ): Promise<void> {
    // 更新任务注册表
    this.taskRegistry.updateStatusToCompleted(queueTask.taskId, threadResult);

    // 从运行中任务移除
    this.runningTasks.delete(queueTask.taskId);

    // 触发完成事件
    const completedEvent = buildTriggeredSubgraphCompletedEvent({
      threadId: queueTask.threadEntity.thread.id,
      workflowId: queueTask.threadEntity.thread.workflowId,
      subgraphId: queueTask.threadEntity.getTriggeredSubworkflowId() || '',
      triggerId: '',
      output: queueTask.threadEntity.getOutput(),
      executionTime
    });
    await emit(this.eventManager, completedEvent);

    // 如果是同步任务，调用 resolve
    if (queueTask.resolve) {
      const result: ExecutedSubgraphResult = {
        subgraphEntity: queueTask.threadEntity,
        threadResult,
        executionTime
      };
      queueTask.resolve(result);
    }
  }

  /**
   * 处理任务失败
   * @param queueTask 队列任务
   * @param error 错误信息
   * @param executionTime 执行时间
   */
  private async handleTaskFailed(
    queueTask: QueueTask,
    error: Error,
    executionTime: number
  ): Promise<void> {
    // 更新任务注册表
    this.taskRegistry.updateStatusToFailed(queueTask.taskId, error);

    // 从运行中任务移除
    this.runningTasks.delete(queueTask.taskId);

    // 触发失败事件
    const failedEvent = buildTriggeredSubgraphFailedEvent({
      threadId: queueTask.threadEntity.thread.id,
      workflowId: queueTask.threadEntity.thread.workflowId,
      subgraphId: queueTask.threadEntity.getTriggeredSubworkflowId() || '',
      triggerId: '',
      error: getErrorOrNew(error)
    });
    await emit(this.eventManager, failedEvent);

    // 如果是同步任务，调用 reject
    if (queueTask.reject) {
      queueTask.reject(error);
    }
  }

  /**
   * 取消任务
   * @param taskId 任务ID
   * @returns 是否取消成功
   */
  cancelTask(taskId: string): boolean {
    // 检查任务是否在待执行队列
    const pendingIndex = this.pendingQueue.findIndex(task => task.taskId === taskId);
    if (pendingIndex > -1) {
      const queueTask = this.pendingQueue.splice(pendingIndex, 1)[0];
      if (!queueTask) {
        return false;
      }

      this.taskRegistry.updateStatusToCancelled(taskId);

      // 触发取消事件（使用 FAILED 事件类型，因为 CANCELLED 事件类型不存在）
      const cancelledEvent = buildTriggeredSubgraphFailedEvent({
        threadId: queueTask.threadEntity.thread.id,
        workflowId: queueTask.threadEntity.thread.workflowId,
        subgraphId: queueTask.threadEntity.getTriggeredSubworkflowId() || '',
        triggerId: '',
        error: new Error('Task cancelled')
      });
      emit(this.eventManager, cancelledEvent);

      return true;
    }

    // 检查任务是否正在运行
    if (this.runningTasks.has(taskId)) {
      // 正在运行的任务无法取消
      return false;
    }

    return false;
  }

  /**
   * 获取队列统计信息
   * @returns 统计信息
   */
  getQueueStats() {
    return {
      pendingCount: this.pendingQueue.length,
      runningCount: this.runningTasks.size,
      completedCount: this.taskRegistry.getStats().completed,
      failedCount: this.taskRegistry.getStats().failed,
      cancelledCount: this.taskRegistry.getStats().cancelled
    };
  }

  /**
   * 等待所有任务完成
   */
  async drain(): Promise<void> {
    while (this.pendingQueue.length > 0 || this.runningTasks.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 清空队列
   */
  clear(): void {
    // 取消所有待执行任务
    for (const queueTask of this.pendingQueue) {
      this.taskRegistry.updateStatusToCancelled(queueTask.taskId);
    }

    this.pendingQueue = [];
  }
}
