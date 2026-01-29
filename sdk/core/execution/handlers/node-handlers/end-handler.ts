/**
 * End节点处理函数
 * 负责执行END节点，标记工作流的结束，收集执行结果
 */

import type { Node, EndNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { ThreadStatus } from '../../../../types/thread';
import { now, diffTimestamp } from '../../../../utils';

/**
 * 验证End节点配置
 */
function validate(node: Node): void {
  if (node.type !== NodeType.END) {
    throw new ValidationError(`Invalid node type for end handler: ${node.type}`, `node.${node.id}`);
  }

  if (node.config && Object.keys(node.config).length > 0) {
    throw new ValidationError('END node must have no configuration', `node.${node.id}`);
  }
}

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== ThreadStatus.RUNNING) {
    return false;
  }

  if (thread.nodeResults.some(result => result.nodeId === node.id)) {
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
export async function endHandler(thread: Thread, node: Node): Promise<any> {
  // 验证节点配置
  validate(node);

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
  let output: any = {};

  // 优先级1：Thread的output
  if (thread.output && Object.keys(thread.output).length > 0) {
    output = thread.output;
  } else {
    // 优先级2：最后一个节点的data
    if (thread.nodeResults && thread.nodeResults.length > 0) {
      const lastResult = thread.nodeResults[thread.nodeResults.length - 1];
      if (lastResult && lastResult.data) {
        output = lastResult.data;
      }
    }
  }

  // 更新Thread状态
  thread.status = ThreadStatus.COMPLETED;
  thread.endTime = now();
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
    executionTime: diffTimestamp(thread.startTime, thread.endTime)
  };
}