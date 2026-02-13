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

import type { Thread, VariableScope } from '@modular-agent/types';
import type { ID } from '@modular-agent/types/common';
import type { TriggerRuntimeState } from '@modular-agent/types/trigger';
import type { StatefulToolFactory } from '@modular-agent/types/tool';
import type { LLMMessage, LLMMessageRole } from '@modular-agent/types/llm';
import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import { ConversationManager } from '../managers/conversation-manager';
import { VariableCoordinator } from '../coordinators/variable-coordinator';
import { VariableStateManager } from '../managers/variable-state-manager';
import { TriggerCoordinator } from '../coordinators/trigger-coordinator';
import { TriggerStateManager } from '../managers/trigger-state-manager';
import { GraphNavigator, type NavigationResult } from '../../graph/graph-navigator';
import { ExecutionState } from './execution-state';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { EventManager } from '../../services/event-manager';
import type { ToolService } from '../../services/tool-service';
import { LLMExecutor } from '../executors/llm-executor';
import type { LifecycleCapable } from '../managers/lifecycle-capable';
import { ThreadInterruptedException } from '@modular-agent/types/errors';

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
   * AbortController 用于中断正在进行的异步操作
   */
  private abortController: AbortController = new AbortController();

  /**
   * 可用工具集合（从workflow配置）
   */
  private availableTools: Set<string> = new Set();

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
   * 设置 Thread 状态
   * @param status 新的线程状态
   */
  setStatus(status: string): void {
    this.thread.status = status as any;
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
   * 设置暂停标志
   * @param shouldPause 是否应该暂停
   */
  setShouldPause(shouldPause: boolean): void {
    this.thread.shouldPause = shouldPause;
  }

  /**
   * 获取暂停标志
   * @returns 是否应该暂停
   */
  getShouldPause(): boolean {
    return this.thread.shouldPause ?? false;
  }

  /**
   * 设置停止标志
   * @param shouldStop 是否应该停止
   */
  setShouldStop(shouldStop: boolean): void {
    this.thread.shouldStop = shouldStop;
  }

  /**
   * 获取停止标志
   * @returns 是否应该停止
   */
  getShouldStop(): boolean {
    return this.thread.shouldStop ?? false;
  }

  /**
   * 获取 AbortSignal
   * @returns AbortSignal 实例
   */
  getAbortSignal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * 中断当前执行
   * @param interruptionType 中断类型（PAUSE 或 STOP）
   */
  interrupt(interruptionType: 'PAUSE' | 'STOP'): void {
    this.abortController.abort(new ThreadInterruptedException(
      `Thread ${interruptionType.toLowerCase()}`,
      interruptionType,
      this.getThreadId(),
      this.getCurrentNodeId()
    ));
  }

  /**
   * 重置中断控制器（用于恢复）
   */
  resetInterrupt(): void {
    this.abortController = new AbortController();
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
   * 获取最近N条消息
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessages(n: number): LLMMessage[] {
    return this.conversationManager.getRecentMessages(n);
  }

  /**
   * 获取指定范围的消息
   * @param start 起始位置
   * @param end 结束位置
   * @returns 消息数组
   */
  getMessagesByRange(start: number, end: number): LLMMessage[] {
    return this.conversationManager.getMessagesByRange(start, end);
  }

  /**
   * 获取指定角色的所有消息
   * @param role 消息角色
   * @returns 消息数组
   */
  getMessagesByRole(role: LLMMessageRole): LLMMessage[] {
    return this.conversationManager.getMessagesByRole(role);
  }

  /**
   * 获取指定角色的最近N条消息
   * @param role 消息角色
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessagesByRole(role: LLMMessageRole, n: number): LLMMessage[] {
    return this.conversationManager.getRecentMessagesByRole(role, n);
  }

  /**
   * 获取指定角色的索引范围消息
   * @param role 消息角色
   * @param start 起始位置（在类型数组中的位置）
   * @param end 结束位置（在类型数组中的位置）
   * @returns 消息数组
   */
  getMessagesByRoleRange(role: LLMMessageRole, start: number, end: number): LLMMessage[] {
    return this.conversationManager.getMessagesByRoleRange(role, start, end);
  }

  /**
   * 进入子图
   * @param workflowId 子工作流ID
   * @param parentWorkflowId 父工作流ID
   * @param input 输入数据
   */
  enterSubgraph(workflowId: ID, parentWorkflowId: ID, input: any): void {
    // 先创建新的本地作用域
    this.variableCoordinator.enterLocalScope(this);
    // 再调用原有的执行状态管理
    this.executionState.enterSubgraph(workflowId, parentWorkflowId, input);
  }

  /**
   * 退出子图
   */
  exitSubgraph(): void {
    // 先调用原有的执行状态管理
    this.executionState.exitSubgraph();
    // 再退出本地作用域
    this.variableCoordinator.exitLocalScope(this);
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

  // ========== Thread类型和关系管理方法 ==========

  /**
   * 获取线程类型
   * @returns 线程类型
   */
  getThreadType(): string {
    return this.thread.threadType || 'MAIN';
  }

  /**
   * 设置线程类型
   * @param threadType 线程类型
   */
  setThreadType(threadType: string): void {
    this.thread.threadType = threadType as any;
  }

  /**
   * 获取Fork ID（用于FORK/JOIN场景）
   * @returns Fork ID，如果没有则返回undefined
   */
  getForkId(): string | undefined {
    return this.thread.forkJoinContext?.forkId;
  }

  /**
   * 设置Fork ID（用于FORK/JOIN场景）
   * @param forkId Fork ID
   */
  setForkId(forkId: string): void {
    if (!this.thread.forkJoinContext) {
      this.thread.forkJoinContext = { forkId, forkPathId: '' };
    }
    this.thread.forkJoinContext.forkId = forkId;
  }

  /**
   * 获取Fork路径ID（用于FORK/JOIN场景）
   * @returns Fork路径ID，如果没有则返回undefined
   */
  getForkPathId(): string | undefined {
    return this.thread.forkJoinContext?.forkPathId;
  }

  /**
   * 设置Fork路径ID（用于FORK/JOIN场景）
   * @param forkPathId Fork路径ID
   */
  setForkPathId(forkPathId: string): void {
    if (!this.thread.forkJoinContext) {
      this.thread.forkJoinContext = { forkId: '', forkPathId };
    }
    this.thread.forkJoinContext.forkPathId = forkPathId;
  }

  /**
   * 获取子Thread ID列表
   * @returns 子Thread ID数组
   */
  getChildThreadIds(): ID[] {
    return this.thread.triggeredSubworkflowContext?.childThreadIds || [];
  }

  /**
   * 注册子Thread
   * @param childThreadId 子Thread ID
   */
  registerChildThread(childThreadId: ID): void {
    if (!this.thread.triggeredSubworkflowContext) {
      this.thread.triggeredSubworkflowContext = {
        parentThreadId: '',
        childThreadIds: [],
        triggeredSubworkflowId: ''
      };
    }
    if (!this.thread.triggeredSubworkflowContext.childThreadIds) {
      this.thread.triggeredSubworkflowContext.childThreadIds = [];
    }
    if (!this.thread.triggeredSubworkflowContext.childThreadIds.includes(childThreadId)) {
      this.thread.triggeredSubworkflowContext.childThreadIds.push(childThreadId);
    }
  }

  /**
   * 注销子Thread
   * @param childThreadId 子Thread ID
   */
  unregisterChildThread(childThreadId: ID): void {
    if (this.thread.triggeredSubworkflowContext?.childThreadIds) {
      this.thread.triggeredSubworkflowContext.childThreadIds = this.thread.triggeredSubworkflowContext.childThreadIds.filter(
        (id: ID) => id !== childThreadId
      );
    }
  }

  /**
   * 获取父Thread ID
   * @returns 父Thread ID，如果没有则返回undefined
   */
  getParentThreadId(): ID | undefined {
    return this.thread.triggeredSubworkflowContext?.parentThreadId;
  }

  /**
   * 设置父Thread ID
   * @param parentThreadId 父Thread ID
   */
  setParentThreadId(parentThreadId: ID): void {
    if (!this.thread.triggeredSubworkflowContext) {
      this.thread.triggeredSubworkflowContext = {
        parentThreadId,
        childThreadIds: [],
        triggeredSubworkflowId: ''
      };
    }
    this.thread.triggeredSubworkflowContext.parentThreadId = parentThreadId;
  }

  /**
   * 获取触发的子工作流ID（用于Triggered子工作流）
   * @returns 子工作流ID，如果没有则返回undefined
   */
  getTriggeredSubworkflowId(): ID | undefined {
    return this.thread.triggeredSubworkflowContext?.triggeredSubworkflowId;
  }

  /**
   * 设置触发的子工作流ID（用于Triggered子工作流）
   * @param subworkflowId 子工作流ID
   */
  setTriggeredSubworkflowId(subworkflowId: ID): void {
    if (!this.thread.triggeredSubworkflowContext) {
      this.thread.triggeredSubworkflowContext = {
        parentThreadId: '',
        childThreadIds: [],
        triggeredSubworkflowId: subworkflowId
      };
    }
    this.thread.triggeredSubworkflowContext.triggeredSubworkflowId = subworkflowId;
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
   * 初始化可用工具（从workflow配置）
   * @param workflow 工作流定义
   */
  initializeAvailableTools(workflow: WorkflowDefinition): void {
    if (workflow.availableTools?.initial) {
      this.availableTools = new Set(workflow.availableTools.initial);
    }
  }

  /**
   * 获取可用工具列表
   * @returns 可用工具ID列表
   */
  getAvailableTools(): string[] {
    return Array.from(this.availableTools);
  }

  /**
   * 检查工具是否可用
   * @param toolId 工具ID
   * @returns 是否可用
   */
  isToolAvailable(toolId: string): boolean {
    return this.availableTools.has(toolId);
  }

  /**
   * 添加动态工具到可用集合
   * @param toolIds 工具ID列表
   */
  addDynamicTools(toolIds: string[]): void {
    toolIds.forEach(id => this.availableTools.add(id));
  }

  /**
   * 获取活跃的子工作流ID列表
   * 包括触发的子工作流和子图执行栈中的工作流
   * @returns 活跃子工作流ID数组
   */
  getActiveSubworkflowIds(): string[] {
    const subworkflows = new Set<string>();
    
    // 1. 检查触发的子工作流
    const triggeredId = this.getTriggeredSubworkflowId();
    if (triggeredId) subworkflows.add(triggeredId);
    
    // 2. 检查子图执行栈中的工作流
    const subgraphStack = this.executionState.getSubgraphStack();
    for (const context of subgraphStack) {
      subworkflows.add(context.workflowId);
    }
    
    return Array.from(subworkflows);
  }

  /**
   * 检查是否引用指定工作流
   * @param workflowId 目标工作流ID
   * @returns 是否引用
   */
  isReferencingWorkflow(workflowId: string): boolean {
    // 1. 检查主工作流
    if (this.getWorkflowId() === workflowId) {
      return true;
    }
    
    // 2. 检查触发的子工作流
    const triggeredId = this.getTriggeredSubworkflowId();
    if (triggeredId === workflowId) {
      return true;
    }
    
    // 3. 检查子图执行栈中的工作流
    const subgraphStack = this.executionState.getSubgraphStack();
    for (const context of subgraphStack) {
      if (context.workflowId === workflowId) {
        return true;
      }
    }
    
    return false;
  }
}