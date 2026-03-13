/**
 * TriggeredSubworkflowManager - 触发子工作流管理器（全局单例服务）
 *
 * 职责：
 * - 管理 triggered 子工作流的完整生命周期
 * - 协调子工作流的创建和执行
 * - 使用任务队列和线程池管理执行
 * - 支持同步和异步执行模式
 * - 提供任务状态查询和取消功能
 *
 * 设计原则：
 * - 全局单例服务，通过 DI 容器管理
 * - 管理跨线程共享的资源（线程池、任务队列）
 * - 无线程隔离，所有触发子工作流共享同一个实例
 * - 实现 TaskManager 接口，与 TaskRegistry 配合使用
 */

import type { ThreadEntity } from '../entities/thread-entity.js';
import { getErrorOrNew, now } from '@modular-agent/common-utils';
import { logger } from '../../utils/logger.js';
import { TaskRegistry, type TaskManager } from './task-registry.js';
import { ThreadPoolService } from './thread-pool-service.js';
import { TaskQueueManager } from '../execution/managers/task-queue-manager.js';
import { CallbackManager } from '../../graph/execution/managers/callback-manager.js';
import {
  type TriggeredSubgraphTask,
  type ExecutedSubgraphResult,
  type TaskSubmissionResult,
} from '../../graph/execution/types/triggered-subworkflow.types.js';
import { emit } from '../execution/utils/index.js';
import {
  buildTriggeredSubgraphStartedEvent,
  buildTriggeredSubgraphCompletedEvent,
  buildTriggeredSubgraphFailedEvent
} from '../../graph/execution/utils/event/event-builder.js';
import { RuntimeValidationError, SDKError } from '@modular-agent/types';
import { logError, emitErrorEvent } from '../../core/utils/error-utils.js';

/**
 * TriggeredSubworkflowManager - 触发子工作流管理器（全局单例服务）
 */
export class TriggeredSubworkflowManager implements TaskManager {
  /**
   * 全局任务注册表
   */
  private taskRegistry: TaskRegistry;

  /**
   * 线程池服务
   */
  private threadPoolService: ThreadPoolService;

  /**
   * 任务队列管理器
   */
  private taskQueueManager: TaskQueueManager;

  /**
   * 事件管理器
   */
  private eventManager: any;

  /**
   * Thread 注册表
   */
  private threadRegistry: any;

  /**
   * Thread 构建器
   */
  private threadBuilder: any;

  /**
   * 回调管理器
   */
  private callbackManager: CallbackManager<ExecutedSubgraphResult>;

  /**
   * 活跃任务映射
   * 用于跟踪和管理异步执行的任务，防止内存泄漏
   */
  private activeTasks: Map<string, { taskId: string; threadId: string; submitTime: number; timeout: number }> = new Map();

  /**
   * 构造函数
   * @param threadRegistry Thread 注册表
   * @param threadBuilder Thread 构建器
   * @param taskQueueManager 任务队列管理器
   * @param eventManager 事件管理器
   * @param threadPoolService 线程池服务
   */
  constructor(
    threadRegistry: any,
    threadBuilder: any,
    taskQueueManager: TaskQueueManager,
    eventManager: any,
    threadPoolService: ThreadPoolService
  ) {
    this.threadRegistry = threadRegistry;
    this.threadBuilder = threadBuilder;
    this.taskQueueManager = taskQueueManager;
    this.eventManager = eventManager;
    this.threadPoolService = threadPoolService;

    // 获取全局任务注册表
    this.taskRegistry = TaskRegistry.getInstance();

    // 创建回调管理器
    this.callbackManager = new CallbackManager<ExecutedSubgraphResult>();
  }

