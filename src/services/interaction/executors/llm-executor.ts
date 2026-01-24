/**
 * LLM Executor 接口和实现
 * 
 * 负责执行 LLM 调用
 */

import { injectable, inject } from 'inversify';
import { IInteractionContext } from '../interaction-context';
import { LLMConfig, LLMExecutionResult, Message, MessageRole, ToolCall, LLMCall, TokenUsage } from '../types/interaction-types';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * LLM Executor 接口
 */
export interface ILLMExecutor {
  /**
   * 执行 LLM 调用
   * @param config LLM 配置
   * @param context Interaction 上下文
   * @returns 执行结果
   */
  execute(
    config: LLMConfig,
    context: IInteractionContext
  ): Promise<LLMExecutionResult>;
}

/**
 * LLM Executor 实现
 * 
 * 注意：当前为框架实现，具体 LLM 调用逻辑将在后续实现
 */
@injectable()
export class LLMExecutor implements ILLMExecutor {
  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {}

  async execute(
    config: LLMConfig,
    context: IInteractionContext
  ): Promise<LLMExecutionResult> {
    const startTime = Date.now();

    this.logger.debug('开始执行 LLM 调用', {
      provider: config.provider,
      model: config.model,
    });

    try {
      // TODO: 实现具体的 LLM 调用逻辑
      // 1. 构建 LLM 请求
      // 2. 调用 LLM Client
      // 3. 处理响应
      // 4. 更新上下文

      this.logger.warn('LLM Executor 具体实现尚未完成', {
        provider: config.provider,
        model: config.model,
      });

      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: 'LLM Executor 具体实现尚未完成',
        executionTime,
        metadata: {
          provider: config.provider,
          model: config.model,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('LLM 调用失败', error instanceof Error ? error : new Error(String(error)), {
        provider: config.provider,
        model: config.model,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          provider: config.provider,
          model: config.model,
        },
      };
    }
  }

  /**
   * 构建 LLM 请求消息列表
   * @param config LLM 配置
   * @param context Interaction 上下文
   * @returns 消息列表
   */
  private buildMessages(
    config: LLMConfig,
    context: IInteractionContext
  ): Message[] {
    const messages: Message[] = [];

    // 添加系统消息
    if (config.systemPrompt) {
      messages.push({
        role: MessageRole.SYSTEM,
        content: config.systemPrompt,
        timestamp: new Date().toISOString(),
      });
    }

    // 添加上下文中的历史消息
    messages.push(...context.getMessages());

    // 添加当前用户消息
    messages.push({
      role: MessageRole.USER,
      content: config.prompt,
      timestamp: new Date().toISOString(),
    });

    return messages;
  }

  /**
   * 创建 LLM 调用记录
   * @param config LLM 配置
   * @param messages 消息列表
   * @param response 响应内容
   * @param toolCalls 工具调用
   * @param usage Token 使用情况
   * @param executionTime 执行时间
   * @returns LLM 调用记录
   */
  private createLLMCall(
    config: LLMConfig,
    messages: Message[],
    response: string,
    toolCalls?: ToolCall[],
    usage?: TokenUsage,
    executionTime?: number
  ): LLMCall {
    return {
      id: `llm_${Date.now()}`,
      provider: config.provider,
      model: config.model,
      messages,
      response,
      toolCalls,
      usage,
      timestamp: new Date().toISOString(),
      executionTime,
    };
  }
}