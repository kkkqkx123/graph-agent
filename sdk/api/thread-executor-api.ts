/**
 * ThreadExecutorAPI - 主执行入口API
 * 封装ThreadExecutor，提供简洁的执行接口
 */

import { ThreadExecutor } from '../core/execution/thread-executor';
import { ThreadBuilder } from '../core/execution/thread-builder';
import { WorkflowRegistry } from '../core/registry/workflow-registry';
import type { WorkflowDefinition } from '../types/workflow';
import type { ThreadResult, ThreadOptions } from '../types/thread';
import type { ExecuteOptions } from './types';
import { NotFoundError, ValidationError } from '../types/errors';

/**
 * ThreadExecutorAPI - 主执行入口API
 */
export class ThreadExecutorAPI {
  private executor: ThreadExecutor;
  private threadBuilder: ThreadBuilder;
  private workflowRegistry: WorkflowRegistry;

  constructor(workflowRegistry?: WorkflowRegistry) {
    this.workflowRegistry = workflowRegistry || new WorkflowRegistry();
    this.executor = new ThreadExecutor(this.workflowRegistry);
    this.threadBuilder = new ThreadBuilder(this.workflowRegistry);
  }

  /**
   * 执行工作流（通过workflowId）
   * @param workflowId 工作流ID
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async executeWorkflow(workflowId: string, options?: ExecuteOptions): Promise<ThreadResult> {
    return this.executor.execute(workflowId, this.convertOptions(options));
  }

  /**
   * 执行工作流（通过workflowDefinition）
   * @param workflow 工作流定义
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async executeWorkflowFromDefinition(workflow: WorkflowDefinition, options?: ExecuteOptions): Promise<ThreadResult> {
    // 注册工作流（临时注册，不启用版本管理）
    const tempRegistry = new WorkflowRegistry({ enableVersioning: false });
    tempRegistry.register(workflow);

    // 执行工作流
    const executor = new ThreadExecutor(tempRegistry);
    return executor.execute(workflow.id, this.convertOptions(options));
  }

  /**
   * 暂停线程执行
   * @param threadId 线程ID
   */
  async pauseThread(threadId: string): Promise<void> {
    await this.executor.pauseThread(threadId);
  }

  /**
   * 恢复线程执行
   * @param threadId 线程ID
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async resumeThread(threadId: string, options?: ExecuteOptions): Promise<ThreadResult> {
    return this.executor.resumeThread(threadId);
  }

  /**
   * 取消线程执行
   * @param threadId 线程ID
   */
  async cancelThread(threadId: string): Promise<void> {
    await this.executor.stopThread(threadId);
  }

  /**
   * 设置变量
   * @param threadId 线程ID
   * @param variables 变量对象
   */
  async setVariables(threadId: string, variables: Record<string, any>): Promise<void> {
    await this.executor.setVariables(threadId, variables);
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