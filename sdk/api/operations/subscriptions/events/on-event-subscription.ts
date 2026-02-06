/**
 * OnEventSubscription - 注册事件监听器
 */

import { BaseSubscription, SubscriptionMetadata } from '../../../core/subscription';
import { eventManager, type EventManager } from '../../../../core/services/event-manager';
import type { EventType, EventListener, BaseEvent } from '../../../../types/events';

/**
 * 注册事件监听器参数
 */
export interface OnEventParams {
  /** 事件类型 */
  eventType: EventType;
  /** 事件监听器 */
  listener: EventListener<BaseEvent>;
}

/**
 * OnEventSubscription - 注册事件监听器
 */
export class OnEventSubscription extends BaseSubscription {
  constructor(
    private readonly params: OnEventParams,
    private readonly eventManager: EventManager = eventManager
  ) {
    super();
  }

  /**
   * 订阅事件
   */
  subscribe(): () => void {
    return this.eventManager.on(this.params.eventType, this.params.listener);
  }

  /**
   * 获取订阅元数据
   */
  getMetadata(): SubscriptionMetadata {
    return {
      name: 'OnEvent',
      description: '注册事件监听器',
      eventType: this.params.eventType,
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}