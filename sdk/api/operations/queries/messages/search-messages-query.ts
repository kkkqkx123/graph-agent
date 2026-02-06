/**
 * SearchMessagesQuery - 搜索消息
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../types/query';
import { threadRegistry, type ThreadRegistry } from '../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../types/llm';
import { NotFoundError } from '../../../../types/errors';

/**
 * 搜索消息参数
 */
export interface SearchMessagesParams {
  /** 线程ID */
  threadId: string;
  /** 搜索关键词 */
  query: string;
}

/**
 * SearchMessagesQuery - 在线程消息中搜索关键词
 */
export class SearchMessagesQuery extends BaseQuery<LLMMessage[]> {
  constructor(
    private readonly params: SearchMessagesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'SearchMessages',
      description: '在线程消息中搜索关键词',
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

      const filteredMessages = messages.filter(message => {
        const content = typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);
        return content.toLowerCase().includes(this.params.query.toLowerCase());
      });

      return querySuccess(filteredMessages, this.getExecutionTime());
    } catch (error) {
      return queryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.getExecutionTime()
      );
    }
  }
}