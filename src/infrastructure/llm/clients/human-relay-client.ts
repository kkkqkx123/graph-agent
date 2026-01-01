/**
 * HumanRelay LLM客户端
 *
 * 实现BaseLLMClient接口，委托给应用层的HumanRelayService处理业务逻辑
 * 简化版本：移除交互策略依赖
 */

import { injectable, inject } from 'inversify';
import { BaseLLMClient } from './base-llm-client';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';
import { TYPES } from '../../../di/service-keys';
import { ProviderConfig, ApiType } from '../parameter-mappers/interfaces/provider-config.interface';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';
import { IHumanRelayService, HumanRelayConfig } from '../../../application/llm/services/human-relay-service';

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

  constructor(
    @inject(TYPES.HttpClient)
    protected override httpClient: any,
    @inject(TYPES.TokenBucketLimiter)
    protected override rateLimiter: any,
    @inject(TYPES.TokenCalculator)
    protected override tokenCalculator: any,
    @inject(TYPES.ConfigLoadingModule)
    protected override configLoadingModule: ConfigLoadingModule,
    @inject('IHumanRelayService')
    private humanRelayService: IHumanRelayService,
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
    // 构建配置
    const config: HumanRelayConfig = {
      mode: this.mode,
      maxHistoryLength: this.maxHistoryLength,
      defaultTimeout: this.defaultTimeout
    };

    // 委托给应用层服务
    return await this.humanRelayService.processRequest(request, config);
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

  /**
   * 估算token数量
   */
  public override async estimateTokens(text: string): Promise<number> {
    // 使用统一的Token计算服务
    return await this.tokenCalculator.calculateTextTokens(text);
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
   * 错误处理
   */
  public override handleError(error: any): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`HumanRelay客户端错误: ${errorMessage}`);
  }
}