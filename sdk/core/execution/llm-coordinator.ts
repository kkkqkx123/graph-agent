/**
 * LLM协调器
 * 负责协调LLM执行和工具执行，管理ConversationManager等有状态服务
 *
 * 核心职责：
 * 1. 管理每个线程的 ConversationManager
 * 2. 执行LLM调用和工具调用的循环
 * 3. 返回执行结果
 *
 * 设计原则：
 * - 作为单例服务存在
 * - 管理有状态资源（ConversationManager）
 * - 调用无状态的 LLMExecutor 和 ToolService
 * - 负责协调LLM调用和工具调用的完整流程
 * - 通过直接方法调用而非事件机制与调用方交互
 */

import type {
  LLMExecutionRequestData,
  LLMExecutionResult,
  ContextSnapshot
} from '../../types/internal-events';
import { ConversationManager } from './conversation';
import { LLMExecutor } from './llm-executor';
import { ToolService } from '../tools/tool-service';

/**
 * LLM执行参数
 */
export interface LLMExecutionParams {
  /** 线程ID */
  threadId: string;
  /** 节点ID */
  nodeId: string;
  /** LLM请求数据 */
  requestData: LLMExecutionRequestData;
  /** 上下文快照（可选） */
  contextSnapshot?: ContextSnapshot;
}

/**
 * LLM执行返回结果
 */
export interface LLMExecutionResponse {
  /** 是否成功 */
  success: boolean;
  /** LLM执行结果 */
  result?: LLMExecutionResult;
  /** 错误信息 */
  error?: Error;
  /** 更新后的上下文 */
  updatedContext?: ContextSnapshot;
}

/**
 * LLM协调器类
 *
 * 通过直接方法调用与节点执行器交互
 * 提供完整的LLM执行和工具调用协调功能
 */
export class LLMCoordinator {
  private static instance: LLMCoordinator;
  private conversationManagers: Map<string, ConversationManager> = new Map();
  private llmExecutor: LLMExecutor;
  private toolService: ToolService;

  private constructor() {
    this.llmExecutor = LLMExecutor.getInstance();
    this.toolService = new ToolService();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): LLMCoordinator {
    if (!LLMCoordinator.instance) {
      LLMCoordinator.instance = new LLMCoordinator();
    }
    return LLMCoordinator.instance;
  }

  /**
   * 执行LLM调用
   *
   * @param params 执行参数
   * @returns 执行结果
   */
  async executeLLM(params: LLMExecutionParams): Promise<LLMExecutionResponse> {
    try {
      const result = await this.handleLLMExecution(params);
      return {
        success: true,
        result,
        updatedContext: {
          conversationHistory: this.getConversationManager(params.threadId)?.getMessages()
        }
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
   * 此方法管理完整的LLM调用和工具调用循环：
   * 1. 添加用户消息到对话历史
   * 2. 执行LLM调用
   * 3. 如果有工具调用，执行工具并添加结果到对话历史
   * 4. 重复步骤2-3，直到没有工具调用
   * 5. 返回最终结果
   *
   * @param params 执行参数
   * @returns LLM执行结果
   */
  private async handleLLMExecution(params: LLMExecutionParams): Promise<LLMExecutionResult> {
    const { threadId, requestData, contextSnapshot } = params;

    // 步骤1：获取或创建 ConversationManager
    const conversationManager = this.getOrCreateConversationManager(
      threadId,
      contextSnapshot
    );

    // 步骤2：添加用户消息
    conversationManager.addMessage({
      role: 'user',
      content: requestData.prompt
    });

    // 步骤3：执行LLM调用循环
    const maxIterations = Infinity;
    let iterationCount = 0;
    let finalResult: LLMExecutionResult | null = null;

    while (iterationCount < maxIterations) {
      iterationCount++;

      // 检查Token使用情况
      await conversationManager.checkTokenUsage();

      // 执行LLM调用
      const llmResult = await this.llmExecutor.executeLLMCall(
        conversationManager.getMessages(),
        requestData
      );

      // 更新Token使用统计
      if (llmResult.usage) {
        conversationManager.updateTokenUsage(llmResult.usage);
      }
      
      // 完成当前请求的Token统计
      conversationManager.finalizeCurrentRequest();

      // 将LLM响应添加到对话历史
      conversationManager.addMessage({
        role: 'assistant',
        content: llmResult.content,
        toolCalls: llmResult.toolCalls?.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.arguments
          }
        }))
      });

      // 检查是否有工具调用
      if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
        // 执行工具调用
        await this.executeToolCalls(
          llmResult.toolCalls,
          conversationManager
        );

        // 继续循环让LLM处理工具结果
        continue;
      } else {
        // 没有工具调用，保存最终结果并退出循环
        finalResult = llmResult;
        break;
      }
    }

    // 返回最终结果
    return finalResult!;
  }

  /**
   * 执行工具调用
   * 
   * 直接调用 ToolService 执行工具，无需事件机制
   * 
   * @param toolCalls 工具调用数组
   * @param conversationManager 对话管理器
   */
  private async executeToolCalls(
    toolCalls: Array<{ id: string; name: string; arguments: string }>,
    conversationManager: ConversationManager
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      try {
        // 直接调用 ToolService 执行工具
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
        conversationManager.addMessage(toolMessage);
      } catch (error) {
        // 将错误信息作为工具结果添加到对话历史
        const errorMessage = error instanceof Error ? error.message : String(error);
        const toolMessage = {
          role: 'tool' as const,
          content: JSON.stringify({ error: errorMessage }),
          toolCallId: toolCall.id
        };
        conversationManager.addMessage(toolMessage);
      }
    }
  }

  /**
   * 获取或创建 ConversationManager
   * @param threadId 线程ID
   * @param contextSnapshot 上下文快照（可选）
   * @returns ConversationManager 实例
   */
  private getOrCreateConversationManager(
    threadId: string,
    contextSnapshot?: ContextSnapshot
  ): ConversationManager {
    // 如果已存在，直接返回
    if (this.conversationManagers.has(threadId)) {
      return this.conversationManagers.get(threadId)!;
    }

    // 创建新的 ConversationManager
    const conversationManager = new ConversationManager();

    // 恢复对话历史
    if (contextSnapshot?.conversationHistory) {
      for (const message of contextSnapshot.conversationHistory) {
        conversationManager.addMessage(message);
      }
    }

    // 缓存 ConversationManager
    this.conversationManagers.set(threadId, conversationManager);

    return conversationManager;
  }

  /**
   * 获取线程的 ConversationManager
   * @param threadId 线程ID
   * @returns ConversationManager 实例，如果不存在则返回 undefined
   */
  getConversationManager(threadId: string): ConversationManager | undefined {
    return this.conversationManagers.get(threadId);
  }

  /**
   * 清理线程的 ConversationManager
   * @param threadId 线程ID
   */
  cleanupConversationManager(threadId: string): void {
    this.conversationManagers.delete(threadId);
  }

  /**
   * 清理所有 ConversationManager
   */
  cleanupAll(): void {
    this.conversationManagers.clear();
  }
}