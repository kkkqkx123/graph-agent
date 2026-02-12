/**
 * 统一错误处理器
 * 负责处理所有类型的错误，包括日志记录、事件触发和策略应用
 *
 * 职责：
 * - 处理节点执行失败
 * - 处理全局执行错误
 * - 标准化错误对象
 * - 记录错误日志
 * - 触发错误事件
 * - 应用错误处理策略
 *
 * 设计原则：
 * - 错误优先：所有运行时异常必须抛出错误，不允许静默处理
 * - 统一入口：所有错误通过ErrorHandler统一处理
 * - 日志集成：ErrorHandler负责所有日志记录，业务代码不直接记录日志
 * - 简洁直接：不追求向后兼容，直接重构，保证长期可维护性
 */

import { ThreadContext } from '../context/thread-context';
import type { Node } from '@modular-agent/types/node';
import type { NodeExecutionResult } from '@modular-agent/types/thread';
import { ErrorHandlingStrategy } from '@modular-agent/types/thread';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '@modular-agent/types/events';
import type { ErrorEvent } from '@modular-agent/types/events';
import { now } from '@modular-agent/common-utils';
import { SDKError, ErrorCode, ErrorContext, ErrorHandlingResult } from '@modular-agent/types/errors';
import { ExecutionError, ValidationError, ToolError, NotFoundError } from '@modular-agent/types/errors';
import { logger } from '../../logger';

/**
 * 统一错误处理函数
 * 处理所有类型的错误，包括日志记录、事件触发和策略应用
 *
 * @param error 错误对象（可以是Error或SDKError）
 * @param context 错误上下文
 * @param eventManager 事件管理器
 * @param strategy 错误处理策略（可选，默认STOP_ON_ERROR）
 * @returns 错误处理结果
 */
export async function handleError(
  error: Error | SDKError,
  context: ErrorContext,
  eventManager: EventManager,
  strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.STOP_ON_ERROR
): Promise<ErrorHandlingResult> {
  // 步骤1：标准化错误对象
  const standardizedError = standardizeError(error, context);
  
  // 步骤2：记录日志
  logError(standardizedError, context);
  
  // 步骤3：触发错误事件
  await emitErrorEvent(standardizedError, context, eventManager);
  
  // 步骤4：应用错误处理策略
  return applyHandlingStrategy(standardizedError, strategy);
}

/**
 * 标准化错误对象
 * 将普通Error转换为SDKError，确保所有错误都有统一的格式
 */
function standardizeError(
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
function logError(error: SDKError, context: ErrorContext): void {
  const logLevel = determineLogLevel(error);
  const logData = {
    errorCode: error.code,
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
function determineLogLevel(error: SDKError): 'error' | 'warn' | 'info' {
  // 检查上下文中的严重程度标记
  if (error.context?.['severity'] === 'warning') {
    return 'warn';
  }
  
  if (error.context?.['severity'] === 'info') {
    return 'info';
  }
  
  // 根据错误类型确定日志级别
  switch (error.code) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.CONFIGURATION_ERROR:
      return 'error';
    
    case ErrorCode.TOOL_ERROR:
    case ErrorCode.CODE_EXECUTION_ERROR:
    case ErrorCode.EXECUTION_ERROR:
      return 'error';
    
    case ErrorCode.NOT_FOUND_ERROR:
      return 'warn';
    
    case ErrorCode.TIMEOUT_ERROR:
      return 'warn';
    
    default:
      return 'error';
  }
}

/**
 * 触发错误事件
 */
async function emitErrorEvent(
  error: SDKError,
  context: ErrorContext,
  eventManager: EventManager
): Promise<void> {
  const errorEvent: ErrorEvent = {
    type: EventType.ERROR,
    threadId: context.threadId || '',
    workflowId: context.workflowId || '',
    error,
    timestamp: now()
  };
  
  await eventManager.emit(errorEvent);
}

/**
 * 应用错误处理策略
 */
function applyHandlingStrategy(
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

// ============================================================================
// 保留原有的函数，但内部使用新的handleError
// ============================================================================

/**
 * 处理节点执行失败
 * @param threadContext 线程上下文
 * @param node 节点定义
 * @param nodeResult 节点执行结果
 * @param eventManager 事件管理器
 */
export async function handleNodeFailure(
  threadContext: ThreadContext,
  node: Node,
  nodeResult: NodeExecutionResult,
  eventManager: EventManager
): Promise<void> {
  const error = nodeResult.error || new Error('Unknown error');
  
  const context: ErrorContext = {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId: node.id,
    operation: 'node_execution'
  };
  
  const result = await handleError(error, context, eventManager, threadContext.thread.errorHandling?.strategy);
  
  // 记录错误到线程上下文
  threadContext.addError(result.error);
  
  // 如果需要停止执行，状态由外部管理
  if (result.shouldStop) {
    return;
  }
  
  // 如果继续执行，路由到下一个节点
  if (threadContext.thread.errorHandling?.strategy === ErrorHandlingStrategy.CONTINUE_ON_ERROR) {
    const navigator = threadContext.getNavigator();
    const currentNodeId = node.id;
    const lastResult = threadContext.getNodeResults()[threadContext.getNodeResults().length - 1];
    const nextNodeId = navigator.selectNextNodeWithContext(
      currentNodeId,
      threadContext.thread,
      node.type,
      lastResult
    );
    if (nextNodeId) {
      threadContext.setCurrentNodeId(nextNodeId);
    }
  }
}

/**
 * 处理执行错误
 * @param threadContext 线程上下文
 * @param error 错误信息
 * @param eventManager 事件管理器
 */
export async function handleExecutionError(
  threadContext: ThreadContext,
  error: any,
  eventManager: EventManager
): Promise<void> {
  const context: ErrorContext = {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    operation: 'execution'
  };
  
  const result = await handleError(error, context, eventManager);
  
  // 记录错误到线程上下文
  threadContext.addError(result.error);
  
  // 状态由外部管理
}