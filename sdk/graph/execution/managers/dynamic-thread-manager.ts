/**
 * DynamicThreadManager - 动态线程管理器
 *
 * 职责：
 * - 创建和管理动态子线程
 * - 处理子线程完成回调
 * - 提供同步和异步执行模式
 * - 管理动态线程的生命周期
 *
 * 设计原则：
 * - 有状态多实例，由 Handler 创建
 * - 复用现有的 TaskQueue 和 ThreadPool 基础设施
 * - 支持同步和异步执行模式
 * - 提供完整的事件通知机制
 */

import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { EventManager } from '../../services/event-manager.js';
import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { ThreadExecutor } from '../thread-executor.js';
import { now, diffTimestamp, getErrorMessage } from '@modular-agent/common-utils';
import { TaskRegistry, type TaskManager } from '../../services/task-registry.js';
import { ThreadPoolService } from '../../services/thread-pool-service.js';
import { TaskQueueManager } from './task-queue-manager.js';
import { ThreadBuilder } from '../thread-builder.js';
import { CallbackManager } from './callback-manager.js';
import {
  type DynamicThreadInfo,
  type ExecutedThreadResult,
  type ThreadSubmissionResult,
  type CreateDynamicThreadRequest,
  type DynamicThreadEvent,
  DynamicThreadEventType,
  type DynamicThreadConfig
} from '../types/dynamic-thread.types.js';
import { TaskStatus } from '../types/task.types.js';
import { EventType } from '@modular-agent/types';

/**
 * DynamicThreadManager - 动态线程管理器
 */
export class DynamicThreadManager implements TaskManager {
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
  private eventManager: EventManager;

  /**
   * Thread 注册表
   */
  private threadRegistry: ThreadRegistry;

  /**
   * Thread 构建器
   */
  private threadBuilder: ThreadBuilder;

  /**
   * 回调管理器
   */
  private callbackManager: CallbackManager<ExecutedThreadResult>;

  /**
   * 动态线程映射
   */
  private dynamicThreads: Map<string, DynamicThreadInfo> = new Map();

  /**
   * 构造函数
   * @param threadRegistry Thread 注册表
   * @param threadBuilder Thread 构建器
   * @param taskRegistry 任务注册表
   * @param taskQueueManager 任务队列管理器
   * @param eventManager 事件管理器
   * @param threadPoolService 线程池服务
   */
  constructor(
    threadRegistry: ThreadRegistry,
    threadBuilder: ThreadBuilder,
    taskRegistry: TaskRegistry,
    taskQueueManager: TaskQueueManager,
    eventManager: EventManager,
    threadPoolService: ThreadPoolService
  ) {
    this.threadRegistry = threadRegistry;
    this.threadBuilder = threadBuilder;
    this.taskRegistry = taskRegistry;
    this.taskQueueManager = taskQueueManager;
    this.eventManager = eventManager;
    this.threadPoolService = threadPoolService;

    // 创建回调管理器
    this.callbackManager = new CallbackManager<ExecutedThreadResult>();
  }

  /**
   * 创建动态子线程
   * @param request 创建请求
   * @returns 执行结果（同步）或任务提交结果（异步）
   */
  async createDynamicThread(
    request: CreateDynamicThreadRequest
  ): Promise<ExecutedThreadResult | ThreadSubmissionResult> {
    // 验证参数
    if (!request.workflowId) {
      throw new Error('workflowId is required');
    }

    if (!request.mainThreadEntity) {
      throw new Error('mainThreadEntity is required');
    }

    // 准备输入数据
    const input = this.prepareInputData(request);

    // 创建子线程 ThreadEntity
    const childThreadEntity = await this.createChildThreadContext(request, input);

    // 注册到 ThreadRegistry
    this.threadRegistry.register(childThreadEntity);

    // 建立父子线程关系
    const parentThreadId = request.mainThreadEntity.getThreadId();
    const childThreadId = childThreadEntity.getThreadId();
    request.mainThreadEntity.registerChildThread(childThreadId);
    childThreadEntity.setParentThreadId(parentThreadId);

    // 创建动态线程信息
    const dynamicThreadInfo: DynamicThreadInfo = {
      id: childThreadId,
      threadEntity: childThreadEntity,
      status: 'QUEUED',
      submitTime: now(),
      parentThreadId
    };
    this.dynamicThreads.set(childThreadId, dynamicThreadInfo);

    // 触发开始事件
    await this.emitStartedEvent(request, childThreadEntity);

    // 根据配置选择执行方式
    const waitForCompletion = request.config?.waitForCompletion !== false; // 默认为 true
    const timeout = request.config?.timeout || this.threadPoolService.getConfig().defaultTimeout;

    if (waitForCompletion) {
      // 同步执行
      return await this.executeSync(childThreadEntity, timeout);
    } else {
      // 异步执行
      return this.executeAsync(childThreadEntity, timeout);
    }
  }

