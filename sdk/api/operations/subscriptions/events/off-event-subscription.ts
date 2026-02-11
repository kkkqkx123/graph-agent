/**
 * OffEventSubscription - 取消事件监听器
 */

import { BaseSubscription, SubscriptionMetadata } from '@modular-agent/types/subscription';
import type { EventType, EventListener, BaseEvent } from '@modular-agent/types/events';
import type { APIDependencies } from '@modular-agent/sdk/core/api-dependencies';

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
    private readonly dependencies: APIDependencies
  ) {
    super();
  }

  /**
   * 取消订阅
   */
  subscribe(): () => void {
    this.dependencies.getEventManager().off(this.params.eventType, this.params.listener);
    return () => { }; // 已经取消，返回空函数
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