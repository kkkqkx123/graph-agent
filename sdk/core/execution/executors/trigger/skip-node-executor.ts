/**
 * 跳过节点执行器
 * 负责执行跳过节点的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import type { ThreadExecutor } from '../../thread-executor';
import { ValidationError } from '../../../../types/errors';

/**
 * 跳过节点执行器
 */
export class SkipNodeExecutor extends BaseTriggerExecutor {
  /**
   * 执行跳过节点动作
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

      const { threadId, nodeId } = action.parameters;

      if (!threadId) {
        throw new ValidationError('threadId is required for SKIP_NODE action', 'parameters.threadId');
      }

      if (!nodeId) {
        throw new ValidationError('nodeId is required for SKIP_NODE action', 'parameters.nodeId');
      }

      // 调用 ThreadExecutor 的 skipNode 方法
      await threadExecutor.skipNode(threadId, nodeId);

      return this.createSuccessResult(
        triggerId,
        action,
        { message: `Node ${nodeId} skipped successfully in thread ${threadId}` },
        executionTime
      );
    } catch (error) {
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}