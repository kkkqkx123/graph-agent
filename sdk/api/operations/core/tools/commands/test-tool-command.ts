/**
 * TestToolCommand - 测试工具命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../../core/command';
import { success, failure, ExecutionResult } from '../../../../types/execution-result';
import type { ToolTestResult } from '../../../../types/tools-types';
import { toolService } from '../../../../../core/services/tool-service';
import { ExecuteToolCommand } from './execute-tool-command';

/**
 * 测试工具命令
 */
export class TestToolCommand extends BaseCommand<ToolTestResult> {
  constructor(
    private readonly toolName: string,
    private readonly parameters: Record<string, any>
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<ToolTestResult>> {
    const startTime = Date.now();

    try {
      // 验证工具参数
      const validation = toolService.validateParameters(this.toolName, this.parameters);
      if (!validation.valid) {
        return failure<ToolTestResult>(
          `参数验证失败: ${validation.errors.join(', ')}`,
          Date.now() - startTime
        );
      }

      // 检查工具是否存在
      const tool = await toolService.getTool(this.toolName);
      if (!tool) {
        return failure<ToolTestResult>(
          `工具不存在: ${this.toolName}`,
          Date.now() - startTime
        );
      }

      // 执行测试（使用较短的默认超时）
      const command = new ExecuteToolCommand(this.toolName, this.parameters, {
        timeout: 5000,
        enableLogging: false
      });
      const result = await command.execute();

      const testResult: ToolTestResult = {
        passed: result.success,
        result: result.success ? result.data.result : undefined,
        error: result.success ? undefined : result.error,
        testTime: Date.now() - startTime,
        toolName: this.toolName
      };

      return success(testResult, testResult.testTime);
    } catch (error) {
      return failure<ToolTestResult>(
        error instanceof Error ? error.message : '未知错误',
        Date.now() - startTime
      );
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
      name: 'TestToolCommand',
      description: '测试工具',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}