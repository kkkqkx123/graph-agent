import { injectable, inject } from 'inversify';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType } from '../parameter-mappers/interfaces/provider-config.interface';
import { AnthropicParameterMapper } from '../parameter-mappers/anthropic-parameter-mapper';
import { AnthropicEndpointStrategy } from '../endpoint-strategies/anthropic-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';
import { HttpClient } from '../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';

@injectable()
export class AnthropicClient extends BaseLLMClient {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.HttpClient) httpClient: HttpClient,
    @inject(LLM_DI_IDENTIFIERS.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(LLM_DI_IDENTIFIERS.TokenCalculator) tokenCalculator: TokenCalculator,
    @inject(LLM_DI_IDENTIFIERS.ConfigLoadingModule) configManager: ConfigLoadingModule
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

    // 从配置中读取支持的模型列表
    const supportedModels = configManager.get('llm.anthropic.models', [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ]);

    // 创建 Anthropic 供应商配置
    const providerConfig: ProviderConfig = {
      name: 'Anthropic',
      apiType: ApiType.NATIVE,
      apiKey: configManager.get('llm.anthropic.apiKey', ''),
      baseURL: 'https://api.anthropic.com',
      parameterMapper: new AnthropicParameterMapper(),
      endpointStrategy: new AnthropicEndpointStrategy(),
      featureSupport: featureSupport,
      defaultModel: 'claude-3-sonnet-20240229',
      supportedModels: supportedModels,
      extraConfig: {
        apiVersion: '2023-06-01'
      }
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

  getModelConfig(): ModelConfig {
    const model = 'claude-3-sonnet-20240229'; // 默认模型
    const configs = this.configLoadingModule.get<Record<string, any>>('llm.anthropic.models', {});
    const config = configs[model];

    if (!config) {
      throw new Error(`Model configuration not found for ${model}`);
    }

    return ModelConfig.create({
      model,
      provider: 'anthropic',
      maxTokens: config.maxTokens || 4096,
      contextWindow: config.contextWindow || 200000,
      temperature: config.temperature || 0.7,
      topP: config.topP || 1.0,
      frequencyPenalty: config.frequencyPenalty || 0.0,
      presencePenalty: config.presencePenalty || 0.0,
      costPer1KTokens: {
        prompt: config.promptTokenPrice || 0.003,
        completion: config.completionTokenPrice || 0.015
      },
      supportsStreaming: config.supportsStreaming ?? true,
      supportsTools: config.supportsTools ?? true,
      supportsImages: config.supportsImages ?? true,
      supportsAudio: config.supportsAudio ?? false,
      supportsVideo: config.supportsVideo ?? false,
      metadata: config.metadata || {}
    });
  }
}