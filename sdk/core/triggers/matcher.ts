/**
 * 通用 Trigger 匹配器
 *
 * 提供事件与触发条件的匹配逻辑。
 */

import type { BaseTriggerCondition, BaseEventData, TriggerMatcher } from './types.js';

/**
 * 默认触发器匹配器
 *
 * 匹配规则：
 * 1. 事件类型必须匹配
 * 2. 如果条件指定了 eventName，事件也必须匹配
 *
 * @param condition 触发条件
 * @param event 事件数据
 * @returns 是否匹配
 */
export const defaultTriggerMatcher: TriggerMatcher = (
  condition: BaseTriggerCondition,
  event: BaseEventData
): boolean => {
  // 检查事件类型
  if (condition.eventType !== event.type) {
    return false;
  }

  // 如果条件指定了 eventName，检查是否匹配
  if (condition.eventName && condition.eventName !== event.eventName) {
    return false;
  }

  return true;
};

/**
 * 匹配触发条件
 *
 * 使用默认匹配器判断事件是否满足触发条件。
 *
 * @param condition 触发条件
 * @param event 事件数据
 * @returns 是否匹配
 */
export function matchTriggerCondition(
  condition: BaseTriggerCondition,
  event: BaseEventData
): boolean {
  return defaultTriggerMatcher(condition, event);
}

/**
 * 批量匹配触发条件
 *
 * 从触发器列表中找出所有匹配的触发器。
 *
 * @param triggers 触发器列表
 * @param event 事件数据
 * @param matcher 匹配器（可选，默认使用 defaultTriggerMatcher）
 * @returns 匹配的触发器列表
 */
export function matchTriggers<T extends { condition: BaseTriggerCondition; enabled?: boolean }>(
  triggers: T[],
  event: BaseEventData,
  matcher: TriggerMatcher = defaultTriggerMatcher
): T[] {
  return triggers.filter(trigger => {
    // 跳过禁用的触发器
    if (trigger.enabled === false) {
      return false;
    }

    return matcher(trigger.condition, event);
  });
}

/**
 * 创建自定义匹配器
 *
 * 工厂函数，用于创建带有自定义匹配逻辑的匹配器。
 *
 * @param customMatcher 自定义匹配函数
 * @returns 匹配器
 */
export function createTriggerMatcher(
  customMatcher: (condition: BaseTriggerCondition, event: BaseEventData) => boolean
): TriggerMatcher {
  return (condition, event) => {
    // 先执行默认匹配
    if (!defaultTriggerMatcher(condition, event)) {
      return false;
    }

    // 再执行自定义匹配
    return customMatcher(condition, event);
  };
}
