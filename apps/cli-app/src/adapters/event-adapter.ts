/**
 * 事件适配器
 * 封装事件相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import type { BaseEvent, EventFilter } from '@modular-agent/types';

/**
 * 事件适配器
 */
export class EventAdapter extends BaseAdapter {
  /**
   * 列出所有事件
   */
  async listEvents(filter?: EventFilter): Promise<BaseEvent[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.events;
      const result = await api.getAll(filter);
      const events = (result as any).data || result;
      return events as BaseEvent[];
    }, '列出事件');
  }

  /**
   * 获取事件详情
   */
  async getEvent(id: string): Promise<BaseEvent> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.events;
      const result = await api.get(id);
      const event = (result as any).data || result;
      return event as BaseEvent;
    }, '获取事件');
  }

  /**
   * 获取事件统计信息
   */
  async getEventStats(filter?: EventFilter): Promise<{
    total: number;
    byType: Record<string, number>;
    byThread: Record<string, number>;
    byWorkflow: Record<string, number>;
  }> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.events;
      const result = await api.getEventStats(filter);
      return result;
    }, '获取事件统计');
  }

  /**
   * 清除事件历史
   */
  async clearEvents(filter?: EventFilter): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.events;
      await api.clear();
      this.logger.success(`已清除事件历史`);
    }, '清除事件');
  }
}