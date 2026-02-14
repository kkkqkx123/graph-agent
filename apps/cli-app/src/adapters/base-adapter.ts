/**
 * 基础适配器类
 * 提供通用的适配器功能
 */

import { sdk } from '@modular-agent/sdk';
import { createLogger } from '../utils/logger';

/**
 * 基础适配器类
 */
export class BaseAdapter {
  protected logger: ReturnType<typeof createLogger>;
  protected sdk: typeof sdk;

  constructor() {
    this.logger = createLogger();
    this.sdk = sdk;
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