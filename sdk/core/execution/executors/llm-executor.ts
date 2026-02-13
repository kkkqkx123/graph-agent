/**
 * LLM执行器
 * 提供无状态的LLM调用方法
 * 
 * 核心职责：
 * 1. 执行LLM调用（非流式和流式）
 * 2. 委托给 sdk/core/llm 模块的 LLMWrapper
 * 
 * 设计原则：
 * - 无状态设计，不持有任何状态
 * - 所有状态通过参数传入
 * - 可以作为单例存在
 * - 由 LLMCoordinator 调用
 * - 不处理工具调用，工具调用由 LLMCoordinator 协调
 */

import type { LLMMessage, LLMResult } from '@modular-agent/types/llm';
import { LLMWrapper } from '../../llm/wrapper';
import { ExecutionError, ThreadInterruptedException, LLMAbortError } from '@modular-agent/types/errors';

/**
 * LLM执行请求数据
 */
export interface LLMExecutionRequestData {
  prompt: string;
  profileId: string;
  parameters: Record<string, any>;
  tools?: any[];
  /** 动态工具配置 */
  dynamicTools?: {
    /** 要动态添加的工具ID或名称 */
    toolIds: string[];
    /** 工具描述模板（可选） */
    descriptionTemplate?: string;
  };
  /** 单次LLM调用最多返回的工具调用数（默认3） */
  maxToolCallsPerRequest?: number;
  stream?: boolean;
}

/**
 * LLM执行结果
 */
export interface LLMExecutionResult {
  content: string;
  usage?: any;
  finishReason?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
}

/**
 * LLM执行器类（无状态单例）
 * 
 * 提供方法来执行LLM调用，不持有任何状态
 * 所有状态通过参数传入，结果通过返回值传出
 */
export class LLMExecutor {
  private static instance: LLMExecutor;
  private llmWrapper: LLMWrapper;

  private constructor() {
    this.llmWrapper = new LLMWrapper();
  }

  /**
   * 获取单例实例
   * @returns LLMExecutor 实例
   */
  static getInstance(): LLMExecutor {
    if (!LLMExecutor.instance) {
      LLMExecutor.instance = new LLMExecutor();
    }
    return LLMExecutor.instance;
  }

  /**
   * 执行单次LLM调用
   *
   * 注意：此方法只执行一次LLM调用，不处理工具调用循环
   * 工具调用的协调由 LLMCoordinator 负责
   *
   * @param messages 消息数组
   * @param requestData 请求数据
   * @param options 执行选项（包含 AbortSignal 和上下文信息）
   * @returns LLM执行结果
   */
  async executeLLMCall(
    messages: LLMMessage[],
    requestData: LLMExecutionRequestData,
    options?: { abortSignal?: AbortSignal, threadId?: string, nodeId?: string }
  ): Promise<LLMExecutionResult> {
    // 构建LLM请求
    const llmRequest = {
      profileId: requestData.profileId,
      messages: messages,
      tools: requestData.tools,
      parameters: requestData.parameters,
      stream: requestData.stream || false,
      signal: options?.abortSignal // 传递 AbortSignal
    };

    let finalResult: LLMResult | null = null;

    try {
      // 执行LLM调用
      if (llmRequest.stream) {
        // 流式调用
        // Token 统计已在客户端层（BaseLLMClient）累积
        for await (const chunk of this.llmWrapper.generateStream(llmRequest)) {
          // 保存最后一个有 finishReason 的 chunk 作为最终结果
          if (chunk.finishReason) {
            finalResult = chunk;
          }
        }
      } else {
        // 非流式调用
        finalResult = await this.llmWrapper.generate(llmRequest);
      }

      // 检查结果
      if (!finalResult) {
        throw new ExecutionError(
          'No LLM result generated',
          undefined,
          undefined,
          { profileId: requestData.profileId }
        );
      }

      // 构建返回结果
      return {
        content: finalResult.content,
        usage: finalResult.usage,
        finishReason: finalResult.finishReason,
        toolCalls: finalResult.toolCalls?.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments
        }))
      };
    } catch (error) {
      // 处理 AbortError，转换为专门的 LLMAbortError
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMAbortError(
          'LLM call aborted',
          options?.threadId || '',
          options?.nodeId || '',
          error
        );
      }
      
      throw new ExecutionError(
        `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        undefined,
        { originalError: error, profileId: requestData.profileId },
        error instanceof Error ? error : undefined
      );
    }
  }
}