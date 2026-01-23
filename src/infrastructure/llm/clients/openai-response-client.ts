import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { ID } from '../../../domain/common/value-objects/id';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType, ProviderConfigBuilder } from '../parameter-mappers';
import { OpenAIParameterMapper } from '../parameter-mappers/openai-parameter-mapper';
import { OpenAIResponsesEndpointStrategy } from '../endpoint-strategies/openai-responses-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { TYPES } from '../../../di/service-keys';
import { HttpClient } from '../../../infrastructure/common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { getConfig } from '../../config/config';

@injectable()
export class OpenAIResponseClient extends BaseLLMClient {
  constructor(
    @inject(TYPES.HttpClient) httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) tokenCalculator: TokenCalculator
  ) {
    // 创建功能支持配置
    const featureSupport = new BaseFeatureSupport();
    featureSupport.supportsStreaming = true;
    featureSupport.supportsTools = true;
    featureSupport.supportsImages = false;
    featureSupport.supportsAudio = false;
    featureSupport.supportsVideo = false;
    featureSupport.supportsSystemMessages = true;
    featureSupport.supportsTemperature = true;
    featureSupport.supportsTopP = true;
    featureSupport.supportsMaxTokens = true;
    featureSupport.setProviderSpecificFeature('reasoning_effort', true);
    featureSupport.setProviderSpecificFeature('previous_response_id', true);
    featureSupport.setProviderSpecificFeature('verbosity', true);

    // 从配置中读取必需的配置项
    const apiKey = getConfig().get('llm_runtime.openai.api_key');
    const defaultModel = getConfig().get('llm_runtime.openai_response.default_model');
    const supportedModels = getConfig().get('llm_runtime.openai_response.supported_models');

    // 验证必需配置
    if (!apiKey) {
      throw new Error('OpenAI Response API密钥未配置。请在配置文件中设置 llm.openai.apiKey。');
    }
    if (!defaultModel) {
      throw new Error(
        'OpenAI Response默认模型未配置。请在配置文件中设置 llm.openai-response.defaultModel。'
      );
    }
    if (!supportedModels || !Array.isArray(supportedModels) || supportedModels.length === 0) {
      throw new Error(
        'OpenAI Response支持的模型列表未配置。请在配置文件中设置 llm.openai-response.supportedModels。'
      );
    }

    // 创建提供商配置
    const providerConfig = new ProviderConfigBuilder()
      .name('OpenAI Response')
      .apiType(ApiType.OPENAI_COMPATIBLE)
      .baseURL('https://api.openai.com/v1')
      .apiKey(apiKey)
      .endpointStrategy(new OpenAIResponsesEndpointStrategy())
      .parameterMapper(new OpenAIParameterMapper())
      .featureSupport(featureSupport)
      .defaultModel(defaultModel)
      .supportedModels(supportedModels)
      .timeout(30000)
      .retryCount(3)
      .retryDelay(1000)
      .extraConfig({
        endpointPath: 'responses',
        enableBeta: true,
        betaVersion: 'responses=v1',
      })
      .build();

    super(httpClient, rateLimiter, tokenCalculator, providerConfig);
  }

  getSupportedModelsList(): string[] {
    if (!this.providerConfig.supportedModels) {
      throw new Error('OpenAI Response支持的模型列表未配置。');
    }
    return this.providerConfig.supportedModels;
  }

  public getModelConfig(): ModelConfig {
    const model = this.providerConfig.defaultModel;
    if (!model) {
      throw new Error('OpenAI Response默认模型未配置。');
    }

    const configs: Record<string, any> = getConfig().get(
        'llm_runtime.openai_response.models'
    );
    const config = configs[model];

    if (!config) {
      throw new Error(
        `OpenAI Response模型配置未找到: ${model}。请在配置文件中提供该模型的完整配置。`
      );
    }

    // 验证必需的配置字段
    const requiredFields = [
      'maxTokens',
      'contextWindow',
      'temperature',
      'topP',
      'promptTokenPrice',
      'completionTokenPrice',
    ];
    for (const field of requiredFields) {
      if (config[field] === undefined || config[field] === null) {
        throw new Error(`OpenAI Response模型 ${model} 缺少必需配置字段: ${field}`);
      }
    }

    return ModelConfig.create({
      model,
      provider: 'openai',
      maxTokens: config.maxTokens,
      contextWindow: config.contextWindow,
      temperature: config.temperature,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty ?? 0.0,
      presencePenalty: config.presencePenalty ?? 0.0,
      costPer1KTokens: {
        prompt: config.promptTokenPrice,
        completion: config.completionTokenPrice,
      },
      supportsStreaming: config.supportsStreaming ?? true,
      supportsTools: config.supportsTools ?? true,
      supportsImages: config.supportsImages ?? false,
      supportsAudio: config.supportsAudio ?? false,
      supportsVideo: config.supportsVideo ?? false,
      metadata: config.metadata ?? {},
    });
  }

  protected override async parseStreamResponse(
    response: any,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    const self = this;

    async function* streamGenerator() {
      // 处理流式响应数据
      for await (const chunk of response.data) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line: string) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            // 跳过结束标记
            if (dataStr.trim() === '[DONE]') {
              return;
            }

            try {
              const data = JSON.parse(dataStr);

              // 提取内容
              const content = self.extractContentFromResponsesChunk(data);
              if (content) {
                yield LLMResponse.create(
                  request.requestId,
                  request.model,
                  [
                    {
                      index: 0,
                      message: LLMMessage.createAssistant(content),
                      finish_reason: '',
                    },
                  ],
                  {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                  },
                  '',
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

      // 发送最终块
      yield LLMResponse.create(
        request.requestId,
        request.model,
        [
          {
            index: 0,
            message: LLMMessage.createAssistant(''),
            finish_reason: 'stop',
          },
        ],
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        'stop',
        0
      );
    }

    return streamGenerator();
  }

  private extractContentFromResponsesChunk(data: any): string | null {
    // Responses API的流式格式可能不同
    if ('content' in data) {
      return data.content || null;
    }

    const choices = data.choices;
    if (!choices) {
      return null;
    }

    const choice = choices[0];
    if ('content' in choice) {
      return choice.content || null;
    }

    const delta = choice.delta;
    return delta?.content || null;
  }

  private messagesToInput(messages: any[]): string {
    if (!messages) return '';

    const contentParts = [];
    for (const message of messages) {
      if (message.getContent()) {
        contentParts.push(String(message.getContent()));
      }
    }

    return contentParts.join('\n');
  }

  private convertResponsesTools(tools: any[]): any[] {
    const responsesTools = [];

    for (const tool of tools) {
      const responsesTool = {
        type: 'custom',
        name: tool.name,
        description: tool.get('description', ''),
      };

      responsesTools.push(responsesTool);
    }

    return responsesTools;
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
      warnings,
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
    return 'OpenAI Response';
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
      resetTime: new Date(Date.now() + 60000),
    };
  }

  public override async resetRateLimit(): Promise<boolean> {
    return true;
  }

  public async getCacheStatistics(): Promise<{
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
      maxCacheSize: 1000,
    };
  }

  public async clearCache(): Promise<boolean> {
    return true;
  }

  public async getErrorStatistics(
    startTime?: Date,
    endTime?: Date
  ): Promise<{
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
      maxRetryCount: 0,
    };
  }

  public async getPerformanceStatistics(
    startTime?: Date,
    endTime?: Date
  ): Promise<{
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
      successRate: 0,
    };
  }

  public async getUsageStatistics(
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byModel: Record<
      string,
      {
        requests: number;
        tokens: number;
        cost: number;
      }
    >;
    averageTokensPerRequest: number;
    averageCostPerRequest: number;
  }> {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0,
    };
  }

  public async exportStatistics(
    format: 'json' | 'csv' | 'xml',
    startTime?: Date,
    endTime?: Date
  ): Promise<string> {
    return JSON.stringify({});
  }

  public async configure(config: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  public async getConfiguration(): Promise<Record<string, unknown>> {
    return {};
  }

  public async resetConfiguration(): Promise<boolean> {
    return true;
  }

  public override async estimateTokens(text: string): Promise<number> {
    // 使用统一的Token计算服务
    return await this.tokenCalculator.calculateTextTokens(text);
  }

  public override async truncateText(text: string, maxTokens: number): Promise<string> {
    // 使用统一的Token计算服务进行精确截断
    return await this.tokenCalculator.truncateText(text, maxTokens);
  }

  public override async formatMessages(messages: any[]): Promise<any[]> {
    // Format messages for OpenAI API
    return messages.map(msg => ({
      role: msg.getRole(),
      content: msg.getContent(),
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
        metadata: { error: error instanceof Error ? error.message : String(error) },
      }
    );
  }
}
