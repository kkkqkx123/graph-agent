/**
 * 恢复线程处理函数
 * 负责执行恢复线程的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { ValidationError, NotFoundError } from '../../../../types/errors';
import { getThreadRegistry, getThreadLifecycleManager } from '../../context/execution-context';

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
 * 恢复线程处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @returns 执行结果
 */
export async function resumeThreadHandler(
  action: TriggerAction,
  triggerId: string
): Promise<TriggerExecutionResult> {
  const executionTime = Date.now();

  try {
    const { threadId } = action.parameters;

    if (!threadId) {
      throw new ValidationError('threadId is required for RESUME_THREAD action', 'parameters.threadId');
    }

    // 从ThreadRegistry获取ThreadContext
    const threadRegistry = getThreadRegistry();
    const threadContext = threadRegistry.get(threadId);

    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    if (threadContext.getStatus() !== 'PAUSED') {
      throw new ValidationError(`Thread is not paused: ${threadId}`, 'threadId', threadId);
    }

    // 调用ThreadLifecycleManager
    const lifecycleManager = getThreadLifecycleManager();
    await lifecycleManager.resumeThread(thread);

    return createSuccessResult(
      triggerId,
      action,
      { message: `Thread ${threadId} resumed successfully` },
      executionTime
    );
  } catch (error) {
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
