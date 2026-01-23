import { injectable, inject } from 'inversify';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType, ProviderConfigBuilder } from '../parameter-mappers';
import { GeminiParameterMapper } from '../parameter-mappers/gemini-parameter-mapper';
import { OpenAICompatibleEndpointStrategy } from '../endpoint-strategies/openai-compatible-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { TYPES } from '../../../di/service-keys';
import { HttpClient } from '../../../infrastructure/common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { getConfig } from '../../config/config';

@injectable()
export class GeminiOpenAIClient extends BaseLLMClient {
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
    featureSupport.supportsAudio = true;
    featureSupport.supportsVideo = true;
    featureSupport.supportsSystemMessages = true;
    featureSupport.supportsTemperature = true;
    featureSupport.supportsTopP = true;
    featureSupport.supportsTopK = true;
    featureSupport.supportsStopSequences = true;
    featureSupport.supportsMaxTokens = true;
    featureSupport.setProviderSpecificFeature('thinking_budget', true);
    featureSupport.setProviderSpecificFeature('cached_content', true);

    // 从配置中读取必需的配置项
    const apiKey = getConfig('llm.gemini-openai.apiKey');
    const defaultModel = getConfig('llm.gemini-openai.defaultModel');
    const supportedModels = getConfig('llm.gemini-openai.supportedModels');

    // 验证必需配置
    if (!apiKey) {
      throw new Error(
        'Gemini OpenAI兼容API密钥未配置。请在配置文件中设置 llm.gemini-openai.apiKey。'
      );
    }
    if (!defaultModel) {
      throw new Error(
        'Gemini OpenAI兼容默认模型未配置。请在配置文件中设置 llm.gemini-openai.defaultModel。'
      );
    }
    if (!supportedModels || !Array.isArray(supportedModels) || supportedModels.length === 0) {
      throw new Error(
        'Gemini OpenAI兼容支持的模型列表未配置。请在配置文件中设置 llm.gemini-openai.supportedModels。'
      );
    }

    // 创建提供商配置
    const providerConfig = new ProviderConfigBuilder()
      .name('gemini-openai')
      .apiType(ApiType.OPENAI_COMPATIBLE)
      .baseURL('https://generativelanguage.googleapis.com/v1beta/openai')
      .apiKey(apiKey)
      .endpointStrategy(new OpenAICompatibleEndpointStrategy())
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
      throw new Error('Gemini OpenAI兼容支持的模型列表未配置。');
    }
    return this.providerConfig.supportedModels;
  }

  getModelConfig(): ModelConfig {
    const model = this.providerConfig.defaultModel;
    if (!model) {
      throw new Error('Gemini OpenAI兼容默认模型未配置。');
    }

    const configs: Record<string, any> = getConfig(
        'llm.gemini-openai.models',
      {}
    );
    const config = configs[model];

    if (!config) {
      throw new Error(
        `Gemini OpenAI兼容模型配置未找到: ${model}。请在配置文件中提供该模型的完整配置。`
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
        throw new Error(`Gemini OpenAI兼容模型 ${model} 缺少必需配置字段: ${field}`);
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
      supportsAudio: config.supportsAudio ?? true,
      supportsVideo: config.supportsVideo ?? true,
      metadata: {
        ...config.metadata,
        topK: config.topK ?? 40,
        supportsThinking: config.supportsThinking ?? true,
      },
    });
  }

  protected override async parseStreamResponse(
    response: any,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    const self = this;

    async function* streamGenerator() {
      // Gemini OpenAI兼容端点使用与OpenAI相同的SSE格式
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
