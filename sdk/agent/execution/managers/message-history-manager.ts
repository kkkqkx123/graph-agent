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
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'MessageHistoryManager' });

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

  constructor(private agentLoopId: string) {
    logger.debug('MessageHistoryManager created', { agentLoopId });
  }

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
   * 分页获取消息
   * @param options 分页参数
   */
  getMessagesPaged(options: { offset?: number; limit?: number } = {}): { total: number; messages: LLMMessage[] } {
    const total = this.messages.length;
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    const messages = this.messages.slice(offset, offset + limit).map(msg => ({ ...msg }));
    return { total, messages };
  }

  /**
   * 获取最近的消息
   * @param count 消息数量
   * @returns 最近的消息数组
   */
  getRecentMessages(count: number): LLMMessage[] {
    return this.messages.slice(-count).map(msg => ({ ...msg }));
  }

  /**
   * 查找消息（基础实现）
   * @param filter 过滤器
   */
  findMessages(filter: { role?: string; contentContains?: string }): number[] {
    const results: number[] = [];
    this.messages.forEach((msg, index) => {
      let match = true;
      if (filter.role && msg.role !== filter.role) match = false;
      if (filter.contentContains && typeof msg.content === 'string' && !msg.content.includes(filter.contentContains)) match = false;
      if (match) results.push(index);
    });
    return results;
  }

  /**
   * 设置消息历史
   * @param messages 消息列表
   */
  setMessages(messages: LLMMessage[]): void {
    logger.debug('Setting message history', {
      agentLoopId: this.agentLoopId,
      messageCount: messages.length
    });
    this.messages = [...messages];
  }

  /**
   * 清空消息历史
   */
  clearMessages(): void {
    logger.info('Clearing message history', {
      agentLoopId: this.agentLoopId,
      previousMessageCount: this.messages.length
    });
    this.messages = [];
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): {
    totalMessages: number;
    roleDistribution: Record<string, number>;
    totalTokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  } {
    const distribution: Record<string, number> = {};
    const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    this.messages.forEach(msg => {
      distribution[msg.role] = (distribution[msg.role] || 0) + 1;
      const msgUsage = msg.metadata?.['usage'];
      if (msgUsage) {
        usage.promptTokens += msgUsage.promptTokens || 0;
        usage.completionTokens += msgUsage.completionTokens || 0;
        usage.totalTokens += msgUsage.totalTokens || 0;
      }
    });

    return {
      totalMessages: this.messages.length,
      roleDistribution: distribution,
      totalTokenUsage: usage
    };
  }

  /**
   * 规范化历史：处理未响应的工具调用
   * 参考 Lim-Code，确保工具调用序列完整
   */
  normalizeHistory(): void {
    const originalCount = this.messages.length;

    logger.debug('Normalizing message history', {
      agentLoopId: this.agentLoopId,
      originalMessageCount: originalCount
    });

    const respondedToolCallIds = new Set<string>();

    // 1. 收集所有已响应的 ID
    this.messages.forEach(msg => {
      if (msg.role === 'tool' && msg.toolCallId) {
        respondedToolCallIds.add(msg.toolCallId);
      }
    });

    // 2. 检查是否有未响应的 assistant 消息
    const normalizedMessages: LLMMessage[] = [];
    let addedErrorMessages = 0;
    this.messages.forEach(msg => {
      normalizedMessages.push(msg);

      if (msg.role === 'assistant' && msg.toolCalls) {
        msg.toolCalls.forEach(call => {
          if (!respondedToolCallIds.has(call.id)) {
            // 补齐一个失败/拒绝的响应
            normalizedMessages.push({
              role: 'tool',
              toolCallId: call.id,
              content: `Error: Tool call ${call.id} was not responded to before session end/reset.`,
              timestamp: Date.now(),
              metadata: { normalized: true }
            });
            respondedToolCallIds.add(call.id);
            addedErrorMessages++;
          }
        });
      }
    });

    this.messages = normalizedMessages;

    if (addedErrorMessages > 0) {
      logger.warn('Added error messages for unresponded tool calls during normalization', {
        agentLoopId: this.agentLoopId,
        addedErrorCount: addedErrorMessages,
        originalMessageCount: originalCount,
        normalizedMessageCount: this.messages.length
      });
    } else {
      logger.debug('Message history normalized without changes', {
        agentLoopId: this.agentLoopId,
        messageCount: this.messages.length
      });
    }
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
    const messageCount = this.messages.length;
    logger.debug('Cleaning up MessageHistoryManager', {
      agentLoopId: this.agentLoopId,
      messageCount
    });
    this.messages = [];
  }
}
