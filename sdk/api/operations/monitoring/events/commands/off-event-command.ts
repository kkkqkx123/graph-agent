/**
 * OffEventCommand - 注销事件监听器
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { eventManager, type EventManager } from '../../../../../core/services/event-manager';
import type { BaseEvent, EventType, EventListener } from '../../../../../types/events';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

/**
 * 注销事件监听器参数
 */
export interface OffEventParams {
  /** 事件类型 */
  eventType: EventType;
  /** 事件监听器 */
  listener: EventListener<BaseEvent>;
}

/**
 * OffEventCommand - 注销事件监听器
 */
export class OffEventCommand extends BaseCommand<boolean> {
  constructor(
    private readonly params: OffEventParams,
    private readonly eventManager: EventManager = eventManager
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'OffEvent',
      description: '注销事件监听器',
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

    if (!this.params.listener || typeof this.params.listener !== 'function') {
      errors.push('listener is required and must be a function');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      const result = this.eventManager.off(this.params.eventType, this.params.listener);

      return success(result, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}