/**
 * 停止线程执行器
 * 负责执行停止线程的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import { ValidationError, NotFoundError } from '../../../../types/errors';
import { getThreadRegistry, getThreadLifecycleManager } from '../../context/execution-context';

/**
 * 停止线程执行器
 */
export class StopThreadExecutor extends BaseTriggerExecutor {
  /**
   * 执行停止线程动作
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

      const { threadId } = action.parameters;

      if (!threadId) {
        throw new ValidationError('threadId is required for STOP_THREAD action', 'parameters.threadId');
      }

      // 直接从 ThreadRegistry 获取 ThreadContext
      const threadRegistry = getThreadRegistry();
      const threadContext = threadRegistry.get(threadId);

      if (!threadContext) {
        throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
      }

      const thread = threadContext.thread;
      const status = threadContext.getStatus();

      if (status !== 'RUNNING' && status !== 'PAUSED') {
        throw new ValidationError(`Thread is not running or paused: ${threadId}`, 'threadId', threadId);
      }

      // 直接调用 ThreadLifecycleManager
      const lifecycleManager = getThreadLifecycleManager();
      await lifecycleManager.cancelThread(thread);

      // 取消子 thread（如果有）
      const childThreadIds = threadContext.getMetadata()?.childThreadIds as string[] || [];
      for (const childThreadId of childThreadIds) {
        const childContext = threadRegistry.get(childThreadId);
        if (childContext) {
          const childThread = childContext.thread;
          const childStatus = childContext.getStatus();
          if (childStatus === 'RUNNING' || childStatus === 'PAUSED') {
            await lifecycleManager.cancelThread(childThread);
          }
        }
      }

      return this.createSuccessResult(
        triggerId,
        action,
        { message: `Thread ${threadId} stopped successfully` },
        executionTime
      );
    } catch (error) {
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}