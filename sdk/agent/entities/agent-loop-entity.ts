/**
 * AgentLoopEntity - Agent Loop 执行实例
 *
 * 纯数据实体，封装 Agent Loop 实例的数据访问操作。
 * 参考 ThreadEntity 的设计模式。
 *
 * 注意：
 * - 工厂方法由 AgentLoopFactory 提供
 * - 生命周期管理由 AgentLoopLifecycle 提供
 * - 快照功能由 AgentLoopSnapshotManager 提供
 */

import type { ID, LLMMessage, AgentLoopConfig } from '@modular-agent/types';
import { AgentLoopStatus } from '@modular-agent/types';
import { AgentLoopState } from './agent-loop-state.js';
import { MessageHistoryManager, VariableStateManager } from '../execution/managers/index.js';
import type { ConversationManager } from '../../core/managers/conversation-manager.js';

/**
 * AgentLoopEntity - Agent Loop 执行实例
 *
 * 核心职责：
 * - 封装执行实例的所有数据
 * - 提供数据访问接口（getter/setter）
 * - 持有状态管理器实例
 *
 * 设计原则：
 * - 纯数据实体：只包含数据和访问方法
 * - 不包含工厂方法：由 AgentLoopFactory 负责
 * - 不包含生命周期方法：由 AgentLoopLifecycle 负责
 * - 与 ConversationManager 可选集成
 */
export class AgentLoopEntity {
  /** 执行实例 ID */
  readonly id: string;

  /** 配置 */
  readonly config: AgentLoopConfig;

  /** 执行状态 */
  readonly state: AgentLoopState;

  /** 消息历史管理器 */
  readonly messageHistoryManager: MessageHistoryManager;

  /** 变量状态管理器 */
  readonly variableStateManager: VariableStateManager;

  /** 中止控制器 */
  abortController?: AbortController;

  /** 对话管理器（可选集成） */
  conversationManager?: ConversationManager;

  /** 父 Thread ID（如果作为 Graph 节点执行） */
  parentThreadId?: ID;

  /** 节点 ID（如果作为 Graph 节点执行） */
  nodeId?: ID;

  /**
   * 构造函数
   * @param id 执行实例 ID
   * @param config 循环配置
   * @param state 执行状态（可选，默认创建新实例）
   */
  constructor(
    id: string,
    config: AgentLoopConfig,
    state?: AgentLoopState
  ) {
    this.id = id;
    this.config = config;
    this.state = state ?? new AgentLoopState();
    this.messageHistoryManager = new MessageHistoryManager(id);
    this.variableStateManager = new VariableStateManager(id);
  }

  // ========== 状态访问 ==========

  /**
   * 获取当前状态
   */
  getStatus(): AgentLoopStatus {
    return this.state.status;
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.state.status === AgentLoopStatus.RUNNING;
  }

  /**
   * 检查是否已暂停
   */
  isPaused(): boolean {
    return this.state.status === AgentLoopStatus.PAUSED;
  }

  /**
   * 检查是否已完成
   */
  isCompleted(): boolean {
    return this.state.status === AgentLoopStatus.COMPLETED;
  }

  /**
   * 检查是否失败
   */
  isFailed(): boolean {
    return this.state.status === AgentLoopStatus.FAILED;
  }

  /**
   * 检查是否已取消
   */
  isCancelled(): boolean {
    return this.state.status === AgentLoopStatus.CANCELLED;
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
   * 中止执行
   * @param reason 中止原因（可选）
   */
  abort(reason?: string): void {
    if (this.abortController) {
      this.abortController.abort(reason);
    }
  }

  /**
   * 检查是否应该暂停
   */
  shouldPause(): boolean {
    return this.state.shouldPause();
  }

  /**
   * 设置暂停标志
   */
  setShouldPause(value: boolean): void {
    this.state.setShouldPause(value);
  }

  /**
   * 检查是否应该停止
   */
  shouldStop(): boolean {
    return this.state.shouldStop();
  }

  /**
   * 设置停止标志
   */
  setShouldStop(value: boolean): void {
    this.state.setShouldStop(value);
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
}
