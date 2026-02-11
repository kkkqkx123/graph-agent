/**
 * ExecuteToolCommand - 执行工具命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '@modular-agent/sdk/api/types/command';
import type { ToolOptions, ToolExecutionResult } from '@modular-agent/sdk/api/types/tools-types';
import type { APIDependencies } from '../../core/api-dependencies';

/**
 * 执行工具命令
 */
export class ExecuteToolCommand extends BaseCommand<ToolExecutionResult> {
  constructor(
    private readonly toolName: string,
    private readonly parameters: Record<string, any>,
    private readonly options: ToolOptions | undefined,
    private readonly dependencies: APIDependencies
  ) {
    super();
  }

  protected async executeInternal(): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionOptions = {
      timeout: this.options?.timeout,
      maxRetries: this.options?.maxRetries,
      retryDelay: this.options?.retryDelay,
      enableLogging: this.options?.enableLogging ?? true
    };

    // 验证工具参数
    const validation = this.dependencies.getToolService().validateParameters(this.toolName, this.parameters);
    if (!validation.valid) {
      throw new Error(`参数验证失败: ${validation.errors.join(', ')}`);
    }

    // 执行工具
    const result = await this.dependencies.getToolService().execute(this.toolName, this.parameters, executionOptions);
    const executionTime = Date.now() - startTime;

    const executionResult: ToolExecutionResult = {
      success: true,
      result: result.result,
      executionTime,
      toolName: this.toolName
    };

    return executionResult;
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