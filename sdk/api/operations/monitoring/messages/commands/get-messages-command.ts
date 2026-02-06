/**
 * GetMessagesCommand - 获取线程消息列表
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { threadRegistry, type ThreadRegistry } from '../../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../../types/llm';
import { NotFoundError } from '../../../../../types/errors';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

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
 * GetMessagesCommand - 获取线程消息列表
 */
export class GetMessagesCommand extends BaseCommand<LLMMessage[]> {
  constructor(
    private readonly params: GetMessagesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'GetMessages',
      description: '获取线程的消息列表',
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

    if (this.params.limit !== undefined && this.params.limit < 0) {
      errors.push('limit must be non-negative');
    }

    if (this.params.offset !== undefined && this.params.offset < 0) {
      errors.push('offset must be non-negative');
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

      return success(sortedMessages, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}