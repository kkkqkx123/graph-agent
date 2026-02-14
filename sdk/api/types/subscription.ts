/**
 * Subscription 模式核心接口
 * 定义事件订阅操作的统一接口
 */

import type { EventType, EventListener, BaseEvent } from '@modular-agent/types';

/**
 * Subscription 元数据
 */
export interface SubscriptionMetadata {
  /** 订阅名称 */
  name: string;
  /** 订阅描述 */
  description: string;
  /** 事件类型 */
  eventType: EventType;
  /** 是否需要认证 */
  requiresAuth: boolean;
  /** 版本 */
  version: string;
}

/**
 * Subscription 接口
 * 所有订阅操作都需要实现此接口
 */
export interface Subscription<T extends BaseEvent = BaseEvent> {
  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  subscribe(): () => void;
  
  /**
   * 获取订阅元数据
   * @returns 订阅元数据
   */
  getMetadata(): SubscriptionMetadata;
}

/**
 * 抽象 Subscription 基类
 * 提供通用的订阅实现
 */
export abstract class BaseSubscription<T extends BaseEvent = BaseEvent> implements Subscription<T> {
  /**
   * 订阅事件
   */
  abstract subscribe(): () => void;
  
  /**
   * 获取订阅元数据
   */
  abstract getMetadata(): SubscriptionMetadata;
}

/**
 * OnEventSubscription - 注册事件监听器
 */
export class OnEventSubscription extends BaseSubscription {
  constructor(
    private readonly eventType: EventType,
    private readonly listener: EventListener<BaseEvent>,
    private readonly eventManager: any
  ) {
    super();
  }
  
  subscribe(): () => void {
    return this.eventManager.on(this.eventType, this.listener);
  }
  
  getMetadata(): SubscriptionMetadata {
    return {
      name: 'OnEvent',
      description: '注册事件监听器',
      eventType: this.eventType,
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}

/**
 * OnceEventSubscription - 注册一次性事件监听器
 */
export class OnceEventSubscription extends BaseSubscription {
  constructor(
    private readonly eventType: EventType,
    private readonly listener: EventListener<BaseEvent>,
    private readonly eventManager: any
  ) {
    super();
  }
  
  subscribe(): () => void {
    return this.eventManager.once(this.eventType, this.listener);
  }
  
  getMetadata(): SubscriptionMetadata {
    return {
      name: 'OnceEvent',
      description: '注册一次性事件监听器',
      eventType: this.eventType,
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}

/**
 * WaitForEventSubscription - 等待特定事件触发
 */
export class WaitForEventSubscription extends BaseSubscription {
  private unsubscribe: (() => void) | null = null;
  private resolve: ((event: BaseEvent) => void) | null = null;
  private reject: ((error: Error) => void) | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly eventType: EventType,
    private readonly timeout: number | undefined,
    private readonly eventManager: any
  ) {
    super();
  }
  
  subscribe(): () => void {
    const listener = (event: BaseEvent) => {
      if (this.resolve) {
        this.resolve(event);
        this.cleanup();
      }
    };
    
    this.unsubscribe = this.eventManager.on(this.eventType, listener);
    
    if (this.timeout !== undefined && this.timeout > 0) {
      this.timeoutId = setTimeout(() => {
        if (this.reject) {
          this.reject(new Error(`Timeout waiting for event: ${this.eventType}`));
          this.cleanup();
        }
      }, this.timeout);
    }
    
    return () => this.cleanup();
  }
  
  /**
   * 等待事件
   */
  async wait(): Promise<BaseEvent> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.subscribe();
    });
  }
  
  private cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.resolve = null;
    this.reject = null;
  }
  
  getMetadata(): SubscriptionMetadata {
    return {
      name: 'WaitForEvent',
      description: '等待特定事件触发',
      eventType: this.eventType,
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}