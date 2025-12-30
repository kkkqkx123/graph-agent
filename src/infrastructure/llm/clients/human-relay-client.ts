/**
 * HumanRelay LLM客户端
 *
 * 实现直接与用户交互的LLM客户端，使用策略模式分离用户交互逻辑
 */

import { injectable, inject } from 'inversify';
import { BaseLLMClient } from './base-llm-client';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { ID } from '../../../domain/common/value-objects/id';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';
import { LLMMessage, LLMMessageRole } from '../../../domain/llm/value-objects/llm-message';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';
import { ProviderConfig, ApiType } from '../parameter-mappers/interfaces/provider-config.interface';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';
import { UserInteractionStrategy, TerminalInteraction } from '../interactions/user-interaction-strategy';
import { PromptRenderingService, Prompt } from '../interactions/prompt-rendering-service';

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

/**
 * HumanRelay客户端配置接口
 */
interface HumanRelayClientConfig {
  mode: HumanRelayMode;
  maxHistoryLength: number;
  defaultTimeout: number;
}

/**
 * HumanRelay LLM客户端
 */
@injectable()
export class HumanRelayClient extends BaseLLMClient {
  private readonly mode: HumanRelayMode;
  private readonly maxHistoryLength: number;
  private readonly defaultTimeout: number;
  private conversationHistory: any[] = [];
  private promptHistory: Prompt[] = [];
  private responseHistory: SimpleResponse[] = [];
  private interactionStrategy: UserInteractionStrategy;
  private promptRenderingService: PromptRenderingService;

  constructor(
    @inject(LLM_DI_IDENTIFIERS.HttpClient)
    protected override httpClient: any,
    @inject(LLM_DI_IDENTIFIERS.TokenBucketLimiter)
    protected override rateLimiter: any,
    @inject(LLM_DI_IDENTIFIERS.TokenCalculator)
    protected override tokenCalculator: any,
    @inject(LLM_DI_IDENTIFIERS.ConfigLoadingModule)
    protected override configLoadingModule: ConfigLoadingModule,
    clientConfig: HumanRelayClientConfig
  ) {
    // 创建最小化的基础配置（HumanRelay不需要HTTP、限流等功能）
    const featureSupport = new BaseFeatureSupport();
    featureSupport.supportsStreaming = false;
    featureSupport.supportsTools = false;

    const baseConfig: ProviderConfig = {
      name: 'human-relay',
      apiType: ApiType.NATIVE,
      baseURL: '',
      apiKey: '',
      parameterMapper: null as any,
      endpointStrategy: null as any,
      featureSupport: featureSupport
    };

    super(httpClient, rateLimiter, tokenCalculator, configLoadingModule, baseConfig);

    this.mode = clientConfig.mode;
    this.maxHistoryLength = clientConfig.maxHistoryLength;
    this.defaultTimeout = clientConfig.defaultTimeout;

    // 使用策略模式初始化交互策略
    this.interactionStrategy = new TerminalInteraction();
    this.promptRenderingService = new PromptRenderingService();
  }

  /**
   * 获取支持的模型列表（硬编码）
   */
  protected override getSupportedModelsList(): string[] {
    return ['single_turn', 'multi_turn'];
  }

  /**
   * 生成响应 - 核心方法
   */
  public override async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      // 1. 构建提示词
      const prompt = this.buildPrompt(request);

      // 2. 发送提示并等待用户响应
      const timeout = (request.metadata?.['timeout'] as number) || this.defaultTimeout;
      const userResponse = await this.sendPromptAndWaitForResponse(prompt, timeout);

      // 3. 更新历史记录
      this.updateHistory(request, userResponse, prompt);

      // 4. 构建LLM响应
      return await this.createLLMResponse(userResponse, request);

    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 流式生成响应 - HumanRelay不支持真正的流式
   */
  public override async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    // HumanRelay不支持真正的流式，返回单次响应
    const response = await this.generateResponse(request);
    return this.createAsyncIterable(response);
  }

  /**
   * 获取模型配置
   */
  public getModelConfig(): ModelConfig {
    return ModelConfig.create({
      model: 'human-relay',
      provider: 'human-relay',
      maxTokens: 200000, // 人工输入没有严格的token限制
      contextWindow: 200000,
      supportsStreaming: false,
      supportsTools: false,
      supportsImages: false,
      supportsAudio: false,
      supportsVideo: false
    });
  }


  /**
   * 健康检查（硬编码）
   */
  public override async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }> {
    return {
      status: 'healthy',
      message: 'HumanRelay客户端可用',
      latency: 0,
      lastChecked: new Date()
    };
  }

  /**
   * 获取客户端名称
   */
  public override getClientName(): string {
    return `human-relay-${this.mode}`;
  }

  /**
   * 获取客户端版本
   */
  public override getClientVersion(): string {
    return '1.0.0';
  }

  /**
   * 计算Token数
   */
  public override async calculateTokens(request: LLMRequest): Promise<number> {
    // 使用统一的Token计算服务
    return await this.tokenCalculator.calculateTokens(request);
  }

  /**
   * 计算成本
   */
  public override async calculateCost(request: LLMRequest, response: LLMResponse): Promise<number> {
    // HumanRelay没有直接成本，返回0
    return 0;
  }

  // 私有方法

  /**
   * 构建提示词
   */
  private buildPrompt(request: LLMRequest): Prompt {
    // 转换消息格式
    const iLLMMessages = request.messages.map(msg => ({
      role: this.convertMessageRole(msg.getRole()),
      content: msg.getContent(),
      metadata: {}
    }));

    // 构建内容和上下文
    let content: string;
    let conversationContext: string | undefined;

    if (this.mode === HumanRelayMode.SINGLE) {
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
      this.mode,
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
  private updateHistory(request: LLMRequest, response: SimpleResponse, prompt: Prompt): void {
    // 添加提示到历史
    this.promptHistory.push({
      ...prompt,
      status: 'responded'
    });

    // 添加响应到历史
    this.responseHistory.push(response);

    // 多轮模式下更新对话历史
    if (this.mode === HumanRelayMode.MULTI) {
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
      if (this.conversationHistory.length > this.maxHistoryLength) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
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
          mode: this.mode,
          responseId: humanRelayResponse.id,
          responseTime: humanRelayResponse.responseTime,
          userInteractionTime: humanRelayResponse.userInteractionTime,
          responseType: humanRelayResponse.type
        }
      }
    );
  }

  /**
   * 创建异步可迭代对象
   */
  private async createAsyncIterable(response: LLMResponse): Promise<AsyncIterable<LLMResponse>> {
    return (async function* () {
      yield response;
    })();
  }

  /**
   * 估算token数量
   */
  public override async estimateTokens(text: string): Promise<number> {
    // 使用统一的Token计算服务
    return await this.tokenCalculator.calculateTextTokens(text);
  }

  /**
   * 估算token数量（内部方法）
   */
  private async estimateTokensSync(request: LLMRequest | string): Promise<number> {
    const text = typeof request === 'string'
      ? request
      : request.messages.map(m => m.getContent()).join(' ');
    return await this.tokenCalculator.calculateTextTokens(text);
  }

  /**
   * 错误处理
   */
  public override handleError(error: any): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`HumanRelay客户端错误: ${errorMessage}`);
  }
}