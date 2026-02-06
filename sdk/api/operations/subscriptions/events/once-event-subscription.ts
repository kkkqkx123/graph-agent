/**
 * OnceEventSubscription - 注册一次性事件监听器
 */

import { BaseSubscription, SubscriptionMetadata } from '../../../core/subscription';
import { eventManager, type EventManager } from '../../../../core/services/event-manager';
import type { EventType, EventListener, BaseEvent } from '../../../../types/events';

/**
 * 注册一次性事件监听器参数
 */
export interface OnceEventParams {
  /** 事件类型 */
  eventType: EventType;
  /** 事件监听器 */
  listener: EventListener<BaseEvent>;
}

/**
 * OnceEventSubscription - 注册一次性事件监听器
 */
export class OnceEventSubscription extends BaseSubscription {
  constructor(
    private readonly params: OnceEventParams,
    private readonly eventManager: EventManager = eventManager
  ) {
    super();
  }

  /**
   * 订阅事件
   */
  subscribe(): () => void {
    return this.eventManager.once(this.params.eventType, this.params.listener);
  }

  /**
   * 获取订阅元数据
   */
  getMetadata(): SubscriptionMetadata {
    return {
      name: 'OnceEvent',
      description: '注册一次性事件监听器',
      eventType: this.params.eventType,
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}