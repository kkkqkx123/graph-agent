/**
 * 自定义动作处理函数
 * 负责执行自定义的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types/trigger';
import { ValidationError, RuntimeValidationError } from '@modular-agent/types/errors';

/**
 * 创建成功结果
 */
function createSuccessResult(
  triggerId: string,
  action: TriggerAction,
  data: any,
  executionTime: number
): TriggerExecutionResult {
  return {
    triggerId,
    success: true,
    action,
    executionTime,
    result: data,
  };
}

/**
 * 创建失败结果
 */
function createFailureResult(
  triggerId: string,
  action: TriggerAction,
  error: any,
  executionTime: number
): TriggerExecutionResult {
  return {
    triggerId,
    success: false,
    action,
    executionTime,
    error: error instanceof Error ? error.message : String(error),

  };
}

/**
 * 自定义动作处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @returns 执行结果
 */
export async function customHandler(
  action: TriggerAction,
  triggerId: string
): Promise<TriggerExecutionResult> {
  const executionTime = Date.now();

  try {
    const { handler } = action.parameters;

    if (!handler || typeof handler !== 'function') {
      throw new RuntimeValidationError('handler is required and must be a function for CUSTOM action', { operation: 'handle', field: 'parameters.handler' });
    }

    // 执行自定义处理函数
    const result = await handler(action.parameters);

    return createSuccessResult(
      triggerId,
      action,
      { message: 'Custom action executed successfully', result },
      executionTime
    );
  } catch (error) {
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
