/**
 * GetRecentMessagesCommand - 获取最近N条消息
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { threadRegistry, type ThreadRegistry } from '../../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../../types/llm';
import { NotFoundError } from '../../../../../types/errors';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

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
 * GetRecentMessagesCommand - 获取最近N条消息
 */
export class GetRecentMessagesCommand extends BaseCommand<LLMMessage[]> {
  constructor(
    private readonly params: GetRecentMessagesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'GetRecentMessages',
      description: '获取线程的最近N条消息',
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

    if (this.params.count <= 0) {
      errors.push('count must be greater than 0');
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

      const messages = threadContext.conversationManager.getRecentMessages(this.params.count);

      return success(messages, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}