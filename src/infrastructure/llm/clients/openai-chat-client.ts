import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType, ProviderConfigBuilder } from '../parameter-mappers';
import { OpenAIParameterMapper } from '../parameter-mappers/openai-parameter-mapper';
import { OpenAICompatibleEndpointStrategy } from '../endpoint-strategies/openai-compatible-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { TYPES } from '../../../di/service-keys';
import { HttpClient } from '../../../infrastructure/common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { getConfig } from '../../config/config';

@injectable()
export class OpenAIChatClient extends BaseLLMClient {
  constructor(
    @inject(TYPES.HttpClient) httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) tokenCalculator: TokenCalculator
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

    // 从配置中读取必需的配置项
    const apiKey = getConfig().get('llm_runtime.openai.api_key');
    const defaultModel = getConfig().get('llm_runtime.openai.default_model');
    const supportedModels = getConfig().get('llm_runtime.openai.supported_models');

    // 验证必需配置
    if (!apiKey) {
      throw new Error('OpenAI API密钥未配置。请在配置文件中设置 llm_runtime.openai.api_key。');
    }
    if (!defaultModel) {
      throw new Error('OpenAI默认模型未配置。请在配置文件中设置 llm_runtime.openai.default_model。');
    }
    if (!supportedModels || !Array.isArray(supportedModels) || supportedModels.length === 0) {
      throw new Error(
        'OpenAI支持的模型列表未配置。请在配置文件中设置 llm_runtime.openai.supported_models。'
      );
    }

    // 创建 OpenAI 供应商配置
    const providerConfig = new ProviderConfigBuilder()
      .name('OpenAI')
      .apiType(ApiType.OPENAI_COMPATIBLE)
      .baseURL('https://api.openai.com/v1')
      .apiKey(apiKey)
      .endpointStrategy(new OpenAICompatibleEndpointStrategy())
      .parameterMapper(new OpenAIParameterMapper())
      .featureSupport(featureSupport)
      .defaultModel(defaultModel)
      .supportedModels(supportedModels)
      .timeout(30000)
      .retryCount(3)
      .retryDelay(1000)
      .build();

  super(httpClient, rateLimiter, tokenCalculator, providerConfig);
}

  getSupportedModelsList(): string[] {
    if (!this.providerConfig.supportedModels) {
      throw new Error('OpenAI支持的模型列表未配置。');
    }
    return this.providerConfig.supportedModels;
  }

  public getModelConfig(): ModelConfig {
    const model = this.providerConfig.defaultModel;
    if (!model) {
      throw new Error('OpenAI默认模型未配置。');
    }

    const configs = getConfig().get('llm_runtime.openai.models');
    const config = configs[model];

    if (!config) {
      throw new Error(`OpenAI模型配置未找到: ${model}。请在配置文件中提供该模型的完整配置。`);
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
        throw new Error(`OpenAI模型 ${model} 缺少必需配置字段: ${field}`);
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
              const choice = data.choices[0];

              if (choice) {
                yield LLMResponse.create(
                  request.requestId,
                  request.model,
                  [
                    {
                      index: choice.index || 0,
                      message: LLMMessage.createAssistant(choice.delta?.content || ''),
                      finish_reason: choice.finish_reason || '',
                    },
                  ],
                  {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
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
    return 'OpenAI Chat';
  }

  public override getClientVersion(): string {
    return '1.0.0';
  }
}
