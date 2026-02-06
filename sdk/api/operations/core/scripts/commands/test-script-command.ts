/**
 * TestScriptCommand - 测试脚本命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../../core/command';
import { success, failure, ExecutionResult } from '../../../../types/execution-result';
import type { ScriptOptions, ScriptTestResult } from '../../../../types/code-types';
import { codeService } from '../../../../../core/services/code-service';
import { ExecuteScriptCommand } from './execute-script-command';

/**
 * 测试脚本命令
 */
export class TestScriptCommand extends BaseCommand<ScriptTestResult> {
  constructor(
    private readonly scriptName: string,
    private readonly options?: ScriptOptions
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<ScriptTestResult>> {
    const startTime = Date.now();

    try {
      // 验证脚本
      const validation = codeService.validateScript(this.scriptName);
      if (!validation.valid) {
        return failure<ScriptTestResult>(
          `脚本验证失败: ${validation.errors.join(', ')}`,
          Date.now() - startTime
        );
      }

      // 检查脚本是否存在
      const script = await codeService.getScript(this.scriptName);
      if (!script) {
        return failure<ScriptTestResult>(
          `脚本不存在: ${this.scriptName}`,
          Date.now() - startTime
        );
      }

      // 执行测试（使用较短的默认超时）
      const command = new ExecuteScriptCommand(this.scriptName, {
        ...this.options,
        timeout: this.options?.timeout ?? 10000,
        enableLogging: false
      });
      const result = await command.execute();

      const testResult: ScriptTestResult = {
        passed: result.success,
        result: result.success ? result.data : undefined,
        error: result.success ? undefined : (result as any).data?.error || result.error,
        testTime: Date.now() - startTime,
        scriptName: this.scriptName
      };

      return success(testResult, testResult.testTime);
    } catch (error) {
      return failure<ScriptTestResult>(
        error instanceof Error ? error.message : '未知错误',
        Date.now() - startTime
      );
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
      name: 'TestScriptCommand',
      description: '测试脚本',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}