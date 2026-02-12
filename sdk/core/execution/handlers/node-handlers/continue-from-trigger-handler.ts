/**
 * ContinueFromTrigger节点处理函数
 * 负责在子工作流执行完成后，将结果回调到主工作流
 */

import type { Node } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import type { ContinueFromTriggerNodeConfig } from '@modular-agent/types/node';
import { ThreadStatus } from '@modular-agent/types/thread';
import { now } from '@modular-agent/common-utils';

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

  // 处理对话历史回调
  if (config.conversationHistoryCallback) {
    const conversationManager = context?.conversationManager;
    if (conversationManager) {
      let messagesToCallback: any[] = [];
      
      const options = config.conversationHistoryCallback!;
      
      if (options.lastN !== undefined) {
        messagesToCallback = conversationManager.getRecentMessages(options.lastN);
      } else if (options.lastNByRole) {
        messagesToCallback = conversationManager.getRecentMessagesByRole(
          options.lastNByRole.role,
          options.lastNByRole.count
        );
      } else if (options.byRole) {
        messagesToCallback = conversationManager.getMessagesByRole(options.byRole);
      } else if (options.range) {
        messagesToCallback = conversationManager.getMessagesByRange(
          options.range.start,
          options.range.end
        );
      }
      
      // 将消息回传到主线程
      mainThreadContext.addMessages(messagesToCallback);
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