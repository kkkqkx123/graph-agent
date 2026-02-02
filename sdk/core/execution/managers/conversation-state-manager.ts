/**
 * 对话状态管理器
 * 负责管理单个 Thread 的对话运行时状态
 *
 * 核心职责：
 * 1. 管理对话消息历史
 * 2. 管理 Token 使用统计
 * 3. 提供状态快照和恢复功能
 *
 * 设计原则：
 * - 有状态设计：维护 Thread 的对话状态
 * - 线程隔离：每个 ThreadContext 拥有独立实例
 * - 快照支持：支持检查点持久化
 * - 委托模式：内部委托给 ConversationManager 进行实际管理
 */

import type { LLMMessage, LLMUsage, TokenUsageHistory, TokenUsageStatistics } from '../../../types/llm';
import { ConversationManager } from '../conversation';
import type { TokenUsageStats } from '../token-usage-tracker';
import type { LifecycleCapable } from './lifecycle-capable';

/**
 * 对话状态接口
 */
export interface ConversationState {
  /** 消息历史 */
  messages: LLMMessage[];
  /** 累积的 Token 使用统计 */
  tokenUsage: TokenUsageStats | null;
  /** 当前请求的 Token 使用统计 */
  currentRequestUsage: TokenUsageStats | null;
  /** Token 使用历史记录 */
  usageHistory?: TokenUsageHistory[];
}

/**
 * 对话状态管理器类
 *
 * 职责：
 * - 管理 Thread 的对话运行时状态
 * - 提供简化的状态访问接口
 * - 支持状态快照和恢复
 *
 * 设计原则：
 * - 有状态设计：维护对话状态
 * - 线程隔离：每个 Thread 独立实例
 * - 委托模式：内部使用 ConversationManager
 */
export class ConversationStateManager implements LifecycleCapable<ConversationState> {
  private threadId: string;
  private conversationManager: ConversationManager;

  /**
   * 构造函数
   * @param threadId 线程 ID
   * @param options 配置选项
   */
  constructor(
    threadId: string,
    options?: {
      tokenLimit?: number;
      eventManager?: any;
      workflowId?: string;
    }
  ) {
    this.threadId = threadId;
    this.conversationManager = new ConversationManager({
      tokenLimit: options?.tokenLimit,
      eventManager: options?.eventManager,
      workflowId: options?.workflowId,
      threadId: threadId
    });
  }

  /**
   * 获取线程 ID
   * @returns 线程 ID
   */
  getThreadId(): string {
    return this.threadId;
  }

  /**
   * 获取当前状态
   * @returns 对话状态
   */
  getState(): ConversationState {
    return {
      messages: this.conversationManager.getMessages(),
      tokenUsage: this.conversationManager.getTokenUsage(),
      currentRequestUsage: this.conversationManager.getCurrentRequestUsage(),
      usageHistory: this.conversationManager.getUsageHistory()
    };
  }

  /**
   * 获取消息历史
   * @returns 消息数组
   */
  getMessages(): LLMMessage[] {
    return this.conversationManager.getMessages();
  }

  /**
   * 获取所有消息（包括压缩的）
   * @returns 消息数组
   */
  getAllMessages(): LLMMessage[] {
    return this.conversationManager.getAllMessages();
  }

  /**
   * 添加消息
   * @param message 消息对象
   */
  addMessage(message: LLMMessage): void {
    this.conversationManager.addMessage(message);
  }

  /**
   * 批量添加消息
   * @param messages 消息数组
   */
  addMessages(...messages: LLMMessage[]): void {
    this.conversationManager.addMessages(...messages);
  }

  /**
   * 获取 Token 使用统计
   * @returns Token 使用统计
   */
  getTokenUsage(): TokenUsageStats | null {
    return this.conversationManager.getTokenUsage();
  }

  /**
   * 获取当前请求的 Token 使用统计
   * @returns Token 使用统计
   */
  getCurrentRequestUsage(): TokenUsageStats | null {
    return this.conversationManager.getCurrentRequestUsage();
  }

  /**
   * 更新 Token 使用统计
   * @param usage Token 使用数据
   */
  updateTokenUsage(usage?: LLMUsage): void {
    this.conversationManager.updateTokenUsage(usage);
  }

  /**
   * 累积流式响应的 Token 使用统计
   * @param usage Token 使用数据（增量）
   */
  accumulateStreamUsage(usage: LLMUsage): void {
    this.conversationManager.accumulateStreamUsage(usage);
  }

