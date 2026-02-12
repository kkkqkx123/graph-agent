/**
 * ErrorService - 错误处理服务
 * 提供全局统一的错误处理能力
 *
 * 职责：
 * - 标准化错误对象
 * - 记录错误日志
 * - 触发错误事件
 * - 应用错误处理策略
 *
 * 设计原则：
 * - 统一入口：所有错误通过 ErrorService 统一处理
 * - 日志集成：ErrorService 负责所有错误相关的日志记录
 * - 事件驱动：通过 EventManager 触发错误事件
 *
 * 本模块导出全局单例实例，不导出类定义
 */

import type { EventManager } from './event-manager';
import { SDKError, ErrorContext, ErrorHandlingResult } from '@modular-agent/types/errors';
import { ExecutionError, ValidationError, ToolError, NotFoundError, TimeoutError } from '@modular-agent/types/errors';
import { ErrorHandlingStrategy } from '@modular-agent/types/thread';
import { EventType } from '@modular-agent/types/events';
import type { ErrorEvent } from '@modular-agent/types/events';
import { now } from '@modular-agent/common-utils';
import { logger } from '../logger';

/**
 * ErrorService - 错误处理服务类
 */
class ErrorService {
  constructor(private eventManager: EventManager) {}

  /**
   * 统一错误处理函数
   * 处理所有类型的错误，包括日志记录、事件触发和策略应用
   *
   * @param error 错误对象（可以是Error或SDKError）
   * @param context 错误上下文
   * @param strategy 错误处理策略（可选，默认STOP_ON_ERROR）
   * @returns 错误处理结果
   */
  async handleError(
    error: Error | SDKError,
    context: ErrorContext,
    strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.STOP_ON_ERROR
  ): Promise<ErrorHandlingResult> {
    // 步骤1：标准化错误对象
    const standardizedError = this.standardizeError(error, context);

    // 步骤2：记录日志
    this.logError(standardizedError, context);

    // 步骤3：触发错误事件
    await this.emitErrorEvent(standardizedError, context);

    // 步骤4：应用错误处理策略
    return this.applyHandlingStrategy(standardizedError, strategy);
  }

  /**
   * 标准化错误对象
   * 将普通Error转换为SDKError，确保所有错误都有统一的格式
   */
  private standardizeError(
    error: Error | SDKError,
    context: ErrorContext
  ): SDKError {
    // 如果已经是SDKError，直接返回
    if (error instanceof SDKError) {
      return error;
    }

    // 否则根据上下文包装为合适的SDKError子类
    if (context.operation?.includes('tool')) {
      return new ToolError(
        error.message,
        context.toolName,
        context.toolType,
        context,
        error
      );
    }

    if (context.operation?.includes('validation')) {
      return new ValidationError(
        error.message,
        context.field,
        context.value,
        context
      );
    }

    if (context.operation?.includes('find') || context.operation?.includes('get')) {
      return new NotFoundError(
        error.message,
        context.resourceType || 'unknown',
        context.resourceId || 'unknown',
        context
      );
    }

    // 默认包装为ExecutionError
    return new ExecutionError(
      error.message,
      context.nodeId,
      context.workflowId,
      context,
      error
    );
  }

  /**
   * 记录错误日志
   * 根据错误类型和严重程度选择合适的日志级别
   */
  private logError(error: SDKError, context: ErrorContext): void {
    const logLevel = this.determineLogLevel(error);
    const logData = {
      errorType: error.constructor.name,
      errorMessage: error.message,
      context: {
        ...context,
        errorContext: error.context
      }
    };

    switch (logLevel) {
      case 'error':
        logger.error(error.message, logData);
        break;
      case 'warn':
        logger.warn(error.message, logData);
        break;
      case 'info':
        logger.info(error.message, logData);
        break;
    }
  }

  /**
   * 确定日志级别
   * 根据错误类型和上下文确定日志级别
   */
  private determineLogLevel(error: SDKError): 'error' | 'warn' | 'info' {
    // 检查上下文中的严重程度标记
    if (error.context?.['severity'] === 'warning') {
      return 'warn';
    }

    if (error.context?.['severity'] === 'info') {
      return 'info';
    }

    // 根据错误类型确定日志级别
    if (error instanceof NotFoundError || error instanceof TimeoutError) {
      return 'warn';
    }

    return 'error';
  }

  /**
   * 触发错误事件
   */
  private async emitErrorEvent(
    error: SDKError,
    context: ErrorContext
  ): Promise<void> {
    const errorEvent: ErrorEvent = {
      type: EventType.ERROR,
      threadId: context.threadId || '',
      workflowId: context.workflowId || '',
      error,
      timestamp: now()
    };

    await this.eventManager.emit(errorEvent);
  }

  /**
   * 应用错误处理策略
   */
  private applyHandlingStrategy(
    error: SDKError,
    strategy: ErrorHandlingStrategy
  ): ErrorHandlingResult {
    switch (strategy) {
      case ErrorHandlingStrategy.STOP_ON_ERROR:
        return { shouldStop: true, error };

      case ErrorHandlingStrategy.CONTINUE_ON_ERROR:
        return { shouldStop: false, error };

      default:
        return { shouldStop: true, error };
    }
  }
}

// 创建全局单例实例
const errorService = new ErrorService(
  // 延迟获取 EventManager 以避免循环依赖
  require('./event-manager').eventManager
);

// 导出单例实例
export { errorService };