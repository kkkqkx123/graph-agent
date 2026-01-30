/**
 * 暂停线程处理函数
 * 负责执行暂停线程的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { ValidationError, NotFoundError } from '../../../../types/errors';
import { ExecutionContext } from '../../context/execution-context';

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
 * 暂停线程处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @param executionContext 执行上下文
 * @returns 执行结果
 */
export async function pauseThreadHandler(
  action: TriggerAction,
  triggerId: string,
  executionContext?: ExecutionContext
): Promise<TriggerExecutionResult> {
  const executionTime = Date.now();
  const context = executionContext || ExecutionContext.createDefault();

  try {
    const { threadId } = action.parameters;

    if (!threadId) {
      throw new ValidationError('threadId is required for PAUSE_THREAD action', 'parameters.threadId');
    }

    // 从ThreadRegistry获取ThreadContext
    const threadRegistry = context.getThreadRegistry();
    const threadContext = threadRegistry.get(threadId);

    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    if (threadContext.getStatus() !== 'RUNNING') {
      throw new ValidationError(`Thread is not running: ${threadId}`, 'threadId', threadId);
    }

    // 调用ThreadLifecycleManager
    const lifecycleManager = context.getThreadLifecycleManager();
    await lifecycleManager.pauseThread(thread);

    return createSuccessResult(
      triggerId,
      action,
      { message: `Thread ${threadId} paused successfully` },
      executionTime
    );
  } catch (error) {
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
