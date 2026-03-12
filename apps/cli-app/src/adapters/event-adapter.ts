/**
 * 事件适配器
 * 封装事件相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import type { BaseEvent } from '@modular-agent/types';
import type { EventFilter } from '@modular-agent/sdk';

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
   * 分发自定义事件
   */
  async dispatchEvent(event: BaseEvent): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.events as any;
      if (typeof api.dispatch === 'function') {
        await api.dispatch(event);
        this.logger.success(`已分发事件: ${event.type}`);
      } else {
        throw new Error('SDK 当前版本不支持事件分发');
      }
    }, '分发事件');
  }

  /**
   * 裁剪事件历史
   */
  async trimEventHistory(maxSize: number): Promise<number> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.events as any;
      if (typeof api.trimEventHistory === 'function') {
        const removed = await api.trimEventHistory(maxSize);
        this.logger.success(`已裁剪事件历史，移除了 ${removed} 条旧事件`);
        return removed;
      } else {
        throw new Error('SDK 当前版本不支持裁剪事件历史');
      }
    }, '裁剪事件历史');
  }
}