/**
 * Command执行器
 * 负责执行命令并管理中间件链
 */

import type { Command, CommandValidationResult } from '../types/command';
import type { ExecutionResult } from '../types/execution-result';
import { failure } from '../types/execution-result';
import { SDKError, ExecutionError as SDKExecutionError, ValidationError } from '@modular-agent/types';
import { isError } from '@modular-agent/common-utils';

/**
 * Command执行器
 */
export class CommandExecutor {

  /**
   * 执行命令
   * @param command 命令
   * @returns 执行结果
   */
  async execute<T>(command: Command<T>): Promise<ExecutionResult<T>> {
    // 验证命令
    const validation: CommandValidationResult = command.validate();
    if (!validation.valid) {
      return failure<T>(
        new ValidationError(
          `Validation failed: ${validation.errors.join(', ')}`,
          undefined,
          undefined,
          { errors: validation.errors }
        ),
        0
      );
    }

    // 执行命令
    try {
      return await command.execute();
    } catch (error) {
      let sdkError: SDKError;
      
      // 如果已经是 SDKError（包括所有子类），直接使用
      if (error instanceof SDKError) {
        sdkError = error;
      }
      // 如果是普通 Error，转换为 SDKExecutionError
      else if (isError(error)) {
        sdkError = new SDKExecutionError(
          error.message,
          undefined,
          undefined,
          {
            originalError: error.name,
            stack: error.stack
          },
          error
        );
      }
      // 其他类型，转换为 SDKExecutionError
      else {
        sdkError = new SDKExecutionError(String(error));
      }
      
      return failure<T>(sdkError, 0);
    }
  }

}