/**
 * LLM 执行协调器
 * 负责协调 LLM 调用和工具调用的完整流程
 *
 * 核心职责：
 * 1. 协调 LLM 调用和工具调用的循环
 * 2. 处理多轮对话（LLM → 工具 → LLM）
 * 3. 返回最终执行结果
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 状态通过参数传入：所有状态通过 conversationState 参数传入
 */

import type { LLMMessage } from '../../../types/llm';
import { ConversationStateManager } from '../managers/conversation-state-manager';
import { LLMExecutor } from '../llm-executor';
import { type ToolService } from '../../services/tool-service';

/**
 * LLM 执行参数
 */
export interface LLMExecutionParams {
  /** 线程 ID */
  threadId: string;
  /** 节点 ID */
  nodeId: string;
  /** 提示词 */
  prompt: string;
  /** LLM 配置 ID */
  profileId?: string;
  /** LLM 参数 */
  parameters?: Record<string, any>;
  /** 工具列表 */
  tools?: any[];
}

/**
 * LLM 执行返回结果
 */
export interface LLMExecutionResponse {
  /** 是否成功 */
  success: boolean;
  /** LLM 响应内容 */
  content?: string;
  /** 错误信息 */
  error?: Error;
  /** 消息历史 */
  messages?: LLMMessage[];
}

/**
 * LLM 执行协调器类
 *
 * 职责：
 * - 协调 LLM 调用和工具调用的完整流程
 * - 处理多轮对话循环
 * - 返回最终执行结果
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 状态通过参数传入
 */
export class LLMExecutionCoordinator {
  constructor(
    private llmExecutor: LLMExecutor,
    private toolService: ToolService = toolService
  ) { }

  /**
   * 执行 LLM 调用
   *
   * 此方法管理完整的 LLM 调用和工具调用循环：
   * 1. 添加用户消息到对话历史
   * 2. 执行 LLM 调用
   * 3. 如果有工具调用，执行工具并添加结果到对话历史
   * 4. 重复步骤 2-3，直到没有工具调用
   * 5. 返回最终内容
   *
   * @param params 执行参数
   * @param conversationState 对话状态管理器
   * @returns 执行结果
   */
  async executeLLM(
    params: LLMExecutionParams,
    conversationState: ConversationStateManager
  ): Promise<LLMExecutionResponse> {
    try {
      const content = await this.handleLLMExecution(params, conversationState);
      return {
        success: true,
        content,
        messages: conversationState.getMessages()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 处理 LLM 执行请求
   *
   * @param params 执行参数
   * @param conversationState 对话状态管理器
   * @returns LLM 响应内容
   */
  private async handleLLMExecution(
    params: LLMExecutionParams,
    conversationState: ConversationStateManager
  ): Promise<string> {
    const { prompt, profileId, parameters, tools } = params;

    // 步骤 1：添加用户消息
    conversationState.addMessage({
      role: 'user',
      content: prompt
    });

    // 步骤 2：执行 LLM 调用循环
    const maxIterations = 10;
    let iterationCount = 0;
    let finalContent = '';

    while (iterationCount < maxIterations) {
      iterationCount++;

      // 检查 Token 使用情况
      await conversationState.checkTokenUsage();

      // 执行 LLM 调用
      const llmResult = await this.llmExecutor.executeLLMCall(
        conversationState.getMessages(),
        {
          prompt,
          profileId: profileId || 'default',
          parameters: parameters || {},
          tools
        }
      );

      // 更新 Token 使用统计
      if (llmResult.usage) {
        conversationState.updateTokenUsage(llmResult.usage);
      }

      // 完成当前请求的 Token 统计
      conversationState.finalizeCurrentRequest();

      // 将 LLM 响应添加到对话历史
      conversationState.addMessage({
        role: 'assistant',
        content: llmResult.content,
        toolCalls: llmResult.toolCalls?.map((tc: any) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.arguments
          }
        }))
      });

      finalContent = llmResult.content;

      // 检查是否有工具调用
      if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
        // 执行工具调用
        await this.executeToolCalls(
          llmResult.toolCalls,
          conversationState
        );

        // 继续循环让 LLM 处理工具结果
        continue;
      } else {
        // 没有工具调用，退出循环
        break;
      }
    }

    // 返回最终内容
    return finalContent;
  }

  /**
   * 执行工具调用
   *
   * @param toolCalls 工具调用数组
   * @param conversationState 对话状态管理器
   */
  private async executeToolCalls(
    toolCalls: Array<{ id: string; name: string; arguments: string }>,
    conversationState: ConversationStateManager
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      try {
        // 调用 ToolService 执行工具
        const result = await this.toolService.execute(
          toolCall.name,
          JSON.parse(toolCall.arguments),
          {
            timeout: 30000,
            retries: 0,
            retryDelay: 1000
          }
        );

        // 将工具结果添加到对话历史
        const toolMessage = {
          role: 'tool' as const,
          content: result.success && result.result !== undefined
            ? JSON.stringify(result.result)
            : JSON.stringify({ error: result.error }),
          toolCallId: toolCall.id
        };
        conversationState.addMessage(toolMessage);
      } catch (error) {
        // 将错误信息作为工具结果添加到对话历史
        const errorMessage = error instanceof Error ? error.message : String(error);
        const toolMessage = {
          role: 'tool' as const,
          content: JSON.stringify({ error: errorMessage }),
          toolCallId: toolCall.id
        };
        conversationState.addMessage(toolMessage);
      }
    }
  }
}