/**
 * Command执行器
 * 负责执行命令并管理中间件链
 */

import type { Command, CommandValidationResult } from '../types/command';
import type { ExecutionResult } from '../types/execution-result';
import { failure } from '../types/execution-result';
import { handleUnknownError } from '../utils/error-utils';

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
      try {
        // 使用错误转换工具
        const apiError = handleUnknownError(error);
        
        return failure<T>({
          message: apiError.message,
          code: apiError.code,
          details: apiError.details,
          timestamp: apiError.timestamp,
          requestId: apiError.requestId,
          cause: apiError.cause ? {
            name: apiError.cause.name,
            message: apiError.cause.message,
            stack: apiError.cause.stack
          } : undefined
        }, 0);
      } catch (handlerError) {
        // 错误处理器本身出错时的回退机制
        return failure<T>({
          message: error instanceof Error ? error.message : String(error),
          code: 'INTERNAL_ERROR',
          timestamp: Date.now()
        }, 0);
      }
    }
  }

}