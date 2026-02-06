/**
 * Command执行器
 * 负责执行命令并管理中间件链
 */

import type { Command, CommandValidationResult } from '../types/command';
import type { ExecutionResult } from '../types/execution-result';
import { failure } from '../types/execution-result';

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
        `Validation failed: ${validation.errors.join(', ')}`,
        0
      );
    }

    // 执行命令
    try {
      return await command.execute();
    } catch (error) {
      return failure<T>(
        error instanceof Error ? error.message : String(error),
        0
      );
    }
  }

}