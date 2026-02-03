/**
 * Start节点处理函数
 * 负责执行START节点，标记工作流的开始，初始化Thread状态
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { ThreadStatus } from '../../../../types/thread';
import { now } from '../../../../utils';

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  // START节点可以在CREATED或RUNNING状态下执行（如果还没有执行过）
  if (thread.status !== ThreadStatus.CREATED && thread.status !== ThreadStatus.RUNNING) {
    return false;
  }

  if (thread.nodeResults.some(result => result.nodeId === node.id)) {
    return false;
  }

  return true;
}

/**
 * Start节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export async function startHandler(thread: Thread, node: Node, context?: any): Promise<any> {
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

  // 初始化Thread状态
  thread.status = ThreadStatus.RUNNING;
  thread.currentNodeId = node.id;
  thread.startTime = now();

  // 初始化Thread的变量和结果
  if (!thread.variables) {
    thread.variables = [];
  }
  if (!thread.nodeResults) {
    thread.nodeResults = [];
  }
  if (!thread.errors) {
    thread.errors = [];
  }

  // 初始化Thread输入
  if (!thread.input) {
    thread.input = {};
  }

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
    message: 'Workflow started',
    input: thread.input
  };
}