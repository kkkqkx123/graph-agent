/**
 * ThreadContext - Thread 执行上下文
 * 封装 Thread 实例的数据访问操作
 * 提供统一的访问接口，避免直接访问 thread 对象
 *
 * 核心职责：
 * - 提供 Thread 数据的统一访问接口
 * - 封装 Thread 内部状态的变更操作
 * - 提供 Thread 元数据的访问
 * - 协调各个状态管理器（变量、触发器、对话等）
 *
 * 设计原则：
 * - 纯数据访问层，不包含执行逻辑
 * - 不管理执行状态（由 ExecutionState 负责）
 * - 不管理子工作流执行历史（由 SubgraphExecutionManager 负责）
 * - 直接依赖具体实现，不使用接口抽象
 */

import type { Thread, VariableScope } from '../../../types';
import type { ID } from '../../../types/common';
import type { StatefulToolFactory } from '../../../types/tool';
import type { LLMMessage } from '../../../types/llm';
import { ConversationManager } from '../managers/conversation-manager';
import { VariableCoordinator } from '../coordinators/variable-coordinator';
import { VariableStateManager } from '../managers/variable-state-manager';
import { TriggerCoordinator } from '../coordinators/trigger-coordinator';
import { TriggerStateManager, type TriggerRuntimeState } from '../managers/trigger-state-manager';
import { GraphNavigator, type NavigationResult } from '../../graph/graph-navigator';
import { ExecutionState } from './execution-state';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { EventManager } from '../../services/event-manager';
import type { ToolService } from '../../services/tool-service';
import { LLMExecutor } from '../executors/llm-executor';
import type { LifecycleCapable } from '../managers/lifecycle-capable';

/**
 * ThreadContext - Thread 执行上下文
 */
export class ThreadContext implements LifecycleCapable {
  /**
   * Thread 实例
   */
  public readonly thread: Thread;

  /**
   * 对话管理器
   */
  public readonly conversationManager: ConversationManager;

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
  private readonly executionState: ExecutionState;

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
   * 工作流注册表
   */
  private readonly workflowRegistry: WorkflowRegistry;

  /**
   * 事件管理器
   */
  private readonly eventManager: EventManager;

  /**
   * 工具服务
   */
  private readonly toolService: ToolService;

  /**
   * LLM 执行器
   */
  private readonly llmExecutor: LLMExecutor;

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
    workflowRegistry: WorkflowRegistry,
    eventManager: EventManager,
    toolService: ToolService,
    llmExecutor: LLMExecutor
  ) {
    this.thread = thread;
    this.conversationManager = conversationManager;
    this.threadRegistry = threadRegistry;
    this.workflowRegistry = workflowRegistry;
    this.eventManager = eventManager;
    this.toolService = toolService;
    this.llmExecutor = llmExecutor;

    // 初始化变量状态管理器
    this.variableStateManager = new VariableStateManager();

    // 初始化变量协调器
    this.variableCoordinator = new VariableCoordinator(
      this.variableStateManager,
      this.eventManager,
      thread.id,
      thread.workflowId
    );

    // 初始化触发器状态管理器
    this.triggerStateManager = new TriggerStateManager(thread.id);

    // 初始化触发器管理器（传入状态管理器）
    this.triggerManager = new TriggerCoordinator(
      threadRegistry,
      workflowRegistry,
      this.triggerStateManager
    );

    // 设置工作流 ID
    this.triggerStateManager.setWorkflowId(thread.workflowId);

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
   * 添加节点执行结果
   * @param result 节点执行结果
   */
  addNodeResult(result: any): void {
    // 委托给执行状态管理器处理子工作流结果
    this.executionState.addSubgraphExecutionResult(result);

    // 如果不在子工作流中，添加到主工作流历史记录
    if (!this.executionState.isExecutingSubgraph()) {
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
   * 获取下一个可执行节点信息
   * @returns 导航结果
   */
  getNextNode(): NavigationResult {
    const navigator = this.getNavigator();
    return navigator.getNextNode(this.getCurrentNodeId());
  }

  /**
   * 向对话历史添加消息
   * @param message 消息内容
   */
  addMessageToConversation(message: LLMMessage): void {
    this.conversationManager.addMessage(message);
  }

  /**
   * 获取对话历史（未压缩的消息）
   * @returns 对话历史数组
   */
  getConversationHistory(): LLMMessage[] {
    return this.conversationManager.getMessages();
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

  /**
   * 初始化管理器
   */
  initialize(): void {
    // ThreadContext 在构造时已经初始化，此方法为空实现
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 1. 清理所有有状态工具实例
    this.cleanupAllStatefulTools();

    // 2. 清理变量状态
    this.variableStateManager.cleanup();

    // 3. 清理触发器状态
    this.triggerStateManager.cleanup();

    // 4. 清理对话状态
    this.conversationManager.cleanup();

    // 5. 清理执行状态
    this.executionState.clear();
  }

  /**
   * 创建状态快照
   */
  createSnapshot(): any {
    return {
      variableState: this.variableStateManager.createSnapshot(),
      triggerState: this.triggerStateManager.createSnapshot(),
      conversationState: this.conversationManager.createSnapshot()
      // 注意：executionState 不包含在快照中，因为它表示临时执行状态，
      // 在检查点恢复时应该重新开始执行
    };
  }

  /**
   * 从快照恢复状态
   */
  restoreFromSnapshot(snapshot: any): void {
    if (snapshot.variableState) {
      this.variableStateManager.restoreFromSnapshot(snapshot.variableState);
    }
    if (snapshot.triggerState) {
      this.triggerStateManager.restoreFromSnapshot(snapshot.triggerState);
    }
    if (snapshot.conversationState) {
      this.conversationManager.restoreFromSnapshot(snapshot.conversationState);
    }
    // executionState 不从快照恢复，保持当前状态或重新初始化
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return true; // ThreadContext 在构造时总是初始化的
  }

  /**
   * 获取 ConversationManager
   * @returns ConversationManager 实例
   */
  getConversationManager(): ConversationManager {
    return this.conversationManager;
  }

  /**
   * 开始执行触发子工作流
   * @param workflowId 子工作流ID
   */
  startTriggeredSubgraphExecution(workflowId: string): void {
    this.executionState.startTriggeredSubgraphExecution(workflowId);
  }

  /**
   * 结束执行触发子工作流
   */
  endTriggeredSubgraphExecution(): void {
    this.executionState.endTriggeredSubgraphExecution();
  }

  /**
   * 检查是否正在执行触发子工作流
   * @returns 是否正在执行
   */
  isExecutingSubgraph(): boolean {
    return this.executionState.isExecutingSubgraph();
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
}