/**
 * Agent Loop 节点处理器
 *
 * 负责在 Graph 执行引擎中处理 AgentLoop 节点。
 * 使用新的 AgentLoopCoordinator 架构，支持暂停/恢复功能。
 */

import type {
  Node,
  Thread,
  AgentLoopNodeConfig,
  LLMMessage
} from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import { now, diffTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import type { ConversationManager } from '../../../../core/managers/conversation-manager.js';
import type { EventManager } from '../../../../core/services/event-manager.js';
import {
  AgentLoopCoordinator,
  AgentLoopRegistry,
  AgentLoopExecutor
} from '../../../../agent/index.js';
import { safeEmit } from '../../utils/index.js';
import {
  buildMessageAddedEvent,
  buildConversationStateChangedEvent
} from '../../utils/event/event-builder.js';
import { LLMWrapper } from '../../../../core/llm/index.js';
import { ToolService } from '../../../../core/services/tool-service.js';

/**
 * Agent Loop 节点执行结果
 */
export interface AgentLoopExecutionResult {
  /** 执行状态 */
  status: 'COMPLETED' | 'FAILED' | 'ABORTED' | 'PAUSED';
  /** 最终LLM响应内容 */
  content?: string;
  /** 实际迭代次数 */
  iterations?: number;
  /** 工具调用次数 */
  toolCallCount?: number;
  /** 是否因为达到最大迭代次数而结束 */
  hitIterationLimit?: boolean;
  /** 错误信息（如果失败） */
  error?: Error;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** Agent Loop 实例 ID（用于暂停/恢复） */
  loopId?: string;
}

/**
 * Agent Loop 处理器上下文
 */
export interface AgentLoopHandlerContext {
  /** LLM 包装器 */
  llmWrapper: LLMWrapper;
  /** 工具服务 */
  toolService: ToolService;
  /** 对话管理器 */
  conversationManager: ConversationManager;
  /** 事件管理器 */
  eventManager: EventManager;
  /** Agent Loop 注册表（可选，用于跨请求管理） */
  agentLoopRegistry?: AgentLoopRegistry;
  /** 线程注册表（用于检查中断） */
  threadRegistry?: any;
}

/**
 * 创建 AgentLoopCoordinator 实例
 */
function createCoordinator(context: AgentLoopHandlerContext): AgentLoopCoordinator {
  const registry = context.agentLoopRegistry ?? new AgentLoopRegistry();
  const executor = new AgentLoopExecutor(context.llmWrapper, context.toolService);

  return new AgentLoopCoordinator(registry, executor);
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

    // 2. 创建 Coordinator 并执行
    const coordinator = createCoordinator(context);

    const result = await coordinator.execute({
      profileId: config.profileId,
      systemPrompt: config.systemPrompt,
      initialMessages,
      tools: config.tools,
      maxIterations: config.maxIterations
    }, {
      conversationManager: context.conversationManager,
      parentThreadId: thread.id,
      nodeId: node.id
    });

    if (!result.success) {
      throw result.error || new Error('Agent loop failed');
    }

    // 3. 同步消息到 ConversationManager
    // 新架构中，消息已经通过 AgentLoopEntity 自动同步到 ConversationManager
    // 这里只需要触发事件
    if (result.content) {
      await safeEmit(context.eventManager, buildMessageAddedEvent({
        threadId: thread.id,
        role: 'assistant',
        content: result.content,
        nodeId: node.id
      }));
    }

    // 触发对话状态变更事件
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
      toolCallCount: result.toolCallCount,
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

/**
 * 流式 Agent Loop 节点处理器
 */
export async function* agentLoopStreamHandler(
  thread: Thread,
  node: Node,
  context: AgentLoopHandlerContext
): AsyncGenerator<any, AgentLoopExecutionResult, unknown> {
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
    }

    // 2. 创建 Coordinator 并流式执行
    const coordinator = createCoordinator(context);

    for await (const event of coordinator.executeStream({
      profileId: config.profileId,
      systemPrompt: config.systemPrompt,
      initialMessages,
      tools: config.tools,
      maxIterations: config.maxIterations
    }, {
      conversationManager: context.conversationManager,
      parentThreadId: thread.id,
      nodeId: node.id
    })) {
      // 转发流式事件
      yield {
        type: 'agent_loop_event',
        threadId: thread.id,
        nodeId: node.id,
        event
      };
    }

    // 3. 获取执行结果
    const entity = coordinator.getRunning()[0] || coordinator.getPaused()[0];
    const iterations = entity?.state.currentIteration ?? 0;
    const toolCallCount = entity?.state.toolCallCount ?? 0;
    const content = entity?.getMessages().filter((m: any) => m.role === 'assistant').pop()?.content;

    // 4. 更新变量
    if (thread.variableScopes?.thread) {
      thread.variableScopes.thread['output'] = content;
      thread.variableScopes.thread['agentLoopIterations'] = iterations;
      thread.variableScopes.thread['agentLoopToolCallCount'] = toolCallCount;
    }

    return {
      status: entity?.isPaused() ? 'PAUSED' : 'COMPLETED',
      content: typeof content === 'string' ? content : undefined,
      iterations,
      toolCallCount,
      executionTime: diffTimestamp(startTime, now()),
      loopId: entity?.id
    };

  } catch (error) {
    return {
      status: 'FAILED',
      error: getErrorOrNew(error),
      executionTime: diffTimestamp(startTime, now())
    };
  }
}
