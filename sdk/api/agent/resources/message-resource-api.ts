/**
 * AgentLoopMessageResourceAPI - Agent Loop 消息资源管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 *
 * 职责：
 * - 封装 MessageHistoryManager，提供消息历史管理功能
 * - 支持消息查询、搜索、统计等功能
 */

import { GenericResourceAPI } from '../../shared/resources/generic-resource-api.js';
import type { LLMMessage, ID } from '@modular-agent/types';
import { getErrorMessage, isSuccess, getData } from '../../shared/types/execution-result.js';
import type { AgentLoopRegistry } from '../../../agent/services/agent-loop-registry.js';
import { getContainer } from '../../../core/di/index.js';
import * as Identifiers from '../../../core/di/service-identifiers.js';

/**
 * 消息过滤器
 */
export interface AgentLoopMessageFilter {
  /** Agent Loop ID */
  agentLoopId?: ID;
  /** 角色过滤 */
  role?: string;
  /** 内容关键词 */
  content?: string;
}

/**
 * 消息统计信息
 */
export interface AgentLoopMessageStats {
  /** 总数 */
  total: number;
  /** 按角色统计 */
  byRole: Record<string, number>;
  /** 按类型统计 */
  byType: Record<string, number>;
}

/**
 * AgentLoopMessageResourceAPI - Agent Loop 消息资源管理API
 */
export class AgentLoopMessageResourceAPI extends GenericResourceAPI<LLMMessage, string, AgentLoopMessageFilter> {
  private registry: AgentLoopRegistry;

  constructor() {
    super();
    const container = getContainer();
    this.registry = container.get(Identifiers.AgentLoopRegistry);
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个消息
   * @param id 消息ID（格式：agentLoopId:messageIndex）
   * @returns 消息对象，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<LLMMessage | null> {
    const [agentLoopId, indexStr] = id.split(':');
    if (!agentLoopId || !indexStr) {
      return null;
    }

    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return null;
    }

    const messages = entity.getMessages();
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index < 0 || index >= messages.length) {
      return null;
    }

    return messages[index]!;
  }

  /**
   * 获取所有消息
   * @returns 消息数组
   */
  protected async getAllResources(): Promise<LLMMessage[]> {
    const entities = this.registry.getAll();
    const allMessages: LLMMessage[] = [];

    for (const entity of entities) {
      const messages = entity.getMessages();
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
  protected applyFilter(messages: LLMMessage[], filter: AgentLoopMessageFilter): LLMMessage[] {
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
   * 获取 Agent Loop 的消息列表
   * @param agentLoopId Agent Loop ID
   * @param limit 返回数量限制
   * @param offset 偏移量
   * @param orderBy 排序方式
   * @returns 消息数组
   */
  async getAgentLoopMessages(
    agentLoopId: ID,
    limit?: number,
    offset?: number,
    orderBy: 'asc' | 'desc' = 'asc'
  ): Promise<LLMMessage[]> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return [];
    }

    let messages = entity.getMessages();

    // 应用排序
    if (orderBy === 'desc') {
      messages = [...messages].reverse();
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
   * @param agentLoopId Agent Loop ID
   * @param count 消息数量
   * @returns 消息数组
   */
  async getRecentMessages(agentLoopId: ID, count: number): Promise<LLMMessage[]> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return [];
    }

    return entity.getRecentMessages(count);
  }

  /**
   * 搜索消息
   * @param agentLoopId Agent Loop ID
   * @param query 搜索关键词
   * @returns 匹配的消息数组
   */
  async searchMessages(agentLoopId: ID, query: string): Promise<LLMMessage[]> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return [];
    }

    const messages = entity.getMessages();
    return messages.filter(message => {
      const content = typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
      return content.toLowerCase().includes(query.toLowerCase());
    });
  }

  /**
   * 获取消息统计信息
   * @param agentLoopId Agent Loop ID
   * @returns 统计信息
   */
  async getMessageStats(agentLoopId: ID): Promise<AgentLoopMessageStats> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return {
        total: 0,
        byRole: {},
        byType: {}
      };
    }

    const messages = entity.getMessages();

    const stats: AgentLoopMessageStats = {
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
   * 获取所有 Agent Loop 的消息统计
   * @returns 全局统计信息
   */
  async getGlobalMessageStats(): Promise<{
    total: number;
    byAgentLoop: Record<string, number>;
    byRole: Record<string, number>;
  }> {
    const entities = this.registry.getAll();
    const stats = {
      total: 0,
      byAgentLoop: {} as Record<string, number>,
      byRole: {} as Record<string, number>
    };

    for (const entity of entities) {
      const messages = entity.getMessages();
      const agentLoopId = entity.id;

      stats.byAgentLoop[agentLoopId] = messages.length;
      stats.total += messages.length;

      for (const message of messages) {
        stats.byRole[message.role] = (stats.byRole[message.role] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 获取消息对话历史
   * @param agentLoopId Agent Loop ID
   * @param maxMessages 最大消息数
   * @returns 对话历史数组
   */
  async getConversationHistory(agentLoopId: ID, maxMessages?: number): Promise<LLMMessage[]> {
    const messages = await this.getAgentLoopMessages(agentLoopId);

    if (maxMessages && messages.length > maxMessages) {
      return messages.slice(-maxMessages);
    }

    return messages;
  }

  /**
   * 获取消息数量
   * @param agentLoopId Agent Loop ID
   * @returns 消息数量
   */
  async getMessageCount(agentLoopId: ID): Promise<number> {
    const entity = this.registry.get(agentLoopId);
    if (!entity) {
      return 0;
    }

    return entity.getMessages().length;
  }

  /**
   * 获取底层 AgentLoopRegistry 实例
   * @returns AgentLoopRegistry 实例
   */
  getRegistry(): AgentLoopRegistry {
    return this.registry;
  }
}
