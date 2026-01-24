import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { ID } from '../../../domain/common/value-objects/id';
import { HttpClient } from '../../../infrastructure/common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { TYPES } from '../../../di/service-keys';
import { ExecutionError } from '../../../common/exceptions';

/**
 * LLM客户端抽象基类
 *
 * 提供通用功能实现，减少代码重复
 */
@injectable()
export abstract class BaseLLMClient {
  protected readonly providerName: string;
  protected readonly supportedModels: string[];
  protected readonly providerConfig: ProviderConfig;

  constructor(
    @inject(TYPES.HttpClient) protected httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) protected rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) protected tokenCalculator: TokenCalculator,
    providerConfig: ProviderConfig
  ) {
    this.providerName = providerConfig.name;
    this.providerConfig = providerConfig;
    this.supportedModels = this.getSupportedModelsList();
  }

  // 抽象方法，由子类实现
  protected abstract getSupportedModelsList(): string[];
  public abstract getModelConfig(): ModelConfig;

  // 抽象方法：解析流式响应，子类必须实现
  protected abstract parseStreamResponse(
    response: any,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>>;

  // 通用实现
  public async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    await this.rateLimiter.checkLimit();

    try {
      // 1. 参数映射
      const providerRequest = this.providerConfig.parameterMapper.mapToProvider(
        request,
        this.providerConfig
      );

      // 2. 构建端点和头部
      const endpoint = this.providerConfig.endpointStrategy.buildEndpoint(
        this.providerConfig,
        providerRequest
      );
      const headers = this.providerConfig.endpointStrategy.buildHeaders(this.providerConfig, request);

      // 3. 发送请求（HttpClient.post 返回 APIPromise）
      const apiPromise = this.httpClient.post(endpoint, providerRequest, { headers });

      // 4. 获取响应数据
      const response = await apiPromise;

      // 5. 转换响应
      return this.providerConfig.parameterMapper.mapFromResponse(response, request);
    } catch (error) {
      this.handleError(error);
    }
  }

  public async calculateTokens(request: LLMRequest): Promise<number> {
    return this.tokenCalculator.calculateTokens(request);
  }

  public async calculateCost(request: LLMRequest, response: LLMResponse): Promise<number> {
    const modelConfig = this.getModelConfig();

    // 优先使用API返回的token计数，如果没有则使用本地计算作为回退
    const promptTokens = response.usage?.promptTokens || (await this.calculateTokens(request));
    const completionTokens = response.usage?.completionTokens || 0;

    return (
      (promptTokens * modelConfig.getPromptCostPer1KTokens() +
        completionTokens * modelConfig.getCompletionCostPer1KTokens()) /
      1000
    );
  }

  // 通用错误处理
  protected handleError(error: any): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`${this.providerName} API error: ${errorMessage}`);
  }

  // 默认实现，子类可覆盖
  public async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    await this.rateLimiter.checkLimit();

    try {
      // 1. 参数映射
      const providerRequest = this.providerConfig.parameterMapper.mapToProvider(
        request,
        this.providerConfig
      );

      // 2. 启用流式模式
      if (typeof providerRequest === 'object' && providerRequest !== null) {
        (providerRequest as any).stream = true;
      }

      // 3. 构建端点和头部
      const endpoint = this.providerConfig.endpointStrategy.buildEndpoint(
        this.providerConfig,
        providerRequest
      );
      const headers = this.providerConfig.endpointStrategy.buildHeaders(this.providerConfig, request);

      // 4. 发送流式请求（使用 stream: true 选项）
      const apiPromise = this.httpClient.post(endpoint, providerRequest, {
        headers,
        stream: true,
      });

      // 5. 获取原始响应（包含流式 body）
      const { response } = await apiPromise.withResponse();

      // 6. 解析流式响应（子类必须实现）
      return this.parseStreamResponse(response, request);
    } catch (error) {
      this.handleError(error);
    }
  }

  public async isModelAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  public async getModelInfo(): Promise<{
    name: string;
    provider: string;
    version: string;
    maxTokens: number;
    contextWindow: number;
    supportsStreaming: boolean;
    supportsTools: boolean;
    supportsImages: boolean;
    supportsAudio: boolean;
    supportsVideo: boolean;
  }> {
    const config = this.getModelConfig();
    return {
      name: config.getModel(),
      provider: this.providerName,
      version: '1.0',
      maxTokens: config.getMaxTokens(),
      contextWindow: config.getContextWindow(),
      supportsStreaming: config.supportsStreaming(),
      supportsTools: config.supportsTools(),
      supportsImages: config.supportsImages(),
      supportsAudio: config.supportsAudio(),
      supportsVideo: config.supportsVideo(),
    };
  }

  public async validateRequest(request: LLMRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.messages || request.messages.length === 0) {
      errors.push('Messages are required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public async validateParameters(parameters: any): Promise<boolean> {
    return parameters && typeof parameters === 'object';
  }

  public async preprocessRequest(request: LLMRequest): Promise<LLMRequest> {
    return request;
  }

  public async postprocessResponse(response: LLMResponse): Promise<LLMResponse> {
    return response;
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }> {
    try {
      const startTime = Date.now();
      await this.getSupportedModels();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'Service is operational',
        latency,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Service is unavailable',
        lastChecked: new Date(),
      };
    }
  }

  public getClientName(): string {
    return this.providerName;
  }

  public getClientVersion(): string {
    return '1.0.0';
  }

  public async getSupportedModels(): Promise<string[]> {
    return this.supportedModels;
  }

  public async getRateLimitInfo(): Promise<{
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerHour: number;
    tokensPerHour: number;
    requestsPerDay: number;
    tokensPerDay: number;
    currentRequests: number;
    currentTokens: number;
    resetTime: Date;
  }> {
    return {
      requestsPerMinute: 60,
      tokensPerMinute: 90000,
      requestsPerHour: 3600,
      tokensPerHour: 5400000,
      requestsPerDay: 86400,
      tokensPerDay: 129600000,
      currentRequests: 0,
      currentTokens: 0,
      resetTime: new Date(Date.now() + 60000),
    };
  }

  public async resetRateLimit(): Promise<boolean> {
    return true;
  }

  public async estimateTokens(text: string): Promise<number> {
    return await this.tokenCalculator.calculateTextTokens(text);
  }

  public async truncateText(text: string, maxTokens: number): Promise<string> {
    return await this.tokenCalculator.truncateText(text, maxTokens);
  }

  public async formatMessages(messages: any[]): Promise<any[]> {
    return messages;
  }

  public async parseResponse(response: any): Promise<LLMResponse> {
    throw new ExecutionError(`parseResponse not implemented for ${this.providerName} client`);
  }

  public async handleErrorWithResponse(error: any): Promise<LLMResponse> {
    return LLMResponse.create(
      ID.fromString('error-request-id'),
      'unknown',
      [],
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      'error',
      0,
      {
        metadata: { error: error instanceof Error ? error.message : String(error) },
      }
    );
  }
}
