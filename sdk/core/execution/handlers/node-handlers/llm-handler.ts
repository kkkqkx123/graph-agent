/**
 * LLM节点处理器
 * 负责执行LLM节点，处理LLM API调用
 * 
 * 设计原则：
 * - 只包含核心执行逻辑
 * - 依赖LLMExecutionCoordinator进行实际的LLM调用
 * - 返回执行结果
 */

import type { Node, LLMNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { ExecutionError } from '../../../../types/errors';
import { now, diffTimestamp } from '../../../../utils';
import { LLMExecutionCoordinator } from '../../coordinators/llm-execution-coordinator';
import { LLMWrapper } from '../../../llm/wrapper';
import { executeHumanRelay } from '../human-relay-handler';
import type { EventManager } from '../../../services/event-manager';
import { transformLLMNodeConfig } from './config-utils';

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
    const executionData = transformLLMNodeConfig(config);

    // 2. 检查是否为 HumanRelay provider
    const llmWrapper = new LLMWrapper();
    const profile = llmWrapper.getProfile(executionData.profileId || 'default');
    if (profile?.provider === 'HUMAN_RELAY') {
      return await executeHumanRelayLLMNode(thread, node, executionData, context, startTime);
    }

    // 3. 调用 LLMExecutionCoordinator，传入 conversationState
    const result = await context.llmCoordinator.executeLLM(
      {
        threadId: thread.id,
        nodeId: node.id,
        prompt: executionData.prompt,
        profileId: executionData.profileId,
        parameters: executionData.parameters,
        dynamicTools: executionData.dynamicTools,
        maxToolCallsPerRequest: executionData.maxToolCallsPerRequest
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
      error: error instanceof Error ? error : new Error(String(error)),
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