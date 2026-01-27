/**
 * ThreadExecutorAPI - 主执行入口API
 * 封装ThreadExecutor，提供简洁的执行接口
 */

import { ThreadExecutor } from '../core/execution/thread-executor';
import { ThreadBuilder } from '../core/execution/thread-builder';
import { WorkflowRegistry } from '../core/execution/registrys/workflow-registry';
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
    // 构建ThreadContext（Core层会检查工作流是否存在）
    const threadContext = await this.threadBuilder.build(workflowId, this.convertOptions(options));

    // 执行Thread
    return this.executor.execute(threadContext, this.convertOptions(options));
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

    // 构建ThreadContext
    const threadBuilder = new ThreadBuilder(tempRegistry);
    const threadContext = await threadBuilder.build(workflow.id, this.convertOptions(options));

    // 执行Thread
    const executor = new ThreadExecutor(tempRegistry);
    return executor.execute(threadContext, this.convertOptions(options));
  }

  /**
   * 执行已存在的线程
   * @param threadId 线程ID
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async executeThread(threadId: string, options?: ExecuteOptions): Promise<ThreadResult> {
    // 获取ThreadContext
    const threadContext = this.executor.getThreadContext(threadId);
    if (!threadContext) {
      throw new NotFoundError(
        `Thread with ID '${threadId}' not found`,
        'Thread',
        threadId
      );
    }

    // 执行Thread
    return this.executor.execute(threadContext, this.convertOptions(options));
  }

  /**
   * 暂停线程执行
   * @param threadId 线程ID
   */
  async pauseThread(threadId: string): Promise<void> {
    await this.executor.pause(threadId);
  }

  /**
   * 恢复线程执行
   * @param threadId 线程ID
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async resumeThread(threadId: string, options?: ExecuteOptions): Promise<ThreadResult> {
    return this.executor.resume(threadId, this.convertOptions(options));
  }

  /**
   * 取消线程执行
   * @param threadId 线程ID
   */
  async cancelThread(threadId: string): Promise<void> {
    await this.executor.cancel(threadId);
  }

  /**
   * 获取ThreadContext
   * @param threadId 线程ID
   * @returns ThreadContext实例
   */
  getThreadContext(threadId: string) {
    return this.executor.getThreadContext(threadId);
  }

  /**
   * 获取所有ThreadContext
   * @returns ThreadContext数组
   */
  getAllThreadContexts() {
    return this.executor.getAllThreadContexts();
  }

  /**
   * 跳过节点
   * @param threadId 线程ID
   * @param nodeId 节点ID
   */
  async skipNode(threadId: string, nodeId: string): Promise<void> {
    await this.executor.skipNode(threadId, nodeId);
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
   * 获取事件管理器
   * @returns 事件管理器
   */
  getEventManager() {
    return this.executor.getEventManager();
  }

  /**
   * 获取触发器管理器
   * @returns 触发器管理器
   */
  getTriggerManager() {
    return this.executor.getTriggerManager();
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