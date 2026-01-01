import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType } from '../parameter-mappers/interfaces/provider-config.interface';
import { OpenAIParameterMapper } from '../parameter-mappers/openai-parameter-mapper';
import { OpenAICompatibleEndpointStrategy } from '../endpoint-strategies/openai-compatible-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { TYPES } from '../../../di/service-keys';
import { HttpClient } from '../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';

@injectable()
export class OpenAIChatClient extends BaseLLMClient {
  constructor(
    @inject(TYPES.HttpClient) httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) tokenCalculator: TokenCalculator,
    @inject(TYPES.ConfigLoadingModule) configManager: ConfigLoadingModule
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
}