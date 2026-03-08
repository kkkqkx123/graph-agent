/**
 * ExecuteToolCommand - 执行工具命令
 */

import { now, diffTimestamp } from '@modular-agent/common-utils';
import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command.js';
import type { ID, ToolOptions } from '@modular-agent/types';
import type { ToolExecutionResult } from '@modular-agent/types';
import type { APIDependencyManager } from '../../../core/sdk-dependencies.js';

/**
 * 执行工具命令
 */
export class ExecuteToolCommand extends BaseCommand<ToolExecutionResult> {
  constructor(
    private readonly toolId: ID,
    private readonly parameters: Record<string, any>,
    private readonly options: ToolOptions | undefined,
    private readonly dependencies: APIDependencyManager
  ) {
    super();
  }

  protected async executeInternal(): Promise<ToolExecutionResult> {
    const startTime = now();
    const executionOptions = {
      timeout: this.options?.timeout,
      maxRetries: this.options?.maxRetries,
      retryDelay: this.options?.retryDelay,
      enableLogging: this.options?.enableLogging ?? true
    };

    // 验证工具参数
    const validation = this.dependencies.getToolService().validateParameters(this.toolId, this.parameters);
    if (!validation.valid) {
      throw new Error(`参数验证失败: ${validation.errors.join(', ')}`);
    }

    // 执行工具
    const result = await this.dependencies.getToolService().execute(this.toolId, this.parameters, executionOptions);
    const executionTime = diffTimestamp(startTime, now());

    // 处理 Result 类型，提取成功的结果或抛出错误
    if (result.isErr()) {
      throw result.error;
    }

    const executionResult: ToolExecutionResult = {
      success: true,
      result: result.value.result,
      executionTime,
      retryCount: 0
    };

    return executionResult;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.toolId || this.toolId.trim().length === 0) {
      errors.push('工具ID不能为空');
    }

    if (!this.parameters) {
      errors.push('参数不能为null');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}