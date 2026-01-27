/**
 * 发送通知执行器
 * 负责执行发送通知的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import { ValidationError } from '../../../../types/errors';

/**
 * 发送通知执行器
 */
export class SendNotificationExecutor extends BaseTriggerExecutor {
  /**
   * 执行发送通知动作
   * @param action 触发动作
   * @param triggerId 触发器 ID
   * @param threadBuilder 线程构建器
   * @returns 执行结果
   */
  async execute(
    action: TriggerAction,
    triggerId: string,
  ): Promise<TriggerExecutionResult> {
    const executionTime = Date.now();

    try {
      // 验证动作
      if (!this.validate(action)) {
        throw new Error('Invalid trigger action');
      }

      const { message, recipients, level } = action.parameters;

      if (!message) {
        throw new ValidationError('message is required for SEND_NOTIFICATION action', 'parameters.message');
      }

      // 实现通知发送逻辑
      // 这里可以根据实际需求集成邮件、短信、webhook 等通知方式
      const notificationResult = {
        message,
        recipients: recipients || [],
        level: level || 'info',
        timestamp: executionTime,
        status: 'sent'
      };

      // TODO: 集成实际的通知服务
      // 例如：await notificationService.send(notificationResult);

      return this.createSuccessResult(
        triggerId,
        action,
        { message: 'Notification sent successfully', notification: notificationResult },
        executionTime
      );
    } catch (error) {
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}