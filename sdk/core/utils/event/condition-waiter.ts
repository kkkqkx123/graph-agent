/**
 * ConditionWaiter - 条件等待器函数（通用部分）
 *
 * 职责：
 * - 封装条件等待逻辑
 * - 提供超时控制
 * - 简化条件等待的调用方式
 *
 * 设计原则：
 * - 纯函数：所有方法都是纯函数
 * - 提供简洁的等待接口
 */

import { TimeoutError } from '@modular-agent/types';
import { now, diffTimestamp } from '@modular-agent/common-utils';

/**
 * 表示始终等待的特殊值
 * 使用 -1 表示无限等待，符合系统级编程惯例（如 C#、Java、POSIX）
 */
export const WAIT_FOREVER = -1;

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
  const startTime = now();

  while (diffTimestamp(startTime, now()) < timeout) {
    if (condition()) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new TimeoutError(
    `Condition not met within ${timeout}ms`,
    timeout,
    { operation: 'wait_for_condition' }
  );
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
  const startTime = now();

  while (diffTimestamp(startTime, now()) < timeout) {
    if (conditions.every(condition => condition())) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new TimeoutError(
    `Not all conditions met within ${timeout}ms`,
    timeout,
    { operation: 'wait_for_all_conditions', conditionCount: conditions.length }
  );
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
  const startTime = now();

  while (diffTimestamp(startTime, now()) < timeout) {
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      if (condition && condition()) {
        return i;
      }
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new TimeoutError(
    `No condition met within ${timeout}ms`,
    timeout,
    { operation: 'wait_for_any_condition', conditionCount: conditions.length }
  );
}