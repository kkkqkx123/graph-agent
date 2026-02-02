/**
 * EventWaiter - 事件等待器
 * 
 * 职责：
 * - 封装事件等待逻辑
 * - 提供超时控制
 * - 简化事件等待的调用方式
 * 
 * 设计原则：
 * - 无状态设计
 * - 依赖注入EventManager
 * - 提供简洁的等待接口
 */

import type { EventManager } from '../../services/event-manager';
import { EventType } from '../../../types/events';

/**
 * EventWaiter - 事件等待器
 */
export class EventWaiter {
  constructor(private eventManager: EventManager) { }

  /**
   * 等待Thread暂停事件
   * 
   * @param threadId Thread ID
   * @param timeout 超时时间（毫秒），默认5000ms
   * @returns Promise，超时或事件触发时解析
   */
  async waitForThreadPaused(threadId: string, timeout: number = 5000): Promise<void> {
    await this.eventManager.waitFor(EventType.THREAD_PAUSED, timeout);
  }

  /**
   * 等待Thread取消事件
   * 
   * @param threadId Thread ID
   * @param timeout 超时时间（毫秒），默认5000ms
   * @returns Promise，超时或事件触发时解析
   */
  async waitForThreadCancelled(threadId: string, timeout: number = 5000): Promise<void> {
    await this.eventManager.waitFor(EventType.THREAD_CANCELLED, timeout);
  }

  /**
   * 等待Thread完成事件
   * 
   * @param threadId Thread ID
   * @param timeout 超时时间（毫秒），默认30000ms
   * @returns Promise，超时或事件触发时解析
   */
  async waitForThreadCompleted(threadId: string, timeout: number = 30000): Promise<void> {
    await this.eventManager.waitFor(EventType.THREAD_COMPLETED, timeout);
  }

  /**
   * 等待Thread失败事件
   * 
   * @param threadId Thread ID
   * @param timeout 超时时间（毫秒），默认30000ms
   * @returns Promise，超时或事件触发时解析
   */
  async waitForThreadFailed(threadId: string, timeout: number = 30000): Promise<void> {
    await this.eventManager.waitFor(EventType.THREAD_FAILED, timeout);
  }

  /**
   * 等待Thread恢复事件
   * 
   * @param threadId Thread ID
   * @param timeout 超时时间（毫秒），默认5000ms
   * @returns Promise，超时或事件触发时解析
   */
  async waitForThreadResumed(threadId: string, timeout: number = 5000): Promise<void> {
    await this.eventManager.waitFor(EventType.THREAD_RESUMED, timeout);
  }

  /**
   * 等待任意Thread生命周期事件
   * 
   * @param threadId Thread ID
   * @param timeout 超时时间（毫秒），默认5000ms
   * @returns Promise，超时或任意生命周期事件触发时解析
   */
  async waitForAnyLifecycleEvent(threadId: string, timeout: number = 5000): Promise<void> {
    // 使用Promise.race等待任意一个生命周期事件
    const events = [
      EventType.THREAD_PAUSED,
      EventType.THREAD_CANCELLED,
      EventType.THREAD_COMPLETED,
      EventType.THREAD_FAILED,
      EventType.THREAD_RESUMED
    ];

    // 创建多个等待Promise
    const promises = events.map(eventType =>
      this.eventManager.waitFor(eventType, timeout)
    );

    // 等待任意一个事件触发
    await Promise.race(promises);
  }
}