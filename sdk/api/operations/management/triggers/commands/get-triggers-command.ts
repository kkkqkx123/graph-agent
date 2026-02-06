/**
 * GetTriggersCommand - 获取所有触发器
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { threadRegistry, type ThreadRegistry } from '../../../../../core/services/thread-registry';
import type { Trigger } from '../../../../../types/trigger';
import { NotFoundError } from '../../../../../types/errors';
import type { TriggerFilter } from '../../../../types/management-types';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

/**
 * 获取触发器参数
 */
export interface GetTriggersParams {
  /** 线程ID */
  threadId: string;
  /** 过滤条件 */
  filter?: TriggerFilter;
}

/**
 * GetTriggersCommand - 获取所有触发器
 */
export class GetTriggersCommand extends BaseCommand<Trigger[]> {
  constructor(
    private readonly params: GetTriggersParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'GetTriggers',
      description: '获取线程的所有触发器',
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

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<Trigger[]>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      const triggerManager = await this.getTriggerManager(this.params.threadId);
      let triggers = triggerManager.getAll();

      // 应用过滤条件
      if (this.params.filter) {
        triggers = triggers.filter(t => this.applyFilter(t, this.params.filter!));
      }

      return success(triggers, Date.now() - startTime);
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

  /**
   * 应用过滤条件
   */
  private applyFilter(trigger: Trigger, filter: TriggerFilter): boolean {
    if (filter.triggerId && trigger.id !== filter.triggerId) {
      return false;
    }
    if (filter.name && !trigger.name.toLowerCase().includes(filter.name.toLowerCase())) {
      return false;
    }
    if (filter.status && trigger.status !== filter.status) {
      return false;
    }
    if (filter.workflowId && trigger.workflowId !== filter.workflowId) {
      return false;
    }
    if (filter.threadId && trigger.threadId !== filter.threadId) {
      return false;
    }
    return true;
  }
}