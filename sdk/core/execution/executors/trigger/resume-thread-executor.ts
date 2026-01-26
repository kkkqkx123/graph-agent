/**
 * 恢复线程执行器
 * 负责执行恢复线程的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import type { ThreadExecutor } from '../../thread-executor';
import { ValidationError } from '../../../../types/errors';

/**
 * 恢复线程执行器
 */
export class ResumeThreadExecutor extends BaseTriggerExecutor {
  /**
   * 执行恢复线程动作
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

      const { threadId, options } = action.parameters;

      if (!threadId) {
        throw new ValidationError('threadId is required for RESUME_THREAD action', 'parameters.threadId');
      }

      // 调用 ThreadExecutor 的 resume 方法
      const result = await threadExecutor.resume(threadId, options);

      return this.createSuccessResult(
        triggerId,
        action,
        { message: `Thread ${threadId} resumed successfully`, result },
        executionTime
      );
    } catch (error) {
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}