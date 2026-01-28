/**
 * 停止线程处理函数
 * 负责执行停止线程的触发动作
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
    result: data
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
    error: error instanceof Error ? error.message : String(error)
  };
}

/**
 * 停止线程处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @returns 执行结果
 */
export async function stopThreadHandler(
  action: TriggerAction,
  triggerId: string
): Promise<TriggerExecutionResult> {
  const executionTime = Date.now();

  try {
    const { threadId } = action.parameters;

    if (!threadId) {
      throw new ValidationError('threadId is required for STOP_THREAD action', 'parameters.threadId');
    }

    // 从ThreadRegistry获取ThreadContext
    const threadRegistry = getThreadRegistry();
    const threadContext = threadRegistry.get(threadId);

    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;
    const status = threadContext.getStatus();

    if (status !== 'RUNNING' && status !== 'PAUSED') {
      throw new ValidationError(`Thread is not running or paused: ${threadId}`, 'threadId', threadId);
    }

    // 调用ThreadLifecycleManager
    const lifecycleManager = getThreadLifecycleManager();
    await lifecycleManager.cancelThread(thread);

    // 取消子thread（如果有）
    const childThreadIds = threadContext.getMetadata()?.childThreadIds as string[] || [];
    for (const childThreadId of childThreadIds) {
      const childContext = threadRegistry.get(childThreadId);
      if (childContext) {
        const childThread = childContext.thread;
        const childStatus = childContext.getStatus();
        if (childStatus === 'RUNNING' || childStatus === 'PAUSED') {
          await lifecycleManager.cancelThread(childThread);
        }
      }
    }

    return createSuccessResult(
      triggerId,
      action,
      { message: `Thread ${threadId} stopped successfully` },
      executionTime
    );
  } catch (error) {
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
