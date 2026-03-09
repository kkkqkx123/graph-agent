/**
 * 消息历史基类
 * 提供基础的消息历史管理能力，包括批次可见性控制
 *
 * 核心职责：
 * 1. 消息的增删查操作
 * 2. 批次可见性控制（用于上下文压缩、检查点恢复）
 * 3. 提供便捷的消息构建方法
 * 4. 支持消息查询和过滤
 *
 * 设计原则：
 * - 无外部依赖：不依赖 Graph 或 Agent 特有组件
 * - 可扩展性：可被子类扩展（如 ConversationManager）
 * - 不可变性：所有返回的消息都是副本
 * - 批次可见性：支持消息的可见性控制，用于上下文压缩
 */

import type { LLMMessage, LLMToolCall, MessageRole, MessageMarkMap } from '@modular-agent/types';
import { MessageArrayUtils } from '../utils/message-array-utils.js';
import { startNewBatch, rollbackToBatch as rollbackBatch, getBatchInfo, getAllBatchesInfo } from '../utils/batch-management-utils.js';
import {
  getVisibleOriginalIndices,
  getVisibleMessages,
  getVisibleMessageCount,
  getInvisibleMessages,
  getInvisibleMessageCount,
  isMessageVisible,
  getCurrentBoundary
} from '../utils/visible-range-calculator.js';
import {
  getIndicesByRole,
  getRecentIndicesByRole,
  getRangeIndicesByRole,
  getCountByRole,
  getVisibleIndicesByRole,
  getVisibleRecentIndicesByRole,
  getVisibleRangeIndicesByRole,
  getVisibleCountByRole
} from '../utils/message-index-utils.js';

/**
 * 消息历史配置
 */
export interface MessageHistoryConfig {
  /** 初始消息列表 */
  initialMessages?: LLMMessage[];
}

/**
 * 消息历史状态（用于快照）
 */
export interface MessageHistoryState {
  /** 消息列表 */
  messages: LLMMessage[];
  /** 消息标记映射 */
  markMap: MessageMarkMap;
}

/**
 * 消息历史基类
 *
 * 提供基础的消息历史管理能力，Agent 和 Graph 都可以基于此类扩展
 * 包含批次可见性控制，支持上下文压缩和检查点恢复
 */
export class MessageHistory {
  protected messages: LLMMessage[] = [];
  protected markMap: MessageMarkMap;

  /**
   * 构造函数
   * @param config 配置选项
   */
  constructor(config: MessageHistoryConfig = {}) {
    if (config.initialMessages) {
      this.messages = MessageArrayUtils.cloneMessages(config.initialMessages);
    }

    // 初始化标记映射
    this.markMap = {
      originalIndices: this.messages.map((_, index) => index),
      batchBoundaries: [0],
      boundaryToBatch: [0],
      currentBatch: 0
    };
  }

  // ============================================================
  // 基础操作
  // ============================================================

