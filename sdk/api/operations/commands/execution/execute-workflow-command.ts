/**
 * ExecuteWorkflowCommand - 执行工作流命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../core/command';
import { success, failure, ExecutionResult } from '../../../types/execution-result';
import type { ThreadResult, ThreadOptions } from '../../../../types/thread';
import type { WorkflowDefinition } from '../../../../types/workflow';
import { ThreadLifecycleCoordinator } from '../../../../core/execution/coordinators/thread-lifecycle-coordinator';
import { workflowRegistry, type WorkflowRegistry } from '../../../../core/services/workflow-registry';

/**
 * 执行工作流命令参数
 */
export interface ExecuteWorkflowParams {
  /** 工作流ID */
  workflowId?: string;
  /** 工作流定义 */
  workflowDefinition?: WorkflowDefinition;
  /** 执行选项 */
  options?: ThreadOptions;
}

/**
 * 执行工作流命令
 */
export class ExecuteWorkflowCommand extends BaseCommand<ThreadResult> {
  constructor(
    private readonly params: ExecuteWorkflowParams,
    private readonly lifecycleCoordinator: ThreadLifecycleCoordinator,
    private readonly workflowRegistry: WorkflowRegistry = workflowRegistry
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<ThreadResult>> {
    try {
      let workflowId: string;

      // 如果提供了工作流定义，先注册
      if (this.params.workflowDefinition) {
        this.workflowRegistry.register(this.params.workflowDefinition);
        workflowId = this.params.workflowDefinition.id;
      } else if (this.params.workflowId) {
        workflowId = this.params.workflowId;
      } else {
        return failure<ThreadResult>('必须提供workflowId或workflowDefinition', this.getExecutionTime());
      }

      // 执行工作流
      const result = await this.lifecycleCoordinator.execute(workflowId, this.params.options || {});
      return success(result, this.getExecutionTime());
    } catch (error) {
      return failure<ThreadResult>(
        error instanceof Error ? error.message : String(error),
        this.getExecutionTime()
      );
    }
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.workflowId && !this.params.workflowDefinition) {
      errors.push('必须提供workflowId或workflowDefinition');
    }

    if (this.params.workflowId && this.params.workflowDefinition) {
      errors.push('不能同时提供workflowId和workflowDefinition');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'ExecuteWorkflowCommand',
      description: '执行工作流',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}