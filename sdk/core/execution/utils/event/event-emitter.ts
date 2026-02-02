/**
 * EventEmitter - 事件触发工具函数
 * 提供统一的事件触发方法，包含错误处理
 *
 * 设计原则：
 * - 纯函数：所有方法都是纯函数，无副作用
 * - 错误处理：提供安全的错误处理机制
 * - 简化调用：简化事件触发的调用方式
 */

import type { EventManager } from '../../../services/event-manager';
import type { Event, EventType } from '../../../../types/events';

/**
 * 安全触发事件
 * 如果事件管理器不存在或触发失败，不会抛出异常
 * 
 * @param eventManager 事件管理器
 * @param event 事件对象
 */
export async function safeEmit(
  eventManager: EventManager | undefined,
  event: Event
): Promise<void> {
  if (!eventManager) {
    return;
  }

  try {
    await eventManager.emit(event);
  } catch (error) {
    // 静默处理事件触发错误，避免影响主流程
    console.error(`Failed to emit event ${event.type}:`, error);
  }
}

/**
 * 触发事件（如果失败会抛出异常）
 * 
 * @param eventManager 事件管理器
 * @param event 事件对象
 * @throws Error 如果事件管理器不存在或触发失败
 */
export async function emit(
  eventManager: EventManager | undefined,
  event: Event
): Promise<void> {
  if (!eventManager) {
    throw new Error('EventManager is not available');
  }

  await eventManager.emit(event);
}

/**
 * 批量触发事件
 * 如果某个事件触发失败，会继续触发其他事件
 * 
 * @param eventManager 事件管理器
 * @param events 事件数组
 */
export async function emitBatch(
  eventManager: EventManager | undefined,
  events: Event[]
): Promise<void> {
  if (!eventManager) {
    return;
  }

  for (const event of events) {
    await safeEmit(eventManager, event);
  }
}

/**
 * 批量安全触发事件（并行）
 * 所有事件并行触发，失败不影响其他事件
 * 
 * @param eventManager 事件管理器
 * @param events 事件数组
 */
export async function emitBatchParallel(
  eventManager: EventManager | undefined,
  events: Event[]
): Promise<void> {
  if (!eventManager) {
    return;
  }

  await Promise.all(
    events.map(event => safeEmit(eventManager, event))
  );
}

/**
 * 条件触发事件
 * 只有当条件满足时才触发事件
 * 
 * @param eventManager 事件管理器
 * @param event 事件对象
 * @param condition 条件函数
 */
export async function emitIf(
  eventManager: EventManager | undefined,
  event: Event,
  condition: () => boolean
): Promise<void> {
  if (!eventManager || !condition()) {
    return;
  }

  await safeEmit(eventManager, event);
}

/**
 * 延迟触发事件
 * 在指定延迟后触发事件
 * 
 * @param eventManager 事件管理器
 * @param event 事件对象
 * @param delay 延迟时间（毫秒）
 */
export async function emitDelayed(
  eventManager: EventManager | undefined,
  event: Event,
  delay: number
): Promise<void> {
  if (!eventManager) {
    return;
  }

  await new Promise(resolve => setTimeout(resolve, delay));
  await safeEmit(eventManager, event);
}

/**
 * 重试触发事件
 * 如果触发失败，会重试指定次数
 * 
 * @param eventManager 事件管理器
 * @param event 事件对象
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 */
export async function emitWithRetry(
  eventManager: EventManager | undefined,
  event: Event,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<void> {
  if (!eventManager) {
    return;
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await eventManager.emit(event);
      return;
    } catch (error) {
      lastError = error as Error;
      console.error(`Event emit attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 所有重试都失败，记录错误但不抛出异常
  console.error(`All ${maxRetries + 1} event emit attempts failed:`, lastError);
}

/**
 * 触发事件并等待回调
 * 触发事件后等待指定的回调事件
 *
 * @param eventManager 事件管理器
 * @param event 事件对象
 * @param callbackEventType 回调事件类型
 * @param timeout 超时时间（毫秒）
 */
export async function emitAndWaitForCallback(
  eventManager: EventManager | undefined,
  event: Event,
  callbackEventType: EventType,
  timeout: number = 30000
): Promise<void> {
  if (!eventManager) {
    throw new Error('EventManager is not available');
  }

  // 触发事件
  await eventManager.emit(event);

  // 等待回调事件
  await eventManager.waitFor(callbackEventType, timeout);
}
