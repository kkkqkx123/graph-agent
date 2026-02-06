/**
 * ExecuteToolCommand - 执行工具命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../../core/command';
import { success, failure, ExecutionResult } from '../../../../types/execution-result';
import type { ToolOptions, ToolExecutionResult } from '../../../../types/tools-types';
import { toolService } from '../../../../../core/services/tool-service';

/**
 * 执行工具命令
 */
export class ExecuteToolCommand extends BaseCommand<ToolExecutionResult> {
  constructor(
    private readonly toolName: string,
    private readonly parameters: Record<string, any>,
    private readonly options?: ToolOptions
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<ToolExecutionResult>> {
    const startTime = Date.now();
    const executionOptions = {
      timeout: this.options?.timeout,
      maxRetries: this.options?.maxRetries,
      retryDelay: this.options?.retryDelay,
      enableLogging: this.options?.enableLogging ?? true
    };

    try {
      // 验证工具参数
      const validation = toolService.validateParameters(this.toolName, this.parameters);
      if (!validation.valid) {
        return failure<ToolExecutionResult>(
          `参数验证失败: ${validation.errors.join(', ')}`,
          Date.now() - startTime
        );
      }

      // 执行工具
      const result = await toolService.execute(this.toolName, this.parameters, executionOptions);
      const executionTime = Date.now() - startTime;

      const executionResult: ToolExecutionResult = {
        success: true,
        result: result.result,
        executionTime,
        toolName: this.toolName
      };

      return success(executionResult, executionTime);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      const executionResult: ToolExecutionResult = {
        success: false,
        error: errorMessage,
        executionTime,
        toolName: this.toolName
      };

      return success(executionResult, executionTime);
    }
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.toolName || this.toolName.trim().length === 0) {
      errors.push('工具名称不能为空');
    }

    if (!this.parameters) {
      errors.push('参数不能为null');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'ExecuteToolCommand',
      description: '执行工具',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}