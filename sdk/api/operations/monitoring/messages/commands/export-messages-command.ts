/**
 * ExportMessagesCommand - 导出消息
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { threadRegistry, type ThreadRegistry } from '../../../../../core/services/thread-registry';
import type { LLMMessage } from '../../../../../types/llm';
import { NotFoundError } from '../../../../../types/errors';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

/**
 * 导出消息参数
 */
export interface ExportMessagesParams {
  /** 线程ID */
  threadId: string;
  /** 导出格式 */
  format: 'json' | 'csv';
}

/**
 * ExportMessagesCommand - 导出消息
 */
export class ExportMessagesCommand extends BaseCommand<string> {
  constructor(
    private readonly params: ExportMessagesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'ExportMessages',
      description: '导出线程消息为JSON或CSV格式',
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

    if (!['json', 'csv'].includes(this.params.format)) {
      errors.push('format must be either "json" or "csv"');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<string>> {
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

      if (this.params.format === 'json') {
        return success(JSON.stringify(messages, null, 2), Date.now() - startTime);
      } else if (this.params.format === 'csv') {
        // CSV格式：role,content
        const headers = 'role,content\n';
        const rows = messages.map(message => {
          const content = typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);
          // 转义CSV中的特殊字符
          const escapedContent = content.replace(/"/g, '""');
          return `${message.role},"${escapedContent}"`;
        }).join('\n');
        return success(headers + rows, Date.now() - startTime);
      } else {
        return failure(`Unsupported export format: ${this.params.format}`, Date.now() - startTime);
      }
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}