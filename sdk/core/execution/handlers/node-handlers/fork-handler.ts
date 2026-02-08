/**
 * Fork节点处理函数
 * Fork节点作为占位符，实际的Fork操作由ThreadExecutor调用ThreadCoordinator处理
 */

import type { Node, ForkNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== 'RUNNING') {
    return false;
  }
  return true;
}

/**
 * Fork节点处理函数
 * Fork节点作为占位符，实际的Fork操作由ThreadExecutor调用ThreadCoordinator处理
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function forkHandler(thread: Thread, node: Node, context?: any): Promise<any> {
  // 检查是否可以执行
  if (!canExecute(thread, node)) {
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'SKIPPED',
      step: thread.nodeResults.length + 1,
      executionTime: 0
    };
  }

  // Fork节点作为占位符，实际Fork操作由ThreadExecutor调用ThreadOperationCoordinator处理
  // 配置参数从node.config中读取，不需要返回配置信息
  return {};
}