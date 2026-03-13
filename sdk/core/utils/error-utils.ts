/**
 * Error Utilities - 错误处理工具函数
 * 提供无状态的错误处理能力
 *
 * 设计原则：
 * - 纯函数：所有方法都是纯函数，无副作用
 * - 无状态：不依赖 DI 容器，直接传入依赖
 * - 灵活性：调用处可按需定制
 */

import type { EventManager } from '../managers/event-manager.js';
import type { SDKError } from '@modular-agent/types';
import { buildErrorEvent } from './event/builders/index.js';
import { safeEmit } from './event/event-emitter.js';
import { logger } from '../../utils/logger.js';

/**
 * 记录错误日志（根据 severity 选择级别）
 *
 * @param error SDKError 对象
 * @param context 额外的上下文信息
 */
export function logError(
  error: SDKError,
  context?: Record<string, any>
): void {
  const logData = {
    errorType: error.constructor.name,
    errorMessage: error.message,
    severity: error.severity,
    ...context
  };

  switch (error.severity) {
    case 'error':
      logger.error(error.message, logData);
      break;
    case 'warning':
      logger.warn(error.message, logData);
      break;
    case 'info':
      logger.info(error.message, logData);
      break;
  }
}

/**
 * 触发错误事件
 *
 * @param eventManager 事件管理器
 * @param params 事件参数
 */
export async function emitErrorEvent(
  eventManager: EventManager | undefined,
  params: {
    threadId: string;
    workflowId: string;
    nodeId?: string;
    error: Error;
  }
): Promise<void> {
  await safeEmit(eventManager, buildErrorEvent(params));
}

/**
 * 统一错误处理（日志 + 事件）
 * 便捷函数，同时执行日志记录和事件触发
 *
 * @param eventManager 事件管理器
 * @param error SDKError 对象
 * @param params 事件参数
 */
export async function handleError(
  eventManager: EventManager | undefined,
  error: SDKError,
  params: {
    threadId: string;
    workflowId: string;
    nodeId?: string;
  }
): Promise<void> {
  // 记录日志
  logError(error, params);

  // 触发事件
  await emitErrorEvent(eventManager, { ...params, error });
}