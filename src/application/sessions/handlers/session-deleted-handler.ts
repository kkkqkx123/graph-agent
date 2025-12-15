/**
 * 会话删除事件处理器
 */

import { SessionDeletedEventHandler } from '../events/session-deleted-event';

/**
 * 会话删除事件处理器
 */
export class SessionDeletedHandler {
  constructor(private readonly eventHandler: SessionDeletedEventHandler) {}

  async handle(event: any): Promise<void> {
    try {
      await this.eventHandler.handle(event);
    } catch (error) {
      console.error('会话删除事件处理失败:', error);
      throw error;
    }
  }
}