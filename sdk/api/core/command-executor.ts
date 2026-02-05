/**
 * Command执行器
 * 负责执行命令并管理中间件链
 */

import type { Command, CommandValidationResult } from './command';
import type { ExecutionResult } from '../types/execution-result';
import type { CommandMiddleware } from './command-middleware';
import { validationFailure } from './command';
import { failure } from '../types/execution-result';

/**
 * Command执行器配置
 */
export interface CommandExecutorOptions {
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 是否启用验证 */
  enableValidation?: boolean;
  /** 是否启用指标收集 */
  enableMetrics?: boolean;
}

/**
 * Command执行器
 */
export class CommandExecutor {
  private readonly middleware: CommandMiddleware[] = [];
  private readonly options: Required<CommandExecutorOptions>;
  
  constructor(options: CommandExecutorOptions = {}) {
    this.options = {
      enableLogging: options.enableLogging ?? true,
      enableValidation: options.enableValidation ?? true,
      enableMetrics: options.enableMetrics ?? false
    };
  }
  
  /**
   * 添加中间件
   * @param middleware 中间件
   */
  addMiddleware(middleware: CommandMiddleware): void {
    this.middleware.push(middleware);
  }
  
  /**
   * 移除中间件
   * @param middleware 中间件
   */
  removeMiddleware(middleware: CommandMiddleware): void {
    const index = this.middleware.indexOf(middleware);
    if (index > -1) {
      this.middleware.splice(index, 1);
    }
  }
  
  /**
   * 执行命令
   * @param command 命令
   * @returns 执行结果
   */
  async execute<T>(command: Command<T>): Promise<ExecutionResult<T>> {
    const metadata = command.getMetadata();
    
    // 验证命令
    if (this.options.enableValidation) {
      const validation: CommandValidationResult = command.validate();
      if (!validation.valid) {
        return failure<T>(
          `Validation failed: ${validation.errors.join(', ')}`,
          0
        );
      }
    }
    
    // 执行前置中间件
    for (const middleware of this.middleware) {
      try {
        await middleware.beforeExecute(command);
      } catch (error) {
        return failure<T>(
          `Middleware beforeExecute failed: ${error instanceof Error ? error.message : String(error)}`,
          0
        );
      }
    }
    
    // 执行命令
    let result: ExecutionResult<T>;
    try {
      result = await command.execute();
    } catch (error) {
      // 执行错误中间件
      for (const middleware of this.middleware.reverse()) {
        try {
          await middleware.onError(command, error instanceof Error ? error : new Error(String(error)));
        } catch (middlewareError) {
          // 忽略中间件错误，继续执行其他中间件
        }
      }
      
      return failure<T>(
        error instanceof Error ? error.message : String(error),
        0
      );
    }
    
    // 执行后置中间件
    for (const middleware of this.middleware.reverse()) {
      try {
        await middleware.afterExecute(command, result);
      } catch (error) {
        // 忽略中间件错误，不影响执行结果
      }
    }
    
    return result;
  }
  
  /**
   * 批量执行命令
   * @param commands 命令数组
   * @param parallel 是否并行执行，默认false
   * @returns 执行结果数组
   */
  async executeBatch<T>(
    commands: Command<T>[],
    parallel: boolean = false
  ): Promise<ExecutionResult<T>[]> {
    if (parallel) {
      return Promise.all(commands.map(cmd => this.execute(cmd)));
    } else {
      const results: ExecutionResult<T>[] = [];
      for (const command of commands) {
        results.push(await this.execute(command));
      }
      return results;
    }
  }
  
  /**
   * 获取中间件数量
   * @returns 中间件数量
   */
  getMiddlewareCount(): number {
    return this.middleware.length;
  }
  
  /**
   * 清空所有中间件
   */
  clearMiddleware(): void {
    this.middleware.length = 0;
  }
}