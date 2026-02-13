/**
 * 工作流内部错误处理器
 * 负责处理工作流执行过程中的错误，包括节点失败和全局执行错误
 *
 * 职责：
 * - 处理节点执行失败
 * - 处理全局执行错误
 * - 记录错误和触发错误事件
 *
 * 设计原则：
 * - 错误优先：所有运行时异常必须抛出错误，不允许静默处理
 * - 统一入口：所有错误通过 ErrorService 统一处理
 * - 事件驱动：错误通过事件机制异步处理，不阻塞执行
 * - 简化接口：工作流内部调用无需传递 eventManager
 * - severity 驱动：仅 ERROR 级别错误停止执行，WARNING 和 INFO 级别继续执行
 */

import { ThreadContext } from '../context/thread-context';
import type { Node } from '@modular-agent/types/node';
import type { NodeExecutionResult } from '@modular-agent/types/thread';
import { ThreadStatus } from '@modular-agent/types/thread';
import { ErrorContext, SDKError, ErrorSeverity } from '@modular-agent/types/errors';
import { errorService } from '../../services/error-service';
import { now } from '@modular-agent/common-utils';

/**
 * 标准化错误以确保有 severity
 * 将普通 Error 转换为 SDKError，确保所有错误都有 severity
 */
function standardizeErrorWithSeverity(error: Error, context: ErrorContext): SDKError {
  // 如果已经是 SDKError，直接返回
  if (error instanceof SDKError) {
    return error;
  }

  // 否则根据上下文包装为合适的 SDKError 子类
  // 默认使用 ERROR 级别
  return new SDKError(error.message, ErrorSeverity.ERROR, context, error);
}

/**
 * 处理节点执行失败
 * 核心简化：仅当 severity 为 ERROR 时才停止执行
 * @param threadContext 线程上下文
 * @param node 节点定义
 * @param nodeResult 节点执行结果
 */
export async function handleNodeFailure(
  threadContext: ThreadContext,
  node: Node,
  nodeResult: NodeExecutionResult
): Promise<void> {
  const error = nodeResult.error || new Error('Unknown error');
  
  // 标准化错误以确保有 severity
  const context: ErrorContext = {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId: node.id,
    operation: 'node_execution'
  };
  
  const standardizedError = standardizeErrorWithSeverity(error, context);

  // 记录错误到线程上下文
  threadContext.addError(standardizedError);

  // 使用 ErrorService 处理错误（记录日志和触发事件）
  await errorService.handleError(standardizedError, context);

  // 核心简化：仅当 severity 为 ERROR 时才停止执行
  if (standardizedError.severity === ErrorSeverity.ERROR) {
    threadContext.setStatus(ThreadStatus.FAILED);
    threadContext.thread.endTime = now();
    threadContext.setShouldStop(true);
  }
  // WARNING 和 INFO 级别自动继续执行
}

/**
 * 处理执行错误
 * 核心简化：仅当 severity 为 ERROR 时才停止执行
 * @param threadContext 线程上下文
 * @param error 错误信息
 */
export async function handleExecutionError(
  threadContext: ThreadContext,
  error: any
): Promise<void> {
  const context: ErrorContext = {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    operation: 'execution'
  };
  
  // 标准化错误以确保有 severity
  const standardizedError = standardizeErrorWithSeverity(error, context);

  // 记录错误到线程上下文
  threadContext.addError(standardizedError);

  // 使用 ErrorService 处理错误（记录日志和触发事件）
  await errorService.handleError(standardizedError, context);

  // 核心简化：仅当 severity 为 ERROR 时才停止执行
  if (standardizedError.severity === ErrorSeverity.ERROR) {
    threadContext.setStatus(ThreadStatus.FAILED);
    threadContext.thread.endTime = now();
    threadContext.setShouldStop(true);
  }
  // WARNING 和 INFO 级别自动继续执行
}