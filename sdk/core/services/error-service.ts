/**
 * ErrorService - 错误处理服务
 * 提供全局统一的错误处理能力
 *
 * 职责：
 * - 记录错误日志
 * - 触发错误事件
 *
 * 设计原则：
 * - 统一入口：所有错误通过 ErrorService 统一处理
 * - 日志集成：ErrorService 负责所有错误相关的日志记录
 * - 事件驱动：通过 EventManager 触发错误事件
 * - 异步非阻塞：错误事件触发后立即返回，不等待处理完成
 * - severity 驱动：直接使用 error.severity 确定日志级别
 *
 * 本模块导出全局单例实例，不导出类定义
 */

import type { EventManager } from './event-manager';
import { SDKError, ErrorContext, ErrorSeverity } from '@modular-agent/types';
import { EventType } from '@modular-agent/types';
import type { ErrorEvent } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import { logger } from '../logger';

/**
 * ErrorService - 错误处理服务类
 */
class ErrorService {
  constructor(private eventManager: EventManager) {}

  /**
   * 统一错误处理函数
   * 处理所有类型的错误，包括日志记录和事件触发
   *
   * @param error 错误对象（必须是SDKError）
   * @param context 错误上下文
   */
  async handleError(
    error: SDKError,
    context: ErrorContext
  ): Promise<void> {
    // 步骤1：记录日志（直接使用 error.severity）
    this.logError(error, context);

    // 步骤2：触发错误事件（异步，不等待）
    this.emitErrorEvent(error, context);
  }

  /**
   * 记录错误日志
   * 直接使用 error.severity 确定日志级别
   */
  private logError(error: SDKError, context: ErrorContext): void {
    const logLevel = this.determineLogLevelFromSeverity(error.severity);
    const logData = {
      errorType: error.constructor.name,
      errorMessage: error.message,
      severity: error.severity,
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
   * 根据 severity 确定日志级别
   */
  private determineLogLevelFromSeverity(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.ERROR: return 'error';
      case ErrorSeverity.WARNING: return 'warn';
      case ErrorSeverity.INFO: return 'info';
    }
  }

  /**
   * 触发错误事件（异步，不等待）
   */
  private emitErrorEvent(
    error: SDKError,
    context: ErrorContext
  ): void {
    const errorEvent: ErrorEvent = {
      type: EventType.ERROR,
      threadId: context.threadId || '',
      workflowId: context.workflowId || '',
      nodeId: context.nodeId,
      error,
      timestamp: now()
    };

    // 异步触发事件，不等待处理完成
    this.eventManager.emit(errorEvent).catch(err => {
      logger.error('Failed to emit error event', { error: err });
    });
  }
}

// 创建全局单例实例
const errorService = new ErrorService(
  // 延迟获取 EventManager 以避免循环依赖
  require('./event-manager').eventManager
);

// 导出单例实例
export { errorService };