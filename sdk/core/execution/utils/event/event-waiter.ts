/**
 * EventWaiter - 事件等待器函数
 * 目前仅用于thread。因为仅thread需要单独管理生命周期
 *
 * 职责：
 * - 封装事件等待逻辑
 * - 提供超时控制
 * - 简化事件等待的调用方式
 * - 支持多线程和节点事件等待
 *
 * 设计原则：
 * - 纯函数：所有方法都是纯函数
 * - 依赖注入EventManager
 * - 提供简洁的等待接口
 * - 事件驱动，避免轮询
 */

import type { EventManager } from '../../../services/event-manager';
import { EventType } from '@modular-agent/types/events';

/**
 * 表示始终等待的特殊值
 * 使用 -1 表示无限等待，符合系统级编程惯例（如 C#、Java、POSIX）
 */
export const WAIT_FOREVER = -1;

/**
 * 等待Thread暂停事件
 *
 * @param eventManager 事件管理器
 * @param threadId Thread ID
 * @param timeout 超时时间（毫秒），默认5000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，超时或事件触发时解析
 *
 * @example
 * // 使用默认超时（5000ms）
 * await waitForThreadPaused(eventManager, threadId);
 *
 * @example
 * // 自定义超时（10秒）
 * await waitForThreadPaused(eventManager, threadId, 10000);
 *
 * @example
 * // 始终等待
 * await waitForThreadPaused(eventManager, threadId, WAIT_FOREVER);
 */
export async function waitForThreadPaused(
  eventManager: EventManager,
  threadId: string,
  timeout: number = 5000
): Promise<void> {
  const actualTimeout = timeout === WAIT_FOREVER ? undefined : timeout;
  await eventManager.waitFor(
    EventType.THREAD_PAUSED,
    actualTimeout,
    (event) => event.threadId === threadId
  );
}

/**
 * 等待Thread取消事件
 *
 * @param eventManager 事件管理器
 * @param threadId Thread ID
 * @param timeout 超时时间（毫秒），默认5000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，超时或事件触发时解析
 */
export async function waitForThreadCancelled(
  eventManager: EventManager,
  threadId: string,
  timeout: number = 5000
): Promise<void> {
  const actualTimeout = timeout === WAIT_FOREVER ? undefined : timeout;
  await eventManager.waitFor(
    EventType.THREAD_CANCELLED,
    actualTimeout,
    (event) => event.threadId === threadId
  );
}

/**
 * 等待Thread完成事件
 *
 * @param eventManager 事件管理器
 * @param threadId Thread ID
 * @param timeout 超时时间（毫秒），默认30000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，超时或事件触发时解析
 */
export async function waitForThreadCompleted(
  eventManager: EventManager,
  threadId: string,
  timeout: number = 30000
): Promise<void> {
  const actualTimeout = timeout === WAIT_FOREVER ? undefined : timeout;
  await eventManager.waitFor(
    EventType.THREAD_COMPLETED,
    actualTimeout,
    (event) => event.threadId === threadId
  );
}

/**
 * 等待Thread失败事件
 *
 * @param eventManager 事件管理器
 * @param threadId Thread ID
 * @param timeout 超时时间（毫秒），默认30000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，超时或事件触发时解析
 */
export async function waitForThreadFailed(
  eventManager: EventManager,
  threadId: string,
  timeout: number = 30000
): Promise<void> {
  const actualTimeout = timeout === WAIT_FOREVER ? undefined : timeout;
  await eventManager.waitFor(
    EventType.THREAD_FAILED,
    actualTimeout,
    (event) => event.threadId === threadId
  );
}

/**
 * 等待Thread恢复事件
 *
 * @param eventManager 事件管理器
 * @param threadId Thread ID
 * @param timeout 超时时间（毫秒），默认5000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，超时或事件触发时解析
 */
export async function waitForThreadResumed(
  eventManager: EventManager,
  threadId: string,
  timeout: number = 5000
): Promise<void> {
  const actualTimeout = timeout === WAIT_FOREVER ? undefined : timeout;
  await eventManager.waitFor(
    EventType.THREAD_RESUMED,
    actualTimeout,
    (event) => event.threadId === threadId
  );
}

/**
 * 等待任意Thread生命周期事件
 *
 * @param eventManager 事件管理器
 * @param threadId Thread ID
 * @param timeout 超时时间（毫秒），默认5000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，超时或任意生命周期事件触发时解析
 */
export async function waitForAnyLifecycleEvent(
  eventManager: EventManager,
  threadId: string,
  timeout: number = 5000
): Promise<void> {
  const actualTimeout = timeout === WAIT_FOREVER ? undefined : timeout;
  
  // 使用Promise.race等待任意一个生命周期事件
  const events = [
    EventType.THREAD_PAUSED,
    EventType.THREAD_CANCELLED,
    EventType.THREAD_COMPLETED,
    EventType.THREAD_FAILED,
    EventType.THREAD_RESUMED
  ];

  // 创建多个等待Promise，每个都使用threadId过滤器
  const promises = events.map(eventType =>
    eventManager.waitFor(
      eventType,
      actualTimeout,
      (event) => event.threadId === threadId
    )
  );

  // 等待任意一个事件触发
  await Promise.race(promises);
}

