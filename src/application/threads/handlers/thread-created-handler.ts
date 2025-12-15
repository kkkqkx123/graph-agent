/**
 * 线程创建事件处理器
 */

import { ThreadCreatedEventHandler } from '../events/thread-created-event';

/**
 * 线程创建事件处理器
 */
export class ThreadCreatedHandler {
  constructor(private readonly eventHandler: ThreadCreatedEventHandler) {}

  async handle(event: any): Promise<void> {
    try {
      await this.eventHandler.handle(event);
    } catch (error) {
      console.error('线程创建事件处理失败:', error);
      throw error;
    }
  }
}