  /**
   * 执行触发子工作流
   * @param task 触发子工作流任务
   * @returns 执行结果（同步）或任务提交结果（异步）
   */
  async executeTriggeredSubgraph(
    task: TriggeredSubgraphTask
  ): Promise<ExecutedSubgraphResult | TaskSubmissionResult> {
    // 验证参数
    if (!task.subgraphId) {
      throw new RuntimeValidationError('subgraphId is required', {
        operation: 'executeTriggeredSubgraph',
        field: 'subgraphId'
      });
    }

    if (!task.mainThreadEntity) {
      throw new RuntimeValidationError('mainThreadEntity is required', {
        operation: 'executeTriggeredSubgraph',
        field: 'mainThreadEntity'
      });
    }

    // 准备输入数据
    const input = this.prepareInputData(task);

    // 创建子工作流 ThreadEntity
    const subgraphEntity = await this.createSubgraphContext(task, input);

    // 注册到 ThreadRegistry
    this.threadRegistry.register(subgraphEntity);

    // 建立父子线程关系
    const parentThreadId = task.mainThreadEntity.getThreadId();
    const childThreadId = subgraphEntity.getThreadId();
    task.mainThreadEntity.registerChildThread(childThreadId);
    subgraphEntity.setParentThreadId(parentThreadId);
    subgraphEntity.setTriggeredSubworkflowId(task.subgraphId);

    // 触发开始事件
    await this.emitStartedEvent(task, subgraphEntity);

    // 根据配置选择执行方式
    const waitForCompletion = task.config?.waitForCompletion !== false; // 默认为 true
    const timeout = task.config?.timeout || this.threadPoolService.getConfig().defaultTimeout;

    if (waitForCompletion) {
      // 同步执行
      return await this.executeSync(subgraphEntity, timeout);
    } else {
      // 异步执行
      return this.executeAsync(subgraphEntity, timeout);
    }
  }

  /**
   * 准备输入数据
   * @param task 触发子工作流任务
   * @returns 输入数据
   */
  private prepareInputData(task: TriggeredSubgraphTask): Record<string, any> {
    return {
      triggerId: task.triggerId,
      output: task.mainThreadEntity.getOutput(),
      input: task.mainThreadEntity.getInput(),
      ...task.input
    };
  }

  /**
   * 创建子工作流上下文
   * @param task 触发子工作流任务
   * @param input 输入数据
   * @returns 子工作流实体
   */
  private async createSubgraphContext(
    task: TriggeredSubgraphTask,
    input: Record<string, any>
  ): Promise<ThreadEntity> {
    const subgraphEntity = await this.threadBuilder.build(task.subgraphId, {
      input
    });

    // 设置线程类型为 TRIGGERED
    subgraphEntity.setThreadType('TRIGGERED');

    return subgraphEntity;
  }

  /**
   * 同步执行
   * @param subgraphEntity 子工作流实体
   * @param timeout 超时时间
   * @returns 执行结果
   */
  private async executeSync(
    subgraphEntity: ThreadEntity,
    timeout: number
  ): Promise<ExecutedSubgraphResult> {
    // 先注册任务到全局 TaskRegistry
    const taskId = this.taskRegistry.register(subgraphEntity, this, timeout);

    try {
      const result = await this.taskQueueManager.submitSync(taskId, subgraphEntity, timeout);

      // 注销父子关系
      this.unregisterParentChildRelationship(subgraphEntity);

      return result;
    } catch (error) {
      // 注销父子关系
      this.unregisterParentChildRelationship(subgraphEntity);
      throw error;
    }
  }

