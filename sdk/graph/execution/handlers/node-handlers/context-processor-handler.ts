/**
 * 上下文处理器节点处理器（批次感知）
 * 负责执行CONTEXT_PROCESSOR节点，处理对话消息的截断、插入、替换、清空、过滤操作
 *
 * 设计原则：
 * - 使用统一的消息操作工具函数
 * - 支持批次管理和可见范围控制
 * - 返回执行结果
 * - 消息操作后自动刷新工具可见性声明
 *
 * 核心概念：
 * - 可见消息：当前批次边界之后的消息，会被发送给LLM
 * - 不可见消息：当前批次边界之前的消息，仅存储但不发送给LLM
 * - 消息操作：truncate（截断）、insert（插入）、replace（替换）、clear（清空）、filter（过滤）
 * - 批次管理：通过 startNewBatch() 和 rollbackToBatch() 控制消息可见性
 */

import type { Node, ContextProcessorNodeConfig } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import { RuntimeValidationError, ValidationError } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import { executeOperation } from '../../../../core/utils/messages/message-operation-utils.js';
import type { MessageOperationContext } from '@modular-agent/types';
import type { MessageOperationResult } from '@modular-agent/types';
import { createContextualLogger } from '../../../../utils/contextual-logger.js';

const logger = createContextualLogger();

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
    invisibleMessageCount: number;
  };
}

/**
 * 上下文处理器执行上下文
 */
export interface ContextProcessorHandlerContext {
  /** 对话管理器 */
  conversationManager: any;
  /** 线程实体（可选，用于识别父线程） */
  threadEntity?: any;
  /** 线程注册表（可选，用于获取父线程实体） */
  threadRegistry?: any;
  /** 工具可见性协调器（可选） */
  toolVisibilityCoordinator?: any;
  /** 线程上下文（可选，用于刷新工具可见性声明） */
  threadContext?: any;
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

    // 2. 获取目标ConversationManager
    let targetConversationManager = context.conversationManager;

    if (config.operationOptions?.target === 'parent') {
      const threadEntity = context.threadEntity;
      const threadRegistry = context.threadRegistry;

      if (threadEntity && threadRegistry && threadEntity.getParentThreadId()) {
        const parentThreadEntity = threadRegistry.get(threadEntity.getParentThreadId());
        if (parentThreadEntity) {
          targetConversationManager = parentThreadEntity.getConversationManager();
          logger.info(`Targeting parent thread: ${threadEntity.getParentThreadId()} for context processing`, {
            nodeId: node.id,
            threadId: thread.id,
            parentThreadId: threadEntity.getParentThreadId()
          });
        }
      }
    }

    // 3. 获取当前消息状态
    const allMessages = targetConversationManager.getAllMessages();
    const markMap = targetConversationManager.getMarkMap();

    // 4. 构建操作上下文
    const operationContext: MessageOperationContext = {
      messages: allMessages,
      markMap: markMap,
      options: config.operationOptions
    };

    // 5. 执行消息操作，由 ConversationManager/MessageHistoryManager 内部处理刷新、事件等
    const result = await targetConversationManager.executeMessageOperation(
      config.operationConfig,
      async () => {
        // 操作后回调：刷新工具可见性声明
        if (context.toolVisibilityCoordinator && context.threadContext) {
          try {
            await context.toolVisibilityCoordinator.refreshDeclaration(context.threadContext);
          } catch (error) {
            // 记录警告日志，不中断执行
            logger.warn(
              `Failed to refresh tool visibility declaration after message operation: ${error instanceof Error ? error.message : String(error)}`,
              {
                operation: config.operationConfig.operation,
                nodeId: node.id,
                threadId: thread.id,
                workflowId: thread.workflowId
              }
            );
          }
        }
      }
    );

    // 6. 获取处理后的消息数量
    const messageCount = targetConversationManager.getMessages().length;

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
