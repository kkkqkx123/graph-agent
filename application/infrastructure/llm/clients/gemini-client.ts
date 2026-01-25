import { injectable, inject } from 'inversify';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType, ProviderConfigBuilder } from '../parameter-mappers';
import { GeminiParameterMapper } from '../parameter-mappers/gemini-parameter-mapper';
import { GeminiNativeEndpointStrategy } from '../endpoint-strategies/gemini-native-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { TYPES } from '../../../di/service-keys';
import { HttpClient } from '../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { getConfig } from '../../config/config';
import { MissingConfigurationError, InvalidConfigurationError } from '../../../domain/common/exceptions';

@injectable()
export class GeminiClient extends BaseLLMClient {
  constructor(
    @inject(TYPES.HttpClient) httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) tokenCalculator: TokenCalculator
  ) {
    // 创建功能支持配置
    const featureSupport = new BaseFeatureSupport();
    featureSupport.supportsStreaming = true;
    featureSupport.supportsTools = true;
    featureSupport.supportsImages = true;
    featureSupport.supportsAudio = false;
    featureSupport.supportsVideo = false;
    featureSupport.supportsSystemMessages = false;
    featureSupport.supportsTemperature = true;
    featureSupport.supportsTopP = true;
    featureSupport.supportsTopK = true;
    featureSupport.supportsStopSequences = true;
    featureSupport.supportsMaxTokens = true;
    featureSupport.setProviderSpecificFeature('thinking_budget', true);
    featureSupport.setProviderSpecificFeature('cached_content', true);

    // 从配置中读取必需的配置项
    const apiKey = getConfig().get('llm_runtime.gemini.api_key');
    const defaultModel = getConfig().get('llm_runtime.gemini.default_model');
    const supportedModels = getConfig().get('llm_runtime.gemini.supported_models');

    // 验证必需配置
    if (!apiKey) {
      throw new MissingConfigurationError('llm.gemini.apiKey');
    }
    if (!defaultModel) {
      throw new MissingConfigurationError('llm.gemini.defaultModel');
    }
    if (!supportedModels || !Array.isArray(supportedModels) || supportedModels.length === 0) {
      throw new MissingConfigurationError('llm.gemini.supportedModels');
    }

    // 创建提供商配置
    const providerConfig = new ProviderConfigBuilder()
      .name('gemini')
      .apiType(ApiType.NATIVE)
      .baseURL('https://generativelanguage.googleapis.com')
      .apiKey(apiKey)
      .endpointStrategy(new GeminiNativeEndpointStrategy())
      .parameterMapper(new GeminiParameterMapper())
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
      throw new MissingConfigurationError('llm.gemini.supportedModels');
    }
    return this.providerConfig.supportedModels;
  }

  getModelConfig(): ModelConfig {
    const model = this.providerConfig.defaultModel;
    if (!model) {
      throw new MissingConfigurationError('llm.gemini.defaultModel');
    }

    const configs = getConfig().get('llm_runtime.gemini.models');
    const config = configs[model];

    if (!config) {
      throw new InvalidConfigurationError(model, `Gemini模型配置未找到: ${model}。请在配置文件中提供该模型的完整配置。`);
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
        throw new InvalidConfigurationError(field, `Gemini模型 ${model} 缺少必需配置字段: ${field}`);
      }
    }

    return ModelConfig.create({
      model,
      provider: 'gemini',
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
      supportsImages: config.supportsImages ?? true,
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
      // Gemini原生API流式响应格式
      for await (const chunk of response.data) {
        try {
          const data = JSON.parse(chunk.toString());

          // Gemini原生格式: { candidates: [{ content: { parts: [{ text: "..." }] }] }]
          if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                if (part.text) {
                  yield LLMResponse.create(
                    request.requestId,
                    request.model,
                    [
                      {
                        index: 0,
                        message: LLMMessage.createAssistant(part.text),
                        finish_reason: candidate.finishReason || '',
                      },
                    ],
                    {
                      promptTokens: data.usageMetadata?.promptTokenCount || 0,
                      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                      totalTokens: data.usageMetadata?.totalTokenCount || 0,
                    },
                    candidate.finishReason || '',
                    0
                  );
                }
              }
            }
          }
        } catch (e) {
          // 跳过无效JSON
          continue;
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
}