  /**
   * 异步执行
   * @param subgraphEntity 子工作流实体
   * @param timeout 超时时间
   * @returns 任务提交结果
   */
  private executeAsync(
    subgraphEntity: ThreadEntity,
    timeout: number
  ): TaskSubmissionResult {
    const threadId = subgraphEntity.getThreadId();

    // 先注册任务到全局 TaskRegistry
    const taskId = this.taskRegistry.register(subgraphEntity, this, timeout);

    // 提交到任务队列
    const submissionResult = this.taskQueueManager.submitAsync(taskId, subgraphEntity, timeout);

    // 直接注册回调，不创建 Promise
    // 这样可以避免 Promise 引用无法被清理导致的内存泄漏
    this.callbackManager.registerCallback(
      threadId,
      (result) => this.handleSubgraphCompleted(threadId, result),
      (error) => this.handleSubgraphFailed(threadId, error)
    );

    // 存储任务信息以便后续清理
    this.activeTasks.set(threadId, {
      taskId,
      threadId,
      submitTime: now(),
      timeout
    });

    return {
      taskId: submissionResult.taskId,
      status: submissionResult.status,
      message: 'Triggered subgraph submitted',
      submitTime: submissionResult.submitTime
    };
  }

  /**
   * 处理子工作流完成
   * @param threadId 线程 ID
   * @param result 执行结果
   */
  private handleSubgraphCompleted(threadId: string, result: ExecutedSubgraphResult): void {
    // 触发完成事件
    this.emitCompletedEvent(threadId, result);

    // 注销父子关系
    const subgraphEntity = this.threadRegistry.get(threadId);
    if (subgraphEntity) {
      this.unregisterParentChildRelationship(subgraphEntity);
    }

    // 清理 TaskRegistry 中的任务记录
    const taskInfo = this.taskRegistry.getAll().find(
      t => t.threadEntity.getThreadId() === threadId
    );
    if (taskInfo) {
      this.taskRegistry.delete(taskInfo.id);
    }

    // 清理活跃任务信息
    this.activeTasks.delete(threadId);

    // 最后触发回调（内部会清理回调）
    // triggerCallback 内部已经会清理回调，不需要再调用 cleanupCallback
    this.callbackManager.triggerCallback(threadId, result);
  }

  /**
   * 处理子工作流失败
   * @param threadId 线程 ID
   * @param error 错误信息
   */
  private handleSubgraphFailed(threadId: string, error: Error): void {
    // 触发失败事件
    this.emitFailedEvent(threadId, error);

    // 注销父子关系
    const subgraphEntity = this.threadRegistry.get(threadId);
    if (subgraphEntity) {
      this.unregisterParentChildRelationship(subgraphEntity);
    }

    // 清理 TaskRegistry 中的任务记录
    const taskInfo = this.taskRegistry.getAll().find(
      t => t.threadEntity.getThreadId() === threadId
    );
    if (taskInfo) {
      this.taskRegistry.delete(taskInfo.id);
    }

    // 清理活跃任务信息
    this.activeTasks.delete(threadId);

    // 最后触发错误回调（内部会清理回调）
    // triggerErrorCallback 内部已经会清理回调，不需要再调用 cleanupCallback
    this.callbackManager.triggerErrorCallback(threadId, error);
  }

  /**
   * 注销父子关系
   * @param subgraphEntity 子工作流实体
   */
  private unregisterParentChildRelationship(subgraphEntity: ThreadEntity): void {
    const parentThreadId = subgraphEntity.getParentThreadId();
    const childThreadId = subgraphEntity.getThreadId();

    if (parentThreadId) {
      const parentEntity = this.threadRegistry.get(parentThreadId);
      if (parentEntity) {
        parentEntity.unregisterChildThread(childThreadId);
      }
    }
  }

  /**
   * 触发开始事件
   * @param task 触发子工作流任务
   * @param subgraphEntity 子工作流实体
   */
  private async emitStartedEvent(
    task: TriggeredSubgraphTask,
    subgraphEntity: ThreadEntity
  ): Promise<void> {
    const startedEvent = buildTriggeredSubgraphStartedEvent({
      threadId: task.mainThreadEntity.thread.id,
      workflowId: task.mainThreadEntity.thread.workflowId,
      subgraphId: task.subgraphId,
      triggerId: task.triggerId,
      input: task.input
    });
    await emit(this.eventManager, startedEvent);
  }

