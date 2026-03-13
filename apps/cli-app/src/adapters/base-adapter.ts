/**
 * 基础适配器类
 * 提供通用的适配器功能
 */

import { getSDK } from '@modular-agent/sdk';
import { getLogger, type CLILogger } from '../utils/logger.js';
import { handleError as handleCLIError, type ErrorContext } from '../utils/error-handler.js';
import { CLIError } from '../types/cli-types.js';

/**
 * 基础适配器类
 */
export class BaseAdapter {
  protected logger: CLILogger;
  protected sdk: ReturnType<typeof getSDK>;

  constructor() {
    this.logger = getLogger();
    this.sdk = getSDK();
  }

  /**
   * 处理错误并转换为 CLIError
   */
  protected handleError(error: unknown, context: string): never {
    const cliError = error instanceof CLIError
      ? error
      : new CLIError(
          error instanceof Error ? error.message : String(error),
          'ADAPTER_ERROR'
        );

    this.logger.error(`${context}: ${cliError.message}`);

    if (error instanceof Error && error.stack) {
      this.logger.debug(error.stack);
    }

    throw cliError;
  }

  /**
   * 执行操作并处理错误
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context);
    }
  }

  /**
   * 创建错误上下文
   */
  protected createErrorContext(operation: string, additional?: Record<string, any>): ErrorContext {
    return {
      operation,
      additionalInfo: additional
    };
  }
}