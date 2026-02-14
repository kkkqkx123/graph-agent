/**
 * ContinueFromTrigger节点处理函数（批次感知）
 * 负责在子工作流执行完成后，将结果回调到主工作流
 */

import type { Node } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import type { ContinueFromTriggerNodeConfig } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import { MessageArrayUtils } from '../../../utils/message-array-utils';
import { executeOperation } from '../../../utils/message-operation-utils';
import { getVisibleMessages } from '../../../utils/visible-range-calculator';
import type { MessageOperationContext } from '@modular-agent/types';

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
 * ContinueFromTrigger节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export async function continueFromTriggerHandler(
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

  const config = node.config as ContinueFromTriggerNodeConfig;
  
  // 获取主线程上下文（从context中）
  const mainThreadContext = context?.mainThreadContext;
  if (!mainThreadContext) {
    throw new Error('Main thread context is required for CONTINUE_FROM_TRIGGER node');
  }

  // 处理变量回调
  if (config.variableCallback) {
    if (config.variableCallback.includeAll) {
      // 回传所有变量
      const allVariables = thread.variables || [];
      mainThreadContext.setVariables(allVariables);
    } else if (config.variableCallback.includeVariables) {
      // 选择性回传变量
      const variablesToCallback = (thread.variables || []).filter(v => 
        config.variableCallback?.includeVariables?.includes(v.name)
      );
      mainThreadContext.setVariables(variablesToCallback);
    }
  }

  // 处理对话历史回调（批次感知）
  if (config.conversationHistoryCallback) {
    const conversationManager = context?.conversationManager;
    if (conversationManager) {
      const allMessages = conversationManager.getAllMessages();
      const markMap = conversationManager.getIndexManager().getMarkMap();
      
      // 构建操作上下文
      const operationContext: MessageOperationContext = {
        messages: allMessages,
        markMap: markMap,
        options: config.callbackOptions
      };
      
      // 执行消息操作
      const result = executeOperation(
        operationContext,
        config.conversationHistoryCallback
      );
      
      // 获取可见消息回传到主线程
      const visibleMessages = getVisibleMessages(
        result.messages,
        result.markMap
      );
      
      // 将消息回传到主线程
      mainThreadContext.addMessages(visibleMessages);
    }
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
    message: 'Triggered subgraph completed and data callback executed',
    callbackExecuted: true
  };
}