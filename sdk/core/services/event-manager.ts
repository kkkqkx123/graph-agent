/**
 * EventManager - 事件管理器
 * 管理工作流执行过程中的事件，提供事件监听和分发机制
 * 仅支持全局事件，用于对外暴露工作流执行状态
 *
 * 注意：内部事件机制已移除，改用直接方法调用
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 SingletonRegistry 统一管理
 */

import type { BaseEvent, EventType, EventListener } from '@modular-agent/types';
import { ValidationError, ExecutionError, RuntimeValidationError } from '@modular-agent/types';
import { now, generateId, getErrorOrNew } from '@modular-agent/common-utils';

/**
 * 监听器包装器
 */
interface ListenerWrapper<T> {
  listener: (event: T) => void | Promise<void>;
  id: string;
  timestamp: number;
  priority: number;
  filter?: (event: T) => boolean;
  timeout?: number;
}

/**
 * EventManager - 事件管理器
 *
 * 职责：
 * - 全局事件：对外暴露，用户可监听（如 NODE_COMPLETED）
 * - 提供事件注册、注销、触发等核心功能
 *
 * 设计原则：
 * - 仅支持全局事件，用于工作流状态通知
 * - 内部协调改用直接方法调用
 */
class EventManager {
  // 全局事件监听器（对外暴露）
  private globalListeners: Map<string, ListenerWrapper<any>[]> = new Map();
  private globalWildcardListeners: ListenerWrapper<any>[] = [];

  /**
   * 注册事件监听器（全局事件）
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @param options 选项（优先级、过滤器、超时等）
   * @returns 注销函数
   */
  on<T extends BaseEvent>(
    eventType: EventType,
    listener: EventListener<T>,
    options?: {
      priority?: number;
      filter?: (event: T) => boolean;
      timeout?: number;
    }
  ): () => void {
    return this.registerGlobalListener(eventType, listener, options);
  }