  /**
   * 准备输入数据
   * @param request 创建请求
   * @returns 输入数据
   */
  private prepareInputData(request: CreateDynamicThreadRequest): Record<string, any> {
    return {
      triggerId: request.triggerId,
      output: request.mainThreadEntity.getOutput(),
      input: request.mainThreadEntity.getInput(),
      ...request.input
    };
  }

  /**
   * 创建子线程上下文
   * @param request 创建请求
   * @param input 输入数据
   * @returns 子线程实体
   */
  private async createChildThreadContext(
    request: CreateDynamicThreadRequest,
    input: Record<string, any>
  ): Promise<ThreadEntity> {
    const childThreadEntity = await this.threadBuilder.build(request.workflowId, {
      input
    });

    // 设置线程类型为 DYNAMIC_CHILD
    childThreadEntity.setThreadType('DYNAMIC_CHILD');

    return childThreadEntity;
  }

  /**
   * 同步执行
   * @param childThreadEntity 子线程实体
   * @param timeout 超时时间
   * @returns 执行结果
   */
  private async executeSync(
    childThreadEntity: ThreadEntity,
    timeout: number
  ): Promise<ExecutedThreadResult> {
    const threadId = childThreadEntity.getThreadId();

    // 先注册任务到全局 TaskRegistry
    const taskId = this.taskRegistry.register(childThreadEntity, this, timeout);

    try {
      // 创建 Promise
      const promise = new Promise<ExecutedThreadResult>((resolve, reject) => {
        // 注册回调
        this.callbackManager.registerCallback(threadId, resolve, reject);
      });

      // 提交到任务队列
      this.taskQueueManager.submitSync(taskId, childThreadEntity, timeout);

      // 等待完成
      const result = await promise;

      // 注销父子关系
      this.unregisterParentChildRelationship(childThreadEntity);

      // 清理回调
      this.callbackManager.cleanupCallback(threadId);

      return result;
    } catch (error) {
      // 注销父子关系
      this.unregisterParentChildRelationship(childThreadEntity);

      // 清理回调
      this.callbackManager.cleanupCallback(threadId);

      throw error;
    }
  }

  /**
   * 异步执行
   * @param childThreadEntity 子线程实体
   * @param timeout 超时时间
   * @returns 任务提交结果
   */
  private executeAsync(
    childThreadEntity: ThreadEntity,
    timeout: number
  ): ThreadSubmissionResult {
    const threadId = childThreadEntity.getThreadId();

    // 先注册任务到全局 TaskRegistry
    const taskId = this.taskRegistry.register(childThreadEntity, this, timeout);

    // 创建 Promise
    const promise = new Promise<ExecutedThreadResult>((resolve, reject) => {
      // 注册回调
      this.callbackManager.registerCallback(threadId, resolve, reject);
    });

    // 提交到任务队列
    const submissionResult = this.taskQueueManager.submitAsync(taskId, childThreadEntity, timeout);

    // 异步执行完成后处理
    promise
      .then((result) => {
        // 触发回调
        this.handleThreadCompleted(threadId, result);
      })
      .catch((error) => {
        // 触发错误回调
        this.handleThreadFailed(threadId, error);
      });

    return {
      threadId,
      status: submissionResult.status,
      message: 'Dynamic thread submitted',
      submitTime: submissionResult.submitTime
    };
  }

