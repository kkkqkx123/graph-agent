/**
 * EventResourceAPI - 事件资源管理API
 * 继承GenericResourceAPI，提供统一的CRUD操作
 */

import { GenericResourceAPI } from '../generic-resource-api';
import type { BaseEvent, EventFilter } from '@modular-agent/types';

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
 * EventResourceAPI - 事件资源管理API
 */
export class EventResourceAPI extends GenericResourceAPI<BaseEvent, string, EventFilter> {
  private eventHistory: BaseEvent[] = [];

  constructor() {
    super();
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个事件
   * @param id 事件ID
   * @returns 事件对象，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<BaseEvent | null> {
    return this.eventHistory.find(event => `${event.type}-${event.threadId}-${event.timestamp}` === id) || null;
  }

  /**
   * 获取所有事件
   * @returns 事件数组
   */
  protected async getAllResources(): Promise<BaseEvent[]> {
    return [...this.eventHistory];
  }

  /**
   * 创建事件（事件由系统生成，此方法抛出错误）
   */
  protected async createResource(resource: BaseEvent): Promise<void> {
    throw new Error('事件不能通过API直接创建，由系统自动生成');
  }

  /**
   * 更新事件（事件不可更新，此方法抛出错误）
   */
  protected async updateResource(id: string, updates: Partial<BaseEvent>): Promise<void> {
    throw new Error('事件不能通过API直接更新');
  }

  /**
   * 删除事件（事件不可删除，此方法抛出错误）
   */
  protected async deleteResource(id: string): Promise<void> {
    throw new Error('事件不能通过API直接删除');
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(events: BaseEvent[], filter: EventFilter): BaseEvent[] {
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
      if (filter.timestampRange?.start && event.timestamp < filter.timestampRange.start) {
        return false;
      }
      if (filter.timestampRange?.end && event.timestamp > filter.timestampRange.end) {
        return false;
      }
      return true;
    });
  }

  // ============================================================================
  // 事件特定方法
  // ============================================================================

  /**
   * 设置事件历史数据
   * @param events 事件数组
   */
  setEventHistory(events: BaseEvent[]): void {
    this.eventHistory = [...events];
  }

  /**
   * 添加事件到历史
   * @param event 事件对象
   */
  addEvent(event: BaseEvent): void {
    this.eventHistory.push(event);
  }

  /**
   * 获取事件列表
   * @param filter 过滤条件
   * @returns 事件数组
   */
  async getEvents(filter?: EventFilter): Promise<BaseEvent[]> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    return events;
  }

  /**
   * 获取事件统计信息
   * @param filter 过滤条件
   * @returns 统计信息
   */
  async getEventStats(filter?: EventFilter): Promise<EventStats> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
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

    return stats;
  }

  /**
   * 获取最近事件
   * @param count 事件数量
   * @param filter 过滤条件
   * @returns 最近事件数组
   */
  async getRecentEvents(count: number, filter?: EventFilter): Promise<BaseEvent[]> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    // 按时间戳降序排序，返回最近的count个事件
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * 搜索事件
   * @param query 搜索关键词
   * @param filter 过滤条件
   * @returns 匹配的事件数组
   */
  async searchEvents(query: string, filter?: EventFilter): Promise<BaseEvent[]> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    return events.filter(event => {
      // 搜索事件类型、线程ID、工作流ID等
      const searchableFields = [
        event.type,
        event.threadId,
        event.workflowId,
        `${event.type}-${event.threadId}-${event.timestamp}`
      ];

      if ('nodeId' in event) {
        searchableFields.push((event as any).nodeId);
      }

      return searchableFields.some(field => 
        field.toLowerCase().includes(query.toLowerCase())
      );
    });
  }

  /**
   * 获取事件时间线
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @returns 时间线事件数组
   */
  async getEventTimeline(threadId?: string, workflowId?: string): Promise<BaseEvent[]> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (threadId) {
      events = events.filter(event => event.threadId === threadId);
    }
    if (workflowId) {
      events = events.filter(event => event.workflowId === workflowId);
    }

    // 按时间戳升序排序，形成时间线
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取事件类型统计
   * @returns 事件类型统计
   */
  async getEventTypeStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const event of this.eventHistory) {
      stats[event.type] = (stats[event.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取线程事件统计
   * @returns 线程事件统计
   */
  async getThreadEventStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const event of this.eventHistory) {
      stats[event.threadId] = (stats[event.threadId] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取工作流事件统计
   * @returns 工作流事件统计
   */
  async getWorkflowEventStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const event of this.eventHistory) {
      stats[event.workflowId] = (stats[event.workflowId] || 0) + 1;
    }

    return stats;
  }

  /**
   * 清空事件历史
   */
  async clearEventHistory(): Promise<void> {
    this.eventHistory = [];
  }

  /**
   * 导出事件历史
   * @param filter 过滤条件
   * @returns JSON字符串
   */
  async exportEventHistory(filter?: EventFilter): Promise<string> {
    const events = await this.getEvents(filter);
    return JSON.stringify(events, null, 2);
  }

  /**
   * 导入事件历史
   * @param json JSON字符串
   */
  async importEventHistory(json: string): Promise<void> {
    try {
      const events = JSON.parse(json) as BaseEvent[];
      if (!Array.isArray(events)) {
        throw new Error('Invalid event history format: expected array');
      }
      this.eventHistory = events;
    } catch (error) {
      throw new Error(`Failed to import event history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取事件历史大小
   * @returns 事件数量
   */
  async getEventHistorySize(): Promise<number> {
    return this.eventHistory.length;
  }

  /**
   * 获取事件时间范围
   * @returns 时间范围
   */
  async getEventTimeRange(): Promise<{ start: number; end: number } | null> {
    if (this.eventHistory.length === 0) {
      return null;
    }

    const timestamps = this.eventHistory.map(event => event.timestamp);
    return {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps)
    };
  }
}