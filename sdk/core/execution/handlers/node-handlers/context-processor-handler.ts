/**
 * 上下文处理器节点处理器（批次感知）
 * 负责执行CONTEXT_PROCESSOR节点，处理对话消息的截断、插入、替换、清空、过滤操作
 *
 * 设计原则：
 * - 使用统一的消息操作工具函数
 * - 支持批次管理和可见范围
 * - 返回执行结果
 */

import type { Node, ContextProcessorNodeConfig } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import { ExecutionError, RuntimeValidationError } from '@modular-agent/types/errors';
import { now } from '@modular-agent/common-utils';
import { executeOperation } from '../../../utils/message-operation-utils';
import type { MessageOperationContext } from '@modular-agent/types/llm';

/**
 * 上下文处理器执行结果
 */
export interface ContextProcessorExecutionResult {
  /** 操作类型 */
  operation: string;
  /** 处理后的消息数量 */
  messageCount: number;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 操作统计信息 */
  stats?: {
    originalMessageCount: number;
    visibleMessageCount: number;
    compressedMessageCount: number;
  };
}

/**
 * 上下文处理器执行上下文
 */
export interface ContextProcessorHandlerContext {
  /** 对话管理器 */
  conversationManager: any; // 简化类型，实际应该使用具体的ConversationManager类型
}

/**
 * 上下文处理器节点处理器
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文
 * @returns 执行结果
 */
export async function contextProcessorHandler(
  thread: Thread,
  node: Node,
  context: ContextProcessorHandlerContext
): Promise<ContextProcessorExecutionResult> {
  const config = node.config as ContextProcessorNodeConfig;
  const startTime = now();

  try {
    // 1. 验证配置
    if (!config.operationConfig) {
      throw new RuntimeValidationError('operationConfig is required', { operation: 'handle', field: 'operationConfig' });
    }

    // 2. 获取ConversationManager
    const conversationManager = context.conversationManager;

    // 3. 获取当前消息状态
    const allMessages = conversationManager.getAllMessages();
    const markMap = conversationManager.getIndexManager().getMarkMap();

    // 4. 构建操作上下文
    const operationContext: MessageOperationContext = {
      messages: allMessages,
      markMap: markMap,
      options: config.operationOptions
    };

    // 5. 执行消息操作
    const result = executeOperation(operationContext, config.operationConfig);

    // 6. 更新ConversationManager
    // 清空当前消息
    conversationManager.clearMessages(false);
    
    // 重新添加所有消息
    for (const msg of result.messages) {
      conversationManager.addMessage(msg);
    }
    
    // 更新标记映射
    conversationManager.getIndexManager().setMarkMap(result.markMap);

    // 7. 获取处理后的消息数量
    const messageCount = conversationManager.getMessages().length;

    const executionTime = now() - startTime;

    return {
      operation: config.operationConfig.operation,
      messageCount,
      executionTime,
      stats: result.stats
    };
  } catch (error) {
    throw error;
  }
}