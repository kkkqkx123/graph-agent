/**
 * SearchMessagesCommand - 搜索消息
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { threadRegistry, type ThreadRegistry } from '../../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../../types/llm';
import { NotFoundError } from '../../../../../types/errors';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

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
 * SearchMessagesCommand - 搜索消息
 */
export class SearchMessagesCommand extends BaseCommand<LLMMessage[]> {
  constructor(
    private readonly params: SearchMessagesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'SearchMessages',
      description: '在线程消息中搜索关键词',
      category: 'monitoring' as const,
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 验证命令参数
   */
  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.threadId || this.params.threadId.trim() === '') {
      errors.push('threadId is required and cannot be empty');
    }

    if (!this.params.query || this.params.query.trim() === '') {
      errors.push('query is required and cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<LLMMessage[]>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      const threadContext = this.threadRegistry.get(this.params.threadId);
      if (!threadContext) {
        return failure(
          new NotFoundError(`Thread not found: ${this.params.threadId}`, 'Thread', this.params.threadId).message,
          Date.now() - startTime
        );
      }

      const messages = threadContext.conversationManager.getMessages();

      const filteredMessages = messages.filter(message => {
        const content = typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);
        return content.toLowerCase().includes(this.params.query.toLowerCase());
      });

      return success(filteredMessages, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}