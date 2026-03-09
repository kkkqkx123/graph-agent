/**
 * 通用 Trigger 限制器
 *
 * 提供触发次数限制逻辑。
 */

import type { BaseTriggerDefinition, TriggerStatus } from './types.js';

/**
 * 检查触发器是否可以触发
 *
 * @param trigger 触发器定义
 * @returns 是否可以触发
 */
export function canTrigger(trigger: BaseTriggerDefinition): boolean {
  // 检查是否禁用
  if (trigger.enabled === false) {
    return false;
  }

  // 检查是否达到最大触发次数
  if (trigger.maxTriggers && trigger.maxTriggers > 0) {
    const currentCount = trigger.triggerCount || 0;
    if (currentCount >= trigger.maxTriggers) {
      return false;
    }
  }

  return true;
}

/**
 * 获取触发器状态
 *
 * @param trigger 触发器定义
 * @returns 触发器状态
 */
export function getTriggerStatus(trigger: BaseTriggerDefinition): TriggerStatus {
  // 检查是否禁用
  if (trigger.enabled === false) {
    return 'disabled';
  }

  // 检查是否达到最大触发次数
  if (trigger.maxTriggers && trigger.maxTriggers > 0) {
    const currentCount = trigger.triggerCount || 0;
    if (currentCount >= trigger.maxTriggers) {
      return 'expired';
    }
  }

  // 检查是否已触发过
  if (trigger.triggerCount && trigger.triggerCount > 0) {
    return 'triggered';
  }

  return 'idle';
}

/**
 * 增加触发计数
 *
 * @param trigger 触发器定义
 * @returns 更新后的触发计数
 */
export function incrementTriggerCount(trigger: BaseTriggerDefinition): number {
  const newCount = (trigger.triggerCount || 0) + 1;
  trigger.triggerCount = newCount;
  return newCount;
}

/**
 * 重置触发计数
 *
 * @param trigger 触发器定义
 */
export function resetTriggerCount(trigger: BaseTriggerDefinition): void {
  trigger.triggerCount = 0;
}

/**
 * 检查触发器是否已过期
 *
 * @param trigger 触发器定义
 * @returns 是否已过期
 */
export function isTriggerExpired(trigger: BaseTriggerDefinition): boolean {
  if (!trigger.maxTriggers || trigger.maxTriggers <= 0) {
    return false;
  }

  const currentCount = trigger.triggerCount || 0;
  return currentCount >= trigger.maxTriggers;
}

/**
 * 获取剩余触发次数
 *
 * @param trigger 触发器定义
 * @returns 剩余次数（-1 表示无限制）
 */
export function getRemainingTriggers(trigger: BaseTriggerDefinition): number {
  if (!trigger.maxTriggers || trigger.maxTriggers <= 0) {
    return -1; // 无限制
  }

  const currentCount = trigger.triggerCount || 0;
  return Math.max(0, trigger.maxTriggers - currentCount);
}
