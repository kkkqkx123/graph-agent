/**
 * CallbackManager - 回调管理器
 *
 * 职责：
 * - 管理动态子线程的回调函数
 * - 支持Promise-based回调和事件监听回调
 * - 提供回调的注册、触发和清理功能
 *
 * 设计原则：
 * - 有状态多实例，由Manager持有
 * - 线程安全的回调管理
 * - 支持事件监听器模式
 * - 支持泛型，适配不同的结果类型
 */

import type { CallbackInfo, DynamicThreadEvent } from '../types/dynamic-thread.types.js';
import { now } from '@modular-agent/common-utils';

/**
 * 回调信息接口（泛型版本）
 */
export interface GenericCallbackInfo<T> {
  /** 线程ID */
  threadId: string;
  /** Promise resolve函数 */
  resolve: (value: T) => void;
  /** Promise reject函数 */
  reject: (error: Error) => void;
  /** 事件监听器数组 */
  eventListeners: Array<(event: DynamicThreadEvent) => void>;
  /** 注册时间 */
  registeredAt: number;
}

/**
 * CallbackManager - 回调管理器（泛型版本）
 * @typeparam T 执行结果类型
 */
export class CallbackManager<T = any> {
  /**
   * 回调映射
   */
  private callbacks: Map<string, GenericCallbackInfo<T>> = new Map();

  /**
   * 注册回调
   * @param threadId 线程ID
   * @param resolve Promise resolve函数
   * @param reject Promise reject函数
   * @returns 是否注册成功
   */
  registerCallback(
    threadId: string,
    resolve: (value: T) => void,
    reject: (error: Error) => void
  ): boolean {
    if (this.callbacks.has(threadId)) {
      return false;
    }

    const callbackInfo: GenericCallbackInfo<T> = {
      threadId,
      resolve,
      reject,
      eventListeners: [],
      registeredAt: now()
    };

    this.callbacks.set(threadId, callbackInfo);
    return true;
  }

  /**
   * 触发成功回调
   * @param threadId 线程ID
   * @param result 执行结果
   * @returns 是否触发成功
   */
  triggerCallback(threadId: string, result: T): boolean {
    const callbackInfo = this.callbacks.get(threadId);
    if (!callbackInfo) {
      return false;
    }

    try {
      // 调用resolve函数
      callbackInfo.resolve(result);

      // 通知所有事件监听器
      const event: DynamicThreadEvent = {
        type: 'DYNAMIC_THREAD_COMPLETED',
        threadId,
        timestamp: now(),
        data: { result }
      };

      callbackInfo.eventListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          // 监听器错误不影响其他监听器
          console.error(`Error in event listener for thread ${threadId}:`, error);
        }
      });

      // 从回调映射中移除
      this.callbacks.delete(threadId);
      return true;
    } catch (error) {
      console.error(`Error triggering callback for thread ${threadId}:`, error);
      this.callbacks.delete(threadId);
      return false;
    }
  }

  /**
   * 触发失败回调
   * @param threadId 线程ID
   * @param error 错误信息
   * @returns 是否触发成功
   */
  triggerErrorCallback(threadId: string, error: Error): boolean {
    const callbackInfo = this.callbacks.get(threadId);
    if (!callbackInfo) {
      return false;
    }

    try {
      // 调用reject函数
      callbackInfo.reject(error);

      // 通知所有事件监听器
      const event: DynamicThreadEvent = {
        type: 'DYNAMIC_THREAD_FAILED',
        threadId,
        timestamp: now(),
        data: { error }
      };

      callbackInfo.eventListeners.forEach(listener => {
        try {
          listener(event);
        } catch (err) {
          // 监听器错误不影响其他监听器
          console.error(`Error in event listener for thread ${threadId}:`, err);
        }
      });

      // 从回调映射中移除
      this.callbacks.delete(threadId);
      return true;
    } catch (err) {
      console.error(`Error triggering error callback for thread ${threadId}:`, err);
      this.callbacks.delete(threadId);
      return false;
    }
  }

  /**
   * 添加事件监听器
   * @param threadId 线程ID
   * @param listener 事件监听器
   * @returns 是否添加成功
   */
  addEventListener(threadId: string, listener: (event: DynamicThreadEvent) => void): boolean {
    const callbackInfo = this.callbacks.get(threadId);
    if (!callbackInfo) {
      return false;
    }

    callbackInfo.eventListeners.push(listener);
    return true;
  }

  /**
   * 移除事件监听器
   * @param threadId 线程ID
   * @param listener 事件监听器
   * @returns 是否移除成功
   */
  removeEventListener(threadId: string, listener: (event: DynamicThreadEvent) => void): boolean {
    const callbackInfo = this.callbacks.get(threadId);
    if (!callbackInfo) {
      return false;
    }

    const index = callbackInfo.eventListeners.indexOf(listener);
    if (index !== -1) {
      callbackInfo.eventListeners.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * 检查回调是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  hasCallback(threadId: string): boolean {
    return this.callbacks.has(threadId);
  }

  /**
   * 获取回调信息
   * @param threadId 线程ID
   * @returns 回调信息
   */
  getCallback(threadId: string): GenericCallbackInfo<T> | undefined {
    return this.callbacks.get(threadId);
  }

  /**
   * 清理所有回调
   */
  cleanup(): void {
    // 遍历所有回调，调用reject函数
    this.callbacks.forEach((callbackInfo, threadId) => {
      try {
        const error = new Error(`Callback cleanup for thread ${threadId}`);
        callbackInfo.reject(error);
      } catch (error) {
        console.error(`Error cleaning up callback for thread ${threadId}:`, error);
      }
    });

    // 清空回调映射
    this.callbacks.clear();
  }

  /**
   * 清理指定线程的回调
   * @param threadId 线程ID
   * @returns 是否清理成功
   */
  cleanupCallback(threadId: string): boolean {
    const callbackInfo = this.callbacks.get(threadId);
    if (!callbackInfo) {
      return false;
    }

    try {
      const error = new Error(`Callback cleanup for thread ${threadId}`);
      callbackInfo.reject(error);
    } catch (error) {
      console.error(`Error cleaning up callback for thread ${threadId}:`, error);
    }

    this.callbacks.delete(threadId);
    return true;
  }

  /**
   * 获取回调数量
   * @returns 回调数量
   */
  size(): number {
    return this.callbacks.size;
  }

  /**
   * 获取所有线程ID
   * @returns 线程ID数组
   */
  getThreadIds(): string[] {
    return Array.from(this.callbacks.keys());
  }
}
