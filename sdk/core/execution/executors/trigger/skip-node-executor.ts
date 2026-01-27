/**
 * 跳过节点执行器
 * 负责执行跳过节点的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import type { NodeExecutionResult } from '../../../../types/thread';
import { ValidationError, NotFoundError } from '../../../../types/errors';
import { EventType } from '../../../../types/events';
import { getThreadRegistry, getEventManager } from '../../context/execution-context';

/**
 * 跳过节点执行器
 */
export class SkipNodeExecutor extends BaseTriggerExecutor {
  /**
   * 执行跳过节点动作
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

      const { threadId, nodeId } = action.parameters;

      if (!threadId) {
        throw new ValidationError('threadId is required for SKIP_NODE action', 'parameters.threadId');
      }

      if (!nodeId) {
        throw new ValidationError('nodeId is required for SKIP_NODE action', 'parameters.nodeId');
      }

      // 直接从 ThreadRegistry 获取 ThreadContext
      const threadRegistry = getThreadRegistry();
      const threadContext = threadRegistry.get(threadId);

      if (!threadContext) {
        throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
      }

      const thread = threadContext.thread;

      // 标记节点为跳过状态
      const result: NodeExecutionResult = {
        nodeId,
        nodeType: 'UNKNOWN',
        status: 'SKIPPED',
        step: thread.nodeResults.length + 1,
        executionTime: 0
      };

      thread.nodeResults.push(result);

      // 触发 NODE_COMPLETED 事件（状态为 SKIPPED）
      const eventManager = getEventManager();
      const completedEvent = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: threadContext.getWorkflowId(),
        threadId: threadContext.getThreadId(),
        nodeId,
        output: null,
        executionTime: 0
      };
      await eventManager.emit(completedEvent);

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