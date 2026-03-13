/**
 * ThreadEntity - Thread实体
 *
 * 纯数据实体，封装Thread实例的数据访问操作。
 * 参考 AgentLoopEntity 的设计模式。
 *
 * 注意：
 * - 工厂方法由 ThreadFactory 提供
 * - 生命周期管理由 ThreadLifecycle 提供
 * - 快照功能由 ThreadSnapshotManager 提供
 */

import type { ID, LLMMessage } from '@modular-agent/types';
import type { Thread, ThreadStatus, ThreadType } from '@modular-agent/types';
import type { PreprocessedGraph } from '@modular-agent/types';
import type { SubgraphContext } from './execution-state.js';
import { ExecutionState } from './execution-state.js';
import { ThreadState } from './thread-state.js';
import { MessageHistoryManager, VariableStateManager } from '../../agent/execution/managers/index.js';
import type { ConversationManager } from '../../core/managers/conversation-manager.js';

/**
 * ThreadEntity - Thread实体
 *
 * 核心职责：
 * - 封装执行实例的所有数据
 * - 提供数据访问接口（getter/setter）
 * - 持有状态管理器实例
 *
 * 设计原则：
 * - 纯数据实体：只包含数据和访问方法
 * - 不包含工厂方法：由 ThreadFactory 负责
 * - 不包含生命周期方法：由 ThreadLifecycle 负责
 * - 与 ConversationManager 可选集成
 */
export class ThreadEntity {
  /** 执行实例 ID */
  readonly id: string;

  /** Thread 数据对象（私有，不暴露） */
  private readonly thread: Thread;

  /** 执行状态 */
  readonly state: ThreadState;

  /** 执行状态管理器（子图执行栈） */
  private readonly executionState: ExecutionState;

  /** 消息历史管理器 */
  readonly messageHistoryManager: MessageHistoryManager;

  /** 变量状态管理器 */
  readonly variableStateManager: VariableStateManager;

  /** 中止控制器 */
  abortController?: AbortController;

  /** 对话管理器（可选集成） */
  conversationManager?: ConversationManager;

  /** 触发器管理 */
  triggerManager?: any;

  /** 工具可见性协调器 */
  toolVisibilityCoordinator?: any;

  /**
   * 构造函数
   * @param thread Thread 数据对象
   * @param executionState 执行状态管理器
   * @param state 执行状态（可选，默认创建新实例）
   * @param conversationManager 对话管理器（可选）
   */
  constructor(
    thread: Thread,
    executionState: ExecutionState,
    state?: ThreadState,
    conversationManager?: ConversationManager
  ) {
    this.id = thread.id;
    this.thread = thread;
    this.executionState = executionState;
    this.state = state ?? new ThreadState();
    this.conversationManager = conversationManager;
    this.messageHistoryManager = new MessageHistoryManager(thread.id);
    this.variableStateManager = new VariableStateManager(thread.id);
  }

  // ========== 基础属性访问 ==========

  getThreadId(): string {
    return this.thread.id;
  }

  getWorkflowId(): string {
    return this.thread.workflowId;
  }

  getStatus(): ThreadStatus {
    return this.state.status;
  }

  setStatus(status: ThreadStatus): void {
    this.state.status = status;
  }

  getThreadType(): ThreadType {
    return this.thread.threadType || 'MAIN';
  }

  setThreadType(threadType: ThreadType): void {
    this.thread.threadType = threadType;
  }

  getCurrentNodeId(): string {
    return this.thread.currentNodeId;
  }

  setCurrentNodeId(nodeId: string): void {
    this.thread.currentNodeId = nodeId;
  }

  // ========== 输入输出 ==========

  getInput(): Record<string, any> {
    return this.thread.input;
  }

  getOutput(): Record<string, any> {
    return this.thread.output;
  }

  setOutput(output: Record<string, any>): void {
    this.thread.output = output;
  }

  // ========== 执行结果 ==========

  addNodeResult(result: any): void {
    this.thread.nodeResults.push(result);
  }

  getNodeResults(): any[] {
    return this.thread.nodeResults;
  }

  // ========== 错误信息 ==========

  getErrors(): any[] {
    return this.thread.errors;
  }

  // ========== 时间信息 ==========

  getStartTime(): number {
    return this.thread.startTime;
  }

  getEndTime(): number | undefined {
    return this.thread.endTime;
  }

  setEndTime(endTime: number): void {
    this.thread.endTime = endTime;
  }

  // ========== 图导航 ==========

  getGraph(): PreprocessedGraph {
    return this.thread.graph;
  }

  // ========== 子图执行状态 ==========

  enterSubgraph(workflowId: ID, parentWorkflowId: ID, input: any): void {
    this.executionState.enterSubgraph(workflowId, parentWorkflowId, input);
  }

  exitSubgraph(): void {
    this.executionState.exitSubgraph();
  }

  getCurrentSubgraphContext(): SubgraphContext | null {
    return this.executionState.getCurrentSubgraphContext();
  }

  getSubgraphStack(): SubgraphContext[] {
    return this.executionState.getSubgraphStack();
  }

  // ========== Fork/Join上下文 ==========

  setForkId(forkId: string): void {
    if (!this.thread.forkJoinContext) {
      this.thread.forkJoinContext = { forkId, forkPathId: '' };
    }
    this.thread.forkJoinContext.forkId = forkId;
  }

  setForkPathId(forkPathId: string): void {
    if (!this.thread.forkJoinContext) {
      this.thread.forkJoinContext = { forkId: '', forkPathId };
    }
    this.thread.forkJoinContext.forkPathId = forkPathId;
  }

  // ========== 触发子工作流上下文 ==========

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

