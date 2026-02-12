/**
 * Command执行器
 * 负责执行命令并管理中间件链
 */

import type { Command, CommandValidationResult } from '@modular-agent/sdk/api/types/command';
import type { ExecutionResult } from '@modular-agent/sdk/api/types/execution-result';
import { failure } from '@modular-agent/sdk/api/types/execution-result';
import { SDKError } from '@modular-agent/types/errors';

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
        {
          message: `Validation failed: ${validation.errors.join(', ')}`,
          code: 'VALIDATION_ERROR'
        },
        0
      );
    }

    // 执行命令
    try {
      return await command.execute();
    } catch (error) {
      // 直接使用SDKError，不做任何转换
      const sdkError = error instanceof SDKError ? error : new Error(String(error));
      
      return failure<T>({
        message: sdkError.message,
        code: sdkError instanceof SDKError ? sdkError.constructor.name : 'UNKNOWN_ERROR',
        details: sdkError instanceof SDKError ? sdkError.context : undefined,
        timestamp: Date.now(),
        cause: sdkError.cause ? {
          name: (sdkError.cause as Error).name,
          message: (sdkError.cause as Error).message,
          stack: (sdkError.cause as Error).stack
        } : undefined
      }, 0);
    }
  }

}