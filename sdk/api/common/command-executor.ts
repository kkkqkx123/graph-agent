/**
 * Command执行器
 * 负责执行命令并管理中间件链
 */

import type { Command, CommandValidationResult } from '../types/command';
import type { ExecutionResult } from '../types/execution-result';
import { failure } from '../types/execution-result';
import { SDKError, ExecutionError as SDKExecutionError } from '@modular-agent/types';

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
        new SDKExecutionError(
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
      let executionError: SDKExecutionError;
      
      // 如果已经是 SDKExecutionError，直接使用
      if (error instanceof SDKExecutionError) {
        executionError = error;
      }
      // 如果是其他 SDKError，转换为 SDKExecutionError
      else if (error instanceof SDKError) {
        executionError = new SDKExecutionError(
          error.message,
          undefined,
          undefined,
          error.context,
          error.cause
        );
      }
      // 如果是普通 Error，转换为 SDKExecutionError
      else if (error instanceof Error) {
        executionError = new SDKExecutionError(
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
      // 其他类型，转换为字符串
      else {
        executionError = new SDKExecutionError(String(error));
      }
      
      return failure<T>(executionError, 0);
    }
  }

}