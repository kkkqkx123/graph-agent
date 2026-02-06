/**
 * OffEventSubscription - 取消事件监听器
 */

import { BaseSubscription, SubscriptionMetadata } from '../../../core/subscription';
import { eventManager, type EventManager } from '../../../../core/services/event-manager';
import type { EventType, EventListener, BaseEvent } from '../../../../types/events';

/**
 * 取消事件监听器参数
 */
export interface OffEventParams {
  /** 事件类型 */
  eventType: EventType;
  /** 事件监听器 */
  listener: EventListener<BaseEvent>;
}

/**
 * OffEventSubscription - 取消事件监听器
 */
export class OffEventSubscription extends BaseSubscription {
  constructor(
    private readonly params: OffEventParams,
    private readonly eventManager: EventManager = eventManager
  ) {
    super();
  }

  /**
   * 取消订阅
   */
  subscribe(): () => void {
    this.eventManager.off(this.params.eventType, this.params.listener);
    return () => {}; // 已经取消，返回空函数
  }

  /**
   * 获取订阅元数据
   */
  getMetadata(): SubscriptionMetadata {
    return {
      name: 'OffEvent',
      description: '取消事件监听器',
      eventType: this.params.eventType,
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}