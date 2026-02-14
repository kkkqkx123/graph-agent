/**
 * OnceEventSubscription - 注册一次性事件监听器
 */

import { BaseSubscription, SubscriptionMetadata } from '../../../types/subscription';
import type { EventType, EventListener, BaseEvent } from '@modular-agent/types';
import type { APIDependencyManager } from '../../../core/sdk-dependencies';

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
    private readonly dependencies: APIDependencyManager
  ) {
    super();
  }

  /**
   * 订阅事件
   */
  subscribe(): () => void {
    return this.dependencies.getEventManager().once(this.params.eventType, this.params.listener);
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