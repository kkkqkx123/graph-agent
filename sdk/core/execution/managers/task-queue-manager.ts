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
import { ThreadPoolManager } from './thread-pool-manager.js';
import type { EventManager } from '../../services/event-manager.js';
import { EventType } from '@modular-agent/types';
import type { ThreadContext } from '../context/thread-context.js';
import type { ThreadResult } from '@modular-agent/types';
import { TaskStatus } from '../types/task.types.js';
import { type QueueTask, type ExecutedSubgraphResult, type TaskSubmissionResult } from '../types/triggered-subgraph.types.js';
import { now, diffTimestamp, getErrorMessage } from '@modular-agent/common-utils';

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
   * 线程池管理器
   */
  private threadPoolManager: ThreadPoolManager;

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
   * @param threadPoolManager 线程池管理器
   * @param eventManager 事件管理器
   */
  constructor(
    taskRegistry: TaskRegistry,
    threadPoolManager: ThreadPoolManager,
    eventManager: EventManager
  ) {
    this.taskRegistry = taskRegistry;
    this.threadPoolManager = threadPoolManager;
    this.eventManager = eventManager;
  }

  /**
   * 提交同步任务
   * @param taskId 任务ID（已由管理器注册）
   * @param threadContext 线程上下文
   * @param timeout 超时时间（毫秒）
   * @returns 执行结果
   */
  async submitSync(taskId: string, threadContext: ThreadContext, timeout?: number): Promise<ExecutedSubgraphResult> {
    return new Promise((resolve, reject) => {
      const queueTask: QueueTask = {
        taskId,
        threadContext,
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
   * @param threadContext 线程上下文
   * @param timeout 超时时间（毫秒）
   * @returns 任务提交结果
   */
  submitAsync(taskId: string, threadContext: ThreadContext, timeout?: number): TaskSubmissionResult {
    const queueTask: QueueTask = {
      taskId,
      threadContext,
      resolve: () => {}, // 异步任务不需要 resolve
      reject: () => {}, // 异步任务不需要 reject
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
        const executor = await this.threadPoolManager.allocateExecutor();
        
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
      const threadResult = await executor.executeThread(queueTask.threadContext);
      
      const executionTime = diffTimestamp(startTime, now());
      
      // 处理任务完成
      await this.handleTaskCompleted(queueTask, threadResult, executionTime);
    } catch (error) {
      const executionTime = diffTimestamp(startTime, now());
      
      // 处理任务失败
      await this.handleTaskFailed(queueTask, error as Error, executionTime);
    } finally {
      // 释放执行器
      await this.threadPoolManager.releaseExecutor(executor);
      
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
    await this.eventManager.emit({
      type: 'TRIGGERED_SUBGRAPH_COMPLETED',
      threadId: queueTask.threadContext.getThreadId(),
      workflowId: queueTask.threadContext.getWorkflowId(),
      subgraphId: queueTask.threadContext.getTriggeredSubworkflowId() || '',
      triggerId: '',
      output: queueTask.threadContext.getOutput(),
      executionTime,
      timestamp: now()
    });
    
    // 如果是同步任务，调用 resolve
    if (queueTask.resolve) {
      const result: ExecutedSubgraphResult = {
        subgraphContext: queueTask.threadContext,
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
    await this.eventManager.emit({
      type: 'TRIGGERED_SUBGRAPH_FAILED',
      threadId: queueTask.threadContext.getThreadId(),
      workflowId: queueTask.threadContext.getWorkflowId(),
      subgraphId: queueTask.threadContext.getTriggeredSubworkflowId() || '',
      triggerId: '',
      error: getErrorMessage(error),
      executionTime,
      timestamp: now()
    });
    
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
      this.eventManager.emit({
        type: 'TRIGGERED_SUBGRAPH_FAILED',
        threadId: queueTask.threadContext.getThreadId(),
        workflowId: queueTask.threadContext.getWorkflowId(),
        subgraphId: queueTask.threadContext.getTriggeredSubworkflowId() || '',
        triggerId: '',
        error: 'Task cancelled',
        executionTime: 0,
        timestamp: now()
      });
      
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