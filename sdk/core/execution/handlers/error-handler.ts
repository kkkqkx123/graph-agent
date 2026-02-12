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
 */

import { ThreadContext } from '../context/thread-context';
import type { Node } from '@modular-agent/types/node';
import type { NodeExecutionResult } from '@modular-agent/types/thread';
import { ThreadStatus } from '@modular-agent/types/thread';
import { ErrorContext } from '@modular-agent/types/errors';
import { errorService } from '../../services/error-service';
import { now } from '@modular-agent/common-utils';

/**
 * 处理节点执行失败
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

  const context: ErrorContext = {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId: node.id,
    operation: 'node_execution'
  };

  // 记录错误到线程上下文
  threadContext.addError(error);

  // 使用 ErrorService 处理错误（记录日志和触发事件）
  await errorService.handleError(error, context);

  // 设置线程状态为 FAILED 和停止标志
  threadContext.setStatus(ThreadStatus.FAILED);
  threadContext.thread.endTime = now();
  threadContext.setShouldStop(true);
}

/**
 * 处理执行错误
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

  // 记录错误到线程上下文
  threadContext.addError(error);

  // 使用 ErrorService 处理错误（记录日志和触发事件）
  await errorService.handleError(error, context);

  // 设置线程状态为 FAILED 和停止标志
  threadContext.setStatus(ThreadStatus.FAILED);
  threadContext.thread.endTime = now();
  threadContext.setShouldStop(true);
}