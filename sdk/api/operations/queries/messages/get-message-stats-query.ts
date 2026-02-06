/**
 * GetMessageStatsQuery - 获取消息统计
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import { threadRegistry, type ThreadRegistry } from '../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../types/llm';
import { NotFoundError } from '../../../../types/errors';

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
 * 获取消息统计参数
 */
export interface GetMessageStatsParams {
  /** 线程ID */
  threadId: string;
}

/**
 * GetMessageStatsQuery - 获取消息统计信息
 */
export class GetMessageStatsQuery extends BaseQuery<MessageStats> {
  constructor(
    private readonly params: GetMessageStatsParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetMessageStats',
      description: '获取线程的消息统计信息',
      category: 'messages',
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 执行查询
   */
  async execute() {
    try {
      const threadContext = this.threadRegistry.get(this.params.threadId);
      if (!threadContext) {
        return queryFailure(
          new NotFoundError(`Thread not found: ${this.params.threadId}`, 'Thread', this.params.threadId).message,
          this.getExecutionTime()
        );
      }

      const messages = threadContext.conversationManager.getMessages();

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

      return querySuccess(stats, this.getExecutionTime());
    } catch (error) {
      return queryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.getExecutionTime()
      );
    }
  }
}