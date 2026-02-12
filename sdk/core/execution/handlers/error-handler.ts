/**
 * 工作流内部错误处理器
 * 负责处理工作流执行过程中的错误，包括节点失败和全局执行错误
 *
 * 职责：
 * - 处理节点执行失败
 * - 处理全局执行错误
 * - 协调错误处理流程
 *
 * 设计原则：
 * - 错误优先：所有运行时异常必须抛出错误，不允许静默处理
 * - 统一入口：所有错误通过 ErrorService 统一处理
 * - 简化接口：工作流内部调用无需传递 eventManager
 */

import { ThreadContext } from '../context/thread-context';
import type { Node } from '@modular-agent/types/node';
import type { NodeExecutionResult } from '@modular-agent/types/thread';
import { ErrorHandlingStrategy } from '@modular-agent/types/thread';
import { SingletonRegistry } from '../context/singleton-registry';
import type { EventManager } from '../../services/event-manager';
import { ErrorContext } from '@modular-agent/types/errors';
import { errorService } from '../../services/error-service';

/**
 * 获取全局 EventManager
 */
function getGlobalEventManager(): EventManager {
  return SingletonRegistry.get<EventManager>('eventManager');
}

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

  // 使用 ErrorService 处理错误
  const result = await errorService.handleError(
    error,
    context,
    threadContext.thread.errorHandling?.strategy
  );

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

  // 使用 ErrorService 处理错误
  const result = await errorService.handleError(error, context);

  // 记录错误到线程上下文
  threadContext.addError(result.error);

  // 状态由外部管理
}