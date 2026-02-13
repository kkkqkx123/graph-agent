/**
 * 对话管理器
 * 管理消息历史和消息索引
 *
 * 核心职责：
 * 1. 消息历史管理
 * 2. Token统计和事件触发（委托给 TokenUsageTracker）
 * 3. 消息索引管理（委托给 MessageIndexManager）
 *
 * 重要说明：
 * - ConversationManager只管理状态，不负责执行逻辑
 * - 执行逻辑由LLMExecutor负责
 * - Token统计委托给TokenUsageTracker
 * - 消息索引管理委托给MessageIndexManager
 * - 上下文压缩通过触发器+子工作流实现，不在此模块
 */

import type { LLMMessage, LLMUsage, MessageMarkMap, TokenUsageHistory, TokenUsageStats, LLMMessageRole } from '@modular-agent/types/llm';
import { ValidationError, RuntimeValidationError } from '@modular-agent/types/errors';
import { TokenUsageTracker } from '../token-usage-tracker';
import { MessageIndexManager } from './message-index-manager';
import { TypeIndexManager } from './type-index-manager';
import type { EventManager } from '../../services/event-manager';
import type { TokenLimitExceededEvent } from '@modular-agent/types/events';
import { EventType } from '@modular-agent/types/events';
import type { LifecycleCapable } from './lifecycle-capable';

/**
 * ConversationManager事件回调
 */
export interface ConversationManagerOptions {
  /** Token限制阈值，超过此值触发压缩事件 */
  tokenLimit?: number;
  /** 事件管理器 */
  eventManager?: EventManager;
  /** 工作流ID（用于事件） */
  workflowId?: string;
  /** 线程ID（用于事件） */
  threadId?: string;
  /** 工具服务（用于工具描述初始化） */
  toolService?: any;
  /** 可用工具配置 */
  availableTools?: {
    /** 初始可用工具集合 */
    initial: Set<string>;
    /** 动态工具配置 */
    dynamicTools?: {
      toolIds: string[];
      descriptionTemplate?: string;
    };
  };
}

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
 * 对话管理器类
 */
