/**
 * ThreadContext - Thread 执行上下文
 * 封装 Thread 实例的数据访问操作
 * 提供统一的访问接口，避免直接访问 thread 对象
 *
 * 核心职责：
 * - 提供 Thread 数据的统一访问接口
 * - 封装 Thread 内部状态的变更操作
 * - 提供 Thread 元数据的访问
 *
 * 设计原则：
 * - 纯数据访问层，不包含执行逻辑
 * - 不管理执行状态（由 ExecutionState 负责）
 * - 直接依赖具体实现，不使用接口抽象
 */

import type { Thread, VariableScope } from '../../../types';
import type { ID } from '../../../types/common';
import type { StatefulToolFactory } from '../../../types/tool';
import { ConversationManager } from '../conversation';
import { VariableCoordinator } from '../coordinators/variable-coordinator';
import { VariableStateManager } from '../managers/variable-state-manager';
import { ConversationStateManager } from '../managers/conversation-state-manager';
import { TriggerCoordinator } from '../coordinators/trigger-coordinator';
import { TriggerStateManager, type TriggerRuntimeState } from '../managers/trigger-state-manager';
import { GraphNavigator } from '../../graph/graph-navigator';
import { ExecutionState } from './execution-state';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { WorkflowRegistry } from '../../services/workflow-registry';

/**
 * ThreadContext - Thread 执行上下文
 */
export class ThreadContext {
  /**
   * Thread 实例
   */
  public readonly thread: Thread;

  /**
   * 对话管理器（保留用于向后兼容）
   */
  public readonly conversationManager: ConversationManager;

  /**
   * 对话状态管理器
   */
  public readonly conversationStateManager: ConversationStateManager;

  /**
   * 变量协调器
   */
  private readonly variableCoordinator: VariableCoordinator;

  /**
   * 变量状态管理器
   */
  private readonly variableStateManager: VariableStateManager;

  /**
   * 触发器状态管理器（每个 Thread 独立）
   */
  public readonly triggerStateManager: TriggerStateManager;

  /**
   * 触发器管理器（每个 Thread 独立）
   */
  public readonly triggerManager: TriggerCoordinator;

  /**
   * 图导航器（延迟创建）
   */
  private navigator?: GraphNavigator;

  /**
   * 执行状态管理器
   */
  public readonly executionState: ExecutionState;

  /**
   * 有状态工具实例映射（线程隔离）
   */
  private statefulTools: Map<string, any> = new Map();

  /**
   * 有状态工具工厂映射
   */
  private factories: Map<string, StatefulToolFactory> = new Map();

  /**
   * Thread 注册表
   */
  private readonly threadRegistry: ThreadRegistry;

  /**
   * 构造函数
   * @param thread Thread 实例
   * @param conversationManager 对话管理器
   * @param threadRegistry Thread 注册表
   * @param workflowRegistry Workflow 注册表（可选）
   */
  constructor(
    thread: Thread,
    conversationManager: ConversationManager,
    threadRegistry: ThreadRegistry,
    workflowRegistry?: WorkflowRegistry
  ) {
    this.thread = thread;
    this.conversationManager = conversationManager;
    this.threadRegistry = threadRegistry;

    // 初始化变量状态管理器
    this.variableStateManager = new VariableStateManager();

    // 初始化变量协调器
    this.variableCoordinator = new VariableCoordinator(
      this.variableStateManager,
      (conversationManager as any).eventManager,
      thread.id,
      thread.workflowId
    );

    // 初始化对话状态管理器
    this.conversationStateManager = new ConversationStateManager(
      thread.id,
      {
        tokenLimit: (conversationManager as any).tokenUsageTracker?.tokenLimit,
        eventManager: (conversationManager as any).eventManager,
        workflowId: thread.workflowId
      }
    );

    // 初始化触发器状态管理器
    this.triggerStateManager = new TriggerStateManager(thread.id);

    // 初始化触发器管理器（传入状态管理器）
    this.triggerManager = new TriggerCoordinator(
      threadRegistry,
      workflowRegistry!,
      this.triggerStateManager
    );

    // 设置工作流 ID
    if (workflowRegistry) {
      this.triggerStateManager.setWorkflowId(thread.workflowId);
    }

    this.executionState = new ExecutionState();
  }

  /**
   * 初始化变量（从Thread的变量定义）
   * 这个方法应该在Thread构建后调用
   */
  initializeVariables(): void {
    if (this.thread.variables && this.thread.variables.length > 0) {
      this.variableStateManager.initializeFromThreadVariables(this.thread.variables);
    }
  }

