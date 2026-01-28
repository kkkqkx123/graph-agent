/**
 * 触发器处理函数模块
 * 提供各种触发器动作的处理函数
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { TriggerActionType } from '../../../../types/trigger';

/**
 * 触发器处理函数类型
 */
export type TriggerHandler = (
  action: TriggerAction,
  triggerId: string
) => Promise<TriggerExecutionResult>;

/**
 * 触发器处理函数映射
 */
export const triggerHandlers: Record<TriggerActionType, TriggerHandler> = {} as Record<TriggerActionType, TriggerHandler>;

/**
 * 注册触发器处理函数
 */
export function registerTriggerHandler(actionType: TriggerActionType, handler: TriggerHandler): void {
  triggerHandlers[actionType] = handler;
}

/**
 * 获取触发器处理函数
 */
export function getTriggerHandler(actionType: TriggerActionType): TriggerHandler {
  const handler = triggerHandlers[actionType];
  if (!handler) {
    throw new Error(`No handler found for trigger action type: ${actionType}`);
  }
  return handler;
}

// 导出各个触发器处理函数
export { stopThreadHandler } from './stop-thread-handler';
export { pauseThreadHandler } from './pause-thread-handler';
export { resumeThreadHandler } from './resume-thread-handler';
export { skipNodeHandler } from './skip-node-handler';
export { setVariableHandler } from './set-variable-handler';
export { sendNotificationHandler } from './send-notification-handler';
export { customHandler } from './custom-handler';