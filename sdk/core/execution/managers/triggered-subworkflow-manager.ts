/**
 * TriggeredSubworkflowManager - 触发子工作流管理器
 * 
 * 职责：
 * - 管理triggered子工作流的完整生命周期
 * - 协调子工作流的创建和执行
 * - 使用任务队列和线程池管理执行
 * - 支持同步和异步执行模式
 * 
 * 设计原则：
 * - 有状态多实例，由Handler创建
 * - 使用任务队列和线程池管理执行
 * - 支持同步和异步执行模式
 * - 提供任务状态查询和取消功能
 */

import type { ID } from '@modular-agent/types';
import { ThreadContext } from '../context/thread-context';
import type { EventManager } from '../../services/event-manager';
import type { ThreadRegistry } from '../../services/thread-registry';
import { EventType } from '@modular-agent/types';
import type { ThreadResult } from '@modular-agent/types';
import { now, getErrorMessage } from '@modular-agent/common-utils';
import { TaskRegistry } from './task-registry';
import { ThreadPoolManager } from './thread-pool-manager';
import { TaskQueueManager } from './task-queue-manager';
import { ExecutionContext } from '../context/execution-context';
import { ThreadBuilder } from '../thread-builder';
import {
  type TriggeredSubgraphTask,
  type ExecutedSubgraphResult,
  type TaskSubmissionResult,
  type SubworkflowManagerConfig
} from '../types/task.types';

/**
 * TriggeredSubworkflowManager - 触发子工作流管理器
 */
export class TriggeredSubworkflowManager {
  /**
   * 任务注册表
   */
  private taskRegistry: TaskRegistry;

  /**
   * 线程池管理器
   */
  private threadPoolManager: ThreadPoolManager;

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
   * 执行上下文
   */
  private executionContext: ExecutionContext;

  /**
   * 构造函数
   * @param executionContext 执行上下文
   * @param config 配置
   */
  constructor(executionContext: ExecutionContext, config?: SubworkflowManagerConfig) {
    this.executionContext = executionContext;
    this.eventManager = executionContext.getEventManager();
    this.threadRegistry = executionContext.getThreadRegistry();
    this.threadBuilder = new ThreadBuilder(executionContext.getWorkflowRegistry(), executionContext);

    // 创建任务注册表
    this.taskRegistry = new TaskRegistry();

    // 创建线程池管理器
    this.threadPoolManager = new ThreadPoolManager(executionContext, config);

    // 创建任务队列管理器
    this.taskQueueManager = new TaskQueueManager(
      this.taskRegistry,
      this.threadPoolManager,
      this.eventManager
    );
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
      throw new Error('subgraphId is required');
    }

    if (!task.mainThreadContext) {
      throw new Error('mainThreadContext is required');
    }

    // 准备输入数据
    const input = this.prepareInputData(task);

    // 创建子工作流 ThreadContext
    const subgraphContext = await this.createSubgraphContext(task, input);

    // 注册到 ThreadRegistry
    this.threadRegistry.register(subgraphContext);

    // 建立父子线程关系
    const parentThreadId = task.mainThreadContext.getThreadId();
    const childThreadId = subgraphContext.getThreadId();
    task.mainThreadContext.registerChildThread(childThreadId);
    subgraphContext.setParentThreadId(parentThreadId);
    subgraphContext.setTriggeredSubworkflowId(task.subgraphId);

    // 触发开始事件
    await this.emitStartedEvent(task, subgraphContext);

    // 根据配置选择执行方式
    const waitForCompletion = task.config?.waitForCompletion !== false; // 默认为 true
    const timeout = task.config?.timeout || this.threadPoolManager.getConfig().defaultTimeout;

