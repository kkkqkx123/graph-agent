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
 * 标准错误上下文
 * 定义错误处理中自动提取的字段
 */
export interface StandardErrorContext {
  threadId?: string;
  workflowId?: string;
  nodeId?: string;
  agentLoopId?: string;
  iteration?: number;
  operation?: string;
  [key: string]: any;
}

/**
 * 从实体自动提取标准错误上下文
 *
 * @param source 上下文来源（ThreadEntity、AgentLoopEntity 或普通对象）
 * @param operation 操作名称（可选）
 * @returns 标准错误上下文
 */
export function extractErrorContext(
  source: unknown,
  operation?: string
): StandardErrorContext {
  const context: StandardErrorContext = { operation };

  if (!source || typeof source !== 'object') {
    return context;
  }

  const src = source as Record<string, any>;

  // 提取 ThreadEntity 相关字段
  if (src['id'] !== undefined) {
    // 优先使用 threadId 字段，其次是 id
    context.threadId = src['threadId'] || src['id'];
  }

  // 提取 workflowId（方法或属性）
  if (typeof src['getWorkflowId'] === 'function') {
    context.workflowId = src['getWorkflowId']();
  } else if (src['workflowId'] !== undefined) {
    context.workflowId = src['workflowId'];
  }

  // 提取 nodeId（方法或属性）
  if (typeof src['getCurrentNodeId'] === 'function') {
    context.nodeId = src['getCurrentNodeId']();
  } else if (typeof src['getNodeId'] === 'function') {
    context.nodeId = src['getNodeId']();
  } else if (src['nodeId'] !== undefined) {
    context.nodeId = src['nodeId'];
  }

  // 提取 AgentLoopEntity 相关字段
  if (src['state']?.currentIteration !== undefined) {
    context.agentLoopId = src['id'];
    context.iteration = src['state'].currentIteration;
  }

  return context;
}

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

/**
 * 统一错误处理（带自动上下文提取）
 * 自动从实体提取 threadId、nodeId、workflowId 等上下文信息
 *
 * @param eventManager 事件管理器
 * @param error SDKError 对象
 * @param contextSource 上下文来源（ThreadEntity、AgentLoopEntity 或普通对象）
 * @param operation 操作名称（可选）
 * @returns 包含提取上下文的标准化错误
 */
export async function handleErrorWithContext(
  eventManager: EventManager | undefined,
  error: SDKError,
  contextSource: unknown,
  operation?: string
): Promise<SDKError & { context: StandardErrorContext }> {
  // 提取标准上下文
  const extractedContext = extractErrorContext(contextSource, operation);

  // 合并错误原有上下文
  const mergedContext: StandardErrorContext = {
    ...extractedContext,
    ...error.context
  };

  // 创建带完整上下文的新错误对象（避免修改原错误）
  const enhancedError = Object.create(Object.getPrototypeOf(error));
  Object.assign(enhancedError, error, { context: mergedContext });

  // 记录日志和触发事件
  logError(enhancedError, mergedContext);
  await emitErrorEvent(eventManager, {
    threadId: mergedContext.threadId || '',
    workflowId: mergedContext.workflowId || '',
    nodeId: mergedContext.nodeId,
    error: enhancedError
  });

  return enhancedError;
}