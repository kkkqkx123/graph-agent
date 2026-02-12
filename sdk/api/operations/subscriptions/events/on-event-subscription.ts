/**
 * OnEventSubscription - 注册事件监听器
 */

import { BaseSubscription, SubscriptionMetadata } from '@modular-agent/sdk/api/types/subscription';
import type { EventType, EventListener, BaseEvent } from '@modular-agent/types/events';
import type { APIDependencies } from '../../../core/api-dependencies';

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
    private readonly dependencies: APIDependencies
  ) {
    super();
  }

  /**
   * 订阅事件
   */
  subscribe(): () => void {
    return this.dependencies.getEventManager().on(this.params.eventType, this.params.listener);
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