    if (waitForCompletion) {
      // 同步执行
      return await this.executeSync(subgraphContext, timeout);
    } else {
      // 异步执行
      return this.executeAsync(subgraphContext, timeout);
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
      output: task.mainThreadContext.getOutput(),
      input: task.mainThreadContext.getInput(),
      ...task.input
    };
  }

  /**
   * 创建子工作流上下文
   * @param task 触发子工作流任务
   * @param input 输入数据
   * @returns 子工作流上下文
   */
  private async createSubgraphContext(
    task: TriggeredSubgraphTask,
    input: Record<string, any>
  ): Promise<ThreadContext> {
    const subgraphContext = await this.threadBuilder.build(task.subgraphId, {
      input
    });
    
    // 设置线程类型为 TRIGGERED
    subgraphContext.setThreadType('TRIGGERED');
    
    return subgraphContext;
  }

  /**
   * 同步执行
   * @param subgraphContext 子工作流上下文
   * @param timeout 超时时间
   * @returns 执行结果
   */
  private async executeSync(
    subgraphContext: ThreadContext,
    timeout: number
  ): Promise<ExecutedSubgraphResult> {
    try {
      const result = await this.taskQueueManager.submitSync(subgraphContext, timeout);

      // 注销父子关系
      this.unregisterParentChildRelationship(subgraphContext);

      return result;
    } catch (error) {
      // 注销父子关系
      this.unregisterParentChildRelationship(subgraphContext);
      throw error;
    }
  }

  /**
   * 异步执行
   * @param subgraphContext 子工作流上下文
   * @param timeout 超时时间
   * @returns 任务提交结果
   */
  private executeAsync(
    subgraphContext: ThreadContext,
    timeout: number
  ): TaskSubmissionResult {
    const result = this.taskQueueManager.submitAsync(subgraphContext, timeout);

    // 异步执行完成后注销父子关系
    this.taskQueueManager.submitSync(subgraphContext, timeout)
      .then(() => {
        this.unregisterParentChildRelationship(subgraphContext);
        // 清理 TaskRegistry 中的任务记录
        const taskInfo = this.taskRegistry.getAll().find(
          t => t.threadContext.getThreadId() === subgraphContext.getThreadId()
        );
        if (taskInfo) {
          this.taskRegistry.delete(taskInfo.id);
        }
      })
      .catch(() => {
        this.unregisterParentChildRelationship(subgraphContext);
      });

    return result;
  }

  /**
   * 注销父子关系
   * @param subgraphContext 子工作流上下文
   */
  private unregisterParentChildRelationship(subgraphContext: ThreadContext): void {
    const parentThreadId = subgraphContext.getParentThreadId();
    const childThreadId = subgraphContext.getThreadId();

    if (parentThreadId) {
      const parentContext = this.threadRegistry.get(parentThreadId);
      if (parentContext) {
        parentContext.unregisterChildThread(childThreadId);
      }
    }
  }

  /**
   * 触发开始事件
   * @param task 触发子工作流任务
   * @param subgraphContext 子工作流上下文
   */
  private async emitStartedEvent(
    task: TriggeredSubgraphTask,
    subgraphContext: ThreadContext
  ): Promise<void> {
    await this.eventManager.emit({
      type: EventType.TRIGGERED_SUBGRAPH_STARTED,
      threadId: task.mainThreadContext.getThreadId(),
      workflowId: task.mainThreadContext.getWorkflowId(),
      subgraphId: task.subgraphId,
      triggerId: task.triggerId,
      input: task.input,
      timestamp: now()
    });
  }

  /**
   * 查询任务状态
   * @param taskId 任务ID
   * @returns 任务信息
   */
  getTaskStatus(taskId: string) {
    return this.taskRegistry.get(taskId);
  }

  /**
   * 取消任务
   * @param taskId 任务ID
   * @returns 是否取消成功
   */
  cancelTask(taskId: string): boolean {
    const success = this.taskQueueManager.cancelTask(taskId);

    if (success) {
      const taskInfo = this.taskRegistry.get(taskId);
      if (taskInfo) {
        // 注销父子关系
        this.unregisterParentChildRelationship(taskInfo.threadContext);
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
    return this.threadPoolManager.getStats();
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
    // 等待所有任务完成
    await this.taskQueueManager.drain();

    // 关闭线程池
    await this.threadPoolManager.shutdown();

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