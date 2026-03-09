/**
 * 通用自定义动作处理器
 *
 * 提供自定义触发动作的执行逻辑。
 * 可被 Graph 和 Agent 模块复用。
 */

import type { BaseTriggerDefinition, BaseEventData, TriggerExecutionResult, BaseTriggerAction } from '../types.js';
import { now } from '@modular-agent/common-utils';

/**
 * 自定义动作参数
 */
export interface CustomActionParameters {
  /** 自定义处理函数 */
  handler: (action: BaseTriggerAction, eventData: BaseEventData) => Promise<any>;
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

  try {
    const params = action.parameters as CustomActionParameters;
    const { handler } = params;

    if (!handler || typeof handler !== 'function') {
      return {
        triggerId: trigger.id,
        success: false,
        action,
        executionTime: now() - startTime,
        error: 'Custom action requires a handler function'
      };
    }

    // 执行自定义处理函数
    const result = await handler(action, eventData);

    return {
      triggerId: trigger.id,
      success: true,
      action,
      executionTime: now() - startTime,
      result
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

    if (params.handler && typeof params.handler === 'function') {
      // 将上下文注入到处理函数
      const result = await params.handler.call(context, trigger.action, eventData);
      return {
        triggerId: trigger.id,
        success: true,
        action: trigger.action,
        executionTime: now(),
        result
      };
    }

    return {
      triggerId: trigger.id,
      success: false,
      action: trigger.action,
      executionTime: now(),
      error: 'No handler provided'
    };
  };
}
