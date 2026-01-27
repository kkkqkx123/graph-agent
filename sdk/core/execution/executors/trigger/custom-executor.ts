/**
 * 自定义动作执行器
 * 负责执行自定义的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import { ValidationError } from '../../../../types/errors';

/**
 * 自定义动作执行器
 */
export class CustomExecutor extends BaseTriggerExecutor {
  /**
   * 执行自定义动作
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

      const { handler } = action.parameters;

      if (!handler || typeof handler !== 'function') {
        throw new ValidationError('handler is required and must be a function for CUSTOM action', 'parameters.handler');
      }

      // 执行自定义处理函数（不再传递 threadExecutor）
      const result = await handler(action.parameters);

      return this.createSuccessResult(
        triggerId,
        action,
        { message: 'Custom action executed successfully', result },
        executionTime
      );
    } catch (error) {
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}