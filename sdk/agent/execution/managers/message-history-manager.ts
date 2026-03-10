/**
 * MessageHistoryManager - 消息历史管理器
 * 管理 Agent Loop 的消息历史
 *
 * 核心职责：
 * 1. 管理 Agent Loop 的消息历史
 * 2. 提供消息历史的查询和清理功能
 * 3. 支持状态快照和恢复（用于检查点）
 *
 * 设计原则：
 * - 实例隔离：每个 AgentLoopEntity 独立持有自己的消息管理器实例
 * - 实现 LifecycleCapable 接口，支持快照和恢复
 */

import type { LLMMessage } from '@modular-agent/types';
import type { LifecycleCapable } from '../../../core/managers/lifecycle-capable.js';

/**
 * 消息历史状态接口
 */
export interface MessageHistoryState {
  messages: LLMMessage[];
}

/**
 * MessageHistoryManager - 消息历史管理器类
 */
export class MessageHistoryManager implements LifecycleCapable<MessageHistoryState> {
  private messages: LLMMessage[] = [];

  constructor(private agentLoopId: string) { }

  /**
   * 获取 Agent Loop ID
   * @returns Agent Loop ID
   */
  getAgentLoopId(): string {
    return this.agentLoopId;
  }

  /**
   * 添加消息
   * @param message LLM 消息
   */
  addMessage(message: LLMMessage): void {
    this.messages.push(message);
  }

  /**
   * 获取所有消息
   * @returns 消息数组的副本
   */
  getMessages(): LLMMessage[] {
    return [...this.messages];
  }

  /**
   * 获取最近的消息
   * @param count 消息数量
   * @returns 最近的消息数组
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

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): {
    totalMessages: number;
  } {
    return {
      totalMessages: this.messages.length,
    };
  }

  /**
   * 创建状态快照
   * @returns 消息历史状态快照
   */
  createSnapshot(): MessageHistoryState {
    return {
      messages: this.messages.map(msg => ({ ...msg })),
    };
  }

  /**
   * 从快照恢复状态
   * @param snapshot 消息历史状态快照
   */
  restoreFromSnapshot(snapshot: MessageHistoryState): void {
    this.messages = snapshot.messages.map(msg => ({ ...msg }));
  }

  /**
   * 清理资源
   * 清空消息历史
   */
  cleanup(): void {
    this.messages = [];
  }
}
