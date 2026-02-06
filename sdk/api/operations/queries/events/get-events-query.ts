/**
 * GetEventsQuery - 获取事件列表
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import type { BaseEvent } from '../../../../types/events';
import type { EventFilter } from '../../../types/management-types';

/**
 * 获取事件参数
 */
export interface GetEventsParams {
  /** 过滤条件 */
  filter?: EventFilter;
  /** 事件历史数据 */
  eventHistory: BaseEvent[];
}

/**
 * GetEventsQuery - 获取事件列表
 */
export class GetEventsQuery extends BaseQuery<BaseEvent[]> {
  constructor(
    private readonly params: GetEventsParams
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetEvents',
      description: '获取事件列表',
      category: 'events',
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 执行查询
   */
  async execute() {
    try {
      let events = this.params.eventHistory;

      // 应用过滤条件
      if (this.params.filter) {
        events = this.applyFilter(events, this.params.filter);
      }

      return querySuccess(events, this.getExecutionTime());
    } catch (error) {
      return queryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.getExecutionTime()
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