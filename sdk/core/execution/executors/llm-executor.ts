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

import { isAbortError, checkInterruption, getInterruptionType, getThreadId, getNodeId } from '@modular-agent/common-utils';
import type { InterruptionCheckResult } from '@modular-agent/common-utils';
import type { LLMMessage, LLMResult } from '@modular-agent/types';
import { LLMWrapper } from '../../llm/wrapper.js';
import { ExecutionError, ThreadInterruptedException, LLMError } from '@modular-agent/types';
import type { EventManager } from '../../services/event-manager.js';

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
 * LLM执行结果（包含中断状态）
 */
export type LLMExecutionResultWithInterruption =
  | { success: true; result: LLMExecutionResult }
  | { success: false; interruption: InterruptionCheckResult };

/**
 * LLM执行器类（无状态单例）
 * 
 * 提供方法来执行LLM调用，不持有任何状态
 * 所有状态通过参数传入，结果通过返回值传出
 */
export class LLMExecutor {
  private static instance: LLMExecutor;
  private llmWrapper: LLMWrapper;

  private constructor(eventManager?: EventManager) {
    this.llmWrapper = new LLMWrapper(eventManager);
  }

  /**
   * 获取单例实例
   * @param eventManager 事件管理器（可选）
   * @returns LLMExecutor 实例
   */
  static getInstance(eventManager?: EventManager): LLMExecutor {
    if (!LLMExecutor.instance) {
      LLMExecutor.instance = new LLMExecutor(eventManager);
    }
    return LLMExecutor.instance;
  }

  /**
   * 设置事件管理器
   * @param eventManager 事件管理器
   */
  setEventManager(eventManager: EventManager): void {
    this.llmWrapper.setEventManager(eventManager);
  }

  /**
   * 处理 LLM 调用错误
   *
   * 统一处理流式和非流式调用的错误逻辑
   *
   * @param error 错误对象
   * @param profileId LLM profile ID
   * @param options 执行选项
   * @returns 执行结果（包含中断状态或错误）
   */
  private handleLLMError(
    error: LLMError,
    profileId: string,
    options?: { abortSignal?: AbortSignal, threadId?: string, nodeId?: string }
  ): LLMExecutionResultWithInterruption {
    // 检查是否是 AbortError
    if (isAbortError(error)) {
      const result = checkInterruption(options?.abortSignal);
      // PAUSE/STOP 返回中断状态
      if (result.type === 'paused' || result.type === 'stopped') {
        return {
          success: false,
          interruption: result
        };
      }
      // 普通中止（aborted）也返回中断状态
      if (result.type === 'aborted') {
        return {
          success: false,
          interruption: result
        };
      }
      // 未中止（continue），抛出原始错误
      throw error;
    }

    // 转换为 ExecutionError 并抛出
    throw new ExecutionError(
      `LLM call failed: ${error.message}`,
      options?.nodeId,
      undefined,
      { originalError: error, profileId },
      error
    );
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
   * @returns LLM执行结果或中断状态
   */
  async executeLLMCall(
    messages: LLMMessage[],
    requestData: LLMExecutionRequestData,
    options?: { abortSignal?: AbortSignal, threadId?: string, nodeId?: string }
  ): Promise<LLMExecutionResultWithInterruption> {
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

    // 执行LLM调用
    if (llmRequest.stream) {
      // 流式调用 - 返回 Result<MessageStream, LLMError>
      const streamResult = await this.llmWrapper.generateStream(llmRequest);

      if (streamResult.isErr()) {
        return this.handleLLMError(streamResult.error, requestData.profileId, options);
      }

      const messageStream = streamResult.value;

      // 消费流，保存最后一个有 finishReason 的 chunk 作为最终结果
      for await (const event of messageStream) {
        // event 是 InternalStreamEvent 类型
        // 我们需要从 MessageStream 中获取最终结果
        const result = await messageStream.getFinalResult();
        if (result) {
          finalResult = result;
        }
      }

      // 如果没有通过事件获取到结果，尝试直接获取
      if (!finalResult) {
        finalResult = await messageStream.getFinalResult();
      }
    } else {
      // 非流式调用 - 返回 Result<LLMResult, LLMError>
      const result = await this.llmWrapper.generate(llmRequest);

      if (result.isErr()) {
        return this.handleLLMError(result.error, requestData.profileId, options);
      }

      finalResult = result.value;
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
      success: true,
      result: {
        content: finalResult.content,
        usage: finalResult.usage,
        finishReason: finalResult.finishReason,
        toolCalls: finalResult.toolCalls?.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments
        }))
      }
    };
  }
}