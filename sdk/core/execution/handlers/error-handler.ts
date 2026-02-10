/**
 * 错误处理函数
 * 负责处理节点执行失败和全局执行错误
 *
 * 职责：
 * - 处理节点执行失败
 * - 处理全局执行错误
 * - 根据错误处理策略决定后续操作
 * - 触发错误事件
 *
 * 设计原则：
 * - 集中管理错误处理逻辑
 * - 支持灵活的错误处理策略
 * - 提供清晰的错误处理接口
 * - 使用纯函数，无内部状态
 */

import { ThreadContext } from '../context/thread-context';
import type { Node } from '../../../types/node';
import type { NodeExecutionResult } from '../../../types/thread';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '../../../types/events';
import type { ErrorEvent } from '../../../types/events';
import { now } from '../../../utils';

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
    // 步骤1：记录错误信息
    threadContext.addError(nodeResult.error);

    // 步骤2：触发错误事件
    const errorEvent: ErrorEvent = {
      type: EventType.ERROR,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      error: nodeResult.error,
      timestamp: now()
    };

    await eventManager.emit(errorEvent);

    // 步骤3：根据错误处理策略决定后续操作
    const errorHandling = threadContext.thread.errorHandling;

    if (errorHandling) {
      if (errorHandling.stopOnError) {
        // 停止执行，状态由外部管理
        return;
      } else if (errorHandling.continueOnError) {
        // 继续执行
        const fallbackNodeId = errorHandling.fallbackNodeId;
        if (fallbackNodeId) {
          threadContext.setCurrentNodeId(fallbackNodeId);
        } else {
          // 没有回退节点，尝试路由到下一个节点
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
    }
    // 默认行为：停止执行，状态由外部管理
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
    // 记录错误信息
    threadContext.addError(error);

    // 触发错误事件
    const errorEvent: ErrorEvent = {
      type: EventType.ERROR,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      error,
      timestamp: now()
    };

    await eventManager.emit(errorEvent);

    // 状态由外部管理
  }