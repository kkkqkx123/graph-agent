/**
 * HumanRelay服务实现
 *
 * 负责HumanRelay业务逻辑编排
 */

import { injectable, inject } from 'inversify';
import { IHumanRelayService, HumanRelayConfig } from '../../../domain/llm/services/human-relay-service.interface';
import { IInteractionStrategy } from '../strategies/interaction-strategy.interface';
import { IPromptRenderingService, Prompt } from './prompt-rendering-service.interface';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMMessage, LLMMessageRole } from '../../../domain/llm/value-objects/llm-message';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';
import { ID } from '../../../domain/common/value-objects/id';

/**
 * 响应类型枚举
 */
enum ResponseType {
  NORMAL = 'normal',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

/**
 * 简化的响应数据结构
 */
interface SimpleResponse {
  id: string;
  content: string;
  type: ResponseType;
  responseTime: number;
  userInteractionTime: number;
  createdAt: Date;
  errorMessage?: string;
}

@injectable()
export class HumanRelayService implements IHumanRelayService {
  private conversationHistory: any[] = [];
  private promptHistory: Prompt[] = [];
  private responseHistory: SimpleResponse[] = [];

  constructor(
    @inject('IInteractionStrategy')
    private interactionStrategy: IInteractionStrategy,
    @inject('IPromptRenderingService')
    private promptRenderingService: IPromptRenderingService
  ) {}

  async processRequest(request: LLMRequest, config: HumanRelayConfig): Promise<LLMResponse> {
    try {
      // 1. 构建提示
      const prompt = this.buildPrompt(request, config);

      // 2. 发送提示并等待用户响应
      const timeout = config.defaultTimeout;
      const userResponse = await this.sendPromptAndWaitForResponse(prompt, timeout);

      // 3. 更新历史记录
      this.updateHistory(request, userResponse, prompt, config);

      // 4. 构建LLM响应
      return await this.createLLMResponse(userResponse, request);

    } catch (error) {
      throw error;
    }
  }

  setInteractionStrategy(strategy: any): void {
    this.interactionStrategy = strategy;
  }

  getInteractionStrategy(): any {
    return this.interactionStrategy;
  }

  /**
   * 构建提示
   */
  private buildPrompt(request: LLMRequest, config: HumanRelayConfig): Prompt {
    // 转换消息格式
    const iLLMMessages = request.messages.map(msg => ({
      role: this.convertMessageRole(msg.getRole()),
      content: msg.getContent(),
      metadata: {}
    }));

    // 构建内容和上下文
    let content: string;
    let conversationContext: string | undefined;

    if (config.mode === HumanRelayMode.SINGLE) {
      // 单轮模式：合并所有消息作为完整上下文
      content = iLLMMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    } else {
      // 多轮模式：只使用最新消息作为增量内容
      const latestMessage = iLLMMessages[iLLMMessages.length - 1];
      if (!latestMessage) {
        throw new Error('消息列表不能为空');
      }

      // 历史消息作为上下文（除了最新消息）
      const historyMessages = iLLMMessages.slice(0, -1);
      conversationContext = historyMessages.length > 0
        ? historyMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
        : undefined;

      content = `${latestMessage.role}: ${latestMessage.content}`;
    }

    return this.promptRenderingService.buildPrompt(
      content,
      config.mode,
      conversationContext
    );
  }

  /**
   * 转换消息角色
   */
  private convertMessageRole(role: LLMMessageRole): string {
    switch (role) {
      case LLMMessageRole.SYSTEM:
        return 'system';
      case LLMMessageRole.USER:
        return 'user';
      case LLMMessageRole.ASSISTANT:
        return 'assistant';
      case LLMMessageRole.TOOL:
        return 'tool';
      default:
        return 'user';
    }
  }

  /**
   * 发送提示并等待响应
   */
  private async sendPromptAndWaitForResponse(
    prompt: Prompt,
    timeout: number
  ): Promise<SimpleResponse> {
    const startTime = Date.now();

    try {
      // 渲染提示内容
      const renderedPrompt = this.promptRenderingService.renderPrompt(prompt);

      // 使用策略模式显示提示并等待用户输入
      const userInput = await this.interactionStrategy.promptUser(renderedPrompt, timeout);
      const responseTime = Date.now() - startTime;

      // 创建响应
      const response: SimpleResponse = {
        id: ID.generate().value,
        content: userInput,
        type: ResponseType.NORMAL,
        responseTime,
        userInteractionTime: responseTime,
        createdAt: new Date()
      };

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新历史记录
   */
  private updateHistory(
    request: LLMRequest,
    response: SimpleResponse,
    prompt: Prompt,
    config: HumanRelayConfig
  ): void {
    // 添加提示到历史
    this.promptHistory.push({
      ...prompt,
      status: 'responded'
    });

    // 添加响应到历史
    this.responseHistory.push(response);

    // 多轮模式下更新对话历史
    if (config.mode === HumanRelayMode.MULTI) {
      // 添加用户消息
      request.messages.forEach(msg => {
        const iLLMMsg = {
          role: this.convertMessageRole(msg.getRole()),
          content: msg.getContent(),
          metadata: {
            name: msg.getName(),
            tool_calls: msg.getToolCalls(),
            tool_call_id: msg.getToolCallId()
          }
        };
        this.conversationHistory.push(iLLMMsg);
      });

      // 添加助手响应
      if (response.type === ResponseType.NORMAL) {
        const assistantMessage = {
          role: LLMMessageRole.ASSISTANT,
          content: response.content,
          metadata: {
            responseId: response.id,
            responseTime: response.responseTime,
            userInteractionTime: response.userInteractionTime
          }
        };
        this.conversationHistory.push(assistantMessage);
      }

      // 检查历史长度
      if (this.conversationHistory.length > config.maxHistoryLength) {
        this.conversationHistory = this.conversationHistory.slice(-config.maxHistoryLength);
      }
    }
  }

  /**
   * 创建LLM响应
   */
  private async createLLMResponse(
    humanRelayResponse: SimpleResponse,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const promptTokens = await this.estimateTokensSync(request);
    const completionTokens = await this.estimateTokensSync(humanRelayResponse.content);

    return LLMResponse.create(
      request.id,
      'human-relay',
      [{
        index: 0,
        message: LLMMessage.createAssistant(humanRelayResponse.content),
        finish_reason: humanRelayResponse.type === ResponseType.NORMAL ? 'stop' : 'error'
      }],
      {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      },
      humanRelayResponse.type === ResponseType.NORMAL ? 'stop' : 'error',
      0,
      {
        metadata: {
          responseId: humanRelayResponse.id,
          responseTime: humanRelayResponse.responseTime,
          userInteractionTime: humanRelayResponse.userInteractionTime,
          responseType: humanRelayResponse.type
        }
      }
    );
  }

  /**
   * 估算token数量（内部方法）
   */
  private async estimateTokensSync(request: LLMRequest | string): Promise<number> {
    const text = typeof request === 'string'
      ? request
      : request.messages.map(m => m.getContent()).join(' ');
    // 简单估算：1个字符约等于0.25个token
    return Math.ceil(text.length * 0.25);
  }
}