/**
 * GetMessageStatsCommand - 获取消息统计信息
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { threadRegistry, type ThreadRegistry } from '../../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../../types/llm';
import { NotFoundError } from '../../../../../types/errors';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

/**
 * 消息统计信息
 */
export interface MessageStats {
  /** 总消息数 */
  totalMessages: number;
  /** 用户消息数 */
  userMessages: number;
  /** 助手消息数 */
  assistantMessages: number;
  /** 系统消息数 */
  systemMessages: number;
  /** 工具消息数 */
  toolMessages: number;
}

/**
 * 获取消息统计参数
 */
export interface GetMessageStatsParams {
  /** 线程ID */
  threadId: string;
}

/**
 * GetMessageStatsCommand - 获取消息统计信息
 */
export class GetMessageStatsCommand extends BaseCommand<MessageStats> {
  constructor(
    private readonly params: GetMessageStatsParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'GetMessageStats',
      description: '获取线程的消息统计信息',
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

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<MessageStats>> {
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

      const stats: MessageStats = {
        totalMessages: messages.length,
        userMessages: 0,
        assistantMessages: 0,
        systemMessages: 0,
        toolMessages: 0
      };

      for (const message of messages) {
        switch (message.role) {
          case 'user':
            stats.userMessages++;
            break;
          case 'assistant':
            stats.assistantMessages++;
            break;
          case 'system':
            stats.systemMessages++;
            break;
          case 'tool':
            stats.toolMessages++;
            break;
        }
      }

      return success(stats, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}