/**
 * HumanRelay LLM客户端
 * 
 * 实现通过前端与用户交互的LLM客户端
 */

import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { ID } from '../../../../domain/common/value-objects/id';
import { BaseLLMClient } from './base-llm-client';
import {
  IHumanRelayInteractionService,
  HumanRelaySession,
  HumanRelayPrompt,
  HumanRelayResponse,
  HumanRelayMode,
  HumanRelaySessionStatus,
  PromptTemplate,
  HumanRelayConfig
} from '../../../../domain/llm';
import { LLMMessageRole } from '../../../../shared/types/llm';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';
import { ProviderConfig, ApiType } from '../parameter-mappers/interfaces/provider-config.interface';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';

/**
 * HumanRelay客户端配置接口
 */
interface HumanRelayClientConfig {
  providerName: string;
  mode: HumanRelayMode;
  maxHistoryLength: number;
  defaultTimeout: number;
  frontendConfig?: any;
}

/**
 * HumanRelay LLM客户端
 */
@injectable()
export class HumanRelayClient extends BaseLLMClient implements ILLMClient {
  private readonly mode: HumanRelayMode;
  private readonly maxHistoryLength: number;
  private readonly defaultTimeout: number;
  private currentSession: HumanRelaySession | null = null;
  private readonly config: HumanRelayConfig;

  constructor(
    @inject(LLM_DI_IDENTIFIERS.HumanRelayInteractionService)
    private interactionService: IHumanRelayInteractionService,
    @inject(LLM_DI_IDENTIFIERS.HttpClient)
    protected override httpClient: any,
    @inject(LLM_DI_IDENTIFIERS.TokenBucketLimiter)
    protected override rateLimiter: any,
    @inject(LLM_DI_IDENTIFIERS.TokenCalculator)
    protected override tokenCalculator: any,
    @inject(LLM_DI_IDENTIFIERS.ConfigManager)
    protected override configManager: any,
    clientConfig: HumanRelayClientConfig
  ) {
    // 创建基础配置
    const featureSupport = new BaseFeatureSupport();
    featureSupport.supportsStreaming = false;
    featureSupport.supportsTools = false;

    const baseConfig: ProviderConfig = {
      name: clientConfig.providerName,
      apiType: ApiType.NATIVE,
      baseURL: 'http://localhost:8080',
      apiKey: 'human-relay-key',
      parameterMapper: null as any, // HumanRelay不需要参数映射
      endpointStrategy: null as any, // HumanRelay不需要端点策略
      featureSupport: featureSupport
    };

    super(httpClient, rateLimiter, tokenCalculator, configManager, baseConfig);

    this.mode = clientConfig.mode;
    this.maxHistoryLength = clientConfig.maxHistoryLength;
    this.defaultTimeout = clientConfig.defaultTimeout;

    // 创建HumanRelay配置
    this.config = HumanRelayConfig.createDefault();
    if (this.mode === HumanRelayMode.MULTI) {
      this.config = HumanRelayConfig.createMultiMode();
    }
  }

  /**
   * 生成响应 - 核心方法
   */
  public override async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      // 1. 获取或创建会话
      await this.ensureSession();

      // 2. 验证会话状态
      const validation = this.validateSession();
      if (!validation.isValid) {
        throw new Error(validation.reason);
      }

      // 3. 构建提示词
      const prompt = this.buildPrompt(request);

      // 4. 发送提示并等待用户响应
      const timeout = (request.metadata?.['timeout'] as number) || this.defaultTimeout;
      const userResponse = await this.interactionService.sendPromptAndWaitForResponse(
        prompt,
        timeout
      );

      // 5. 处理响应
      const processedResponse = await this.processResponse(userResponse, request, prompt);

      // 6. 更新会话历史
      this.updateSessionHistory(request, processedResponse);

