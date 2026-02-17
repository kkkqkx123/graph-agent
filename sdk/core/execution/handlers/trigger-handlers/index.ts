/**
 * 触发器处理函数模块
 * 提供各种触发器动作的处理函数
 *
 * 注意：
 * - 触发器动作类型是固定的（TriggerActionType枚举）
 * - 处理器在模块加载时静态映射，不支持运行时扩展
 * - 与 NodeHandler 保持一致的架构设计
 */

import { ExecutionError } from '@modular-agent/types';
import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import { TriggerActionType } from '@modular-agent/types';

/**
 * 触发器处理器类型
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @param executionContext 执行上下文（可选）
 * @returns 执行结果
 */
export type TriggerHandler = (
  action: TriggerAction,
  triggerId: string,
  executionContext?: any
) => Promise<TriggerExecutionResult>;

// 导入各个触发器处理函数
import { stopThreadHandler } from './stop-thread-handler.js';
import { pauseThreadHandler } from './pause-thread-handler.js';
import { resumeThreadHandler } from './resume-thread-handler.js';
import { skipNodeHandler } from './skip-node-handler.js';
import { setVariableHandler } from './set-variable-handler.js';
import { sendNotificationHandler } from './send-notification-handler.js';
import { customHandler } from './custom-handler.js';
import { executeTriggeredSubgraphHandler } from './execute-triggered-subgraph-handler.js';

/**
 * 触发器处理函数映射
 *
 * 注意：触发器动作类型是固定的（TriggerActionType枚举），处理器在模块加载时静态映射
 */
export const triggerHandlers: Record<TriggerActionType, TriggerHandler> = {
  ['start_workflow']: async (action, triggerId) => ({
    triggerId,
    success: false,
    action,
    executionTime: Date.now(),
    error: new Error('start_workflow not implemented')
  }),
  ['stop_workflow']: async (action, triggerId) => ({
    triggerId,
    success: false,
    action,
    executionTime: Date.now(),
    error: new Error('stop_workflow not implemented')
  }),
  ['stop_thread']: stopThreadHandler,
  ['pause_thread']: pauseThreadHandler,
  ['resume_thread']: resumeThreadHandler,
  ['skip_node']: skipNodeHandler,
  ['set_variable']: setVariableHandler,
  ['send_notification']: sendNotificationHandler,
  ['custom']: customHandler,
  ['execute_triggered_subgraph']: executeTriggeredSubgraphHandler
} as Record<TriggerActionType, TriggerHandler>;

/**
 * 获取触发器处理函数
 * @param actionType 触发器动作类型
 * @returns 触发器处理函数
 * @throws Error 如果找不到对应的处理器
 */
export function getTriggerHandler(actionType: TriggerActionType): TriggerHandler {
  const handler = triggerHandlers[actionType];
  if (!handler) {
    throw new ExecutionError(`No handler found for trigger action type: ${actionType}`);
  }
  return handler;
}

// 导出各个触发器处理函数（用于外部使用）
export { stopThreadHandler } from './stop-thread-handler.js';
export { pauseThreadHandler } from './pause-thread-handler.js';
export { resumeThreadHandler } from './resume-thread-handler.js';
export { skipNodeHandler } from './skip-node-handler.js';
export { setVariableHandler } from './set-variable-handler.js';
export { sendNotificationHandler } from './send-notification-handler.js';
export { customHandler } from './custom-handler.js';
export { executeTriggeredSubgraphHandler } from './execute-triggered-subgraph-handler.js';