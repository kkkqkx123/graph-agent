/**
 * 恢复线程处理函数
 * 
 * 负责执行恢复线程的触发动作
 * 通过ThreadLifecycleCoordinator协调恢复流程
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import { ValidationError, RuntimeValidationError } from '@modular-agent/types';
import type { ThreadLifecycleCoordinator } from '../../coordinators/thread-lifecycle-coordinator.js';
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
  lifecycleCoordinator: ThreadLifecycleCoordinator
): Promise<TriggerExecutionResult> {
  const executionTime = now();

  try {
    // 检查动作类型
    if (action.type !== 'resume_thread') {
      throw new RuntimeValidationError('Action type must be resume_thread', { operation: 'handle', field: 'type' });
    }

    const { threadId } = action.parameters;

    // 通过Coordinator进行恢复流程协调
    // Coordinator负责：
    // 1. 更新线程状态为RUNNING
    // 2. 清除暂停标志
    // 3. 继续执行线程
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
