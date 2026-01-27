/**
 * SetVariableExecutor - 设置变量执行器
 * 负责执行设置变量的触发器动作
 */

import { BaseTriggerExecutor } from './base-trigger-executor';
import { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { NotFoundError } from '../../../../types/errors';
import { getThreadRegistry } from '../../context/execution-context';

/**
 * SetVariableExecutor - 设置变量执行器
 */
export class SetVariableExecutor extends BaseTriggerExecutor {
  /**
   * 执行设置变量动作
   * @param action 触发动作
   * @param triggerId 触发器 ID
   * @returns 执行结果
   */
  async execute(action: TriggerAction, triggerId: string): Promise<TriggerExecutionResult> {
    const startTime = Date.now();

    try {
      // 验证动作参数
      if (!this.validate(action)) {
        throw new Error('Invalid trigger action: missing required fields');
      }

      const { threadId, variables } = action.parameters;

      if (!threadId || !variables) {
        throw new Error('Missing required parameters: threadId and variables');
      }

      // 获取 ThreadContext
      const threadRegistry = getThreadRegistry();
      const threadContext = threadRegistry.get(threadId);

      if (!threadContext) {
        throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
      }

      // 使用 ThreadContext 的 updateVariable 方法更新已定义的变量
      for (const [name, value] of Object.entries(variables)) {
        threadContext.updateVariable(name, value);
      }

      const executionTime = Date.now() - startTime;

      return this.createSuccessResult(
        triggerId,
        action,
        { message: `Variables updated successfully in thread ${threadId}`, variables },
        executionTime
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}