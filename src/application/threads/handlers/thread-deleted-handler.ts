/**
 * 线程删除事件处理器
 */

import { ThreadDeletedEventHandler } from '../events/thread-deleted-event';

/**
 * 线程删除事件处理器
 */
export class ThreadDeletedHandler {
  constructor(private readonly eventHandler: ThreadDeletedEventHandler) {}

  async handle(event: any): Promise<void> {
    try {
      await this.eventHandler.handle(event);
    } catch (error) {
      console.error('线程删除事件处理失败:', error);
      throw error;
    }
  }
}