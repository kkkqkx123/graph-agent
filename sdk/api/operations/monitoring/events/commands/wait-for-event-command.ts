/**
 * WaitForEventCommand - 等待特定事件触发
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { eventManager, type EventManager } from '../../../../../core/services/event-manager';
import type { BaseEvent, EventType } from '../../../../../types/events';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

/**
 * 等待事件参数
 */
export interface WaitForEventParams {
  /** 事件类型 */
  eventType: EventType;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * WaitForEventCommand - 等待特定事件触发
 */
export class WaitForEventCommand extends BaseCommand<BaseEvent> {
  constructor(
    private readonly params: WaitForEventParams,
    private readonly eventManager: EventManager = eventManager
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'WaitForEvent',
      description: '等待特定事件触发',
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

    if (!this.params.eventType) {
      errors.push('eventType is required');
    }

    if (this.params.timeout !== undefined && this.params.timeout < 0) {
      errors.push('timeout must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<BaseEvent>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      const event = await this.eventManager.waitFor(this.params.eventType, this.params.timeout);

      return success(event, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}