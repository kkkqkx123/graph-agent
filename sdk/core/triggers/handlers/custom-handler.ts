/**
 * 通用自定义动作处理器
 *
 * 提供自定义触发动作的执行逻辑。
 * 可被 Graph 和 Agent 模块复用。
 */

import type { BaseTriggerDefinition, BaseEventData, TriggerExecutionResult, BaseTriggerAction } from '../types.js';
import { now } from '@modular-agent/common-utils';
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'CustomTriggerHandler' });

/**
 * 自定义动作参数
 */
export interface CustomActionParameters {
  /** 自定义处理器名称 */
  handlerName: string;
  /** 自定义参数 */
  data?: Record<string, any>;
  /** 其他参数 */
  [key: string]: any;
}

/**
 * 执行自定义动作
 *
 * @param trigger 触发器定义
 * @param eventData 事件数据
 * @returns 执行结果
 */
export async function executeCustomAction(
  trigger: BaseTriggerDefinition,
  eventData: BaseEventData
): Promise<TriggerExecutionResult> {
  const startTime = now();
  const { action } = trigger;

  logger.debug('Custom trigger action executing', { triggerId: trigger.id, actionType: action.type });

  try {
    const params = action.parameters as CustomActionParameters;
    const { handlerName, data } = params;

    if (!handlerName || typeof handlerName !== 'string') {
      logger.warn('Custom action missing handlerName', { triggerId: trigger.id });
      return {
        triggerId: trigger.id,
        success: false,
        action,
        executionTime: now() - startTime,
        error: 'Custom action requires a handlerName'
      };
    }

    // TODO: 实现通过 handlerName 查找并执行对应的 handler 函数
    // 目前先抛出错误，等待实现 handler 注册机制
    logger.warn('Custom handler execution not fully implemented', { triggerId: trigger.id, handlerName });
    return {
      triggerId: trigger.id,
      success: false,
      action,
      executionTime: now() - startTime,
      error: `Custom handler '${handlerName}' not found. Handler registration mechanism not yet implemented.`
    };
  } catch (error) {
    return {
      triggerId: trigger.id,
      success: false,
      action,
      executionTime: now() - startTime,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * 创建自定义动作处理器
 *
 * 工厂函数，用于创建带有特定上下文的自定义处理器。
 *
 * @param context 上下文对象
 * @returns 处理器函数
 */
export function createCustomHandler<TContext>(
  context: TContext
): (trigger: BaseTriggerDefinition, eventData: BaseEventData) => Promise<TriggerExecutionResult> {
  return async (trigger, eventData) => {
    const params = trigger.action.parameters as CustomActionParameters;

    if (params.handlerName && typeof params.handlerName === 'string') {
      // TODO: 实现通过 handlerName 查找并执行对应的 handler 函数
      // 目前先返回错误，等待实现 handler 注册机制
      return {
        triggerId: trigger.id,
        success: false,
        action: trigger.action,
        executionTime: now(),
        error: `Custom handler '${params.handlerName}' not found. Handler registration mechanism not yet implemented.`
      };
    }

    return {
      triggerId: trigger.id,
      success: false,
      action: trigger.action,
      executionTime: now(),
      error: 'No handlerName provided'
    };
  };
}