  /**
   * 添加单个消息
   * @param message 消息对象
   * @returns 添加后的消息数组长度
   */
  addMessage(message: LLMMessage): number {
    this.messages.push({ ...message });
    const newIndex = this.messages.length - 1;

    // 同步更新标记映射
    this.markMap.originalIndices.push(newIndex);

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
   * 获取可见消息（批次边界之后的消息）
   * 这是发送给 LLM 的消息
   * @returns 可见消息数组的副本
   */
  getMessages(): LLMMessage[] {
    return getVisibleMessages(this.messages, this.markMap);
  }

  /**
   * 获取所有消息（包括不可见消息）
   * @returns 所有消息数组的副本
   */
  getAllMessages(): LLMMessage[] {
    return MessageArrayUtils.cloneMessages(this.messages);
  }

  /**
   * 获取消息数量（仅可见消息）
   * @returns 可见消息数量
   */
  getMessageCount(): number {
    return getVisibleMessageCount(this.markMap);
  }

  /**
   * 获取总消息数量（包括不可见消息）
   * @returns 总消息数量
   */
  getTotalMessageCount(): number {
    return this.messages.length;
  }

  /**
   * 清空所有消息
   */
  clear(): void {
    this.messages = [];
    this.markMap = {
      originalIndices: [],
      batchBoundaries: [0],
      boundaryToBatch: [0],
      currentBatch: 0
    };
  }

  // ============================================================
  // 批次可见性控制
  // ============================================================

  /**
   * 开始新批次
   * 用于标记一个新的对话阶段，之前的消息将被标记为不可见
   * @param boundaryIndex 边界索引（默认为当前消息数量）
   * @returns 新批次号
   */
  startNewBatch(boundaryIndex?: number): number {
    const index = boundaryIndex ?? this.messages.length;
    this.markMap = startNewBatch(this.markMap, index);
    return this.markMap.currentBatch;
  }

  /**
   * 回退到指定批次
   * 用于撤销或恢复到之前的对话状态
   * @param targetBatch 目标批次号
   */
  rollbackToBatch(targetBatch: number): void {
    this.markMap = rollbackBatch(this.markMap, targetBatch);
  }

  /**
   * 获取当前批次号
   * @returns 当前批次号
   */
  getCurrentBatch(): number {
    return this.markMap.currentBatch;
  }

  /**
   * 获取批次信息
   * @param batchId 批次号
   * @returns 批次信息
   */
  getBatchInfo(batchId: number) {
    return getBatchInfo(this.markMap, batchId);
  }

  /**
   * 获取所有批次信息
   * @returns 所有批次信息
   */
  getAllBatchesInfo() {
    return getAllBatchesInfo(this.markMap);
  }

  /**
   * 获取当前批次边界索引
   * @returns 边界索引
   */
  getCurrentBoundary(): number {
    return getCurrentBoundary(this.markMap);
  }

  /**
   * 获取标记映射
   * @returns 标记映射的副本
   */
  getMarkMap(): MessageMarkMap {
    return {
      ...this.markMap,
      originalIndices: [...this.markMap.originalIndices],
      batchBoundaries: [...this.markMap.batchBoundaries],
      boundaryToBatch: [...this.markMap.boundaryToBatch]
    };
  }

  /**
   * 设置标记映射
   * @param markMap 标记映射
   */
  setMarkMap(markMap: MessageMarkMap): void {
    this.markMap = {
      ...markMap,
      originalIndices: [...markMap.originalIndices],
      batchBoundaries: [...markMap.batchBoundaries],
      boundaryToBatch: [...markMap.boundaryToBatch]
    };
  }

  /**
   * 获取不可见消息（批次边界之前的消息）
   * @returns 不可见消息数组
   */
  getInvisibleMessages(): LLMMessage[] {
    return getInvisibleMessages(this.messages, this.markMap);
  }

  /**
   * 获取不可见消息数量
   * @returns 不可见消息数量
   */
  getInvisibleMessageCount(): number {
    return getInvisibleMessageCount(this.markMap);
  }

  /**
   * 检查消息是否可见
   * @param originalIndex 原始消息索引
   * @returns 是否可见
   */
  isMessageVisible(originalIndex: number): boolean {
    return isMessageVisible(originalIndex, this.markMap);
  }

  // ============================================================
  // 便捷方法 - 构建特定类型消息
  // ============================================================

  /**
   * 添加系统消息
   * @param content 消息内容
   * @returns 添加后的消息数组长度
   */
  addSystemMessage(content: string): number {
    return this.addMessage({ role: 'system', content });
  }

  /**
   * 添加用户消息
   * @param content 消息内容
   * @returns 添加后的消息数组长度
   */
  addUserMessage(content: string): number {
    return this.addMessage({ role: 'user', content });
  }

  /**
   * 添加助理消息
   * @param content 消息内容
   * @param toolCalls 工具调用（可选）
   * @param thinking 思考内容（可选）
   * @returns 添加后的消息数组长度
   */
  addAssistantMessage(content: string, toolCalls?: LLMToolCall[], thinking?: string): number {
    const message: LLMMessage = {
      role: 'assistant',
      content
    };

    if (toolCalls && toolCalls.length > 0) {
      message.toolCalls = toolCalls;
    }

    if (thinking) {
      message.thinking = thinking;
    }

    return this.addMessage(message);
  }

  /**
   * 添加工具结果消息
   * @param toolCallId 工具调用 ID
   * @param content 结果内容
   * @returns 添加后的消息数组长度
   */
  addToolResultMessage(toolCallId: string, content: string): number {
    return this.addMessage({
      role: 'tool',
      toolCallId,
      content
    });
  }

  // ============================================================
  // 查询方法 - 可见消息
  // ============================================================

  /**
   * 获取最近 N 条可见消息
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessages(n: number): LLMMessage[] {
    const visibleMessages = this.getMessages();
    if (n >= visibleMessages.length) {
      return visibleMessages;
    }
    return visibleMessages.slice(-n);
  }

  /**
   * 按角色过滤可见消息
   * @param roles 要保留的角色数组
   * @returns 过滤后的消息数组
   */
  filterMessagesByRole(roles: MessageRole[]): LLMMessage[] {
    const visibleMessages = this.getMessages();
    return MessageArrayUtils.filterMessagesByRole(visibleMessages, roles);
  }

  /**
   * 获取指定角色的最近 N 条可见消息
   * @param role 消息角色
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessagesByRole(role: MessageRole, n: number): LLMMessage[] {
    const indices = getVisibleRecentIndicesByRole(this.messages, this.markMap, role, n);
    return indices.map(index => ({ ...this.messages[index]! }));
  }

  /**
   * 获取指定角色的所有可见消息
   * @param role 消息角色
   * @returns 消息数组
   */
  getMessagesByRole(role: MessageRole): LLMMessage[] {
    const indices = getVisibleIndicesByRole(this.messages, this.markMap, role);
    return indices.map(index => ({ ...this.messages[index]! }));
  }

  /**
   * 获取指定角色的可见消息数量
   * @param role 消息角色
   * @returns 消息数量
   */
  getMessageCountByRole(role: MessageRole): number {
    return getVisibleCountByRole(this.messages, this.markMap, role);
  }

  /**
   * 搜索可见消息
   * @param query 搜索关键词
   * @returns 匹配的消息数组
   */
  searchMessages(query: string): LLMMessage[] {
    const visibleMessages = this.getMessages();
    return MessageArrayUtils.searchMessages(visibleMessages, query);
  }

  // ============================================================
  // 查询方法 - 所有消息（包括不可见）
  // ============================================================

  /**
   * 获取指定角色的所有消息（包括不可见）
   * @param role 消息角色
   * @returns 消息数组
   */
  getAllMessagesByRole(role: MessageRole): LLMMessage[] {
    const indices = getIndicesByRole(this.messages, role);
    return indices.map(index => ({ ...this.messages[index]! }));
  }

  /**
   * 获取指定角色的所有消息数量（包括不可见）
   * @param role 消息角色
   * @returns 消息数量
   */
  getTotalMessageCountByRole(role: MessageRole): number {
    return getCountByRole(this.messages, role);
  }

  // ============================================================
  // 操作方法
  // ============================================================

  /**
   * 截断消息数组
   * @param options 截断选项
   */
  truncateMessages(options: Parameters<typeof MessageArrayUtils.truncateMessages>[1]): void {
    this.messages = MessageArrayUtils.truncateMessages(this.messages, options);
    // 重新同步标记映射
    this.syncMarkMapFromMessages();
  }

  /**
   * 在指定位置插入消息
   * @param position 插入位置（-1 表示末尾）
   * @param newMessages 要插入的消息数组
   */
  insertMessages(position: number, newMessages: LLMMessage[]): void {
    this.messages = MessageArrayUtils.insertMessages(this.messages, position, newMessages);
    // 重新同步标记映射
    this.syncMarkMapFromMessages();
  }

  /**
   * 替换指定索引的消息
   * @param index 要替换的索引
   * @param newMessage 新消息
   */
  replaceMessage(index: number, newMessage: LLMMessage): void {
    this.messages = MessageArrayUtils.replaceMessage(this.messages, index, newMessage);
  }

  /**
   * 清空消息（可选保留系统消息）
   * @param keepSystemMessage 是否保留系统消息
   */
  clearMessages(keepSystemMessage: boolean = true): void {
    this.messages = MessageArrayUtils.clearMessages(this.messages, keepSystemMessage);
    // 重新同步标记映射
    this.syncMarkMapFromMessages();
  }

  /**
   * 去重消息数组
   * @param keyFn 用于生成唯一键的函数（可选）
   */
  deduplicateMessages(keyFn?: (msg: LLMMessage) => string): void {
    this.messages = MessageArrayUtils.deduplicateMessages(this.messages, keyFn);
    // 重新同步标记映射
    this.syncMarkMapFromMessages();
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 初始化消息列表
   * @param initialMessages 初始消息列表
   */
  initialize(initialMessages: LLMMessage[] = []): void {
    this.messages = MessageArrayUtils.cloneMessages(initialMessages);
    this.syncMarkMapFromMessages();
  }

  /**
   * 同步标记映射与消息数组
   */
  protected syncMarkMapFromMessages(): void {
    this.markMap.originalIndices = this.messages.map((_, index) => index);
  }

  /**
   * 克隆当前 MessageHistory 实例
   * @returns 克隆的 MessageHistory 实例
   */
  clone(): MessageHistory {
    const cloned = new MessageHistory();
    cloned.messages = MessageArrayUtils.cloneMessages(this.messages);
    cloned.markMap = this.getMarkMap();
    return cloned;
  }

  /**
   * 验证消息数组的有效性
   * @returns 验证结果
   */
  validate(): { valid: boolean; errors: string[] } {
    return MessageArrayUtils.validateMessageArray(this.messages);
  }

  /**
   * 创建状态快照
   * @returns 消息历史状态快照
   */
  createSnapshot(): MessageHistoryState {
    return {
      messages: this.getAllMessages(),
      markMap: this.getMarkMap()
    };
  }

  /**
   * 从快照恢复状态
   * @param snapshot 消息历史状态快照
   */
  restoreFromSnapshot(snapshot: MessageHistoryState): void {
    this.messages = MessageArrayUtils.cloneMessages(snapshot.messages);
    this.markMap = {
      ...snapshot.markMap,
      originalIndices: [...snapshot.markMap.originalIndices],
      batchBoundaries: [...snapshot.markMap.batchBoundaries],
      boundaryToBatch: [...snapshot.markMap.boundaryToBatch]
    };
  }
}
