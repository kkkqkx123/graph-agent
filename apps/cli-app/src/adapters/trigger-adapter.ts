/**
 * 触发器适配器
 * 封装触发器相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import type { Trigger, TriggerFilter } from '@modular-agent/types';

/**
 * 触发器适配器
 */
export class TriggerAdapter extends BaseAdapter {
  /**
   * 列出所有触发器
   */
  async listTriggers(filter?: TriggerFilter): Promise<Trigger[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.triggers;
      const result = await api.getAll(filter);
      const triggers = (result as any).data || result;
      return triggers as Trigger[];
    }, '列出触发器');
  }

  /**
   * 获取触发器详情
   */
  async getTrigger(id: string): Promise<Trigger> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.triggers;
      const result = await api.get(id);
      const trigger = (result as any).data || result;
      return trigger as Trigger;
    }, '获取触发器');
  }

  /**
   * 启用触发器
   */
  async enableTrigger(threadId: string, triggerId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.triggers;
      await api.enableTrigger(threadId, triggerId);
      this.logger.success(`触发器已启用: ${triggerId}`);
    }, '启用触发器');
  }

  /**
   * 禁用触发器
   */
  async disableTrigger(threadId: string, triggerId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.triggers;
      await api.disableTrigger(threadId, triggerId);
      this.logger.success(`触发器已禁用: ${triggerId}`);
    }, '禁用触发器');
  }

  /**
   * 按线程ID列出触发器
   */
  async listTriggersByThread(threadId: string): Promise<Trigger[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.triggers;
      const result = await api.getThreadTriggers(threadId);
      return result;
    }, '列出线程触发器');
  }
}