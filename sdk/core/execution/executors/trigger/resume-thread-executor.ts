/**
 * 恢复线程执行器
 * 负责执行恢复线程的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import { ValidationError, NotFoundError } from '../../../../types/errors';
import { ExecutionSingletons } from '../../singletons';

/**
 * 恢复线程执行器
 */
export class ResumeThreadExecutor extends BaseTriggerExecutor {
  /**
   * 执行恢复线程动作
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

      const { threadId, options } = action.parameters;

      if (!threadId) {
        throw new ValidationError('threadId is required for RESUME_THREAD action', 'parameters.threadId');
      }

      // 直接从 ThreadRegistry 获取 ThreadContext
      const threadRegistry = ExecutionSingletons.getThreadRegistry();
      const threadContext = threadRegistry.get(threadId);

      if (!threadContext) {
        throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
      }

      const thread = threadContext.thread;

      if (threadContext.getStatus() !== 'PAUSED') {
        throw new ValidationError(`Thread is not paused: ${threadId}`, 'threadId', threadId);
      }

      // 直接调用 ThreadLifecycleManager
      const lifecycleManager = ExecutionSingletons.getThreadLifecycleManager();
      await lifecycleManager.resumeThread(thread);

      // 继续执行（简化处理，只返回成功消息）
      return this.createSuccessResult(
        triggerId,
        action,
        { message: `Thread ${threadId} resumed successfully` },
        executionTime
      );
    } catch (error) {
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}