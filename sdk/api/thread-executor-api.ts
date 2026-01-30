/**
 * ThreadExecutorAPI - 主执行入口API
 * 封装ThreadCoordinator，提供简洁的执行接口
 */

import { ThreadCoordinator } from '../core/execution/thread-coordinator';
import { workflowRegistry, type WorkflowRegistry } from '../core/services/workflow-registry';
import type { WorkflowDefinition } from '../types/workflow';
import type { ThreadResult, ThreadOptions } from '../types/thread';
import type { ExecuteOptions } from './types';
import { NotFoundError, ValidationError } from '../types/errors';

/**
 * ThreadExecutorAPI - 主执行入口API
 */
export class ThreadExecutorAPI {
  private coordinator: ThreadCoordinator;
  private workflowRegistry: WorkflowRegistry;

  constructor(workflowRegistryParam?: WorkflowRegistry) {
    this.workflowRegistry = workflowRegistryParam || workflowRegistry;
    this.coordinator = new ThreadCoordinator(this.workflowRegistry);
  }

  /**
   * 执行工作流（通过workflowId）
   * @param workflowId 工作流ID
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async executeWorkflow(workflowId: string, options?: ExecuteOptions): Promise<ThreadResult> {
    return this.coordinator.execute(workflowId, this.convertOptions(options));
  }

  /**
   * 执行工作流（通过workflowDefinition）
   * @param workflow 工作流定义
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async executeWorkflowFromDefinition(workflow: WorkflowDefinition, options?: ExecuteOptions): Promise<ThreadResult> {
    // 注册工作流到全局注册表
    workflowRegistry.register(workflow);

    // 执行工作流
    return this.coordinator.execute(workflow.id, this.convertOptions(options));
  }

  /**
   * 暂停线程执行
   * @param threadId 线程ID
   */
  async pauseThread(threadId: string): Promise<void> {
    await this.coordinator.pauseThread(threadId);
  }

  /**
   * 恢复线程执行
   * @param threadId 线程ID
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async resumeThread(threadId: string, options?: ExecuteOptions): Promise<ThreadResult> {
    return this.coordinator.resumeThread(threadId);
  }

  /**
   * 取消线程执行
   * @param threadId 线程ID
   */
  async cancelThread(threadId: string): Promise<void> {
    await this.coordinator.stopThread(threadId);
  }

  /**
   * 设置变量
   * @param threadId 线程ID
   * @param variables 变量对象
   */
  async setVariables(threadId: string, variables: Record<string, any>): Promise<void> {
    await this.coordinator.setVariables(threadId, variables);
  }

  /**
   * Fork 操作 - 创建子线程
   * @param parentThreadId 父线程ID
   * @param forkConfig Fork配置
   * @returns 子线程ID数组
   */
  async forkThread(parentThreadId: string, forkConfig: { forkId: string; forkStrategy?: 'serial' | 'parallel'; startNodeId?: string }): Promise<string[]> {
    return this.coordinator.fork(parentThreadId, forkConfig);
  }

  /**
   * Join 操作 - 合并子线程结果
   * @param parentThreadId 父线程ID
   * @param childThreadIds 子线程ID数组
   * @param joinStrategy Join策略
   * @param timeout 超时时间（秒）
   * @returns Join结果
   */
  async joinThread(
    parentThreadId: string,
    childThreadIds: string[],
    joinStrategy: 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD' = 'ALL_COMPLETED',
    timeout: number = 60
  ): Promise<{ success: boolean; output: any; completedThreads: any[]; failedThreads: any[] }> {
    return this.coordinator.join(parentThreadId, childThreadIds, joinStrategy, timeout);
  }

  /**
   * Copy 操作 - 创建线程副本
   * @param sourceThreadId 源线程ID
   * @returns 副本线程ID
   */
  async copyThread(sourceThreadId: string): Promise<string> {
    return this.coordinator.copy(sourceThreadId);
  }

  /**
   * 获取线程
   * @param threadId 线程ID
   * @returns 线程实例
   */
  getThread(threadId: string) {
    return this.coordinator.getThread(threadId);
  }

  /**
   * 获取线程上下文
   * @param threadId 线程ID
   * @returns 线程上下文实例
   */
  getThreadContext(threadId: string) {
    return this.coordinator.getThreadContext(threadId);
  }

  /**
   * 获取事件管理器
   * @returns 事件管理器实例
   */
  getEventManager() {
    return this.coordinator.getEventManager();
  }

  /**
   * 获取线程注册表
   * @returns 线程注册表实例
   */
  getThreadRegistry() {
    return this.coordinator.getThreadRegistry();
  }

  /**
   * 获取工作流注册表
   * @returns 工作流注册表实例
   */
  getWorkflowRegistry(): WorkflowRegistry {
    return this.workflowRegistry;
  }

  /**
   * 获取协调器
   * @returns 协调器实例
   */
  getCoordinator(): ThreadCoordinator {
    return this.coordinator;
  }

  /**
   * 获取触发器管理器
   * @returns 触发器管理器实例
   */
  getTriggerManager() {
    return this.coordinator.getTriggerManager();
  }

  /**
   * 转换执行选项
   * @param options API执行选项
   * @returns Core层执行选项
   */
  private convertOptions(options?: ExecuteOptions): ThreadOptions {
    if (!options) {
      return {};
    }

    return {
      input: options.input,
      maxSteps: options.maxSteps,
      timeout: options.timeout,
      enableCheckpoints: options.enableCheckpoints,
      onNodeExecuted: options.onNodeExecuted,
      onError: options.onError
    };
  }
}