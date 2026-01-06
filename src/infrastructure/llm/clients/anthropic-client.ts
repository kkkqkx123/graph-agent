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
import { HttpClient } from '../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';

@injectable()
export class AnthropicClient extends BaseLLMClient {
  constructor(
    @inject(TYPES.HttpClient) httpClient: HttpClient,
    @inject(TYPES.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(TYPES.TokenCalculator) tokenCalculator: TokenCalculator,
    @inject(TYPES.ConfigLoadingModule) configManager: ConfigLoadingModule
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
    const apiKey = configManager.get('llm.anthropic.apiKey');
    const defaultModel = configManager.get('llm.anthropic.defaultModel');
    const supportedModels = configManager.get('llm.anthropic.supportedModels');

    // 验证必需配置
    if (!apiKey) {
      throw new Error('Anthropic API密钥未配置。请在配置文件中设置 llm.anthropic.apiKey。');
    }
    if (!defaultModel) {
      throw new Error('Anthropic默认模型未配置。请在配置文件中设置 llm.anthropic.defaultModel。');
    }
    if (!supportedModels || !Array.isArray(supportedModels) || supportedModels.length === 0) {
      throw new Error(
        'Anthropic支持的模型列表未配置。请在配置文件中设置 llm.anthropic.supportedModels。'
      );
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

    super(httpClient, rateLimiter, tokenCalculator, configManager, providerConfig);
  }

  getSupportedModelsList(): string[] {
    if (!this.providerConfig.supportedModels) {
      throw new Error('Anthropic支持的模型列表未配置。');
    }
    return this.providerConfig.supportedModels;
  }

  getModelConfig(): ModelConfig {
    const model = this.providerConfig.defaultModel;
    if (!model) {
      throw new Error('Anthropic默认模型未配置。');
    }

    const configs = this.configLoadingModule.get<Record<string, any>>('llm.anthropic.models', {});
    const config = configs[model];

    if (!config) {
      throw new Error(`Anthropic模型配置未找到: ${model}。请在配置文件中提供该模型的完整配置。`);
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
        throw new Error(`Anthropic模型 ${model} 缺少必需配置字段: ${field}`);
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
              throw new Error(`Anthropic流式响应错误: ${data.error?.message || 'Unknown error'}`);

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
