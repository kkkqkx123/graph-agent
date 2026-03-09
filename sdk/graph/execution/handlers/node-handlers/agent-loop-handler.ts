import type {
  Node,
  Thread,
  AgentLoopNodeConfig,
  AgentLoopToolCall,
  LLMMessage,
  MessageRole
} from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import { now, diffTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import type { LLMExecutionCoordinator } from '../../coordinators/llm-execution-coordinator.js';
import type { ToolCallExecutor } from '../../executors/tool-call-executor.js';
import type { ConversationManager } from '../../../../core/execution/managers/conversation-manager.js';
import type { EventManager } from '../../../../core/services/event-manager.js';
import type { AgentLoopExecutor } from '../../../../agent/executors/agent-loop-executor.js';
import { safeEmit } from '../../utils/index.js';
import {
  buildMessageAddedEvent,
  buildConversationStateChangedEvent
} from '../../utils/event/event-builder.js';

/**
 * Agent Loop 节点执行结果
 */
export interface AgentLoopExecutionResult {
  /** 执行状态 */
  status: 'COMPLETED' | 'FAILED' | 'ABORTED';
  /** 最终LLM响应内容 */
  content?: string;
  /** 实际迭代次数 */
  iterations?: number;
  /** 是否因为达到最大迭代次数而结束 */
  hitIterationLimit?: boolean;
  /** 错误信息（如果失败） */
  error?: Error;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * Agent Loop 处理器上下文
 */
export interface AgentLoopHandlerContext {
  /** Agent 循环执行器 */
  agentLoopExecutor: AgentLoopExecutor;
  /** LLM执行协调器 */
  llmCoordinator: LLMExecutionCoordinator;
  /** 工具调用执行器 */
  toolCallExecutor: ToolCallExecutor;
  /** 对话管理器 */
  conversationManager: ConversationManager;
  /** 事件管理器 */
  eventManager: EventManager;
  /** 线程注册表（用于检查中断） */
  threadRegistry?: any;
}

/**
 * Agent Loop 节点处理器
 */
export async function agentLoopHandler(
  thread: Thread,
  node: Node,
  context: AgentLoopHandlerContext
): Promise<AgentLoopExecutionResult> {
  const config = node.config as AgentLoopNodeConfig;
  const startTime = now();

  if (!config.profileId) {
    return {
      status: 'FAILED',
      error: new ExecutionError('AgentLoop node requires profileId', node.id),
      executionTime: 0
    };
  }

  try {
    // 1. 准备初始消息
    const initialMessages: LLMMessage[] = [];
    const inputPrompt = thread.variableScopes?.thread?.['input'] || thread.variableScopes?.thread?.['prompt'];

    if (inputPrompt && typeof inputPrompt === 'string') {
      initialMessages.push({ role: 'user', content: inputPrompt });

      // 触发消息添加事件
      await safeEmit(context.eventManager, buildMessageAddedEvent({
        threadId: thread.id,
        role: 'user',
        content: inputPrompt,
        nodeId: node.id
      }));
    }

    // 2. 调用 AgentLoopExecutor 执行循环
    const result = await context.agentLoopExecutor.run({
      profileId: config.profileId,
      systemPrompt: config.systemPrompt,
      initialMessages,
      tools: config.tools,
      maxIterations: config.maxIterations
    });

    if (!result.success) {
      throw result.error || new Error('Agent loop failed');
    }

    // 3. 将结果同步回 Graph 对话历史（用于持久化和展示）
    // 注意：AgentLoopExecutor 内部使用了独立的 MessageHistory
    // 我们需要将新增加的消息同步到 context.conversationManager
    const allMessages = result.content ? [{ role: 'assistant', content: result.content }] : [];
    // TODO: 如果需要更完整的同步，可以在 AgentLoopService 中增加获取新增消息的方法
    if (result.content) {
      context.conversationManager.addMessage({ role: 'assistant', content: result.content });
    }

    // 触发事件
    await safeEmit(context.eventManager, buildConversationStateChangedEvent({
      threadId: thread.id,
      messageCount: context.conversationManager.getMessages().length,
      tokenUsage: 0, // 暂时不统计总消耗
      nodeId: node.id
    }));

    // 4. 更新变量
    if (thread.variableScopes?.thread) {
      thread.variableScopes.thread['output'] = result.content;
      thread.variableScopes.thread['agentLoopIterations'] = result.iterations;
      thread.variableScopes.thread['agentLoopToolCallCount'] = result.toolCallCount;
    }

    return {
      status: 'COMPLETED',
      content: result.content,
      iterations: result.iterations,
      executionTime: diffTimestamp(startTime, now())
    };

  } catch (error) {
    return {
      status: 'FAILED',
      error: getErrorOrNew(error),
      executionTime: diffTimestamp(startTime, now())
    };
  }
}
