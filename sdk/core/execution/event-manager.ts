/**
 * EventManager - 事件管理器
 * 管理工作流执行过程中的事件，提供事件监听和分发机制
 * 支持全局事件和内部协调事件
 */

import type { BaseEvent, EventType, EventListener } from '../../types/events';
import type { BaseInternalEvent, InternalEventType } from '../../types/internal-events';

/**
 * 监听器包装器
 */
interface ListenerWrapper<T> {
  listener: (event: T) => void | Promise<void>;
  id: string;
  timestamp: number;
}

/**
 * EventManager - 事件管理器
 *
 * 职责：
 * - 全局事件：对外暴露，用户可监听（如 THREAD_STARTED、NODE_COMPLETED）
 * - 内部事件：模块内部协调，不对外暴露（如 FORK_REQUEST、JOIN_COMPLETED）
 *
 * 设计原则：
 * - 内部事件监听器与全局事件完全分离，提高安全性
 * - 内部事件只能通过 onInternal/emitInternal 访问
 */
export class EventManager {
  // 全局事件监听器（对外暴露）
  private globalListeners: Map<string, ListenerWrapper<any>[]> = new Map();
  private globalWildcardListeners: ListenerWrapper<any>[] = [];
  
  // 内部事件监听器（仅内部使用）
  private internalListeners: Map<string, ListenerWrapper<any>[]> = new Map();

  /**
   * 注册事件监听器（全局事件）
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 注销函数
   */
  on<T extends BaseEvent>(eventType: EventType, listener: EventListener<T>): () => void {
    return this.registerGlobalListener(eventType, listener);
  }

