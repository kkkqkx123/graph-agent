/**
 * ExecuteScriptCommand - 执行脚本命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../../core/command';
import { success, failure, ExecutionResult } from '../../../../types/execution-result';
import type { ScriptOptions } from '../../../../types/code-types';
import type { ScriptExecutionResult } from '../../../../../types/code';
import { ScriptType } from '../../../../../types/code';
import { codeService } from '../../../../../core/services/code-service';

/**
 * 执行脚本命令
 */
export class ExecuteScriptCommand extends BaseCommand<ScriptExecutionResult> {
  constructor(
    private readonly scriptName: string,
    private readonly options?: ScriptOptions
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<ScriptExecutionResult>> {
    const startTime = Date.now();
    const executionOptions = {
      timeout: this.options?.timeout,
      retries: this.options?.retries,
      retryDelay: this.options?.retryDelay,
      workingDirectory: this.options?.workingDirectory,
      environment: this.options?.environment,
      sandbox: this.options?.sandbox
    };

    try {
      // 验证脚本
      const validation = codeService.validateScript(this.scriptName);
      if (!validation.valid) {
        return failure<ScriptExecutionResult>(
          `脚本验证失败: ${validation.errors.join(', ')}`,
          Date.now() - startTime
        );
      }

      // 执行脚本
      const result = await codeService.execute(this.scriptName, executionOptions);
      const executionTime = Date.now() - startTime;

      const executionResult: ScriptExecutionResult = {
        ...result,
        executionTime
      };

      return success(executionResult, executionTime);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      const executionResult: ScriptExecutionResult = {
        success: false,
        scriptName: this.scriptName,
        scriptType: ScriptType.SHELL,
        stdout: undefined,
        stderr: errorMessage,
        exitCode: 1,
        executionTime,
        error: errorMessage
      };

      return success(executionResult, executionTime);
    }
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