  /**
   * 处理线程完成
   * @param threadId 线程 ID
   * @param result 执行结果
   */
  private handleThreadCompleted(threadId: string, result: ExecutedThreadResult): void {
    // 更新动态线程映射状态
    const dynamicThreadInfo = this.dynamicThreads.get(threadId);
    if (dynamicThreadInfo) {
      dynamicThreadInfo.status = 'COMPLETED';
      dynamicThreadInfo.completeTime = now();
      dynamicThreadInfo.result = result.threadResult;
    }

    // 触发回调
    this.callbackManager.triggerCallback(threadId, result);

    // 触发完成事件
    this.emitCompletedEvent(threadId, result);

    // 注销父子关系
    const childThreadEntity = this.threadRegistry.get(threadId);
    if (childThreadEntity) {
      this.unregisterParentChildRelationship(childThreadEntity);
    }

    // 清理回调
    this.callbackManager.cleanupCallback(threadId);
  }

  /**
   * 处理线程失败
   * @param threadId 线程 ID
   * @param error 错误信息
   */
  private handleThreadFailed(threadId: string, error: Error): void {
    // 更新动态线程映射状态
    const dynamicThreadInfo = this.dynamicThreads.get(threadId);
    if (dynamicThreadInfo) {
      dynamicThreadInfo.status = 'FAILED';
      dynamicThreadInfo.completeTime = now();
      dynamicThreadInfo.error = error;
    }

    // 触发错误回调
    this.callbackManager.triggerErrorCallback(threadId, error);

    // 触发失败事件
    this.emitFailedEvent(threadId, error);

    // 注销父子关系
    const childThreadEntity = this.threadRegistry.get(threadId);
    if (childThreadEntity) {
      this.unregisterParentChildRelationship(childThreadEntity);
    }

    // 清理回调
    this.callbackManager.cleanupCallback(threadId);
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
    return this.cancelDynamicThread(taskId);
  }

  /**
   * 取消动态线程
   * @param threadId 线程 ID
   * @returns 是否取消成功
   */
  cancelDynamicThread(threadId: string): boolean {
    const success = this.taskQueueManager.cancelTask(threadId);

    if (success) {
      // 更新动态线程映射状态
      const dynamicThreadInfo = this.dynamicThreads.get(threadId);
      if (dynamicThreadInfo) {
        dynamicThreadInfo.status = 'CANCELLED';
        dynamicThreadInfo.completeTime = now();
      }

      // 触发取消事件
      this.emitCancelledEvent(threadId);

      // 注销父子关系
      const childThreadEntity = this.threadRegistry.get(threadId);
      if (childThreadEntity) {
        this.unregisterParentChildRelationship(childThreadEntity);
      }

      // 清理回调
      this.callbackManager.cleanupCallback(threadId);
    }

    return success;
  }

  /**
   * 查询动态线程状态
   * @param threadId 线程 ID
   * @returns 线程状态信息
   */
  getThreadStatus(threadId: string): DynamicThreadInfo | undefined {
    return this.dynamicThreads.get(threadId);
  }

  /**
   * 添加事件监听器
   * @param threadId 线程 ID
   * @param listener 事件监听器
   * @returns 是否添加成功
   */
  addEventListener(threadId: string, listener: (event: DynamicThreadEvent) => void): boolean {
    return this.callbackManager.addEventListener(threadId, listener);
  }

  /**
   * 移除事件监听器
   * @param threadId 线程 ID
   * @param listener 事件监听器
   * @returns 是否移除成功
   */
  removeEventListener(threadId: string, listener: (event: DynamicThreadEvent) => void): boolean {
    return this.callbackManager.removeEventListener(threadId, listener);
  }

