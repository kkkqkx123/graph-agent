/**
 * StartFromTrigger节点处理函数
 * 负责初始化触发子工作流，接收来自主线程的输入数据
 */

import type { Node } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import { ThreadStatus } from '@modular-agent/types/thread';
import { now } from '@modular-agent/common-utils';

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  // START_FROM_TRIGGER节点可以在CREATED或RUNNING状态下执行
  if (thread.status !== ThreadStatus.CREATED && thread.status !== ThreadStatus.RUNNING) {
    return false;
  }

  if (thread.nodeResults && thread.nodeResults.some(result => result.nodeId === node.id)) {
    return false;
  }

  return true;
}

/**
 * StartFromTrigger节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export async function startFromTriggerHandler(
  thread: Thread, 
  node: Node, 
  context?: any
): Promise<any> {
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

  // 从context中获取触发器传递的输入数据
  const triggerInput = context?.triggerInput || {};
  
  // 将输入数据设置到thread.input中
  thread.input = {
    ...thread.input,
    ...triggerInput
  };

  // 如果有传递的变量，初始化到thread中
  if (triggerInput.variables) {
    thread.variables = triggerInput.variables;
  }

  // 如果有传递的对话历史，初始化到conversationManager中
  if (triggerInput.conversationHistory && context?.conversationManager) {
    context.conversationManager.addMessages(triggerInput.conversationHistory);
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
    message: 'Triggered subgraph started',
    input: thread.input
  };
}