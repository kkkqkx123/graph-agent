/**
 * DisableTriggerCommand - 禁用触发器
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { threadRegistry, type ThreadRegistry } from '../../../../../core/services/thread-registry';
import { NotFoundError } from '../../../../../types/errors';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

/**
 * 禁用触发器参数
 */
export interface DisableTriggerParams {
  /** 线程ID */
  threadId: string;
  /** 触发器ID */
  triggerId: string;
}

/**
 * DisableTriggerCommand - 禁用触发器
 */
export class DisableTriggerCommand extends BaseCommand<void> {
  constructor(
    private readonly params: DisableTriggerParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'DisableTrigger',
      description: '禁用触发器',
      category: 'management' as const,
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

    if (!this.params.triggerId || this.params.triggerId.trim() === '') {
      errors.push('triggerId is required and cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<void>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      const triggerManager = await this.getTriggerManager(this.params.threadId);
      triggerManager.disable(this.params.triggerId);

      return success(undefined, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }

  /**
   * 获取触发器管理器
   */
  private async getTriggerManager(threadId: string) {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'thread', threadId);
    }
    return threadContext.triggerManager;
  }
}