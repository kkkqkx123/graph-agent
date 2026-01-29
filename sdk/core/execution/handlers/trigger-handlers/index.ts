/**
 * 触发器处理函数模块
 * 提供各种触发器动作的处理函数
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { TriggerActionType } from '../../../../types/trigger';

// 导入接口定义
import type {
  TriggerHandler,
  TriggerHandlerRegistry
} from './interfaces';

// 导出接口定义
export type {
  TriggerHandler,
  TriggerHandlerRegistry
} from './interfaces';

/**
 * 触发器处理器注册器实现
 * 实现TriggerHandlerRegistry接口
 */
class TriggerHandlerRegistryImpl implements TriggerHandlerRegistry {
  private handlers: Record<string, TriggerHandler> = {};

  register(actionType: string, handler: TriggerHandler): void {
    this.handlers[actionType] = handler;
  }

  get(actionType: string): TriggerHandler {
    const handler = this.handlers[actionType];
    if (!handler) {
      throw new Error(`No handler found for trigger action type: ${actionType}`);
    }
    return handler;
  }

  has(actionType: string): boolean {
    return actionType in this.handlers;
  }

  getAll(): Record<string, TriggerHandler> {
    return { ...this.handlers };
  }
}

/**
 * 触发器处理器注册器实例
 */
export const triggerHandlerRegistry: TriggerHandlerRegistry = new TriggerHandlerRegistryImpl();

/**
 * 触发器处理函数映射（向后兼容）
 * @deprecated 请使用 triggerHandlerRegistry
 */
export const triggerHandlers: Record<TriggerActionType, TriggerHandler> = {} as Record<TriggerActionType, TriggerHandler>;

/**
 * 注册触发器处理函数（向后兼容）
 * @deprecated 请使用 triggerHandlerRegistry.register()
 */
export function registerTriggerHandler(actionType: TriggerActionType, handler: TriggerHandler): void {
  triggerHandlerRegistry.register(actionType, handler);
  triggerHandlers[actionType] = handler;
}

/**
 * 获取触发器处理函数（向后兼容）
 * @deprecated 请使用 triggerHandlerRegistry.get()
 */
export function getTriggerHandler(actionType: TriggerActionType): TriggerHandler {
  return triggerHandlerRegistry.get(actionType);
}

// 导出各个触发器处理函数
export { stopThreadHandler } from './stop-thread-handler';
export { pauseThreadHandler } from './pause-thread-handler';
export { resumeThreadHandler } from './resume-thread-handler';
export { skipNodeHandler } from './skip-node-handler';
export { setVariableHandler } from './set-variable-handler';
export { sendNotificationHandler } from './send-notification-handler';
export { customHandler } from './custom-handler';