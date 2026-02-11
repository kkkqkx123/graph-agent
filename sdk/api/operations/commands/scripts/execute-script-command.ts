/**
 * ExecuteScriptCommand - 执行脚本命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '@modular-agent/sdk/api/types/command';
import type { ScriptOptions } from '@modular-agent/sdk/api/types/code-types';
import type { ScriptExecutionResult } from '@modular-agent/types/code';
import type { APIDependencies } from '../../core/api-dependencies';

/**
 * 执行脚本命令
 */
export class ExecuteScriptCommand extends BaseCommand<ScriptExecutionResult> {
  constructor(
    private readonly scriptName: string,
    private readonly options: ScriptOptions | undefined,
    private readonly dependencies: APIDependencies
  ) {
    super();
  }

  protected async executeInternal(): Promise<ScriptExecutionResult> {
    const startTime = Date.now();
    const executionOptions = {
      timeout: this.options?.timeout,
      retries: this.options?.retries,
      retryDelay: this.options?.retryDelay,
      workingDirectory: this.options?.workingDirectory,
      environment: this.options?.environment,
      sandbox: this.options?.sandbox
    };

    // 验证脚本
    const validation = this.dependencies.getCodeService().validateScript(this.scriptName);
    if (!validation.valid) {
      throw new Error(`脚本验证失败: ${validation.errors.join(', ')}`);
    }

    // 执行脚本
    const result = await this.dependencies.getCodeService().execute(this.scriptName, executionOptions);
    const executionTime = Date.now() - startTime;

    const executionResult: ScriptExecutionResult = {
      ...result,
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

  getMetadata(): CommandMetadata {
    return {
      name: 'ExecuteScriptCommand',
      description: '执行脚本',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}