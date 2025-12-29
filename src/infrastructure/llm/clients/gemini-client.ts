import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType, ProviderConfigBuilder } from '../parameter-mappers';
import { GeminiParameterMapper } from '../parameter-mappers/providers/gemini-parameter-mapper';
import { GeminiNativeEndpointStrategy } from '../endpoint-strategies/providers/gemini-native-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { FeatureRegistry } from '../features/feature-registry';
import { GeminiThinkingBudgetFeature } from '../features/providers/gemini-thinking-budget-feature';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';
import { HttpClient } from '../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../token-calculators/token-calculator';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';

@injectable()
export class GeminiClient extends BaseLLMClient {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.HttpClient) httpClient: HttpClient,
    @inject(LLM_DI_IDENTIFIERS.TokenBucketLimiter) rateLimiter: TokenBucketLimiter,
    @inject(LLM_DI_IDENTIFIERS.TokenCalculator) tokenCalculator: TokenCalculator,
    @inject(LLM_DI_IDENTIFIERS.ConfigLoadingModule) configManager: ConfigLoadingModule
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

    // 创建功能注册表并注册 Gemini 特有功能
    const featureRegistry = new FeatureRegistry();
    featureRegistry.registerFeature(new GeminiThinkingBudgetFeature());

    // 从配置中读取支持的模型列表
    const supportedModels = configManager.get('llm.gemini.models', [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash-thinking-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
    ]);

    // 创建提供商配置
    const providerConfig = new ProviderConfigBuilder()
      .name('gemini')
      .apiType(ApiType.NATIVE)
      .baseURL('https://generativelanguage.googleapis.com')
      .apiKey(configManager.get('llm.gemini.apiKey'))
      .endpointStrategy(new GeminiNativeEndpointStrategy())
      .parameterMapper(new GeminiParameterMapper())
      .featureSupport(featureSupport)
      .defaultModel('gemini-2.5-pro')
      .supportedModels(supportedModels)
      .timeout(30000)
      .retryCount(3)
      .retryDelay(1000)
      .build();

    super(
      httpClient,
      rateLimiter,
      tokenCalculator,
      configManager,
      providerConfig,
      featureRegistry
    );
  }


  getSupportedModelsList(): string[] {
    // 使用配置中的模型列表，如果没有配置则返回空数组
    return this.providerConfig.supportedModels || [];
  }

  getModelConfig(): ModelConfig {
    const model = 'gemini-2.5-pro'; // 默认模型
    const configs = this.configLoadingModule.get<Record<string, any>>('llm.gemini.modelConfigs', {});
    const config = configs[model];

    if (!config) {
      // 返回默认配置
      return ModelConfig.create({
        model,
        provider: 'gemini',
        maxTokens: 8192,
        contextWindow: 125000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        costPer1KTokens: {
          prompt: 0.0005,
          completion: 0.0015
        },
        supportsStreaming: true,
        supportsTools: true,
        supportsImages: true,
        supportsAudio: false,
        supportsVideo: false,
        metadata: {}
      });
    }

    return ModelConfig.create({
      model,
      provider: 'gemini',
      maxTokens: config.maxTokens || 8192,
      contextWindow: config.contextWindow || 125000,
      temperature: config.temperature || 0.7,
      topP: config.topP || 1.0,
      frequencyPenalty: config.frequencyPenalty || 0.0,
      presencePenalty: config.presencePenalty || 0.0,
      costPer1KTokens: {
        prompt: config.promptTokenPrice || 0.0005,
        completion: config.completionTokenPrice || 0.0015
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