  /**
   * 注册事件监听器（内部协调事件）
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onInternal<T extends BaseInternalEvent>(eventType: InternalEventType, listener: (event: T) => void | Promise<void>): () => void {
    return this.registerInternalListener(eventType, listener);
  }

  /**
   * 注册全局事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 注销函数
   */
  private registerGlobalListener<T>(eventType: string, listener: (event: T) => void | Promise<void>): () => void {
    // 验证参数
    if (!eventType) {
      throw new Error('EventType is required');
    }
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    // 创建监听器包装器
    const wrapper: ListenerWrapper<T> = {
      listener,
      id: `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    // 添加到全局监听器列表
    if (!this.globalListeners.has(eventType)) {
      this.globalListeners.set(eventType, []);
    }
    this.globalListeners.get(eventType)!.push(wrapper);

    // 返回注销函数
    return () => this.unregisterGlobalListener(eventType, listener);
  }

  /**
   * 注册内部事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 注销函数
   */
  private registerInternalListener<T>(eventType: string, listener: (event: T) => void | Promise<void>): () => void {
    // 验证参数
    if (!eventType) {
      throw new Error('EventType is required');
    }
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    // 创建监听器包装器
    const wrapper: ListenerWrapper<T> = {
      listener,
      id: `internal-listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    // 添加到内部监听器列表
    if (!this.internalListeners.has(eventType)) {
      this.internalListeners.set(eventType, []);
    }
    this.internalListeners.get(eventType)!.push(wrapper);

    // 返回注销函数
    return () => this.unregisterInternalListener(eventType, listener);
  }

  /**
   * 注销事件监听器（全局事件）
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 是否成功注销
   */
  off<T extends BaseEvent>(eventType: EventType, listener: EventListener<T>): boolean {
    return this.unregisterGlobalListener(eventType, listener);
  }

  /**
   * 注销事件监听器（内部协调事件）
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 是否成功注销
   */
  offInternal<T extends BaseInternalEvent>(eventType: InternalEventType, listener: (event: T) => void | Promise<void>): boolean {
    return this.unregisterInternalListener(eventType, listener);
  }

  /**
   * 注销全局事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 是否成功注销
   */
  private unregisterGlobalListener<T>(eventType: string, listener: (event: T) => void | Promise<void>): boolean {
    // 验证参数
    if (!eventType) {
      throw new Error('EventType is required');
    }
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    // 获取监听器数组
    const wrappers = this.globalListeners.get(eventType);
    if (!wrappers) {
      return false;
    }

    // 查找并移除监听器
    const index = wrappers.findIndex(w => w.listener === listener);
    if (index === -1) {
      return false;
    }

    wrappers.splice(index, 1);

    // 如果数组为空，删除映射
    if (wrappers.length === 0) {
      this.globalListeners.delete(eventType);
    }

    return true;
  }

  /**
   * 注销内部事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 是否成功注销
   */
  private unregisterInternalListener<T>(eventType: string, listener: (event: T) => void | Promise<void>): boolean {
    // 验证参数
    if (!eventType) {
      throw new Error('EventType is required');
    }
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    // 获取监听器数组
    const wrappers = this.internalListeners.get(eventType);
    if (!wrappers) {
      return false;
    }

    // 查找并移除监听器
    const index = wrappers.findIndex(w => w.listener === listener);
    if (index === -1) {
      return false;
    }

    wrappers.splice(index, 1);

    // 如果数组为空，删除映射
    if (wrappers.length === 0) {
      this.internalListeners.delete(eventType);
    }

    return true;
  }

  /**
   * 触发事件（全局事件）
   * @param event 事件对象
   * @returns Promise，等待所有监听器完成
   */
  async emit<T extends BaseEvent>(event: T): Promise<void> {
    return this.dispatchEvent(event, true);
  }

  /**
   * 触发事件（内部协调事件）
   * @param event 事件对象
   * @returns Promise，等待所有监听器完成
   */
  async emitInternal<T extends BaseInternalEvent>(event: T): Promise<void> {
    return this.dispatchEvent(event, false);
  }

  /**
   * 内部触发事件
   * @param event 事件对象
   * @param isGlobal 是否为全局事件
   * @returns Promise，等待所有监听器完成
   */
  private async dispatchEvent<T extends { type: string }>(event: T, isGlobal: boolean): Promise<void> {
    // 验证事件
    if (!event) {
      throw new Error('Event is required');
    }
    if (!event.type) {
      throw new Error('Event type is required');
    }

    // 根据事件类型选择监听器列表
    const listeners = isGlobal ? this.globalListeners : this.internalListeners;
    const wrappers = listeners.get(event.type) || [];
    const allWrappers = isGlobal ? [...wrappers, ...this.globalWildcardListeners] : wrappers;

    // 执行监听器
    const promises = allWrappers.map(async (wrapper) => {
      try {
        await wrapper.listener(event);
      } catch (error) {
        // 记录错误，不影响其他监听器
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    });

    // 等待所有监听器完成
    await Promise.all(promises);
  }

  /**
   * 注册一次性事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 注销函数
   */
  once<T extends BaseEvent>(eventType: EventType, listener: EventListener<T>): () => void {
    // 验证参数
    if (!eventType) {
      throw new Error('EventType is required');
    }
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    // 创建包装监听器
    const wrapper: EventListener<T> = async (event: T) => {
      await listener(event);
      // 自动注销
      this.off(eventType, wrapper);
    };

    // 注册包装监听器
    return this.on(eventType, wrapper);
  }

  /**
   * 清空事件监听器
   * @param eventType 事件类型（可选），如果不提供则清空所有监听器
   */
  clear(eventType?: EventType): void {
    if (eventType) {
      this.globalListeners.delete(eventType);
    } else {
      this.globalListeners.clear();
      this.globalWildcardListeners = [];
    }
  }

  /**
   * 等待特定事件触发
   * @param eventType 事件类型
   * @param timeout 超时时间（毫秒）
   * @returns Promise，解析为事件对象
   */
  waitFor<T extends BaseEvent>(eventType: EventType, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      // 创建一次性监听器
      const unregister = this.once(eventType, (event: T) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(event);
      });

      // 设置超时
      if (timeout) {
        timeoutId = setTimeout(() => {
          unregister();
          reject(new Error(`Timeout waiting for event ${eventType}`));
        }, timeout);
      }
    });
  }

  /**
   * 获取监听器数量（仅全局事件）
   * @param eventType 事件类型（可选）
   * @returns 监听器数量
   */
  getListenerCount(eventType?: EventType): number {
    if (eventType) {
      return this.globalListeners.get(eventType)?.length || 0;
    }
    let count = 0;
    for (const wrappers of this.globalListeners.values()) {
      count += wrappers.length;
    }
    count += this.globalWildcardListeners.length;
    return count;
  }

  /**
   * 获取内部监听器数量（仅用于调试）
   * @param eventType 事件类型（可选）
   * @returns 监听器数量
   */
  getInternalListenerCount(eventType?: InternalEventType): number {
    if (eventType) {
      return this.internalListeners.get(eventType)?.length || 0;
    }
    let count = 0;
    for (const wrappers of this.internalListeners.values()) {
      count += wrappers.length;
    }
    return count;
  }
}