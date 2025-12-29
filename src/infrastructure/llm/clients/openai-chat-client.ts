import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { ID } from '../../../domain/common/value-objects/id';
import { BaseLLMClient } from './base-llm-client';
import { OpenAIProvider, getMessageConverter } from '../converters';
import { ProviderConfig, ApiType } from '../parameter-mappers/interfaces/provider-config.interface';
import { OpenAIParameterMapper } from '../parameter-mappers/providers/openai-parameter-mapper';
import { OpenAICompatibleEndpointStrategy } from '../endpoint-strategies/providers/openai-compatible-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';
import { HttpClient } from '../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';

@injectable()
export class OpenAIChatClient extends BaseLLMClient {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.HttpClient) httpClient: HttpClient,
    @inject(LLM_DI_IDENTIFIERS.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(LLM_DI_IDENTIFIERS.TokenCalculator) tokenCalculator: TokenCalculator,
    @inject(LLM_DI_IDENTIFIERS.ConfigLoadingModule) configManager: ConfigLoadingModule
  ) {
    // 创建 OpenAI 功能支持
    const featureSupport = new BaseFeatureSupport();
    featureSupport.supportsStreaming = true;
    featureSupport.supportsTools = true;
    featureSupport.supportsImages = true;
    featureSupport.supportsAudio = true;
    featureSupport.supportsVideo = false;
    featureSupport.supportsJsonMode = true;
    featureSupport.supportsSeed = true;
    featureSupport.supportsLogProbs = true;
    featureSupport.supportsLogitBias = true;
    featureSupport.supportsFunctionCalling = true;
    featureSupport.supportsParallelToolCalling = true;

    // 从配置中读取支持的模型列表
    const supportedModels = configManager.get('llm.openai.models', [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-3.5-turbo',
      'gpt-5'
    ]);

    // 创建 OpenAI 供应商配置
    const providerConfig: ProviderConfig = {
      name: 'OpenAI',
      apiType: ApiType.OPENAI_COMPATIBLE,
      apiKey: configManager.get('llm.openai.apiKey', ''),
      baseURL: 'https://api.openai.com/v1',
      parameterMapper: new OpenAIParameterMapper(),
      endpointStrategy: new OpenAICompatibleEndpointStrategy(),
      featureSupport: featureSupport,
      defaultModel: 'gpt-3.5-turbo',
      supportedModels: supportedModels
    };

    super(
      httpClient,
      rateLimiter,
      tokenCalculator,
      configManager,
      providerConfig
    );
  }


  getSupportedModelsList(): string[] {
    // 使用配置中的模型列表，如果没有配置则返回空数组
    return this.providerConfig.supportedModels || [];
  }

  public getModelConfig(): ModelConfig {
    const model = 'gpt-3.5-turbo'; // 默认模型
    const configs = this.configLoadingModule.get<Record<string, any>>('llm.openai.models', {});
    const config = configs[model];

    if (!config) {
      throw new Error(`Model configuration not found for ${model}`);
    }

    return ModelConfig.create({
      model,
      provider: 'openai',
      maxTokens: config.maxTokens || 4096,
      contextWindow: config.contextWindow || 16384,
      temperature: config.temperature || 0.7,
      topP: config.topP || 1.0,
      frequencyPenalty: config.frequencyPenalty || 0.0,
      presencePenalty: config.presencePenalty || 0.0,
      costPer1KTokens: {
        prompt: config.promptTokenPrice || 0.001,
        completion: config.completionTokenPrice || 0.002
      },
      supportsStreaming: config.supportsStreaming ?? true,
      supportsTools: config.supportsTools ?? true,
      supportsImages: config.supportsImages ?? false,
      supportsAudio: config.supportsAudio ?? false,
      supportsVideo: config.supportsVideo ?? false,
      metadata: config.metadata || {}
    });
  }

  protected override async parseStreamResponse(response: any, request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    const self = this;

    async function* streamGenerator() {
      // 处理流式响应数据
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            // 跳过结束标记
            if (dataStr.trim() === '[DONE]') {
              return;
            }

            try {
              const data = JSON.parse(dataStr);
              const choice = data.choices[0];

              if (choice) {
                yield LLMResponse.create(
                  request.requestId,
                  request.model,
                  [{
                    index: choice.index || 0,
                    message: LLMMessage.createAssistant(choice.delta?.content || ''),
                    finish_reason: choice.finish_reason || ''
                  }],
                  {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                  },
                  choice.finish_reason || '',
                  0
                );
              }
            } catch (e) {
              // 跳过无效JSON
              continue;
            }
          }
        }
      }
    }

    return streamGenerator();
  }

  public override async validateRequest(request: LLMRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.messages || request.messages.length === 0) {
      errors.push('Messages are required');
    }

    // Check if model is available
    try {
      const isAvailable = await this.isModelAvailable();
      if (!isAvailable) {
        errors.push('Model is not available');
      }
    } catch (error) {
      errors.push('Failed to check model availability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public override async validateParameters(parameters: any): Promise<boolean> {
    // Basic parameter validation
    return parameters && typeof parameters === 'object';
  }

  public override async preprocessRequest(request: LLMRequest): Promise<LLMRequest> {
    // Apply any preprocessing logic here
    return request;
  }

  public override async postprocessResponse(response: LLMResponse): Promise<LLMResponse> {
    // Apply any postprocessing logic here
    return response;
  }


  public override getClientName(): string {
    return 'OpenAI Chat';
  }

  public override getClientVersion(): string {
    return '1.0.0';
  }


  public override async getRateLimitInfo(): Promise<{
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
      resetTime: new Date(Date.now() + 60000)
    };
  }

  public override async resetRateLimit(): Promise<boolean> {
    return true;
  }

  public override async waitForRateLimitReset(timeout?: number): Promise<boolean> {
    return true;
  }

  public override async getCacheStatistics(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
    maxCacheSize: number;
  }> {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      maxCacheSize: 1000
    };
  }

  public override async clearCache(): Promise<boolean> {
    return true;
  }

  public override async getErrorStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalErrors: number;
    byType: Record<string, number>;
    byStatusCode: Record<string, number>;
    averageRetryCount: number;
    maxRetryCount: number;
  }> {
    return {
      totalErrors: 0,
      byType: {},
      byStatusCode: {},
      averageRetryCount: 0,
      maxRetryCount: 0
    };
  }

  public override async getPerformanceStatistics(startTime?: Date, endTime?: Date): Promise<{
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
  }> {
    return {
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      minLatency: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0
    };
  }

  public override async getUsageStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, {
      requests: number;
      tokens: number;
      cost: number;
    }>;
    averageTokensPerRequest: number;
    averageCostPerRequest: number;
  }> {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0
    };
  }

  public override async exportStatistics(
    format: 'json' | 'csv' | 'xml',
    startTime?: Date,
    endTime?: Date
  ): Promise<string> {
    return JSON.stringify({});
  }

  public override async configure(config: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  public override async getConfiguration(): Promise<Record<string, unknown>> {
    return {};
  }

  public override async resetConfiguration(): Promise<boolean> {
    return true;
  }

  public override async close(): Promise<boolean> {
    // Clean up resources if needed
    return true;
  }

  public override async getModelCapabilities(model: string): Promise<any> {
    const config = this.getModelConfig();
    return {
      supportsStreaming: config.supportsStreaming(),
      supportsTools: config.supportsTools(),
      supportsImages: config.supportsImages(),
      supportsAudio: config.supportsAudio(),
      supportsVideo: config.supportsVideo(),
      maxTokens: config.getMaxTokens(),
      contextWindow: config.getContextWindow()
    };
  }

  public override async estimateTokens(text: string): Promise<number> {
    // 简单的token估算实现
    return Math.ceil(text.length / 4);
  }

  public override async truncateText(text: string, maxTokens: number): Promise<string> {
    // 简单的文本截断实现
    const estimatedTokens = await this.estimateTokens(text);
    if (estimatedTokens <= maxTokens) {
      return text;
    }

    const ratio = maxTokens / estimatedTokens;
    return text.substring(0, Math.floor(text.length * ratio));
  }

  public override async formatMessages(messages: any[]): Promise<any[]> {
    // Format messages for OpenAI API
    return messages.map(msg => ({
      role: msg.getRole(),
      content: msg.getContent()
    }));
  }

  public override async parseResponse(response: any): Promise<LLMResponse> {
    // 简单返回错误响应
    return LLMResponse.create(
      ID.fromString('error-request-id'),
      'unknown',
      [],
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      'error',
      0,
      { metadata: { error: 'Failed to parse response' } }
    );
  }

  public override async handleErrorWithResponse(error: any): Promise<LLMResponse> {
    // Create error response
    return LLMResponse.create(
      ID.fromString('error-request-id'),
      'unknown',
      [],
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      'error',
      0,
      {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      }
    );
  }
}