/**
 * End节点处理函数
 * 负责执行END节点，标记工作流的结束，收集执行结果
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { ThreadStatus } from '../../../../types/thread';
import { now, diffTimestamp } from '../../../../utils';

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== ThreadStatus.RUNNING) {
    return false;
  }

  if (thread.nodeResults && thread.nodeResults.some(result => result.nodeId === node.id)) {
    return false;
  }

  return true;
}

/**
 * End节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function endHandler(thread: Thread, node: Node, context?: any): Promise<any> {
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

  // 收集Thread输出
  // 使用 thread.output 作为工作流最终输出（由节点或END节点显式设置）
  const output = thread.output || {};

  // 设置Thread输出（不修改状态，状态由ThreadLifecycleManager管理）
  thread.output = output;

  // 记录执行历史
  thread.nodeResults.push({
    step: thread.nodeResults.length + 1,
    nodeId: node.id,
    nodeType: node.type,
    status: 'COMPLETED',
    timestamp: now()
  });

  // 返回执行结果
  return {
    message: 'Workflow completed',
    output,
    executionTime: diffTimestamp(thread.startTime, now())
  };
}