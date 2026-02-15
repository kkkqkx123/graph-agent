/**
 * 跳过节点处理函数
 * 负责执行跳过节点的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';
import type { NodeExecutionResult } from '@modular-agent/types';
import { ValidationError, NotFoundError, RuntimeValidationError, ThreadContextNotFoundError } from '@modular-agent/types';
import { EventType } from '@modular-agent/types';
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
 * 跳过节点处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @param executionContext 执行上下文
 * @returns 执行结果
 */
export async function skipNodeHandler(
  action: TriggerAction,
  triggerId: string,
  executionContext?: ExecutionContext
): Promise<TriggerExecutionResult> {
  const executionTime = Date.now();
  const context = executionContext || ExecutionContext.createDefault();

  try {
    const { threadId, nodeId } = action.parameters;

    if (!threadId) {
      throw new ValidationError('threadId is required for SKIP_NODE action', 'parameters.threadId');
    }

    if (!nodeId) {
      throw new ValidationError('nodeId is required for SKIP_NODE action', 'parameters.nodeId');
    }

    // 从ThreadRegistry获取ThreadContext
    const threadRegistry = context.getThreadRegistry();
    const threadContext = threadRegistry.get(threadId);

    if (!threadContext) {
      throw new ThreadContextNotFoundError(`ThreadContext not found: ${threadId}`, threadId);
    }

    const thread = threadContext.thread;

    // 标记节点为跳过状态
    const result: NodeExecutionResult = {
      nodeId,
      nodeType: 'UNKNOWN',
      status: 'SKIPPED',
      step: thread.nodeResults.length + 1,
      executionTime: 0
    };

    thread.nodeResults.push(result);

    // 触发NODE_COMPLETED事件（状态为SKIPPED）
    const eventManager = context.getEventManager();
    const completedEvent = {
      type: EventType.NODE_COMPLETED,
      timestamp: Date.now(),
      workflowId: threadContext.getWorkflowId(),
      threadId: threadContext.getThreadId(),
      nodeId,
      output: null,
      executionTime: 0
    };
    await eventManager.emit(completedEvent);

    return createSuccessResult(
      triggerId,
      action,
      { message: `Node ${nodeId} skipped successfully in thread ${threadId}` },
      executionTime
    );
  } catch (error) {
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