  /**
   * 触发完成事件
   * @param threadId 线程 ID
   * @param result 执行结果
   */
  private async emitCompletedEvent(threadId: string, result: ExecutedSubgraphResult): Promise<void> {
    const subgraphEntity = this.threadRegistry.get(threadId);
    if (!subgraphEntity) {
      return;
    }

    const completedEvent = buildTriggeredSubgraphCompletedEvent({
      threadId: subgraphEntity.thread.id,
      workflowId: subgraphEntity.thread.workflowId,
      subgraphId: subgraphEntity.getTriggeredSubworkflowId() || '',
      triggerId: '',
      output: subgraphEntity.getOutput(),
      executionTime: result.executionTime
    });
    await emit(this.eventManager, completedEvent);
  }

  /**
   * 触发失败事件
   * @param threadId 线程 ID
   * @param error 错误信息
   */
  private async emitFailedEvent(threadId: string, error: Error): Promise<void> {
    const subgraphEntity = this.threadRegistry.get(threadId);
    if (!subgraphEntity) {
      return;
    }

    const failedEvent = buildTriggeredSubgraphFailedEvent({
      threadId: subgraphEntity.thread.id,
      workflowId: subgraphEntity.thread.workflowId,
      subgraphId: subgraphEntity.getTriggeredSubworkflowId() || '',
      triggerId: '',
      error: getErrorOrNew(error)
    });
    await emit(this.eventManager, failedEvent);
  }

  /**
   * 查询任务状态（实现 TaskManager 接口）
   * @param taskId 任务 ID
   * @returns 任务信息
   */
  getTaskStatus(taskId: string) {
    return this.taskRegistry.get(taskId);
  }

  /**
   * 取消任务（实现 TaskManager 接口）
   * @param taskId 任务 ID
   * @returns 是否取消成功
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const success = this.taskQueueManager.cancelTask(taskId);

    if (success) {
      const taskInfo = this.taskRegistry.get(taskId);
      if (taskInfo) {
        // 注销父子关系
        this.unregisterParentChildRelationship(taskInfo.threadEntity);
      }
    }

    return success;
  }

  /**
   * 获取队列统计信息
   * @returns 队列统计信息
   */
  getQueueStats() {
    return this.taskQueueManager.getQueueStats();
  }

  /**
   * 获取线程池统计信息
   * @returns 线程池统计信息
   */
  getPoolStats() {
    return this.threadPoolService.getStats();
  }

  /**
   * 获取任务注册表统计信息
   * @returns 任务注册表统计信息
   */
  getTaskStats() {
    return this.taskRegistry.getStats();
  }

  /**
   * 关闭管理器
   */
  async shutdown(): Promise<void> {
    // 取消所有活跃任务
    for (const [threadId, task] of this.activeTasks.entries()) {
      try {
        await this.cancelTask(task.taskId);
      } catch (error) {
        const errorObj = getErrorOrNew(error);
        const sdkError = new SDKError(
          `Failed to cancel task ${task.taskId}`,
          'warning',
          { threadId, taskId: task.taskId },
          errorObj
        );
        logError(sdkError, { threadId, taskId: task.taskId });
        emitErrorEvent(this.eventManager, {
          threadId,
          workflowId: '',
          error: sdkError
        });
      }
    }

    // 清理活跃任务信息
    this.activeTasks.clear();

    // 清理回调管理器
    this.callbackManager.cleanup();

    // 等待所有任务完成
    await this.taskQueueManager.drain();

    // 关闭线程池
    await this.threadPoolService.shutdown();

    // 清理任务注册表
    this.taskRegistry.cleanup();
  }

  /**
   * 清理过期任务
   * @param retentionTime 保留时间（毫秒）
   * @returns 清理的任务数量
   */
  cleanupExpiredTasks(retentionTime?: number): number {
    return this.taskRegistry.cleanup(retentionTime);
  }
}