  /**
   * 注销父子关系
   * @param childThreadEntity 子线程实体
   */
  private unregisterParentChildRelationship(childThreadEntity: ThreadEntity): void {
    const parentThreadId = childThreadEntity.getParentThreadId();
    const childThreadId = childThreadEntity.getThreadId();

    if (parentThreadId) {
      const parentEntity = this.threadRegistry.get(parentThreadId);
      if (parentEntity) {
        parentEntity.unregisterChildThread(childThreadId);
      }
    }
  }

  /**
   * 触发开始事件
   * @param request 创建请求
   * @param childThreadEntity 子线程实体
   */
  private async emitStartedEvent(
    request: CreateDynamicThreadRequest,
    childThreadEntity: ThreadEntity
  ): Promise<void> {
    await this.eventManager.emit({
      type: 'DYNAMIC_THREAD_SUBMITTED',
      threadId: request.mainThreadEntity.getThreadId(),
      workflowId: request.mainThreadEntity.getWorkflowId(),
      subgraphId: request.workflowId,
      triggerId: request.triggerId,
      input: request.input,
      timestamp: now()
    });
  }

  /**
   * 触发完成事件
   * @param threadId 线程 ID
   * @param result 执行结果
   */
  private async emitCompletedEvent(threadId: string, result: ExecutedThreadResult): Promise<void> {
    const childThreadEntity = this.threadRegistry.get(threadId);
    if (!childThreadEntity) {
      return;
    }

    await this.eventManager.emit({
      type: 'DYNAMIC_THREAD_COMPLETED',
      threadId,
      workflowId: childThreadEntity.getWorkflowId(),
      subgraphId: childThreadEntity.getTriggeredSubworkflowId() || '',
      triggerId: '',
      output: childThreadEntity.getOutput(),
      executionTime: result.executionTime,
      timestamp: now()
    });
  }

  /**
   * 触发失败事件
   * @param threadId 线程 ID
   * @param error 错误信息
   */
  private async emitFailedEvent(threadId: string, error: Error): Promise<void> {
    const childThreadEntity = this.threadRegistry.get(threadId);
    if (!childThreadEntity) {
      return;
    }

    await this.eventManager.emit({
      type: 'DYNAMIC_THREAD_FAILED',
      threadId,
      workflowId: childThreadEntity.getWorkflowId(),
      subgraphId: childThreadEntity.getTriggeredSubworkflowId() || '',
      triggerId: '',
      error: getErrorMessage(error),
      timestamp: now()
    });
  }

  /**
   * 触发取消事件
   * @param threadId 线程 ID
   */
  private async emitCancelledEvent(threadId: string): Promise<void> {
    const childThreadEntity = this.threadRegistry.get(threadId);
    if (!childThreadEntity) {
      return;
    }

    await this.eventManager.emit({
      type: 'DYNAMIC_THREAD_CANCELLED',
      threadId,
      workflowId: childThreadEntity.getWorkflowId(),
      subgraphId: childThreadEntity.getTriggeredSubworkflowId() || '',
      triggerId: '',
      timestamp: now()
    });
  }

  /**
   * 关闭管理器
   */
  shutdown(): void {
    // 清理回调管理器
    this.callbackManager.cleanup();

    // 清理动态线程映射
    this.dynamicThreads.clear();

    // 取消所有运行中的线程
    this.dynamicThreads.forEach((dynamicThreadInfo, threadId) => {
      if (dynamicThreadInfo.status === 'RUNNING' || dynamicThreadInfo.status === 'QUEUED') {
        this.cancelDynamicThread(threadId);
      }
    });
  }

  /**
   * 获取回调管理器
   * @returns 回调管理器
   */
  getCallbackManager(): CallbackManager<ExecutedThreadResult> {
    return this.callbackManager;
  }

  /**
   * 获取任务队列管理器
   * @returns 任务队列管理器
   */
  getTaskQueueManager(): TaskQueueManager {
    return this.taskQueueManager;
  }
}
