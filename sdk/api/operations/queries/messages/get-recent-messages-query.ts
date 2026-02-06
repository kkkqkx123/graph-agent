/**
 * GetRecentMessagesQuery - 获取最近N条消息
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import { threadRegistry, type ThreadRegistry } from '../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../types/llm';
import { NotFoundError } from '../../../../types/errors';

/**
 * 获取最近消息参数
 */
export interface GetRecentMessagesParams {
  /** 线程ID */
  threadId: string;
  /** 消息数量 */
  count: number;
}

/**
 * GetRecentMessagesQuery - 获取最近N条消息
 */
export class GetRecentMessagesQuery extends BaseQuery<LLMMessage[]> {
  constructor(
    private readonly params: GetRecentMessagesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetRecentMessages',
      description: '获取线程的最近N条消息',
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

      const messages = threadContext.conversationManager.getRecentMessages(this.params.count);

      return querySuccess(messages, this.getExecutionTime());
    } catch (error) {
      return queryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.getExecutionTime()
      );
    }
  }
}