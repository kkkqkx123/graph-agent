/**
 * 设置变量执行器
 * 负责执行设置变量的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import type { ThreadExecutor } from '../../thread-executor';
import { ValidationError } from '../../../../types/errors';

/**
 * 设置变量执行器
 */
export class SetVariableExecutor extends BaseTriggerExecutor {
  /**
   * 执行设置变量动作
   * @param action 触发动作
   * @param triggerId 触发器 ID
   * @param threadExecutor 线程执行器
   * @returns 执行结果
   */
  async execute(
    action: TriggerAction,
    triggerId: string,
    threadExecutor: ThreadExecutor
  ): Promise<TriggerExecutionResult> {
    const executionTime = Date.now();

    try {
      // 验证动作
      if (!this.validate(action)) {
        throw new Error('Invalid trigger action');
      }

      const { threadId, variables } = action.parameters;

      if (!threadId) {
        throw new ValidationError('threadId is required for SET_VARIABLE action', 'parameters.threadId');
      }

      if (!variables || typeof variables !== 'object') {
        throw new ValidationError('variables is required and must be an object for SET_VARIABLE action', 'parameters.variables');
      }

      // 调用 ThreadExecutor 的 setVariables 方法
      await threadExecutor.setVariables(threadId, variables);

      return this.createSuccessResult(
        triggerId,
        action,
        { message: `Variables set successfully in thread ${threadId}`, variables },
        executionTime
      );
    } catch (error) {
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}