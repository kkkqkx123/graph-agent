/**
 * GetEventsCommand - 获取事件历史
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import type { BaseEvent } from '../../../../../types/events';
import type { EventFilter } from '../../../../types/management-types';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

/**
 * 获取事件历史参数
 */
export interface GetEventsParams {
  /** 过滤条件 */
  filter?: EventFilter;
  /** 事件历史数据 */
  eventHistory: BaseEvent[];
}

/**
 * GetEventsCommand - 获取事件历史
 */
export class GetEventsCommand extends BaseCommand<BaseEvent[]> {
  constructor(
    private readonly params: GetEventsParams
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'GetEvents',
      description: '获取事件历史记录',
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

    if (!this.params.eventHistory) {
      errors.push('eventHistory is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<BaseEvent[]>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      let events = [...this.params.eventHistory];

      // 应用过滤条件
      if (this.params.filter) {
        events = this.applyFilter(events, this.params.filter);
      }

      // 按时间倒序排序
      events = events.sort((a, b) => b.timestamp - a.timestamp);

      return success(events, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }

  /**
   * 应用过滤条件
   */
  private applyFilter(events: BaseEvent[], filter: EventFilter): BaseEvent[] {
    return events.filter(event => {
      if (filter.eventType && event.type !== filter.eventType) {
        return false;
      }
      if (filter.threadId && event.threadId !== filter.threadId) {
        return false;
      }
      if (filter.workflowId && event.workflowId !== filter.workflowId) {
        return false;
      }
      if (filter.nodeId && 'nodeId' in event && (event as any).nodeId !== filter.nodeId) {
        return false;
      }
      if (filter.startTimeFrom && event.timestamp < filter.startTimeFrom) {
        return false;
      }
      if (filter.startTimeTo && event.timestamp > filter.startTimeTo) {
        return false;
      }
      return true;
    });
  }
}