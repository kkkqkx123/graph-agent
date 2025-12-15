/**
 * 会话创建事件处理器
 */

import { SessionCreatedEventHandler } from '../events/session-created-event';

/**
 * 会话创建事件处理器
 */
export class SessionCreatedHandler {
  constructor(private readonly eventHandler: SessionCreatedEventHandler) {}

  async handle(event: any): Promise<void> {
    try {
      await this.eventHandler.handle(event);
    } catch (error) {
      console.error('会话创建事件处理失败:', error);
      throw error;
    }
  }
}