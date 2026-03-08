/**
 * ExecuteScriptCommand - 执行脚本命令
 */

import { now, diffTimestamp } from '@modular-agent/common-utils';
import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command.js';
import type { ScriptOptions } from '@modular-agent/types';
import type { ScriptExecutionResult } from '@modular-agent/types';
import type { APIDependencyManager } from '../../../core/sdk-dependencies.js';

/**
 * 执行脚本命令
 */
export class ExecuteScriptCommand extends BaseCommand<ScriptExecutionResult> {
  constructor(
    private readonly scriptName: string,
    private readonly options: ScriptOptions | undefined,
    private readonly dependencies: APIDependencyManager
  ) {
    super();
  }

  protected async executeInternal(): Promise<ScriptExecutionResult> {
    const startTime = now();
    const executionOptions = {
      timeout: this.options?.timeout,
      retries: this.options?.retries,
      retryDelay: this.options?.retryDelay,
      workingDirectory: this.options?.workingDirectory,
      environment: this.options?.environment,
      sandbox: this.options?.sandbox
    };

    // 验证脚本（使用执行器验证）
    const validation = this.dependencies.getScriptService().validateScriptWithExecutor(this.scriptName);
    if (!validation.valid) {
      throw new Error(`脚本验证失败: ${validation.errors.join(', ')}`);
    }

    // 执行脚本
    const result = await this.dependencies.getScriptService().execute(this.scriptName, executionOptions);
    const executionTime = diffTimestamp(startTime, now());

    // 处理 Result 类型，提取成功的结果或抛出错误
    if (result.isErr()) {
      throw result.error;
    }

    const executionResult: ScriptExecutionResult = {
      ...result.value,
      executionTime
    };

    return executionResult;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.scriptName || this.scriptName.trim().length === 0) {
      errors.push('脚本名称不能为空');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}