  /**
   * 获取 Thread 注册表
   * @returns ThreadRegistry 实例
   */
  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }

  /**
   * 获取 Thread ID
   * @returns Thread ID
   */
  getThreadId(): string {
    return this.thread.id;
  }

  /**
   * 获取 Workflow ID
   * @returns Workflow ID
   */
  getWorkflowId(): string {
    return this.thread.workflowId;
  }

  /**
   * 获取当前工作流ID（考虑子图上下文）
   * @returns 当前工作流ID
   */
  getCurrentWorkflowId(): ID {
    return this.executionState.getCurrentWorkflowId(this.getWorkflowId());
  }

  /**
   * 获取 Thread 状态
   * @returns Thread 状态
   */
  getStatus(): string {
    return this.thread.status;
  }

  /**
   * 获取当前节点 ID
   * @returns 当前节点 ID
   */
  getCurrentNodeId(): string {
    return this.thread.currentNodeId;
  }

  /**
   * 设置当前节点 ID
   * @param nodeId 节点 ID
   */
  setCurrentNodeId(nodeId: string): void {
    this.thread.currentNodeId = nodeId;
  }

  /**
   * 获取 Thread 输入
   * @returns Thread 输入
   */
  getInput(): Record<string, any> {
    return this.thread.input;
  }

  /**
   * 获取 Thread 输出
   * @returns Thread 输出
   */
  getOutput(): Record<string, any> {
    return this.thread.output;
  }

  /**
   * 设置 Thread 输出
   * @param output 输出数据
   */
  setOutput(output: Record<string, any>): void {
    this.thread.output = output;
  }

  /**
   * 获取 ConversationManager
   * @returns ConversationManager 实例
   */
  getConversationManager(): ConversationManager {
    return this.conversationManager;
  }

  /**
   * 获取 Thread 元数据
   * @returns Thread 元数据
   */
  getMetadata(): any {
    return this.thread.metadata;
  }

  /**
   * 设置 Thread 元数据
   * @param metadata 元数据
   */
  setMetadata(metadata: any): void {
    this.thread.metadata = metadata;
  }

  /**
   * 获取 Thread 变量值
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(name: string): any {
    return this.variableCoordinator.getVariable(this, name);
  }

  /**
   * 更新已定义变量的值
   * @param name 变量名称
   * @param value 新的变量值
   * @param scope 显式指定作用域（可选）
   */
  async updateVariable(name: string, value: any, scope?: VariableScope): Promise<void> {
    await this.variableCoordinator.updateVariable(this, name, value, scope);
  }

  /**
   * 检查变量是否存在
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(name: string): boolean {
    return this.variableCoordinator.hasVariable(this, name);
  }

  /**
   * 获取所有变量
   * @returns 所有变量值
   */
  getAllVariables(): Record<string, any> {
    return this.variableCoordinator.getAllVariables(this);
  }

  /**
   * 子工作流执行历史记录（用于触发器触发的孤立子工作流）
   */
  private subgraphExecutionHistory: any[] = [];

  /**
   * 是否正在执行触发子工作流
   */
  private isExecutingTriggeredSubgraph: boolean = false;

  /**
   * 添加节点执行结果
   * @param result 节点执行结果
   */
  addNodeResult(result: any): void {
    if (this.isExecutingTriggeredSubgraph) {
      // 如果正在执行触发子工作流，添加到子工作流历史记录
      this.subgraphExecutionHistory.push(result);
    } else {
      // 否则添加到主工作流历史记录
      this.thread.nodeResults.push(result);
    }
  }

  /**
   * 获取节点执行结果（主工作流）
   * @returns 节点执行结果数组
   */
  getNodeResults(): any[] {
    return this.thread.nodeResults;
  }

  /**
   * 获取子工作流执行历史
   * @returns 子工作流执行结果数组
   */
  getSubgraphExecutionHistory(): any[] {
    return this.subgraphExecutionHistory;
  }

  /**
   * 开始执行触发子工作流
   */
  startTriggeredSubgraphExecution(): void {
    this.isExecutingTriggeredSubgraph = true;
    this.subgraphExecutionHistory = [];
  }

  /**
   * 结束执行触发子工作流
   */
  endTriggeredSubgraphExecution(): void {
    this.isExecutingTriggeredSubgraph = false;
  }

  /**
   * 检查是否正在执行触发子工作流
   * @returns 是否正在执行
   */
  isExecutingSubgraph(): boolean {
    return this.isExecutingTriggeredSubgraph;
  }

  /**
   * 添加错误信息
   * @param error 错误信息
   */
  addError(error: any): void {
    this.thread.errors.push(error);
  }

  /**
   * 获取错误信息
   * @returns 错误信息数组
   */
  getErrors(): any[] {
    return this.thread.errors;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  getStartTime(): number {
    return this.thread.startTime;
  }

  /**
   * 获取结束时间
   * @returns 结束时间
   */
  getEndTime(): number | undefined {
    return this.thread.endTime;
  }

  /**
   * 设置结束时间
   * @param endTime 结束时间
   */
  setEndTime(endTime: number): void {
    this.thread.endTime = endTime;
  }

  /**
   * 获取图导航器
   * @returns 图导航器实例
   */
  getNavigator(): GraphNavigator {
    if (!this.navigator) {
      this.navigator = new GraphNavigator(this.thread.graph);
    }
    return this.navigator;
  }

  /**
   * 进入子图
   * @param workflowId 子工作流ID
   * @param parentWorkflowId 父工作流ID
   * @param input 输入数据
   */
  enterSubgraph(workflowId: ID, parentWorkflowId: ID, input: any): void {
    // 先创建新的子图作用域
    this.variableCoordinator.enterSubgraphScope(this);
    // 再调用原有的执行状态管理
    this.executionState.enterSubgraph(workflowId, parentWorkflowId, input);
  }

  /**
   * 退出子图
   */
  exitSubgraph(): void {
    // 先调用原有的执行状态管理
    this.executionState.exitSubgraph();
    // 再退出子图作用域
    this.variableCoordinator.exitSubgraphScope(this);
  }

  /**
   * 进入循环作用域
   */
  enterLoop(): void {
    this.variableCoordinator.enterLoopScope(this);
  }

  /**
   * 退出循环作用域
   */
  exitLoop(): void {
    this.variableCoordinator.exitLoopScope(this);
  }

  /**
   * 获取当前子图上下文
   * @returns 当前子图上下文
   */
  getCurrentSubgraphContext(): any {
    return this.executionState.getCurrentSubgraphContext();
  }

  /**
   * 获取子图执行堆栈
   * @returns 子图执行堆栈
   */
  getSubgraphStack(): any[] {
    return this.executionState.getSubgraphStack();
  }

  /**
   * 检查是否在子图中执行
   * @returns 是否在子图中
   */
  isInSubgraph(): boolean {
    return this.executionState.isInSubgraph();
  }

  /**
   * 注册有状态工具工厂
   * @param toolName 工具名称
   * @param factory 工厂函数
   */
  registerStatefulTool(toolName: string, factory: StatefulToolFactory): void {
    this.factories.set(toolName, factory);
  }

  /**
   * 获取有状态工具实例（懒加载）
   * @param toolName 工具名称
   * @returns 工具实例
   */
  getStatefulTool(toolName: string): any {
    // 如果已存在实例，直接返回
    if (this.statefulTools.has(toolName)) {
      return this.statefulTools.get(toolName);
    }

    // 获取工厂函数
    const factory = this.factories.get(toolName);
    if (!factory) {
      throw new Error(`No factory registered for tool: ${toolName}`);
    }

    // 创建新实例
    const instance = factory.create();
    this.statefulTools.set(toolName, instance);

    return instance;
  }

  /**
   * 清理有状态工具实例
   * @param toolName 工具名称
   */
  cleanupStatefulTool(toolName: string): void {
    const instance = this.statefulTools.get(toolName);
    if (instance && typeof instance.cleanup === 'function') {
      instance.cleanup();
    }
    this.statefulTools.delete(toolName);
  }

  /**
   * 清理所有有状态工具实例
   */
  cleanupAllStatefulTools(): void {
    for (const [toolName, instance] of this.statefulTools.entries()) {
      if (typeof instance.cleanup === 'function') {
        instance.cleanup();
      }
    }
    this.statefulTools.clear();
  }

  /**
   * 获取触发器状态快照
   * @returns 触发器状态快照
   */
  getTriggerStateSnapshot(): Map<ID, TriggerRuntimeState> {
    return this.triggerStateManager.createSnapshot();
  }

  /**
   * 恢复触发器状态
   * @param snapshot 触发器状态快照
   */
  restoreTriggerState(snapshot: Map<ID, TriggerRuntimeState>): void {
    this.triggerStateManager.restoreFromSnapshot(snapshot);
  }
}