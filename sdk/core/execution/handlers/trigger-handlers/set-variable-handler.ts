/**
 * 设置变量处理函数
 * 负责执行设置变量的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { NotFoundError } from '../../../../types/errors';
import { getThreadRegistry } from '../../context/execution-context';

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
 * @returns 执行结果
 */
export async function setVariableHandler(
  action: TriggerAction,
  triggerId: string
): Promise<TriggerExecutionResult> {
  const startTime = Date.now();

  try {
    const { threadId, variables } = action.parameters;

    if (!threadId || !variables) {
      throw new Error('Missing required parameters: threadId and variables');
    }

    // 获取ThreadContext
    const threadRegistry = getThreadRegistry();
    const threadContext = threadRegistry.get(threadId);

    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    // 使用ThreadContext的updateVariable方法更新已定义的变量
    for (const [name, value] of Object.entries(variables)) {
      threadContext.updateVariable(name, value);
    }

    const executionTime = Date.now() - startTime;

    return createSuccessResult(
      triggerId,
      action,
      { message: `Variables updated successfully in thread ${threadId}`, variables },
      executionTime
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