export class ConversationManager implements LifecycleCapable<ConversationState> {
  private messages: LLMMessage[] = [];
  private tokenUsageTracker: TokenUsageTracker;
  private indexManager: MessageIndexManager;
  private typeIndexManager: TypeIndexManager;
  private eventManager?: EventManager;
  private workflowId?: string;
  private threadId?: string;
  private toolService?: any;
  private availableTools?: ConversationManagerOptions['availableTools'];

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options: ConversationManagerOptions = {}) {
    this.tokenUsageTracker = new TokenUsageTracker({
      tokenLimit: options.tokenLimit
    });
    this.indexManager = new MessageIndexManager();
    this.typeIndexManager = new TypeIndexManager();
    this.eventManager = options.eventManager;
    this.workflowId = options.workflowId;
    this.threadId = options.threadId;
    this.toolService = options.toolService;
    this.availableTools = options.availableTools;
  }

  /**
   * 添加消息
   * @param message 消息对象
   * @returns 添加后的消息数组长度
   */
  addMessage(message: LLMMessage): number {
    // 验证消息格式
    if (!message.role || !message.content) {
      throw new RuntimeValidationError('Invalid message format: role and content are required', { operation: 'addMessage', field: 'message' });
    }

    // 将消息追加到数组末尾
    this.messages.push({ ...message });
    const newIndex = this.messages.length - 1;

    // 同步更新索引
    this.indexManager.addIndex(newIndex);
    
    // 同步更新类型索引
    this.typeIndexManager.addIndex(message.role, newIndex);

    return this.messages.length;
  }

  /**
   * 批量添加消息
   * @param messages 消息数组
   * @returns 添加后的消息数组长度
   */
  addMessages(...messages: LLMMessage[]): number {
    for (const message of messages) {
      this.addMessage(message);
    }
    return this.messages.length;
  }

  /**
   * 获取当前消息历史（未压缩的消息）
   * @returns 消息数组的副本
   */
  getMessages(): LLMMessage[] {
    const uncompressedIndices = this.indexManager.getUncompressedIndices();
    return this.indexManager.filterMessages(this.messages, uncompressedIndices);
  }

  /**
   * 获取所有消息（包括压缩的）
   * @returns 消息数组的副本
   */
  getAllMessages(): LLMMessage[] {
    return [...this.messages];
  }

  /**
   * 根据索引范围获取消息
   * @param start 起始索引
   * @param end 结束索引
   * @returns 消息数组
   */
  getMessagesByRange(start: number, end: number): LLMMessage[] {
    const uncompressedIndices = this.indexManager.getUncompressedIndices();
    const filteredIndices = uncompressedIndices.filter(idx => idx >= start && idx < end);
    return this.indexManager.filterMessages(this.messages, filteredIndices);
  }

  /**
   * 清空消息历史
   * @param keepSystemMessage 是否保留系统消息
   */
  clearMessages(keepSystemMessage: boolean = true): void {
    if (keepSystemMessage && this.messages.length > 0) {
      const firstMessage = this.messages[0]!;
      if (firstMessage.role === 'system') {
        // 保留系统消息
        this.messages = [firstMessage];
      } else {
        // 清空所有消息
        this.messages = [];
      }
    } else {
      // 清空所有消息
      this.messages = [];
    }

    // 重置索引管理器
    this.indexManager.reset();
    
    // 重置类型索引管理器
    this.typeIndexManager.reset();
  }

  /**
   * 检查Token使用情况，触发压缩事件
   */
  async checkTokenUsage(): Promise<void> {
    const tokensUsed = this.tokenUsageTracker.getTokenUsage(this.messages);

    // 如果超过限制，触发Token限制事件
    if (this.tokenUsageTracker.isTokenLimitExceeded(this.messages)) {
      await this.triggerTokenLimitEvent(tokensUsed);
    }
  }

  /**
   * 更新Token使用统计
   * @param usage Token使用数据
   */
  updateTokenUsage(usage?: LLMUsage): void {
    if (!usage) {
      return;
    }

    this.tokenUsageTracker.updateApiUsage(usage);
  }

  /**
   * 累积流式响应的Token使用统计
   * @param usage Token使用数据（增量）
   */
  accumulateStreamUsage(usage: LLMUsage): void {
    this.tokenUsageTracker.accumulateStreamUsage(usage);
  }

  /**
   * 完成当前请求的Token统计
   */
  finalizeCurrentRequest(): void {
    this.tokenUsageTracker.finalizeCurrentRequest();
  }

  /**
   * 获取Token使用统计
   * @returns Token使用统计
   */
  getTokenUsage(): TokenUsageStats | null {
    return this.tokenUsageTracker.getCumulativeUsage();
  }

  /**
   * 获取当前请求的Token使用统计
   * @returns Token使用统计
   */
  getCurrentRequestUsage(): TokenUsageStats | null {
    return this.tokenUsageTracker.getCurrentRequestUsage();
  }

  /**
   * 获取Token使用历史记录
   * @returns Token使用历史记录
   */
  getUsageHistory(): TokenUsageHistory[] {
    return this.tokenUsageTracker.getUsageHistory();
  }

  /**
   * 获取最近N条消息
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessages(n: number): LLMMessage[] {
    if (n >= this.messages.length) {
      return this.getMessages();
    }

    return this.messages.slice(-n).map(msg => ({ ...msg }));
  }

  /**
   * 按角色过滤消息
   * @param role 消息角色
   * @returns 消息数组
   */
  filterMessagesByRole(role: string): LLMMessage[] {
    return this.messages
      .filter(msg => msg.role === role)
      .map(msg => ({ ...msg }));
  }

  /**
   * 获取指定类型的所有消息
   * @param role 消息角色
   * @returns 消息数组
   */
  getMessagesByRole(role: LLMMessageRole): LLMMessage[] {
    const indices = this.typeIndexManager.getIndicesByRole(role);
    return indices.map(index => ({ ...this.messages[index]! }));
  }

  /**
   * 获取指定类型的最近N条消息
   * @param role 消息角色
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessagesByRole(role: LLMMessageRole, n: number): LLMMessage[] {
    const indices = this.typeIndexManager.getRecentIndicesByRole(role, n);
    return indices.map(index => ({ ...this.messages[index]! }));
  }

  /**
   * 获取指定类型的索引范围消息
   * @param role 消息角色
   * @param start 起始位置（在类型数组中的位置）
   * @param end 结束位置（在类型数组中的位置）
   * @returns 消息数组
   */
  getMessagesByRoleRange(role: LLMMessageRole, start: number, end: number): LLMMessage[] {
    const indices = this.typeIndexManager.getRangeIndicesByRole(role, start, end);
    return indices.map(index => ({ ...this.messages[index]! }));
  }

  /**
   * 获取指定类型的消息数量
   * @param role 消息角色
   * @returns 消息数量
   */
  getMessageCountByRole(role: LLMMessageRole): number {
    return this.typeIndexManager.getCountByRole(role);
  }

  /**
   * 触发Token限制事件
   * @param tokensUsed 当前使用的Token数量
   */
  private async triggerTokenLimitEvent(tokensUsed: number): Promise<void> {
    // 1. 通过 EventManager 发送事件
    if (this.eventManager && this.workflowId && this.threadId) {
      const event: TokenLimitExceededEvent = {
        type: EventType.TOKEN_LIMIT_EXCEEDED,
        timestamp: Date.now(),
        workflowId: this.workflowId,
        threadId: this.threadId,
        tokensUsed,
        tokenLimit: this.tokenUsageTracker['tokenLimit']
      };
      await this.eventManager.emit(event);
    }

    // 2. 记录警告日志作为兜底机制
    console.warn(`Token limit exceeded: ${tokensUsed} > ${this.tokenUsageTracker['tokenLimit']}`);
  }

  /**
   * 回退到指定批次
   * @param targetBatch 目标批次号
   */
  rollbackToBatch(targetBatch: number): void {
    this.indexManager.rollbackToBatch(targetBatch);
  }

  /**
   * 获取标记映射
   * @returns 标记映射
   */
  getMarkMap(): MessageMarkMap {
    return this.indexManager.getMarkMap();
  }

  /**
   * 获取索引管理器实例（用于内部操作）
   * @returns MessageIndexManager 实例
   */
  getIndexManager(): MessageIndexManager {
    return this.indexManager;
  }

  /**
   * 获取类型索引管理器实例（用于内部操作）
   * @returns TypeIndexManager 实例
   */
  getTypeIndexManager(): TypeIndexManager {
    return this.typeIndexManager;
  }

  /**
   * 获取Token使用追踪器实例（用于内部操作）
   * @returns TokenUsageTracker 实例
   */
  getTokenUsageTracker(): TokenUsageTracker {
    return this.tokenUsageTracker;
  }

  /**
   * 设置原始索引数组
   * @param indices 索引数组
   */
  setOriginalIndices(indices: number[]): void {
    this.indexManager.setOriginalIndices(indices);
  }

  /**
   * 克隆 ConversationManager 实例
   * 创建一个包含相同消息历史和配置的新 ConversationManager 实例
   * @returns 克隆的 ConversationManager 实例
   */
  clone(): ConversationManager {
    // 创建新的 ConversationManager 实例
    const clonedManager = new ConversationManager({
      tokenLimit: this.tokenUsageTracker['tokenLimit'],
      eventManager: this.eventManager,
      workflowId: this.workflowId,
      threadId: this.threadId
    });

    // 复制所有消息历史
    clonedManager.messages = this.messages.map(msg => ({ ...msg }));

    // 复制 token 使用统计
    clonedManager.tokenUsageTracker = this.tokenUsageTracker.clone();

    // 复制索引管理器
    clonedManager.indexManager = this.indexManager.clone();
    
    // 复制类型索引管理器
    clonedManager.typeIndexManager = this.typeIndexManager.clone();

    return clonedManager;
  }

  /**
   * 创建状态快照
   * @returns 对话状态快照
   */
  createSnapshot(): ConversationState {
    return {
      messages: this.getAllMessages().map(msg => ({ ...msg })),
      tokenUsage: this.getTokenUsage(),
      currentRequestUsage: this.getCurrentRequestUsage(),
      usageHistory: this.getUsageHistory()
    };
  }

  /**
   * 从快照恢复状态
   * @param snapshot 对话状态快照
   */
  restoreFromSnapshot(snapshot: ConversationState): void {
    // 清空当前消息
    this.clearMessages(false);

    // 恢复消息历史
    this.addMessages(...snapshot.messages);
  }

  /**
   * 清理资源
   * 清空消息历史和Token统计
   */
  cleanup(): void {
    this.clearMessages(false);
  }

  /**
   * 移除指定的消息索引
   * @param indices 要移除的索引数组
   */
  removeMessageIndices(indices: number[]): void {
    // 从类型索引中移除
    this.typeIndexManager.removeIndices(indices);
  }

  /**
   * 保留指定的消息索引
   * @param indices 要保留的索引数组
   */
  keepMessageIndices(indices: number[]): void {
    // 从类型索引中保留
    this.typeIndexManager.keepIndices(indices);
  }

  /**
   * 检查是否已经存在工具描述消息
   * @returns 是否存在工具描述消息
   */
  private hasToolDescriptionMessage(): boolean {
    const allMessages = this.getAllMessages();
    return allMessages.some(msg =>
      msg.role === 'system' &&
      typeof msg.content === 'string' &&
      msg.content.startsWith('可用工具:')
    );
  }

  /**
   * 获取初始可用工具的描述消息（不包含 dynamicTools）
   * @returns 工具描述消息，如果没有初始工具则返回 null
   */
  getInitialToolDescriptionMessage(): LLMMessage | null {
    if (!this.availableTools || !this.toolService) {
      return null;
    }
    
    // 只使用 initial 工具集合
    const initialToolIds = Array.from(this.availableTools.initial);
    if (initialToolIds.length === 0) {
      return null;
    }

    // 构建工具描述
    const toolDescriptions = initialToolIds
      .map(id => {
        const tool = this.toolService.getTool(id);
        if (!tool) return null;
        return `- ${tool.name}: ${tool.description}`;
      })
      .filter(Boolean)
      .join('\n');

    if (toolDescriptions.length > 0) {
      return {
        role: 'system' as const,
        content: `可用工具:\n${toolDescriptions}`
      };
    }
    
    return null;
  }

  /**
   * 在新批次开始时添加初始工具描述（如果不存在）
   * @param boundaryIndex 批次边界索引
   */
  startNewBatchWithInitialTools(boundaryIndex: number): void {
    // 开始新批次
    this.indexManager.startNewBatch(boundaryIndex);
    
    // 检查是否已存在工具描述消息
    if (!this.hasToolDescriptionMessage()) {
      // 添加初始工具描述消息
      const toolDescMessage = this.getInitialToolDescriptionMessage();
      if (toolDescMessage) {
        this.addMessage(toolDescMessage);
      }
    }
  }
}