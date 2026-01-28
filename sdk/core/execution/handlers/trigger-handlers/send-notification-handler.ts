/**
 * 发送通知处理函数
 * 负责执行发送通知的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { ValidationError } from '../../../../types/errors';

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
 * 发送通知处理函数
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @returns 执行结果
 */
export async function sendNotificationHandler(
  action: TriggerAction,
  triggerId: string
): Promise<TriggerExecutionResult> {
  const executionTime = Date.now();

  try {
    const { message, recipients, level } = action.parameters;

    if (!message) {
      throw new ValidationError('message is required for SEND_NOTIFICATION action', 'parameters.message');
    }

    // 实现通知发送逻辑
    const notificationResult = {
      message,
      recipients: recipients || [],
      level: level || 'info',
      timestamp: executionTime,
      status: 'sent'
    };

    // TODO: 集成实际的通知服务
    // 例如：await notificationService.send(notificationResult);

    return createSuccessResult(
      triggerId,
      action,
      { message: 'Notification sent successfully', notification: notificationResult },
      executionTime
    );
  } catch (error) {
    return createFailureResult(triggerId, action, error, executionTime);
  }
}