/**
 * 等待多个线程完成
 *
 * @param eventManager 事件管理器
 * @param threadIds 线程ID数组
 * @param timeout 超时时间（毫秒），默认30000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，所有线程完成或超时时解析
 */
export async function waitForMultipleThreadsCompleted(
  eventManager: EventManager,
  threadIds: string[],
  timeout: number = 30000
): Promise<void> {
  const promises = threadIds.map(threadId =>
    waitForThreadCompleted(eventManager, threadId, timeout)
  );

  await Promise.all(promises);
}

/**
 * 等待任意一个线程完成
 *
 * @param eventManager 事件管理器
 * @param threadIds 线程ID数组
 * @param timeout 超时时间（毫秒），默认30000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，任意线程完成或超时时解析，返回完成的线程ID
 */
export async function waitForAnyThreadCompleted(
  eventManager: EventManager,
  threadIds: string[],
  timeout: number = 30000
): Promise<string> {
  const promises = threadIds.map(threadId =>
    waitForThreadCompleted(eventManager, threadId, timeout)
      .then(() => threadId)
  );

  return await Promise.race(promises);
}

/**
 * 等待任意一个线程完成或失败
 *
 * @param eventManager 事件管理器
 * @param threadIds 线程ID数组
 * @param timeout 超时时间（毫秒），默认30000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，任意线程完成或失败时解析，返回线程ID和状态
 */
export async function waitForAnyThreadCompletion(
  eventManager: EventManager,
  threadIds: string[],
  timeout: number = 30000
): Promise<{ threadId: string; status: 'COMPLETED' | 'FAILED' }> {
  const completedPromises = threadIds.map(threadId =>
    waitForThreadCompleted(eventManager, threadId, timeout)
      .then(() => ({ threadId, status: 'COMPLETED' as const }))
  );

  const failedPromises = threadIds.map(threadId =>
    waitForThreadFailed(eventManager, threadId, timeout)
      .then(() => ({ threadId, status: 'FAILED' as const }))
  );

  return await Promise.race([...completedPromises, ...failedPromises]);
}

/**
 * 等待节点完成
 *
 * @param eventManager 事件管理器
 * @param threadId 线程ID
 * @param nodeId 节点ID
 * @param timeout 超时时间（毫秒），默认30000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，超时或事件触发时解析
 */
export async function waitForNodeCompleted(
  eventManager: EventManager,
  threadId: string,
  nodeId: string,
  timeout: number = 30000
): Promise<void> {
  const actualTimeout = timeout === WAIT_FOREVER ? undefined : timeout;
  await eventManager.waitFor(
    EventType.NODE_COMPLETED,
    actualTimeout,
    (event: any) => event.threadId === threadId && event.nodeId === nodeId
  );
}

/**
 * 等待节点失败
 *
 * @param eventManager 事件管理器
 * @param threadId 线程ID
 * @param nodeId 节点ID
 * @param timeout 超时时间（毫秒），默认30000ms。使用 WAIT_FOREVER 或 -1 表示始终等待
 * @returns Promise，超时或事件触发时解析
 */
export async function waitForNodeFailed(
  eventManager: EventManager,
  threadId: string,
  nodeId: string,
  timeout: number = 30000
): Promise<void> {
  const actualTimeout = timeout === WAIT_FOREVER ? undefined : timeout;
  await eventManager.waitFor(
    EventType.NODE_FAILED,
    actualTimeout,
    (event: any) => event.threadId === threadId && event.nodeId === nodeId
  );
}

/**
 * 等待条件满足
 *
 * @param condition 条件函数
 * @param checkInterval 检查间隔（毫秒），默认100ms
 * @param timeout 超时时间（毫秒），默认30000ms
 * @returns Promise，条件满足或超时时解析
 * @throws Error 超时时抛出异常
 */
export async function waitForCondition(
  condition: () => boolean,
  checkInterval: number = 100,
  timeout: number = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * 等待多个条件满足
 *
 * @param conditions 条件函数数组
 * @param checkInterval 检查间隔（毫秒），默认100ms
 * @param timeout 超时时间（毫秒），默认30000ms
 * @returns Promise，所有条件满足或超时时解析
 * @throws Error 超时时抛出异常
 */
export async function waitForAllConditions(
  conditions: Array<() => boolean>,
  checkInterval: number = 100,
  timeout: number = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (conditions.every(condition => condition())) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Not all conditions met within ${timeout}ms`);
}

/**
 * 等待任意条件满足
 *
 * @param conditions 条件函数数组
 * @param checkInterval 检查间隔（毫秒），默认100ms
 * @param timeout 超时时间（毫秒），默认30000ms
 * @returns Promise，任意条件满足或超时时解析，返回满足条件的索引
 * @throws Error 超时时抛出异常
 */
export async function waitForAnyCondition(
  conditions: Array<() => boolean>,
  checkInterval: number = 100,
  timeout: number = 30000
): Promise<number> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      if (condition && condition()) {
        return i;
      }
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`No condition met within ${timeout}ms`);
}
