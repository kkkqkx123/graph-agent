/**
 * 设置变量处理函数
 * 负责执行设置变量的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import { NotFoundError, ValidationError, RuntimeValidationError, ThreadContextNotFoundError } from '@modular-agent/types';
import type { ThreadRegistry } from '../../../services/thread-registry.js';
import { now, diffTimestamp } from '@modular-agent/common-utils';

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
 * 设置变量处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @param executionContext 执行上下文
 * @returns 执行结果
 */
export async function setVariableHandler(
  action: TriggerAction,
  triggerId: string,
  threadRegistry: ThreadRegistry
): Promise<TriggerExecutionResult> {
  const startTime = now();

  try {
    const { threadId, variables } = action.parameters;

    if (!threadId || !variables) {
      throw new RuntimeValidationError('Missing required parameters: threadId and variables', { operation: 'handle' });
    }

    // 获取ThreadEntity
    const threadEntity = threadRegistry.get(threadId);

    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`ThreadEntity not found: ${threadId}`, threadId);
    }

    // 使用ThreadEntity的setVariable方法更新变量
    for (const [name, value] of Object.entries(variables)) {
      threadEntity.setVariable(name, value);
    }

    const executionTime = diffTimestamp(startTime, now());

    return createSuccessResult(
      triggerId,
      action,
      { message: `Variables updated successfully in thread ${threadId}`, variables },
      executionTime
    );
  } catch (error) {
    const executionTime = diffTimestamp(startTime, now());
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
