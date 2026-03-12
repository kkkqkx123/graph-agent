/**
 * LLM节点处理器
 * 负责执行LLM节点，处理LLM API调用
 * 
 * 设计原则：
 * - 只包含核心执行逻辑
 * - 依赖LLMExecutionCoordinator进行实际的LLM调用
 * - 工具审批等业务逻辑由Graph模块处理
 * - 返回执行结果
 */

import type { Node, LLMNodeConfig } from '@modular-agent/types';
import type { GraphLLMExecutionConfig } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import { now, diffTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import { LLMExecutionCoordinator } from '../../../../core/coordinators/llm-execution-coordinator.js';
import { LLMWrapper } from '../../../../core/llm/wrapper.js';
import { executeHumanRelay } from '../human-relay-handler.js';
import type { EventManager } from '../../../../core/services/event-manager.js';

/**
 * LLM节点执行结果
 */
export interface LLMExecutionResult {
  /** 执行状态 */
  status: 'COMPLETED' | 'FAILED';
  /** LLM响应内容 */
  content?: string;
  /** 错误信息（如果失败） */
  error?: Error;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * LLM处理器上下文
 */
export interface LLMHandlerContext {
  /** LLM执行协调器 */
  llmCoordinator: LLMExecutionCoordinator;
  /** LLM包装器 */
  llmWrapper: LLMWrapper;
  /** 事件管理器 */
  eventManager: EventManager;
  /** 对话管理器 */
  conversationManager: any;
  /** HumanRelay处理器（可选） */
  humanRelayHandler?: any;
}

/**
 * LLM节点处理器
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文
 * @returns 执行结果
 */
export async function llmHandler(
  thread: Thread,
  node: Node,
  context: LLMHandlerContext
): Promise<LLMExecutionResult> {
  const config = node.config as LLMNodeConfig;
  const startTime = now();

  try {
    // 1. 转换配置为执行数据（配置已在工作流注册时通过静态验证）
    const executionData = {
      prompt: config.prompt || '',
      profileId: config.profileId,
      parameters: config.parameters || {},
      maxToolCallsPerRequest: config.maxToolCallsPerRequest,
      stream: false
    };

    // 2. 检查是否为 HumanRelay provider
    const profile = context.llmWrapper.getProfile(executionData.profileId || 'DEFAULT');
    if (profile?.provider === 'HUMAN_RELAY') {
      return await executeHumanRelayLLMNode(thread, node, executionData, context, startTime);
    }

    // 3. 创建执行配置
    const executionConfig: GraphLLMExecutionConfig = {
      profileId: executionData.profileId,
      parameters: executionData.parameters,
      maxToolCallsPerRequest: executionData.maxToolCallsPerRequest,
      workflowId: thread.workflowId,
      nodeId: node.id,
      threadId: thread.id
    };

    // 4. 调用 LLMExecutionCoordinator
    const result = await context.llmCoordinator.executeLLM(
      {
        contextId: thread.id,
        prompt: executionData.prompt,
        config: executionConfig,
        eventManager: context.eventManager,
        nodeId: node.id
      },
      context.conversationManager
    );

    const endTime = now();

    if (result.success) {
      return {
        status: 'COMPLETED',
        content: result.content,
        executionTime: diffTimestamp(startTime, endTime)
      };
    } else {
      return {
        status: 'FAILED',
        error: result.error,
        executionTime: diffTimestamp(startTime, endTime)
      };
    }
  } catch (error) {
    const endTime = now();
    return {
      status: 'FAILED',
      error: getErrorOrNew(error),
      executionTime: diffTimestamp(startTime, endTime)
    };
  }
}

/**
 * 执行 HumanRelay LLM节点
 */
async function executeHumanRelayLLMNode(
  thread: Thread,
  node: Node,
  requestData: any,
  context: LLMHandlerContext,
  startTime: number
): Promise<LLMExecutionResult> {
  if (!context.humanRelayHandler) {
    throw new ExecutionError('HumanRelayHandler is not provided', node.id);
  }

  try {
    // 获取当前对话消息
    const messages = context.conversationManager.getMessages();

    // 调用 executeHumanRelay 函数
    const result = await executeHumanRelay(
      messages,
      requestData.prompt || 'Please provide your input:',
      requestData.parameters?.timeout || 300000,
      { thread, conversationManager: context.conversationManager } as any, // 简化处理，实际应该传入完整的ThreadContext
      context.eventManager,
      context.humanRelayHandler,
      node.id
    );

    const endTime = now();

    // HumanRelay执行成功，返回结果
    return {
      status: 'COMPLETED',
      content: typeof result.message.content === 'string' ? result.message.content : JSON.stringify(result.message.content),
      executionTime: diffTimestamp(startTime, endTime)
    };
  } catch (error) {
    const endTime = now();
    return {
      status: 'FAILED',
      error: error instanceof Error ? error : new Error(String(error)),
      executionTime: diffTimestamp(startTime, endTime)
    };
  }
}
