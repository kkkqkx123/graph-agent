/**
 * ThreadExecutorAPI - 主执行入口API
 * 封装ThreadLifecycleCoordinator，提供简洁的执行接口
 */

import { ThreadLifecycleCoordinator } from '../../core/execution/coordinators/thread-lifecycle-coordinator';
import { ThreadOperationCoordinator } from '../../core/execution/coordinators/thread-operation-coordinator';
import { VariableCoordinator } from '../../core/execution/coordinators/variable-coordinator';
import { VariableStateManager } from '../../core/execution/managers/variable-state-manager';
import { ExecutionContext } from '../../core/execution/context/execution-context';
import { workflowRegistry, type WorkflowRegistry } from '../../core/services/workflow-registry';
import type { WorkflowDefinition } from '../../types/workflow';
import type { ThreadResult, ThreadOptions } from '../../types/thread';

/**
 * ThreadExecutorAPI - 主执行入口API
 */
export class ThreadExecutorAPI {
  private lifecycleCoordinator: ThreadLifecycleCoordinator;
  private operationCoordinator: ThreadOperationCoordinator;
  private variableCoordinator: VariableCoordinator;
  private workflowRegistry: WorkflowRegistry;
  private executionContext: ExecutionContext;

  constructor(workflowRegistryParam?: WorkflowRegistry, executionContextParam?: ExecutionContext) {
    this.workflowRegistry = workflowRegistryParam || workflowRegistry;
    
    // 使用传入的ExecutionContext或创建默认的
    this.executionContext = executionContextParam || ExecutionContext.createDefault();
    
    this.lifecycleCoordinator = new ThreadLifecycleCoordinator(this.executionContext);
    this.operationCoordinator = new ThreadOperationCoordinator(this.executionContext);
    this.variableCoordinator = new VariableCoordinator(
      new VariableStateManager(),
      this.executionContext.getEventManager()
    );
  }

  /**
   * 执行工作流（通过workflowId）
   * @param workflowId 工作流ID
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async executeWorkflow(workflowId: string, options?: ThreadOptions): Promise<ThreadResult> {
    return this.lifecycleCoordinator.execute(workflowId, options || {});
  }

  /**
   * 执行工作流（通过workflowDefinition）
   * @param workflow 工作流定义
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async executeWorkflowFromDefinition(workflow: WorkflowDefinition, options?: ThreadOptions): Promise<ThreadResult> {
    // 注册工作流到全局注册表
    workflowRegistry.register(workflow);

    // 执行工作流
    return this.lifecycleCoordinator.execute(workflow.id, options || {});
  }

  /**
   * 暂停线程执行
   * @param threadId 线程ID
   */
  async pauseThread(threadId: string): Promise<void> {
    await this.lifecycleCoordinator.pauseThread(threadId);
  }

  /**
   * 恢复线程执行
   * @param threadId 线程ID
   * @param options 执行选项
   * @returns 线程执行结果
   */
  async resumeThread(threadId: string, options?: ThreadOptions): Promise<ThreadResult> {
    return this.lifecycleCoordinator.resumeThread(threadId);
  }

  /**
   * 取消线程执行
   * @param threadId 线程ID
   */
  async cancelThread(threadId: string): Promise<void> {
    await this.lifecycleCoordinator.stopThread(threadId);
  }

  /**
   * 设置变量
   * @param threadId 线程ID
   * @param variables 变量对象
   */
  async setVariables(threadId: string, variables: Record<string, any>): Promise<void> {
    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    if (threadContext) {
      for (const [name, value] of Object.entries(variables)) {
        await this.variableCoordinator.updateVariable(threadContext, name, value);
      }
    }
  }

  /**
   * Fork 操作 - 创建子线程
   * @param parentThreadId 父线程ID
   * @param forkConfig Fork配置
   * @returns 子线程ID数组
   */
  async forkThread(parentThreadId: string, forkConfig: { forkId: string; forkStrategy?: 'serial' | 'parallel'; startNodeId?: string }): Promise<string[]> {
    return this.operationCoordinator.fork(parentThreadId, forkConfig);
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
    return this.operationCoordinator.join(parentThreadId, childThreadIds, joinStrategy, timeout);
  }

  /**
   * Copy 操作 - 创建线程副本
   * @param sourceThreadId 源线程ID
   * @returns 副本线程ID
   */
  async copyThread(sourceThreadId: string): Promise<string> {
    return this.operationCoordinator.copy(sourceThreadId);
  }

  /**
   * 获取线程
   * @param threadId 线程ID
   * @returns 线程实例
   */
  getThread(threadId: string) {
    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    return threadContext?.thread;
  }

  /**
   * 获取线程上下文
   * @param threadId 线程ID
   * @returns 线程上下文实例
   */
  getThreadContext(threadId: string) {
    return this.executionContext.getThreadRegistry().get(threadId);
  }

  /**
   * 获取事件管理器
   * @returns 事件管理器实例
   */
  getEventManager() {
    return this.executionContext.getEventManager();
  }

  /**
   * 获取线程注册表
   * @returns 线程注册表实例
   */
  getThreadRegistry() {
    return this.executionContext.getThreadRegistry();
  }

  /**
   * 获取工作流注册表
   * @returns 工作流注册表实例
   */
  getWorkflowRegistry(): WorkflowRegistry {
    return this.workflowRegistry;
  }

  /**
   * 获取生命周期协调器
   * @returns 生命周期协调器实例
   */
  getLifecycleCoordinator(): ThreadLifecycleCoordinator {
    return this.lifecycleCoordinator;
  }

  /**
   * 获取操作协调器
   * @returns 操作协调器实例
   */
  getOperationCoordinator(): ThreadOperationCoordinator {
    return this.operationCoordinator;
  }

  /**
   * 获取变量协调器
   * @returns 变量协调器实例
   */
  getVariableCoordinator(): VariableCoordinator {
    return this.variableCoordinator;
  }

  /**
     * 获取触发器管理器
     * @param threadId 线程ID
     * @returns 触发器管理器实例
     */
  getTriggerManager(threadId: string) {
    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    return threadContext?.triggerManager;
  }

}