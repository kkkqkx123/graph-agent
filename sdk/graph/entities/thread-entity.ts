/**
 * ThreadEntity - Thread实体
 * 自包含的数据实体，封装Thread实例的数据访问操作
 */

import type { ID } from '@modular-agent/types';
import type { Thread, ThreadStatus, LLMMessage } from '@modular-agent/types';
import type { PreprocessedGraph } from '@modular-agent/types';
import type { SubgraphContext } from './execution-state.js';
import { ExecutionState } from './execution-state.js';
import type { MessageHistoryManager } from '../execution/managers/message-history-manager.js';
import type { ConversationManager } from '../../core/managers/conversation-manager.js';

/**
 * ThreadEntity - Thread实体
 * 封装Thread实例的数据访问操作
 */
export class ThreadEntity {
  // 公开访问thread对象，用于兼容现有代码
  readonly thread: Thread;

  // 暴露id属性用于API访问
  readonly id: string;

  // 消息管理
  messages: LLMMessage[] = [];

  // 触发器管理
  triggerManager?: any;

  // 变量存储
  private variables: Map<string, any> = new Map();

  // 中止控制器
  abortController?: AbortController;

  // 对话管理器
  conversationManager?: ConversationManager;

  constructor(
    thread: Thread,
    private readonly executionState: ExecutionState,
    conversationManager?: ConversationManager
  ) {
    this.thread = thread;
    this.id = thread.id;
    this.conversationManager = conversationManager;
  }

  // ========== 基础属性访问 ==========

  getThreadId(): string {
    return this.thread.id;
  }

  getWorkflowId(): string {
    return this.thread.workflowId;
  }

  getStatus(): ThreadStatus {
    return this.thread.status;
  }

  setStatus(status: ThreadStatus): void {
    this.thread.status = status;
  }

  getThreadType(): string {
    return this.thread.threadType || 'MAIN';
  }

  setThreadType(threadType: string): void {
    this.thread.threadType = threadType as any;
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

  // ========== 运行时控制 ==========

  shouldPause(): boolean {
    return this.thread.shouldPause || false;
  }

  setShouldPause(shouldPause: boolean): void {
    this.thread.shouldPause = shouldPause;
  }

  shouldStop(): boolean {
    return this.thread.shouldStop || false;
  }

  setShouldStop(shouldStop: boolean): void {
    this.thread.shouldStop = shouldStop;
  }

  // ========== 获取原始Thread对象 ==========

  getThread(): Thread {
    return this.thread;
  }

  // ========== 中止控制 ==========

  getAbortSignal(): AbortSignal {
    if (!this.abortController) {
      this.abortController = new AbortController();
    }
    return this.abortController.signal;
  }

  // ========== 变量管理 ==========

  getVariable(name: string): any {
    return this.variables.get(name);
  }

  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables);
  }

  // ========== 中断控制 ==========

  interrupt(type: 'PAUSE' | 'STOP'): void {
    if (type === 'PAUSE') {
      this.setShouldPause(true);
    } else {
      this.setShouldStop(true);
    }
  }

  resetInterrupt(): void {
    this.setShouldPause(false);
    this.setShouldStop(false);
  }

  // ========== 对话管理 ==========

  addMessageToConversation(message: LLMMessage): void {
    this.messages.push(message);
  }

  getConversationHistory(count?: number): LLMMessage[] {
    if (count) {
      return this.messages.slice(-count);
    }
    return this.messages;
  }

  // ========== 触发器状态 ==========

  getTriggerStateSnapshot(): any {
    return {
      triggers: this.triggerManager?.getAll() || []
    };
  }

  // ========== 工具可见性协调器 ==========

  toolVisibilityCoordinator?: any;

  // ========== 对话管理器访问 ==========

  getConversationManager(): ConversationManager | undefined {
    return this.conversationManager;
  }

  setConversationManager(conversationManager: ConversationManager): void {
    this.conversationManager = conversationManager;
  }

  // ========== 触发器状态恢复 ==========

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

  // ========== 上下文日志记录器 ==========

}
