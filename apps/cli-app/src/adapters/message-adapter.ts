/**
 * 消息适配器
 * 封装消息相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import type { LLMMessage } from '@modular-agent/types';

/**
 * 消息过滤器
 */
interface MessageFilter {
  /** 线程ID */
  threadId?: string;
  /** 角色过滤 */
  role?: string;
  /** 内容关键词 */
  content?: string;
  /** 时间范围开始 */
  startTimeFrom?: number;
  /** 时间范围结束 */
  startTimeTo?: number;
}

/**
 * 消息适配器
 */
export class MessageAdapter extends BaseAdapter {
  /**
   * 列出所有消息
   */
  async listMessages(filter?: MessageFilter): Promise<LLMMessage[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.messages;
      const result = await api.getAll(filter);
      const messages = (result as any).data || result;
      return messages as LLMMessage[];
    }, '列出消息');
  }

  /**
   * 获取消息详情
   */
  async getMessage(id: string): Promise<LLMMessage> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.messages;
      const result = await api.get(id);
      const message = (result as any).data || result;
      return message as LLMMessage;
    }, '获取消息');
  }

  /**
   * 按线程ID列出消息
   */
  async listMessagesByThread(threadId: string): Promise<LLMMessage[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.messages;
      const result = await api.getAll({ threadId });
      const messages = (result as any).data || result;
      return messages as LLMMessage[];
    }, '列出线程消息');
  }

  /**
   * 获取消息统计信息
   */
  async getMessageStats(threadId?: string): Promise<{
    total: number;
    byRole: Record<string, number>;
    byType: Record<string, number>;
  }> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.messages;
      if (threadId) {
        const result = await api.getMessageStats(threadId);
        return {
          total: result.total,
          byRole: result.byRole,
          byType: result.byType
        };
      } else {
        const result = await api.getGlobalMessageStats();
        return {
          total: result.total,
          byRole: result.byRole,
          byType: {}
        };
      }
    }, '获取消息统计');
  }
}