      // 7. 构建LLM响应
      return this.createLLMResponse(processedResponse, request);

    } catch (error) {
      // 错误处理
      await this.handleError(error);
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
      maxTokens: 100000, // 人工输入没有严格的token限制
      contextWindow: 100000,
      supportsStreaming: false,
      supportsTools: false,
      supportsImages: false,
      supportsAudio: false,
      supportsVideo: false
    });
  }

  /**
   * 获取支持的模型列表
   */
  public getSupportedModelsList(): string[] {
    return ['human-relay-s', 'human-relay-m'];
  }

  /**
   * 获取支持的模型列表（异步版本）
   */
  public override async getSupportedModels(): Promise<string[]> {
    return this.getSupportedModelsList();
  }

  /**
   * 健康检查
   */
  public override async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }> {
    try {
      const startTime = Date.now();
      const isUserAvailable = await this.interactionService.isUserAvailable();
      const interactionStatus = await this.interactionService.getInteractionStatus();
      const latency = Date.now() - startTime;

      let status: 'healthy' | 'unhealthy' | 'degraded';
      let message: string | undefined;

      if (isUserAvailable && interactionStatus === 'available') {
        status = 'healthy';
        message = '用户可用，交互正常';
      } else if (interactionStatus === 'busy') {
        status = 'degraded';
        message = '用户忙碌，但系统可用';
      } else {
        status = 'unhealthy';
        message = '用户不可用或交互系统异常';
      }

      return {
        status,
        message,
        latency,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        lastChecked: new Date()
      };
    }
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
    // 简单的token估算
    const text = request.messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }

  /**
   * 计算成本
   */
  public override async calculateCost(request: LLMRequest, response: LLMResponse): Promise<number> {
    // HumanRelay没有直接成本，返回0
    return 0;
  }

  /**
   * 关闭客户端
   */
  public override async close(): Promise<boolean> {
    try {
      // 完成当前会话
      if (this.currentSession && !this.isSessionTerminal()) {
        this.currentSession.complete();
      }

      this.currentSession = null;
      return true;
    } catch (error) {
      console.error('关闭HumanRelay客户端时出错:', error);
      return false;
    }
  }

  // 私有方法

  /**
   * 确保会话存在
   */
  private async ensureSession(): Promise<void> {
    if (!this.currentSession || this.isSessionTerminal()) {
      this.currentSession = this.createNewSession();
    }
  }

  /**
   * 创建新会话
   */
  private createNewSession(): HumanRelaySession {
    const sessionName = `HumanRelay-${this.mode}-${Date.now()}`;

    if (this.mode === HumanRelayMode.MULTI) {
      return HumanRelaySession.createMultiTurn(
        sessionName,
        this.maxHistoryLength,
        this.config.defaultTimeout
      );
    } else {
      return HumanRelaySession.createSingleTurn(
        sessionName,
        this.config.defaultTimeout
      );
    }
  }

  /**
   * 验证会话状态
   */
  private validateSession(): { isValid: boolean; reason?: string } {
    if (!this.currentSession) {
      return { isValid: false, reason: '会话不存在' };
    }

    if (this.currentSession.isTimeout()) {
      return { isValid: false, reason: '会话已超时' };
    }

    if (!this.currentSession.canAcceptInteraction()) {
      return {
        isValid: false,
        reason: `会话状态不允许新的交互: ${this.currentSession.getStatus()}`
      };
    }

    return { isValid: true };
  }

  /**
   * 构建提示词
   */
  private buildPrompt(request: LLMRequest): HumanRelayPrompt {
    // 获取模板
    const template = this.mode === HumanRelayMode.MULTI
      ? PromptTemplate.createMultiTurnDefault()
      : PromptTemplate.createSingleTurnDefault();

    // 转换消息格式
    const iLLMMessages = request.messages.map(msg => ({
      role: this.convertMessageRole(msg.role),
      content: msg.content,
      metadata: {}
    }));

    // 创建提示
    return HumanRelayPrompt.fromLLMMessages(
      iLLMMessages,
      this.mode,
      template,
      this.defaultTimeout
    );
  }

  /**
   * 转换消息角色
   */
  private convertMessageRole(role: string): LLMMessageRole {
    switch (role) {
      case 'system':
        return LLMMessageRole.SYSTEM;
      case 'user':
        return LLMMessageRole.USER;
      case 'assistant':
        return LLMMessageRole.ASSISTANT;
      case 'tool':
        return LLMMessageRole.TOOL;
      default:
        return LLMMessageRole.USER;
    }
  }

  /**
   * 处理用户响应
   */
  private async processResponse(
    response: HumanRelayResponse,
    request: LLMRequest,
    prompt: HumanRelayPrompt
  ): Promise<HumanRelayResponse> {
    if (!this.currentSession) {
      throw new Error('会话不存在');
    }

    // 添加提示到会话
    this.currentSession.addPrompt(prompt);

    // 根据响应类型处理
    if (response.isNormal()) {
      // 正常响应
      this.currentSession.setProcessing();
      return response;
    } else if (response.isTimeout()) {
      // 超时处理
      this.currentSession.timeout();
      return response;
    } else if (response.isCancelled()) {
      // 取消处理
      this.currentSession.cancel();
      return response;
    } else {
      // 错误处理
      this.currentSession.setError();
      return response;
    }
  }

  /**
   * 更新会话历史
   */
  private updateSessionHistory(request: LLMRequest, response: HumanRelayResponse): void {
    if (!this.currentSession || this.mode !== HumanRelayMode.MULTI) {
      return;
    }

    // 添加用户消息
    request.messages.forEach(msg => {
      const iLLMMsg = {
        role: this.convertMessageRole(msg.role),
        content: msg.content,
        metadata: {
          name: msg.name,
          tool_calls: msg.tool_calls,
          tool_call_id: msg.tool_call_id
        }
      };
      this.currentSession!.addMessage(iLLMMsg);
    });

    // 添加助手响应
    if (response.isNormal()) {
      const assistantMessage = {
        role: LLMMessageRole.ASSISTANT,
        content: response.getContent(),
        metadata: {
          responseId: response.getId().toString(),
          responseTime: response.getResponseTime(),
          userInteractionTime: response.getUserInteractionTime()
        }
      };
      this.currentSession.addMessage(assistantMessage);
    }

    // 添加响应到历史
    this.currentSession.addResponse(response);

    // 检查历史长度
    this.trimHistoryIfNeeded();
  }

  /**
   * 根据需要修剪历史
   */
  private trimHistoryIfNeeded(): void {
    if (!this.currentSession) {
      return;
    }

    const history = this.currentSession.getConversationHistory();
    if (history.length > this.maxHistoryLength) {
      // 保留最新的消息
      const trimmedHistory = history.slice(-this.maxHistoryLength);
      this.currentSession.clearHistory();
      trimmedHistory.forEach(msg => this.currentSession!.addMessage(msg));
    }
  }

  /**
   * 创建LLM响应
   */
  private createLLMResponse(
    humanRelayResponse: HumanRelayResponse,
    request: LLMRequest
  ): LLMResponse {
    const promptTokens = this.estimateTokensSync(request);
    const completionTokens = this.estimateTokensSync(humanRelayResponse.getContent());

    return LLMResponse.create(
      request.id,
      'human-relay',
      [{
        index: 0,
        message: {
          role: 'assistant',
          content: humanRelayResponse.getContent()
        },
        finish_reason: humanRelayResponse.isNormal() ? 'stop' : 'error'
      }],
      {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      },
      humanRelayResponse.isNormal() ? 'stop' : 'error',
      0,
      {
        metadata: {
          mode: this.mode,
          sessionId: this.currentSession?.getId().toString(),
          responseId: humanRelayResponse.getId().toString(),
          responseTime: humanRelayResponse.getResponseTime(),
          userInteractionTime: humanRelayResponse.getUserInteractionTime(),
          responseType: humanRelayResponse.getType(),
          efficiencyScore: humanRelayResponse.getEfficiencyScore(),
          engagementScore: humanRelayResponse.getEngagementScore()
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
    return Math.ceil(text.length / 4);
  }

  /**
   * 估算token数量（内部方法）
   */
  private estimateTokensSync(request: LLMRequest | string): number {
    const text = typeof request === 'string'
      ? request
      : request.messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }

  /**
   * 检查会话是否为终态
   */
  private isSessionTerminal(): boolean {
    return this.currentSession ? [
      HumanRelaySessionStatus.COMPLETED,
      HumanRelaySessionStatus.TIMEOUT,
      HumanRelaySessionStatus.CANCELLED,
      HumanRelaySessionStatus.ERROR
    ].includes(this.currentSession.getStatus()) : true;
  }

  /**
   * 错误处理
   */
  public override handleError(error: any): never {
    if (this.currentSession) {
      this.currentSession.setError();
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`HumanRelay客户端错误: ${errorMessage}`);
  }
}