  /**
   * 完成当前请求的 Token 统计
   */
  finalizeCurrentRequest(): void {
    this.conversationManager.finalizeCurrentRequest();
  }

  /**
   * 检查 Token 使用情况，触发压缩事件
   */
  async checkTokenUsage(): Promise<void> {
    await this.conversationManager.checkTokenUsage();
  }

  /**
   * 获取Token使用历史记录
   * @returns Token使用历史记录
   */
  getUsageHistory(): TokenUsageHistory[] {
    return this.conversationManager.getUsageHistory();
  }

  /**
   * 获取最近N条Token使用历史记录
   * @param n 记录数量
   * @returns 最近N条历史记录
   */
  getRecentUsageHistory(n: number): TokenUsageHistory[] {
    return this.conversationManager.getTokenUsageTracker().getRecentHistory(n);
  }

  /**
   * 获取Token使用统计信息
   * @returns 统计信息
   */
  getTokenUsageStatistics(): TokenUsageStatistics {
    return this.conversationManager.getTokenUsageTracker().getStatistics();
  }

  /**
   * 回退到指定请求之前
   * @param requestIndex 请求索引
   */
  rollbackToRequest(requestIndex: number): void {
    this.conversationManager.getTokenUsageTracker().rollbackToRequest(requestIndex);
  }

  /**
   * 回退到指定请求ID之前
   * @param requestId 请求ID
   */
  rollbackToRequestId(requestId: string): void {
    this.conversationManager.getTokenUsageTracker().rollbackToRequestId(requestId);
  }

  /**
   * 回退到指定时间戳之前
   * @param timestamp 时间戳
   */
  rollbackToTimestamp(timestamp: number): void {
    this.conversationManager.getTokenUsageTracker().rollbackToTimestamp(timestamp);
  }

  /**
   * 清空消息历史
   * @param keepSystemMessage 是否保留系统消息
   */
  clearMessages(keepSystemMessage: boolean = true): void {
    this.conversationManager.clearMessages(keepSystemMessage);
  }

  /**
   * 获取最近 N 条消息
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessages(n: number): LLMMessage[] {
    return this.conversationManager.getRecentMessages(n);
  }

  /**
   * 按角色过滤消息
   * @param role 消息角色
   * @returns 消息数组
   */
  filterMessagesByRole(role: string): LLMMessage[] {
    return this.conversationManager.filterMessagesByRole(role);
  }

  /**
   * 创建状态快照
   * @returns 对话状态快照
   */
  createSnapshot(): ConversationState {
    return {
      messages: this.conversationManager.getAllMessages().map(msg => ({ ...msg })),
      tokenUsage: this.conversationManager.getTokenUsage(),
      currentRequestUsage: this.conversationManager.getCurrentRequestUsage(),
      usageHistory: this.conversationManager.getUsageHistory()
    };
  }

  /**
   * 从快照恢复状态
   * @param snapshot 对话状态快照
   */
  restoreFromSnapshot(snapshot: ConversationState): void {
    // 清空当前消息
    this.conversationManager.clearMessages(false);

    // 恢复消息历史
    this.conversationManager.addMessages(...snapshot.messages);

    // Token 使用统计无法直接恢复，需要重新累积
    // 这里只恢复消息历史，Token 统计会在后续执行中重新累积
  }

  /**
   * 克隆状态管理器
   * @returns 克隆的 ConversationStateManager 实例
   */
  clone(): ConversationStateManager {
    const cloned = new ConversationStateManager(
      this.threadId,
      {
        tokenLimit: this.conversationManager.getTokenUsageTracker()['tokenLimit'],
        eventManager: (this.conversationManager as any).eventManager,
        workflowId: (this.conversationManager as any).workflowId
      }
    );

    // 克隆 ConversationManager
    cloned.conversationManager = this.conversationManager.clone();

    return cloned;
  }

  /**
   * 初始化管理器
   * ConversationStateManager在构造时已初始化，此方法为空实现
   */
  initialize(): void {
    // ConversationStateManager在构造时已初始化，无需额外操作
  }

  /**
   * 清理资源
   * 清空消息历史和Token统计
   */
  cleanup(): void {
    this.conversationManager.clearMessages(false);
  }

  /**
   * 检查是否已初始化
   * @returns 始终返回true，因为ConversationStateManager在构造时已初始化
   */
  isInitialized(): boolean {
    return true;
  }
}