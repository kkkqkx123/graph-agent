/**
 * GetMessagesQuery - 获取线程消息列表
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import { threadRegistry, type ThreadRegistry } from '../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../types/llm';
import { NotFoundError } from '../../../../types/errors';

/**
 * 获取消息参数
 */
export interface GetMessagesParams {
  /** 线程ID */
  threadId: string;
  /** 返回数量限制 */
  limit?: number;
  /** 偏移量（用于分页） */
  offset?: number;
  /** 排序方式 */
  orderBy?: 'asc' | 'desc';
}

/**
 * GetMessagesQuery - 获取线程的消息列表
 */
export class GetMessagesQuery extends BaseQuery<LLMMessage[]> {
  constructor(
    private readonly params: GetMessagesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetMessages',
      description: '获取线程的消息列表',
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

      // 应用排序
      let sortedMessages = [...messages];
      if (this.params.orderBy === 'desc') {
        sortedMessages.reverse();
      }

      // 应用分页
      if (this.params.offset !== undefined || this.params.limit !== undefined) {
        const start = this.params.offset || 0;
        const end = this.params.limit !== undefined ? start + this.params.limit : undefined;
        sortedMessages = sortedMessages.slice(start, end);
      }

      return querySuccess(sortedMessages, this.getExecutionTime());
    } catch (error) {
      return queryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.getExecutionTime()
      );
    }
  }
}