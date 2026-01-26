/**
 * 启动工作流执行器
 * 负责执行启动工作流的触发动作
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import type { ThreadExecutor } from '../../thread-executor';
import type { WorkflowDefinition } from '../../../../types/workflow';
import type { ThreadOptions } from '../../../../types/thread';
import { ValidationError } from '../../../../types/errors';

/**
 * 启动工作流执行器
 */
export class StartWorkflowExecutor extends BaseTriggerExecutor {
  /**
   * 执行启动工作流动作
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

      const { workflow, options } = action.parameters;

      if (!workflow) {
        throw new ValidationError('workflow is required for START_WORKFLOW action', 'parameters.workflow');
      }

      // 调用 ThreadExecutor 的 execute 方法启动工作流
      const result = await threadExecutor.execute(workflow as WorkflowDefinition, options as ThreadOptions);

      return this.createSuccessResult(
        triggerId,
        action,
        {
          message: `Workflow ${workflow.id} started successfully`,
          threadId: result.threadId,
          result
        },
        executionTime
      );
    } catch (error) {
      return this.createFailureResult(triggerId, action, error, executionTime);
    }
  }
}