  unregisterChildThread(childThreadId: ID): void {
    if (this.thread.triggeredSubworkflowContext?.childThreadIds) {
      this.thread.triggeredSubworkflowContext.childThreadIds =
        this.thread.triggeredSubworkflowContext.childThreadIds.filter(
          (id: ID) => id !== childThreadId
        );
    }
  }

  getParentThreadId(): ID | undefined {
    return this.thread.triggeredSubworkflowContext?.parentThreadId;
  }

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

  getTriggeredSubworkflowId(): ID | undefined {
    return this.thread.triggeredSubworkflowContext?.triggeredSubworkflowId;
  }

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

  // ========== 消息管理 ==========

  /**
   * 添加消息
   * @param message LLM 消息
   */
  addMessage(message: LLMMessage): void {
    this.messageHistoryManager.addMessage(message);

    // 同步到 ConversationManager（如果存在）
    if (this.conversationManager) {
      this.conversationManager.addMessage(message);
    }
  }

  /**
   * 获取所有消息
   */
  getMessages(): LLMMessage[] {
    return this.messageHistoryManager.getMessages();
  }

  /**
   * 获取最近的消息
   * @param count 消息数量
   */
  getRecentMessages(count: number): LLMMessage[] {
    return this.messageHistoryManager.getRecentMessages(count);
  }

  /**
   * 设置消息历史
   * @param messages 消息列表
   */
  setMessages(messages: LLMMessage[]): void {
    this.messageHistoryManager.setMessages(messages);
  }

  /**
   * 清空消息历史
   */
  clearMessages(): void {
    this.messageHistoryManager.clearMessages();
  }

  /**
   * 规范化消息历史
   */
  normalizeHistory(): void {
    this.messageHistoryManager.normalizeHistory();
  }

  // ========== 变量管理 ==========

  /**
   * 获取变量
   * @param name 变量名
   */
  getVariable(name: string): any {
    return this.variableStateManager.getVariable(name);
  }

  /**
   * 设置变量
   * @param name 变量名
   * @param value 变量值
   */
  setVariable(name: string, value: any): void {
    this.variableStateManager.setVariable(name, value);
  }

  /**
   * 获取所有变量
   */
  getAllVariables(): Record<string, any> {
    return this.variableStateManager.getAllVariables();
  }

  /**
   * 删除变量
   * @param name 变量名
   */
  deleteVariable(name: string): boolean {
    return this.variableStateManager.deleteVariable(name);
  }

  // ========== 中止控制 ==========

  /**
   * 获取中止信号
   */
  getAbortSignal(): AbortSignal {
    if (!this.abortController) {
      this.abortController = new AbortController();
    }
    return this.abortController.signal;
  }

  /**
   * 检查是否已中止
   */
  isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  /**
   * 中止执行
   * @param reason 中止原因（可选）
   */
  abort(reason?: string): void {
    if (this.abortController) {
      this.abortController.abort(reason);
    }
  }

  // ========== 中断控制 ==========

  /**
   * 暂停执行
   */
  pause(): void {
    this.state.pause();
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this.state.resume();
  }

  /**
   * 停止执行
   */
  stop(): void {
    this.state.cancel();
    this.abort();
  }

  /**
   * 检查是否应该暂停
   */
  shouldPause(): boolean {
    return this.state.shouldPause();
  }

  /**
   * 检查是否应该停止
   */
  shouldStop(): boolean {
    return this.state.shouldStop();
  }

  /**
   * 中断执行
   * @param type 中断类型
   */
  interrupt(type: 'PAUSE' | 'STOP'): void {
    this.state.interrupt(type);
    if (type === 'STOP') {
      this.abort();
    }
  }

  /**
   * 重置中断标志
   */
  resetInterrupt(): void {
    this.state.resetInterrupt();
  }

  // ========== 对话管理器 ==========

  /**
   * 获取对话管理器
   */
  getConversationManager(): ConversationManager | undefined {
    return this.conversationManager;
  }

  /**
   * 设置对话管理器
   */
  setConversationManager(conversationManager: ConversationManager): void {
    this.conversationManager = conversationManager;
  }

  // ========== 触发器状态 ==========

  getTriggerStateSnapshot(): any {
    return {
      triggers: this.triggerManager?.getAll() || []
    };
  }

  restoreTriggerState(triggerStates: any): void {
    if (this.triggerManager && triggerStates?.triggers) {
      for (const trigger of triggerStates.triggers) {
        this.triggerManager.restore(trigger);
      }
    }
  }

  // ========== 事件构建（自动填充上下文）==========

  /**
   * 构建事件（自动填充 threadId, workflowId, nodeId）
   * @param builder 事件构建器函数
   * @param params 事件参数（不含上下文字段）
   * @returns 完整事件对象
   *
   * @example
   * const event = threadEntity.buildEvent(buildNodeStartedEvent, { nodeType: 'LLM' });
   */
  buildEvent<T extends { threadId?: string; workflowId?: string; nodeId?: string; timestamp: number; type: string }>(
    builder: (params: T) => T,
    params: Omit<T, 'threadId' | 'workflowId' | 'nodeId' | 'timestamp' | 'type'>
  ): T {
    return builder({
      ...params,
      threadId: this.id,
      workflowId: this.getWorkflowId(),
      nodeId: this.getCurrentNodeId(),
    } as T);
  }

  // ========== 获取原始Thread对象（只读访问）==========

  /**
   * 获取 Thread 对象的只读引用
   * 注意：此方法仅用于兼容现有代码，应避免直接修改返回的对象
   * @deprecated 应使用 Entity 的访问方法
   */
  getThread(): Thread {
    return this.thread;
  }
}
