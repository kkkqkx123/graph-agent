/**
 * GetEventStatsQuery - 获取事件统计
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import type { BaseEvent } from '../../../../types/events';
import type { EventFilter } from '../../../types/management-types';

/**
 * 事件统计信息
 */
export interface EventStats {
  /** 总数 */
  total: number;
  /** 按类型统计 */
  byType: Record<string, number>;
  /** 按线程统计 */
  byThread: Record<string, number>;
  /** 按工作流统计 */
  byWorkflow: Record<string, number>;
}

/**
 * 获取事件统计参数
 */
export interface GetEventStatsParams {
  /** 过滤条件 */
  filter?: EventFilter;
  /** 事件历史数据 */
  eventHistory: BaseEvent[];
}

/**
 * GetEventStatsQuery - 获取事件统计信息
 */
export class GetEventStatsQuery extends BaseQuery<EventStats> {
  constructor(
    private readonly params: GetEventStatsParams
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetEventStats',
      description: '获取事件统计信息',
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

      const stats: EventStats = {
        total: events.length,
        byType: {},
        byThread: {},
        byWorkflow: {}
      };

      for (const event of events) {
        // 按类型统计
        stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

        // 按线程统计
        stats.byThread[event.threadId] = (stats.byThread[event.threadId] || 0) + 1;

        // 按工作流统计
        stats.byWorkflow[event.workflowId] = (stats.byWorkflow[event.workflowId] || 0) + 1;
      }

      return querySuccess(stats, this.getExecutionTime());
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