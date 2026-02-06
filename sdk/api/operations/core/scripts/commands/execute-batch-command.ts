/**
 * ExecuteBatchCommand - 批量执行脚本命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../../core/command';
import { success, failure, ExecutionResult } from '../../../../types/execution-result';
import type { ScriptOptions, ScriptBatchExecutionConfig } from '../../../../types/code-types';
import type { ScriptExecutionResult } from '../../../../../types/code';
import { ScriptType } from '../../../../../types/code';
import { ExecuteScriptCommand } from './execute-script-command';

/**
 * 批量执行脚本命令
 */
export class ExecuteBatchCommand extends BaseCommand<ScriptExecutionResult[]> {
  constructor(
    private readonly executions: Array<{
      scriptName: string;
      options?: ScriptOptions;
    }>,
    private readonly config?: ScriptBatchExecutionConfig
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<ScriptExecutionResult[]>> {
    const batchConfig = {
      parallel: this.config?.parallel ?? true,
      maxConcurrency: this.config?.maxConcurrency ?? 5,
      continueOnFailure: this.config?.continueOnFailure ?? false,
      enableLogging: this.config?.enableLogging ?? true
    };

    try {
      if (batchConfig.parallel) {
        // 并行执行
        const results: ScriptExecutionResult[] = [];
        const chunks = this.chunkArray(this.executions, batchConfig.maxConcurrency);

        for (const chunk of chunks) {
          const chunkResults = await Promise.all(
            chunk.map(exec =>
              this.executeSingle(exec, batchConfig.continueOnFailure, batchConfig.enableLogging)
            )
          );
          results.push(...chunkResults);
        }

        return success(results, this.getExecutionTime());
      } else {
        // 串行执行
        const results: ScriptExecutionResult[] = [];
        for (const exec of this.executions) {
          const result = await this.executeSingle(exec, batchConfig.continueOnFailure, batchConfig.enableLogging);
          results.push(result);
        }
        return success(results, this.getExecutionTime());
      }
    } catch (error) {
      return failure<ScriptExecutionResult[]>(
        error instanceof Error ? error.message : String(error),
        this.getExecutionTime()
      );
    }
  }

  private async executeSingle(
    exec: { scriptName: string; options?: ScriptOptions },
    continueOnFailure: boolean,
    enableLogging: boolean
  ): Promise<ScriptExecutionResult> {
    try {
      const command = new ExecuteScriptCommand(exec.scriptName, {
        ...exec.options,
        enableLogging
      });
      const result = await command.execute();
      return result.success ? result.data : this.createFailureResult(exec.scriptName, result.error);
    } catch (error) {
      if (continueOnFailure) {
        return this.createFailureResult(exec.scriptName, error instanceof Error ? error.message : '未知错误');
      }
      throw error;
    }
  }

  private createFailureResult(scriptName: string, error: string): ScriptExecutionResult {
    return {
      success: false,
      scriptName,
      scriptType: ScriptType.SHELL,
      stdout: undefined,
      stderr: error,
      exitCode: 1,
      executionTime: 0,
      error
    };
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.executions || this.executions.length === 0) {
      errors.push('执行列表不能为空');
    }

    for (let i = 0; i < this.executions.length; i++) {
      const exec = this.executions[i];
      if (!exec || !exec.scriptName || exec.scriptName.trim().length === 0) {
        errors.push(`执行${i}的脚本名称不能为空`);
      }
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'ExecuteBatchCommand',
      description: '批量执行脚本',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}