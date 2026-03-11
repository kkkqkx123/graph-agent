/**
 * 基础适配器类
 * 提供通用的适配器功能
 */

import { getSDK } from '@modular-agent/sdk';
import { getLogger, type CLILogger } from '../utils/logger.js';

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
   * 处理错误
   */
  protected handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);

    if (error instanceof Error && error.stack) {
      this.logger.debug(error.stack);
    }

    throw error;
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
}