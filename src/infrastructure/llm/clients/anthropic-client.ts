import { injectable, inject } from 'inversify';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType, ProviderConfigBuilder } from '../parameter-mappers';
import { AnthropicParameterMapper } from '../parameter-mappers/anthropic-parameter-mapper';
import { AnthropicEndpointStrategy } from '../endpoint-strategies/anthropic-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { TYPES } from '../../../di/service-keys';
import { HttpClient } from '../../../infrastructure/common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { getConfig } from '../../config/config';
import { MissingConfigurationError, InvalidConfigurationError, ExecutionError } from '../../../../common/exceptions';

@injectable()
export class AnthropicClient extends BaseLLMClient {
  constructor(
    @inject(TYPES.HttpClient) httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) tokenCalculator: TokenCalculator
  ) {
    // 创建 Anthropic 功能支持
    const featureSupport = new BaseFeatureSupport();
    featureSupport.supportsStreaming = true;
    featureSupport.supportsTools = true;
    featureSupport.supportsImages = true;
    featureSupport.supportsAudio = false;
    featureSupport.supportsVideo = false;
    featureSupport.supportsTopK = true;
    featureSupport.supportsSystemMessages = true;
    featureSupport.supportsFunctionCalling = true;
    featureSupport.supportsParallelToolCalling = true;

    // 从配置中读取必需的配置项
    const apiKey = getConfig().get('llm_runtime.anthropic.api_key');
    const defaultModel = getConfig().get('llm_runtime.anthropic.default_model');
    const supportedModels = getConfig().get('llm_runtime.anthropic.supported_models');

    // 验证必需配置
    if (!apiKey) {
      throw new MissingConfigurationError('llm.anthropic.apiKey');
    }
    if (!defaultModel) {
      throw new MissingConfigurationError('llm.anthropic.defaultModel');
    }
    if (!supportedModels || !Array.isArray(supportedModels) || supportedModels.length === 0) {
      throw new MissingConfigurationError('llm.anthropic.supportedModels');
    }

    // 创建 Anthropic 供应商配置
    const providerConfig = new ProviderConfigBuilder()
      .name('Anthropic')
      .apiType(ApiType.NATIVE)
      .baseURL('https://api.anthropic.com')
      .apiKey(apiKey)
      .endpointStrategy(new AnthropicEndpointStrategy())
      .parameterMapper(new AnthropicParameterMapper())
      .featureSupport(featureSupport)
      .defaultModel(defaultModel)
      .supportedModels(supportedModels)
      .timeout(30000)
      .retryCount(3)
      .retryDelay(1000)
      .extraConfig({
        apiVersion: '2023-06-01',
      })
      .build();

    super(httpClient, rateLimiter, tokenCalculator, providerConfig);
  }

  getSupportedModelsList(): string[] {
    if (!this.providerConfig.supportedModels) {
      throw new MissingConfigurationError('llm.anthropic.supportedModels');
    }
    return this.providerConfig.supportedModels;
  }

  getModelConfig(): ModelConfig {
    const model = this.providerConfig.defaultModel;
    if (!model) {
      throw new MissingConfigurationError('llm.anthropic.defaultModel');
    }

    const configs = getConfig().get('llm_runtime.anthropic.models');
    const config = configs[model];

    if (!config) {
      throw new InvalidConfigurationError(model, `Anthropic模型配置未找到: ${model}。请在配置文件中提供该模型的完整配置。`);
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
        throw new InvalidConfigurationError(field, `Anthropic模型 ${model} 缺少必需配置字段: ${field}`);
      }
    }

    return ModelConfig.create({
      model,
      provider: 'anthropic',
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
      // Anthropic使用事件类型的流式响应格式
      for await (const chunk of response.data) {
        try {
          const data = JSON.parse(chunk.toString());

          // 处理不同的事件类型
          switch (data.type) {
            case 'content_block_delta':
              // 文本增量事件
              if (data.delta && data.delta.type === 'text_delta' && data.delta.text) {
                yield LLMResponse.create(
                  request.requestId,
                  request.model,
                  [
                    {
                      index: data.index || 0,
                      message: LLMMessage.createAssistant(data.delta.text),
                      finish_reason: '',
                    },
                  ],
                  {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                  },
                  '',
                  0
                );
              }
              break;

            case 'message_stop':
              // 消息结束事件
              yield LLMResponse.create(
                request.requestId,
                request.model,
                [
                  {
                    index: 0,
                    message: LLMMessage.createAssistant(''),
                    finish_reason: data.stop_reason || 'stop',
                  },
                ],
                {
                  promptTokens: data.usage?.input_tokens || 0,
                  completionTokens: data.usage?.output_tokens || 0,
                  totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
                },
                data.stop_reason || 'stop',
                0
              );
              return;

            case 'error':
              // 错误事件
              throw new ExecutionError(`Anthropic流式响应错误: ${data.error?.message || 'Unknown error'}`);

            default:
              // 其他事件类型忽略
              break;
          }
        } catch (e) {
          // 跳过无效JSON
          continue;
        }
      }

      // 如果没有收到message_stop事件，发送最终块
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
