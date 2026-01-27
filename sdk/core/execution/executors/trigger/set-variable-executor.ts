/**
 * 设置变量执行器
 * 负责执行设置变量的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import { ValidationError, NotFoundError } from '../../../../types/errors';
import { getThreadRegistry } from '../../context/execution-context';

/**
 * 设置变量执行器
 */
export class SetVariableExecutor extends BaseTriggerExecutor {
  /**
   * 执行设置变量动作
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

      const { threadId, variables } = action.parameters;

      if (!threadId) {
        throw new ValidationError('threadId is required for SET_VARIABLE action', 'parameters.threadId');
      }

      if (!variables || typeof variables !== 'object') {
        throw new ValidationError('variables is required and must be an object for SET_VARIABLE action', 'parameters.variables');
      }

      // 直接从 ThreadRegistry 获取 ThreadContext
      const threadRegistry = getThreadRegistry();
      const threadContext = threadRegistry.get(threadId);

      if (!threadContext) {
        throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
      }

      // 使用 ThreadContext 的 setVariable 方法设置变量
      for (const [name, value] of Object.entries(variables)) {
        threadContext.setVariable(name, value, typeof value as any, 'local', false);
      }

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