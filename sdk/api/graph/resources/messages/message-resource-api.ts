/**
 * MessageResourceAPI - 消息资源管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 */

import { GenericResourceAPI } from '../../../shared/resources/generic-resource-api.js';
import type { ThreadRegistry } from '../../../../graph/services/thread-registry.js';
import type { LLMMessage } from '@modular-agent/types';
import { NotFoundError, ThreadContextNotFoundError } from '@modular-agent/types';
import { getContainer } from '../../../../core/di/index.js';
import * as Identifiers from '../../../../core/di/service-identifiers.js';

/**
 * 消息过滤器
 */
export interface MessageFilter {
  /** 线程ID */
  threadId?: string;
  /** 角色过滤 */
  role?: string;
  /** 内容关键词 */
  content?: string;
  /** 时间范围开始 */
  startTimeFrom?: number;
  /** 时间范围结束 */
  startTimeTo?: number;
}

/**
 * 消息统计信息
 */
export interface MessageStats {
  /** 总数 */
  total: number;
  /** 按角色统计 */
  byRole: Record<string, number>;
  /** 按类型统计 */
  byType: Record<string, number>;
}

/**
 * MessageResourceAPI - 消息资源管理API
 */
export class MessageResourceAPI extends GenericResourceAPI<LLMMessage, string, MessageFilter> {
  private registry: ThreadRegistry;

  constructor() {
    super();
    const container = getContainer();
    this.registry = container.get(Identifiers.ThreadRegistry);
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个消息
   * @param id 消息ID
   * @returns 消息对象，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<LLMMessage | null> {
    // 消息通常通过线程实体获取，这里需要遍历所有线程
    const threadEntities = this.registry.getAll();
    for (const threadEntity of threadEntities) {
      const messages = threadEntity.messages || [];
      const message = messages.find((m: LLMMessage, index: number) => `${threadEntity.id}-${index}` === id);
      if (message) {
        return message;
      }
    }
    return null;
  }

  /**
   * 获取所有消息
   * @returns 消息数组
   */
  protected async getAllResources(): Promise<LLMMessage[]> {
    const threadEntities = this.registry.getAll();
    const allMessages: LLMMessage[] = [];
    
    for (const threadEntity of threadEntities) {
      const messages = threadEntity.messages || [];
      allMessages.push(...messages);
    }
    
    return allMessages;
  }

  /**
   * 创建消息（消息由LLM或用户创建，此方法抛出错误）
   */
  protected async createResource(resource: LLMMessage): Promise<void> {
    throw new Error('消息不能通过API直接创建，请使用LLM生成或用户输入');
  }

  /**
   * 更新消息（消息通常不可更新，此方法抛出错误）
   */
  protected async updateResource(id: string, updates: Partial<LLMMessage>): Promise<void> {
    throw new Error('消息不能通过API直接更新');
  }

  /**
   * 删除消息（消息通常不可删除，此方法抛出错误）
   */
  protected async deleteResource(id: string): Promise<void> {
    throw new Error('消息不能通过API直接删除');
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(messages: LLMMessage[], filter: MessageFilter): LLMMessage[] {
    // 由于LLMMessage没有线程ID和时间戳，只能过滤角色和内容
    return messages.filter(message => {
      if (filter.role && message.role !== filter.role) {
        return false;
      }
      if (filter.content) {
        const content = typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);
        if (!content.toLowerCase().includes(filter.content.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }

  // ============================================================================
  // 消息特定方法
  // ============================================================================

  /**
   * 获取线程消息列表
   * @param threadId 线程ID
   * @param limit 返回数量限制
   * @param offset 偏移量
   * @param orderBy 排序方式
   * @returns 消息数组
   */
  async getThreadMessages(
    threadId: string,
    limit?: number,
    offset?: number,
    orderBy: 'asc' | 'desc' = 'asc'
  ): Promise<LLMMessage[]> {
    const threadEntity = this.registry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`Thread not found: ${threadId}`, threadId);
    }

    let messages = threadEntity.messages || [];

    // 应用排序
    if (orderBy === 'desc') {
      messages.reverse();
    }

    // 应用分页
    if (offset !== undefined || limit !== undefined) {
      const start = offset || 0;
      const end = limit !== undefined ? start + limit : undefined;
      messages = messages.slice(start, end);
    }

    return messages;
  }

  /**
   * 获取最近N条消息
   * @param threadId 线程ID
   * @param count 消息数量
   * @returns 消息数组
   */
  async getRecentMessages(threadId: string, count: number): Promise<LLMMessage[]> {
    const threadEntity = this.registry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`Thread not found: ${threadId}`, threadId);
    }

    const messages = threadEntity.messages || [];
    return messages.slice(-count);
  }

  /**
   * 搜索消息
   * @param threadId 线程ID
   * @param query 搜索关键词
   * @returns 匹配的消息数组
   */
  async searchMessages(threadId: string, query: string): Promise<LLMMessage[]> {
    const threadEntity = this.registry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`Thread not found: ${threadId}`, threadId);
    }

    const messages = threadEntity.messages || [];
    return messages.filter((message: LLMMessage) => {
      const content = typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
      return content.toLowerCase().includes(query.toLowerCase());
    });
  }

  /**
   * 获取消息统计信息
   * @param threadId 线程ID
   * @returns 统计信息
   */
  async getMessageStats(threadId: string): Promise<MessageStats> {
    const threadEntity = this.registry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`Thread not found: ${threadId}`, threadId);
    }

    const messages = threadEntity.messages || [];

    const stats: MessageStats = {
      total: messages.length,
      byRole: {},
      byType: {}
    };

    for (const message of messages) {
      // 按角色统计
      stats.byRole[message.role] = (stats.byRole[message.role] || 0) + 1;

      // 按类型统计
      const type = typeof message.content === 'string' ? 'text' : 'object';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取所有线程的消息统计
   * @returns 全局统计信息
   */
  async getGlobalMessageStats(): Promise<{
    total: number;
    byThread: Record<string, number>;
    byRole: Record<string, number>;
  }> {
    const threadEntities = this.registry.getAll();
    const stats = {
      total: 0,
      byThread: {} as Record<string, number>,
      byRole: {} as Record<string, number>
    };

    for (const threadEntity of threadEntities) {
      const messages = threadEntity.messages || [];
      const threadId = threadEntity.id;
      
      stats.byThread[threadId] = messages.length;
      stats.total += messages.length;

      for (const message of messages) {
        stats.byRole[message.role] = (stats.byRole[message.role] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 获取消息对话历史
   * @param threadId 线程ID
   * @param maxMessages 最大消息数
   * @returns 对话历史数组
   */
  async getConversationHistory(threadId: string, maxMessages?: number): Promise<LLMMessage[]> {
    const messages = await this.getThreadMessages(threadId);
    
    if (maxMessages && messages.length > maxMessages) {
      return messages.slice(-maxMessages);
    }
    
    return messages;
  }

  /**
   * 获取底层ThreadRegistry实例
   * @returns ThreadRegistry实例
   */
  getRegistry(): ThreadRegistry {
    return this.registry;
  }
}
