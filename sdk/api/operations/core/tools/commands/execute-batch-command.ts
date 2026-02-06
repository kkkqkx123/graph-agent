/**
 * ExecuteBatchCommand - 批量执行工具命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../../core/command';
import { success, failure, ExecutionResult, isSuccess } from '../../../../types/execution-result';
import type { ToolOptions, ToolExecutionResult } from '../../../../types/tools-types';
import { toolService } from '../../../../../core/services/tool-service';
import { ExecuteToolCommand } from './execute-tool-command';

/**
 * 批量执行工具命令
 */
export class ExecuteBatchCommand extends BaseCommand<ToolExecutionResult[]> {
  constructor(
    private readonly executions: Array<{
      toolName: string;
      parameters: Record<string, any>;
      options?: ToolOptions;
    }>
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<ToolExecutionResult[]>> {
    try {
      const results = await Promise.all(
        this.executions.map(exec => {
          const command = new ExecuteToolCommand(exec.toolName, exec.parameters, exec.options);
          return command.execute();
        })
      );

      // 提取成功的结果数据
      const executionResults = results.map((result: ExecutionResult<ToolExecutionResult>) => {
        if (isSuccess(result)) {
          return result.data;
        } else {
          return {
            success: false,
            error: result.error,
            executionTime: result.executionTime,
            toolName: 'unknown'
          } as ToolExecutionResult;
        }
      });

      return success(executionResults, this.getExecutionTime());
    } catch (error) {
      return failure<ToolExecutionResult[]>(
        error instanceof Error ? error.message : String(error),
        this.getExecutionTime()
      );
    }
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.executions || this.executions.length === 0) {
      errors.push('执行列表不能为空');
    }

    for (let i = 0; i < this.executions.length; i++) {
      const exec = this.executions[i];
      if (!exec || !exec.toolName || exec.toolName.trim().length === 0) {
        errors.push(`执行${i}的工具名称不能为空`);
      }
      if (!exec || !exec.parameters) {
        errors.push(`执行${i}的参数不能为null`);
      }
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'ExecuteBatchCommand',
      description: '批量执行工具',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}