/**
 * ThreadEntity - Thread实体
 * 自包含的数据实体，封装Thread实例的数据访问操作
 */

import type { ID } from '@modular-agent/types';
import type { Thread, ThreadStatus, LLMMessage } from '@modular-agent/types';
import type { PreprocessedGraph } from '@modular-agent/types';
import type { SubgraphContext } from './execution-state.js';
import { ExecutionState } from './execution-state.js';
import type { ConversationManager } from '../../core/execution/managers/conversation-manager.js';

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

  getWorkflowVersion(): string {
    return this.thread.workflowVersion;
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

  addError(error: any): void {
    this.thread.errors.push(error);
  }

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

  getCurrentWorkflowId(): ID {
    return this.executionState.getCurrentWorkflowId(this.thread.workflowId);
  }

  getCurrentSubgraphContext(): SubgraphContext | null {
    return this.executionState.getCurrentSubgraphContext();
  }

  getSubgraphStack(): SubgraphContext[] {
    return this.executionState.getSubgraphStack();
  }

  isInSubgraph(): boolean {
    return this.executionState.isInSubgraph();
  }

  // ========== Fork/Join上下文 ==========

  getForkId(): string | undefined {
    return this.thread.forkJoinContext?.forkId;
  }

  setForkId(forkId: string): void {
    if (!this.thread.forkJoinContext) {
      this.thread.forkJoinContext = { forkId, forkPathId: '' };
    }
    this.thread.forkJoinContext.forkId = forkId;
  }

  getForkPathId(): string | undefined {
    return this.thread.forkJoinContext?.forkPathId;
  }

  setForkPathId(forkPathId: string): void {
    if (!this.thread.forkJoinContext) {
      this.thread.forkJoinContext = { forkId: '', forkPathId };
    }
    this.thread.forkJoinContext.forkPathId = forkPathId;
  }

  // ========== 触发子工作流上下文 ==========

  getChildThreadIds(): ID[] {
    return this.thread.triggeredSubworkflowContext?.childThreadIds || [];
  }

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

  // ========== 获取ExecutionState ==========

  getExecutionState(): ExecutionState {
    return this.executionState;
  }

  // ========== 清理资源 ==========

  cleanup(): void {
    this.executionState.cleanup();
  }

  // ========== 克隆 ==========

  clone(): ThreadEntity {
    const clonedExecutionState = this.executionState.clone();
    return new ThreadEntity(this.thread, clonedExecutionState);
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

  // ========== 消息管理 ==========

  addMessage(message: LLMMessage): void {
    this.messages.push(message);
  }

  getMessages(): LLMMessage[] {
    return this.messages;
  }

  getRecentMessages(count: number): LLMMessage[] {
    return this.messages.slice(-count);
  }

  // ========== 导航器 ==========

  getNavigator(): any {
    // 返回一个简单的导航器mock
    return {
      getNextNode: () => ({ nextNodeId: null, isEnd: true })
    };
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
    this.addMessage(message);
  }

  getConversationHistory(count?: number): LLMMessage[] {
    if (count) {
      return this.getRecentMessages(count);
    }
    return this.getMessages();
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

  // ========== 工具可见性初始化 ==========

  initializeToolVisibility(): void {
    // 工具可见性初始化逻辑由ToolVisibilityCoordinator处理
    // 这里只是占位符，实际初始化在协调器中完成
  }
}
