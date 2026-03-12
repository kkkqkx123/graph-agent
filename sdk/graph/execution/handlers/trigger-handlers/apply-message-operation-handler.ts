/**
 * 应用消息操作处理函数
 * 
 * 负责执行应用消息操作（如上下文压缩、消息截断等）的触发动作
 * 通过ThreadRegistry获取线程的ConversationManager执行操作
 */

import type { TriggerAction, TriggerExecutionResult, MessageOperationConfig } from '@modular-agent/types';
import { ValidationError, RuntimeValidationError } from '@modular-agent/types';
import type { ThreadRegistry } from '../../../services/thread-registry.js';
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
 * 应用消息操作处理函数
 * 
 * @param action 触发动作，包含 threadId 和 operationConfig 参数
 * @param triggerId 触发器ID
 * @param threadRegistry 线程注册表
 * @returns 执行结果
 */
export async function applyMessageOperationHandler(
  action: TriggerAction,
  triggerId: string,
  threadRegistry: ThreadRegistry
): Promise<TriggerExecutionResult> {
  const executionTime = now();

  try {
    const { threadId, operationConfig } = action.parameters as { threadId?: string, operationConfig?: MessageOperationConfig };

    if (!threadId) {
      throw new RuntimeValidationError('threadId is required for APPLY_MESSAGE_OPERATION action', { operation: 'handle', field: 'parameters.threadId' });
    }

    if (!operationConfig) {
      throw new RuntimeValidationError('operationConfig is required for APPLY_MESSAGE_OPERATION action', { operation: 'handle', field: 'parameters.operationConfig' });
    }

    const threadEntity = threadRegistry.get(threadId);
    if (!threadEntity) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    const conversationManager = threadEntity.getConversationManager();
    if (!conversationManager) {
      throw new Error(`Conversation manager not found for thread: ${threadId}`);
    }
    const result = await conversationManager.executeMessageOperation(operationConfig);

    return createSuccessResult(
      triggerId,
      action,
      { 
        message: `Message operation ${operationConfig.operation} applied successfully to thread ${threadId}`,
        stats: result.stats
      },
      executionTime
    );
  } catch (error) {
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
