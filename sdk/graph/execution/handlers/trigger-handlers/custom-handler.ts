/**
 * Graph 自定义动作处理函数
 *
 * 基于 sdk/core/triggers 通用框架实现 Graph 特定的自定义动作处理。
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import { RuntimeValidationError } from '@modular-agent/types';
import { executeCustomAction, type BaseTriggerDefinition, type BaseEventData } from '../../../../core/triggers/index.js';
import { getErrorMessage, now } from '@modular-agent/common-utils';

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
    error: getErrorMessage(error),
  };
}

/**
 * 自定义动作处理函数
 *
 * 使用通用框架执行自定义动作。
 *
 * @param action 触发动作
 * @param triggerId 触发器 ID
 * @returns 执行结果
 */
export async function customHandler(
  action: TriggerAction,
  triggerId: string
): Promise<TriggerExecutionResult> {
  const startTime = now();

  try {
    // 检查动作类型
    if (action.type !== 'custom') {
      throw new RuntimeValidationError(
        'Action type must be custom',
        { operation: 'handle', field: 'type' }
      );
    }

    const { handlerName, data } = action.parameters;

    if (!handlerName || typeof handlerName !== 'string') {
      throw new RuntimeValidationError(
        'handlerName is required and must be a string for CUSTOM action',
        { operation: 'handle', field: 'parameters.handlerName' }
      );
    }

    // 构建触发器定义（用于通用框架）
    const trigger: BaseTriggerDefinition = {
      id: triggerId,
      name: 'custom_trigger',
      condition: { eventType: 'custom' },
      action: {
        type: 'custom',
        parameters: action.parameters
      }
    };

    // 构建事件数据
    const eventData: BaseEventData = {
      type: 'custom',
      timestamp: startTime
    };

    // 使用通用框架执行
    const result = await executeCustomAction(trigger, eventData);

    if (result.success) {
      return createSuccessResult(
        triggerId,
        action,
        { message: 'Custom action executed successfully', result: result.result },
        startTime
      );
    } else {
      return createFailureResult(triggerId, action, result.error, startTime);
    }
  } catch (error) {
    return createFailureResult(triggerId, action, error, startTime);
  }
}
