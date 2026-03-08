/**
 * Agent Loop 节点处理器
 * 负责执行 Agent 自循环，支持多轮 LLM-工具调用
 *
 * 设计原则：
 * - 极简配置，专注于 LLM-工具自循环
 * - 不提供复杂约束，复杂控制请使用 LOOP_START/LOOP_END + 图编排
 * - 适用于简单任务和主协调引擎场景
 */

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
import type { ConversationManager } from '../../managers/conversation-manager.js';
import type { EventManager } from '../../../../core/services/event-manager.js';
import { safeEmit } from '../../utils/event/event-emitter.js';
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
 * 检查线程是否已中止
 */
function isThreadAborted(threadId: string, context: AgentLoopHandlerContext): boolean {
  if (!context.threadRegistry) {
    return false;
  }
  const threadEntity = context.threadRegistry.get(threadId);
  if (!threadEntity) {
    return false;
  }
  return threadEntity.getAbortSignal().aborted;
}

/**
 * Agent Loop 节点处理器
 *
 * 执行流程：
 * 1. 获取输入提示词（从上下文变量或节点配置）
 * 2. 循环执行 LLM 调用和工具调用
 * 3. 当没有工具调用或达到最大迭代次数时结束
 * 4. 将结果写入上下文变量
 *
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文
 * @returns 执行结果
 */
export async function agentLoopHandler(
  thread: Thread,
  node: Node,
  context: AgentLoopHandlerContext
): Promise<AgentLoopExecutionResult> {
  const config = node.config as AgentLoopNodeConfig;
  const startTime = now();

  // 参数验证
  if (!config.profileId) {
    return {
      status: 'FAILED',
      error: new ExecutionError('AgentLoop node requires profileId', node.id),
      executionTime: 0
    };
  }

  const maxIterations = config.maxIterations ?? 20;
  const toolCallsHistory: AgentLoopToolCall[] = [];

  try {
    // 获取输入提示词（从上下文变量）
    const inputPrompt = thread.variableScopes?.thread?.['input'] || thread.variableScopes?.thread?.['prompt'];

    // 如果有输入提示词，添加到对话历史
    if (inputPrompt && typeof inputPrompt === 'string') {
      const userMessage: LLMMessage = {
        role: 'user' as MessageRole,
        content: inputPrompt
      };
      context.conversationManager.addMessage(userMessage);

      // 触发消息添加事件
      const messageEvent = buildMessageAddedEvent({
        threadId: thread.id,
        role: 'user',
        content: inputPrompt,
        nodeId: node.id
      });
      await safeEmit(context.eventManager, messageEvent);
    }

    // 如果有系统提示词，添加为system消息
    if (config.systemPrompt) {
      const systemMessage: LLMMessage = {
        role: 'system' as MessageRole,
        content: config.systemPrompt
      };
      context.conversationManager.addMessage(systemMessage);
    }

    let iteration = 0;
    let finalContent = '';
    let hitLimit = false;

    // Agent 自循环
    while (iteration < maxIterations) {
      // 检查是否已中止
      if (isThreadAborted(thread.id, context)) {
        return {
          status: 'ABORTED',
          executionTime: diffTimestamp(startTime, now())
        };
      }

      // 调用 LLM
      const llmResult = await context.llmCoordinator.executeLLM(
        {
          threadId: thread.id,
          nodeId: node.id,
          prompt: '', // 提示词已在conversationManager中
          profileId: config.profileId,
          tools: config.tools
        },
        context.conversationManager
      );

      if (!llmResult.success) {
        throw llmResult.error || new ExecutionError('LLM execution failed', node.id);
      }

      finalContent = llmResult.content || '';
      const messages = context.conversationManager.getMessages();
      const lastMessage = messages[messages.length - 1];

      // 检查是否有工具调用
      const toolCalls = lastMessage?.toolCalls;
      if (!toolCalls || toolCalls.length === 0) {
        // 没有工具调用，循环结束
        break;
      }

      // 执行工具调用
      const toolCallTasks = toolCalls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string'
          ? tc.function.arguments
          : JSON.stringify(tc.function.arguments)
      }));

      const executionResults = await context.toolCallExecutor.executeToolCalls(
        toolCallTasks,
        context.conversationManager,
        thread.id,
        node.id,
        { abortSignal: context.threadRegistry?.get(thread.id)?.getAbortSignal() }
      );

      // 记录工具调用历史
      for (let i = 0; i < toolCalls.length; i++) {
        const tc = toolCalls[i];
        const result = executionResults[i];
        if (!tc || !result) continue;
        toolCallsHistory.push({
          iteration: iteration + 1,
          toolName: tc.function.name,
          input: tc.function.arguments,
          output: result.result,
          toolCallId: tc.id
        });
      }

      iteration++;
    }

    // 检查是否因为达到最大迭代次数而结束
    if (iteration >= maxIterations) {
      hitLimit = true;
    }

    // 触发对话状态变化事件
    const stateChangedEvent = buildConversationStateChangedEvent({
      threadId: thread.id,
      messageCount: context.conversationManager.getMessages().length,
      tokenUsage: context.conversationManager.getTokenUsage()?.totalTokens || 0,
      nodeId: node.id
    });
    await safeEmit(context.eventManager, stateChangedEvent);

    // 将结果写入上下文变量
    if (thread.variableScopes?.thread) {
      thread.variableScopes.thread['output'] = finalContent;
      thread.variableScopes.thread['agentLoopIterations'] = iteration;
      thread.variableScopes.thread['agentLoopHitLimit'] = hitLimit;
      thread.variableScopes.thread['agentLoopToolCalls'] = toolCallsHistory;
    }

    const endTime = now();
    return {
      status: 'COMPLETED',
      content: finalContent,
      iterations: iteration,
      hitIterationLimit: hitLimit,
      executionTime: diffTimestamp(startTime, endTime)
    };

  } catch (error) {
    const endTime = now();
    return {
      status: 'FAILED',
      error: getErrorOrNew(error),
      executionTime: diffTimestamp(startTime, endTime)
    };
  }
}
