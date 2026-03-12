/**
 * DispatchEventCommand - 分发事件
 */

import { BaseCommand, CommandValidationResult } from '../../../shared/types/command.js';
import type { APIDependencyManager } from '../../../shared/core/sdk-dependencies.js';
import type { BaseEvent } from '@modular-agent/types';
import { emit } from '../../../../core/utils/event/event-emitter.js';

/**
 * 分发事件参数
 */
export interface DispatchEventParams {
  /** 事件对象 */
  event: BaseEvent;
}

/**
 * DispatchEventCommand - 分发事件
 */
export class DispatchEventCommand extends BaseCommand<void> {
  constructor(
    private readonly params: DispatchEventParams,
    private readonly dependencies: APIDependencyManager
  ) {
    super();
  }

  /**
   * 验证命令参数
   */
  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.event) {
      errors.push('事件对象不能为空');
    } else if (!this.params.event.type) {
      errors.push('事件类型不能为空');
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
    const eventManager = this.dependencies.getEventManager();
    await emit(eventManager, this.params.event as any);
  }
}