  /**
   * 注册全局事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @param options 选项
   * @returns 注销函数
   */
  private registerGlobalListener<T>(
    eventType: string,
    listener: (event: T) => void | Promise<void>,
    options?: {
      priority?: number;
      filter?: (event: T) => boolean;
      timeout?: number;
    }
  ): () => void {
    // 验证参数
    if (!eventType) {
      throw new RuntimeValidationError('EventType is required', { field: 'eventType' });
    }
    if (typeof listener !== 'function') {
      throw new RuntimeValidationError('Listener must be a function', { field: 'listener' });
    }

    // 创建监听器包装器
    const wrapper: ListenerWrapper<T> = {
      listener,
      id: generateId(),
      timestamp: now(),
      priority: options?.priority || 0,
      filter: options?.filter,
      timeout: options?.timeout
    };

    // 添加到全局监听器列表
    if (!this.globalListeners.has(eventType)) {
      this.globalListeners.set(eventType, []);
    }
    this.globalListeners.get(eventType)!.push(wrapper);

    // 按优先级排序（优先级高的在前）
    this.globalListeners.get(eventType)!.sort((a, b) => b.priority - a.priority);

    // 返回注销函数
    return () => this.unregisterGlobalListener(eventType, listener);
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
   * 注销事件监听器（通过ID）
   * @param eventType 事件类型
   * @param listenerId 监听器ID
   * @returns 是否成功注销
   */
  offById(eventType: EventType, listenerId: string): boolean {
    if (!eventType) {
      throw new RuntimeValidationError('EventType is required', { field: 'eventType' });
    }

    const wrappers = this.globalListeners.get(eventType);
    if (!wrappers) {
      return false;
    }

    const index = wrappers.findIndex(w => w.id === listenerId);
    if (index === -1) {
      return false;
    }

    wrappers.splice(index, 1);

    if (wrappers.length === 0) {
      this.globalListeners.delete(eventType);
    }

    return true;
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
      throw new RuntimeValidationError('EventType is required', { field: 'eventType' });
    }
    if (typeof listener !== 'function') {
      throw new RuntimeValidationError('Listener must be a function', { field: 'listener' });
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
   * 触发事件
   * @param event 事件对象
   * @returns Promise，等待所有监听器完成
   */
  async emit<T extends BaseEvent>(event: T): Promise<void> {
    // 验证事件
    if (!event) {
      throw new RuntimeValidationError('Event is required', { field: 'event' });
    }
    if (!event.type) {
      throw new RuntimeValidationError('Event type is required', { field: 'event.type' });
    }

    // 添加传播控制标志
    (event as any)._propagationStopped = false;

    // 获取监听器
    const wrappers = this.globalListeners.get(event.type) || [];
    const allWrappers = [...wrappers, ...this.globalWildcardListeners];

    // 执行监听器
    for (const wrapper of allWrappers) {
      // 检查传播是否被停止
      if ((event as any)._propagationStopped) {
        break;
      }

      // 检查过滤器
      if (wrapper.filter && !wrapper.filter(event)) {
        continue;
      }

      try {
        // 执行监听器（带超时控制）
        if (wrapper.timeout) {
          await Promise.race([
            wrapper.listener(event),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Listener timeout after ${wrapper.timeout}ms`)), wrapper.timeout)
            )
          ]);
        } else {
          await wrapper.listener(event);
        }
      } catch (error) {
        // 抛出错误，由调用方决定如何处理
        throw new ExecutionError(
          'Event listener execution failed',
          undefined,
          undefined,
          {
            eventType: event.type,
            operation: 'event_listener'
          },
          getErrorOrNew(error)
        );
      }
    }
  }

  /**
   * 停止事件传播
   * @param event 事件对象
   */
  stopPropagation<T extends BaseEvent>(event: T): void {
    (event as any)._propagationStopped = true;
  }

  /**
   * 检查事件传播是否已停止
   * @param event 事件对象
   * @returns 是否已停止
   */
  isPropagationStopped<T extends BaseEvent>(event: T): boolean {
    return (event as any)._propagationStopped === true;
  }

  /**
   * 注册一次性事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @param options 选项
   * @returns 注销函数
   */
  once<T extends BaseEvent>(
    eventType: EventType,
    listener: EventListener<T>,
    options?: {
      priority?: number;
      filter?: (event: T) => boolean;
      timeout?: number;
    }
  ): () => void {
    // 验证参数
    if (!eventType) {
      throw new RuntimeValidationError('EventType is required', { field: 'eventType' });
    }
    if (typeof listener !== 'function') {
      throw new RuntimeValidationError('Listener must be a function', { field: 'listener' });
    }

    // 创建包装监听器
    const wrapper: EventListener<T> = async (event: T) => {
      await listener(event);
      // 自动注销
      this.off(eventType, wrapper);
    };

    // 注册包装监听器
    return this.on(eventType, wrapper, options);
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
   * @param filter 事件过滤器函数，返回true时才解析Promise
   * @returns Promise，解析为事件对象
   */
  waitFor<T extends BaseEvent>(
    eventType: EventType,
    timeout?: number,
    filter?: (event: T) => boolean
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      let resolved = false;

      // 创建监听器（不使用once，因为filter可能返回false）
      const listener = (event: T) => {
        // 检查过滤器
        if (filter && !filter(event)) {
          return; // 不匹配，继续等待
        }
        
        // 标记为已解决
        resolved = true;
        
        // 清理资源
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.off(eventType, listener);
        
        // 解析Promise
        resolve(event);
      };

      // 注册监听器
      this.on(eventType, listener);

      // 设置超时
      if (timeout) {
        timeoutId = setTimeout(() => {
          if (!resolved) {
            this.off(eventType, listener);
            reject(new Error(`Timeout waiting for event ${eventType}`));
          }
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

}

/**
 * 导出EventManager类
 */
export { EventManager };