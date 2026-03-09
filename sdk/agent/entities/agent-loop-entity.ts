/**
 * AgentLoopEntity - Agent Loop 执行实例
 *
 * 自包含的数据实体，封装 Agent Loop 实例的数据访问操作。
 * 参考 ThreadEntity 的设计模式。
 *
 * 注意：快照功能由 AgentLoopSnapshotManager 提供
 */

import { randomUUID } from 'crypto';
import type { ID, LLMMessage, AgentLoopConfig } from '@modular-agent/types';
import { AgentLoopStatus } from '@modular-agent/types';
import { AgentLoopState } from './agent-loop-state.js';
import type { AgentLoopEntitySnapshot } from '../snapshot/agent-loop-snapshot.js';
import { AgentLoopSnapshotManager } from '../snapshot/agent-loop-snapshot.js';
import type { ConversationManager } from '../../core/managers/conversation-manager.js';

/**
 * AgentLoopEntity 创建选项
 */
export interface AgentLoopEntityOptions {
  /** 初始消息 */
  initialMessages?: LLMMessage[];
  /** 初始变量 */
  initialVariables?: Record<string, any>;
  /** 对话管理器 */
  conversationManager?: ConversationManager;
  /** 父 Thread ID */
  parentThreadId?: ID;
  /** 节点 ID */
  nodeId?: ID;
}

/**
 * AgentLoopEntity - Agent Loop 执行实例
 *
 * 核心职责：
 * - 封装执行实例的所有数据
 * - 提供数据访问接口
 * - 管理消息历史和变量存储
 * - 支持中断控制
 *
 * 设计原则：
 * - 自包含：所有状态都在实体内部
 * - 与 ConversationManager 可选集成
 * - 快照功能由 AgentLoopSnapshotManager 提供
 */
export class AgentLoopEntity {
  /** 执行实例 ID */
  readonly id: string;

  /** 配置 */
  readonly config: AgentLoopConfig;

  /** 执行状态 */
  readonly state: AgentLoopState;

  /** 消息历史 */
  messages: LLMMessage[] = [];

  /** 变量存储 */
  private variables: Map<string, any> = new Map();

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
  }

  // ========== 静态工厂方法 ==========

  /**
   * 创建新的 AgentLoopEntity 实例
   * @param config 循环配置
   * @param options 创建选项
   * @returns AgentLoopEntity 实例
   */
  static create(config: AgentLoopConfig, options: AgentLoopEntityOptions = {}): AgentLoopEntity {
    const id = `agent-loop-${randomUUID()}`;
    const entity = new AgentLoopEntity(id, config);

    // 初始化消息历史
    if (options.initialMessages && options.initialMessages.length > 0) {
      entity.setMessages(options.initialMessages);
    } else if (config.initialMessages && config.initialMessages.length > 0) {
      entity.setMessages(config.initialMessages as LLMMessage[]);
    }

    // 初始化变量
    if (options.initialVariables) {
      for (const [key, value] of Object.entries(options.initialVariables)) {
        entity.setVariable(key, value);
      }
    }

    // 设置对话管理器
    if (options.conversationManager) {
      entity.setConversationManager(options.conversationManager);
    }

    // 设置父 Thread ID 和节点 ID
    entity.parentThreadId = options.parentThreadId;
    entity.nodeId = options.nodeId;

    return entity;
  }

  /**
   * 从快照恢复 AgentLoopEntity 实例
   * @param snapshot 快照数据
   * @returns AgentLoopEntity 实例
   */
  static fromSnapshot(snapshot: AgentLoopEntitySnapshot): AgentLoopEntity {
    const state = new AgentLoopState();
    const restoredState = AgentLoopSnapshotManager.restoreState(snapshot);

    // 恢复状态
    state.status = restoredState.status;
    (state as any)._currentIteration = restoredState.currentIteration;
    (state as any)._toolCallCount = restoredState.toolCallCount;
    (state as any)._startTime = restoredState.startTime;
    (state as any)._endTime = restoredState.endTime;
    (state as any)._error = restoredState.error;
    (state as any)._iterationHistory = restoredState.iterationHistory;

    const entity = new AgentLoopEntity(snapshot.id, snapshot.config, state);
    entity.messages = [...snapshot.messages];
    entity.variables = new Map(Object.entries(snapshot.variables));
    entity.parentThreadId = snapshot.parentThreadId;
    entity.nodeId = snapshot.nodeId;

    return entity;
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
    this.messages.push(message);

    // 同步到 ConversationManager（如果存在）
    if (this.conversationManager) {
      this.conversationManager.addMessage(message);
    }
  }

  /**
   * 获取所有消息
   */
  getMessages(): LLMMessage[] {
    return [...this.messages];
  }

  /**
   * 获取最近的消息
   * @param count 消息数量
   */
  getRecentMessages(count: number): LLMMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * 设置消息历史
   * @param messages 消息列表
   */
  setMessages(messages: LLMMessage[]): void {
    this.messages = [...messages];
  }

  /**
   * 清空消息历史
   */
  clearMessages(): void {
    this.messages = [];
  }

  // ========== 变量管理 ==========

  /**
   * 获取变量
   * @param name 变量名
   */
  getVariable(name: string): any {
    return this.variables.get(name);
  }

  /**
   * 设置变量
   * @param name 变量名
   * @param value 变量值
   */
  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  /**
   * 获取所有变量
   */
  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables);
  }

  /**
   * 删除变量
   * @param name 变量名
   */
  deleteVariable(name: string): boolean {
    return this.variables.delete(name);
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
   * 中止执行
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 检查是否已中止
   */
  isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  // ========== 中断控制 ==========

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

  // ========== 快照（委托给 SnapshotManager） ==========

  /**
   * 创建快照
   * @returns 快照数据
   */
  createSnapshot(): AgentLoopEntitySnapshot {
    return AgentLoopSnapshotManager.createSnapshot({
      id: this.id,
      config: this.config,
      state: {
        status: this.state.status,
        currentIteration: this.state.currentIteration,
        toolCallCount: this.state.toolCallCount,
        startTime: this.state.startTime,
        endTime: this.state.endTime,
        error: this.state.error,
        iterationHistory: this.state.iterationHistory,
      },
      messages: this.messages,
      variables: this.variables,
      parentThreadId: this.parentThreadId,
      nodeId: this.nodeId,
    });
  }

  // ========== 清理资源 ==========

  /**
   * 清理资源
   */
  cleanup(): void {
    this.state.cleanup();
    this.messages = [];
    this.variables.clear();
    this.abortController = undefined;
  }

  // ========== 克隆 ==========

  /**
   * 克隆实体
   */
  clone(): AgentLoopEntity {
    const cloned = new AgentLoopEntity(
      this.id,
      { ...this.config },
      this.state.clone()
    );
    cloned.messages = [...this.messages];
    cloned.variables = new Map(this.variables);
    cloned.parentThreadId = this.parentThreadId;
    cloned.nodeId = this.nodeId;
    cloned.conversationManager = this.conversationManager;
    return cloned;
  }
}
