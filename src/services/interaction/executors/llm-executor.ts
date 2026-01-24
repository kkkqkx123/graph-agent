/**
 * LLM Executor 接口和实现
 *
 * 负责执行 LLM 调用
 */

import { injectable, inject } from 'inversify';
import { IInteractionContext } from '../interaction-context';
import { LLMExecutionResult } from '../interaction-engine';
import { LLMConfig } from '../../../domain/interaction/value-objects/llm-config';
import { Message } from '../../../domain/interaction/value-objects/message';
import { MessageRole } from '../../../domain/interaction/value-objects/message-role';
import { ToolCall } from '../../../domain/interaction/value-objects/tool-call';
import { LLMCall } from '../../../domain/interaction/value-objects/llm-call';
import { InteractionTokenUsage as TokenUsage } from '../../../domain/interaction/value-objects/token-usage';
import { ILogger } from '../../../domain/common/types/logger-types';
import { Wrapper } from '../../llm/wrapper';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMMessage, LLMMessageRole } from '../../../domain/llm/value-objects/llm-message';
import { ID } from '../../../domain/common/value-objects/id';

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
 * 使用基础设施层的 BaseLLMClient 执行 LLM 调用
 */
@injectable()
export class LLMExecutor implements ILLMExecutor {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('Wrapper') private readonly wrapper: Wrapper
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
      // 1. 构建 LLM 请求
      const llmRequest = this.buildLLMRequest(config, context);

      // 2. 使用 Wrapper 执行 LLM 调用
      const llmResponse = await this.wrapper.generateDirectResponse(
        config.provider,
        config.model,
        llmRequest
      );

      // 3. 处理响应
      const result = this.processResponse(llmResponse, config, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result.output,
        messages: result.messages,
        toolCalls: result.toolCalls,
        llmCalls: result.llmCalls,
        tokenUsage: result.tokenUsage,
        executionTime,
        metadata: {
          provider: config.provider,
          model: config.model,
          requestId: llmRequest.requestId.toString(),
          responseId: llmResponse.responseId.toString(),
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
   * 构建 LLM 请求
   * @param config LLM 配置
   * @param context Interaction 上下文
   * @returns LLM 请求
   */
  private buildLLMRequest(
    config: LLMConfig,
    context: IInteractionContext
  ): LLMRequest {
    // 构建消息列表
    const messages: LLMMessage[] = [];

    // 添加系统消息
    if (config.systemPrompt) {
      messages.push(LLMMessage.createSystem(config.systemPrompt));
    }

    // 添加上下文中的历史消息
    const contextMessages = context.getMessages();
    for (const msg of contextMessages) {
      messages.push(this.convertToLLMMessage(msg));
    }

    // 添加当前用户消息
    messages.push(LLMMessage.createUser(config.prompt));

    // 构建 LLM 请求
    return LLMRequest.create(config.model, messages, {
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      stop: config.stopSequences,
      stream: config.stream,
    });
  }

  /**
   * 将 Interaction Message 转换为 LLM Message
   * @param message Interaction 消息
   * @returns LLM 消息
   */
  private convertToLLMMessage(message: Message): LLMMessage {
    switch (message.role) {
      case MessageRole.SYSTEM:
        return LLMMessage.createSystem(message.content);
      case MessageRole.USER:
        return LLMMessage.createUser(message.content);
      case MessageRole.ASSISTANT:
        // 添加工具调用
        if (message.toolCalls && message.toolCalls.length > 0) {
          const toolCalls = message.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          }));
          return LLMMessage.fromInterface({
            role: LLMMessageRole.ASSISTANT,
            content: message.content,
            toolCalls,
          });
        }
        return LLMMessage.createAssistant(message.content);
      case MessageRole.TOOL:
        return LLMMessage.fromInterface({
          role: LLMMessageRole.TOOL,
          content: message.content,
          toolCallId: message.toolCallId,
        });
      default:
        return LLMMessage.createUser(message.content);
    }
  }

  /**
   * 处理 LLM 响应
   * @param llmResponse LLM 响应
   * @param config LLM 配置
   * @param context Interaction 上下文
   * @returns 处理结果
   */
  private processResponse(
    llmResponse: LLMResponse,
    config: LLMConfig,
    context: IInteractionContext
  ): {
    output: string;
    messages: Message[];
    toolCalls: ToolCall[];
    llmCalls: LLMCall[];
    tokenUsage: TokenUsage;
  } {
    // 提取输出内容
    const output = llmResponse.getContent();

    // 构建消息列表
    const messages: Message[] = [];

    // 提取工具调用
    const toolCalls: ToolCall[] = [];
    if (llmResponse.hasToolCalls()) {
      const responseToolCalls = llmResponse.getToolCalls();
      for (const tc of responseToolCalls) {
        const toolCall = new ToolCall({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        });
        toolCalls.push(toolCall);
      }
    }

    // 创建助手消息（包含工具调用）
    const assistantMessage = new Message({
      role: MessageRole.ASSISTANT,
      content: output,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });
    messages.push(assistantMessage);

    // 构建 Token 使用情况
    const tokenUsage = new TokenUsage({
      promptTokens: llmResponse.getPromptTokens(),
      completionTokens: llmResponse.getCompletionTokens(),
      totalTokens: llmResponse.getTotalTokens(),
    });

    // 创建 LLM 调用记录
    const llmCall = new LLMCall({
      id: `llm_${Date.now()}`,
      provider: config.provider,
      model: config.model,
      messages: messages,
      response: output,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: tokenUsage,
      timestamp: new Date().toISOString(),
      executionTime: llmResponse.duration,
    });

    return {
      output,
      messages,
      toolCalls,
      llmCalls: [llmCall],
      tokenUsage,
    };
  }
}