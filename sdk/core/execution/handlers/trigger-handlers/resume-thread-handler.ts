/**
 * 恢复线程处理函数
 * 
 * 负责执行恢复线程的触发动作
 * 通过ThreadLifecycleCoordinator协调恢复流程
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import { ValidationError, RuntimeValidationError } from '@modular-agent/types';
import { ExecutionContext } from '../../context/execution-context';
import { getErrorMessage } from '@modular-agent/common-utils';

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
 * 恢复线程处理函数
 * 
 * @param action 触发动作，包含 threadId 参数
 * @param triggerId 触发器ID
 * @param executionContext 执行上下文
 * @returns 执行结果
 */
export async function resumeThreadHandler(
  action: TriggerAction,
  triggerId: string,
  executionContext?: ExecutionContext
): Promise<TriggerExecutionResult> {
  const executionTime = Date.now();
  const context = executionContext || ExecutionContext.createDefault();

  try {
    const { threadId } = action.parameters;

    if (!threadId) {
      throw new RuntimeValidationError('threadId is required for RESUME_THREAD action', { operation: 'handle', field: 'parameters.threadId' });
    }

    // 通过Coordinator进行恢复流程协调
    // Coordinator负责：
    // 1. 更新线程状态为RUNNING
    // 2. 清除暂停标志
    // 3. 继续执行线程
    const lifecycleCoordinator = context.getLifecycleCoordinator();
    await lifecycleCoordinator.resumeThread(threadId);

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
