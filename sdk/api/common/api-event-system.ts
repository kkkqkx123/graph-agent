/**
 * API事件系统
 * 提供统一的事件发布和订阅机制
 *
 * 设计模式：
 * - Observer模式：事件订阅和发布
 * - Event Bus模式：集中式事件管理
 */

// 导入事件系统类型定义
import {
  APIEventType,
  APIEventData,
  APIEventListener
} from '../types/event-types';
import { SDKError } from '@modular-agent/types/errors';

/**
 * 事件总线类
 */
export class APIEventBus {
  private listeners: Map<APIEventType, APIEventListener[]> = new Map();

  /**
   * 订阅事件
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 取消订阅的函数
   */
  public on(eventType: APIEventType, listener: APIEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
    return () => this.off(eventType, listener);
  }

  /**
   * 订阅一次性事件
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 取消订阅的函数
   */
  public once(eventType: APIEventType, listener: APIEventListener): () => void {
    const wrappedListener: APIEventListener = async (event) => {
      await listener(event);
      this.off(eventType, wrappedListener);
    };
    return this.on(eventType, wrappedListener);
  }

  /**
   * 取消订阅事件
   * @param eventType 事件类型
   * @param listener 事件监听器
   */
  public off(eventType: APIEventType, listener: APIEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 发布事件
   * @param event 事件数据
   */
  public async emit(event: APIEventData): Promise<void> {
    const listeners = this.listeners.get(event.type);
    if (!listeners || listeners.length === 0) {
      return;
    }

    for (const listener of [...listeners]) {
      try {
        await listener(event);
      } catch (error) {
        // 抛出错误，由调用方决定如何处理
        throw new SDKError(
          'Event listener execution failed',
          {
            eventType: event.type,
            operation: 'event_listener'
          },
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * 清除所有监听器
   * @param eventType 可选的事件类型，如果不提供则清除所有
   */
  public clear(eventType?: APIEventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }
}


/**
 * 事件构建器
 * 用于创建标准化的事件数据
 */
export class APIEventBuilder {
  private event: Partial<APIEventData> = {
    timestamp: Date.now(),
    eventId: this.generateEventId()
  };

  /**
   * 设置事件类型
   */
  public type(type: APIEventType): this {
    this.event.type = type;
    return this;
  }

  /**
   * 设置资源类型
   */
  public resourceType(resourceType: string): this {
    this.event.resourceType = resourceType;
    return this;
  }

  /**
   * 设置资源ID
   */
  public resourceId(resourceId: string): this {
    this.event.resourceId = resourceId;
    return this;
  }

  /**
   * 设置操作名称
   */
  public operation(operation: string): this {
    this.event.operation = operation;
    return this;
  }

  /**
   * 设置额外数据
   */
  public data(data: Record<string, any>): this {
    this.event.data = data;
    return this;
  }

  /**
   * 设置错误
   */
  public error(error: Error): this {
    this.event.error = error;
    return this;
  }

  /**
   * 构建事件
   */
  public build(): APIEventData {
    if (!this.event.type) {
      throw new Error('Event type is required');
    }
    return this.event as APIEventData;
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 导出事件总线构造函数
 */
export const createEventBus = (): APIEventBus => new APIEventBus();