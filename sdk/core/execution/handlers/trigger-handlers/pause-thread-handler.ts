/**
 * 暂停线程处理函数
 * 
 * 负责执行暂停线程的触发动作
 * 通过ThreadLifecycleCoordinator协调暂停流程
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import { ValidationError, RuntimeValidationError } from '@modular-agent/types';
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
 * 
 * @param action 触发动作，包含 threadId 参数
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
      throw new RuntimeValidationError('threadId is required for PAUSE_THREAD action', { operation: 'handle', field: 'parameters.threadId' });
    }

    // 通过Coordinator进行暂停流程协调
    // Coordinator负责：
    // 1. 设置暂停标志
    // 2. 等待执行器响应
    // 3. 更新线程状态
    const lifecycleCoordinator = context.getLifecycleCoordinator();
    await lifecycleCoordinator.pauseThread(threadId);

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
