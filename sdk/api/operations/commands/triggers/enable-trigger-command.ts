/**
 * EnableTriggerCommand - 启用触发器
 */

import { BaseCommand, CommandValidationResult } from '../../../types/command';
import { NotFoundError, ThreadContextNotFoundError } from '@modular-agent/types';
import type { APIDependencies } from '../../../core/api-dependencies';

/**
 * 启用触发器参数
 */
export interface EnableTriggerParams {
  /** 线程ID */
  threadId: string;
  /** 触发器ID */
  triggerId: string;
}

/**
 * EnableTriggerCommand - 启用触发器
 */
export class EnableTriggerCommand extends BaseCommand<void> {
  constructor(
    private readonly params: EnableTriggerParams,
    private readonly dependencies: APIDependencies
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'EnableTrigger',
      description: '启用触发器',
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
      errors.push('线程ID不能为空');
    }

    if (!this.params.triggerId || this.params.triggerId.trim() === '') {
      errors.push('触发器ID不能为空');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  protected async executeInternal(): Promise<void> {
    const triggerManager = await this.getTriggerManager(this.params.threadId);
    triggerManager.enable(this.params.triggerId);
  }

  /**
   * 获取触发器管理器
   */
  private async getTriggerManager(threadId: string) {
    const threadContext = this.dependencies.getThreadRegistry().get(threadId);
    if (!threadContext) {
      throw new ThreadContextNotFoundError(`Thread not found: ${threadId}`, threadId);
    }
    return threadContext.triggerManager;
  }
}