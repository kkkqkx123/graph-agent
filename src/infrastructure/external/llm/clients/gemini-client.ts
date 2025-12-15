import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType, ProviderConfigBuilder } from '../parameter-mappers';
import { GeminiParameterMapper } from '../parameter-mappers/providers/gemini-parameter-mapper';
import { GeminiNativeEndpointStrategy } from '../endpoint-strategies/providers/gemini-native-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { FeatureRegistry } from '../features/registry/feature-registry';
import { GeminiThinkingBudgetFeature } from '../features/providers/gemini-thinking-budget-feature';

@injectable()
export class GeminiClient extends BaseLLMClient {
  constructor(
    @inject('HttpClient') httpClient: any,
    @inject('TokenBucketLimiter') rateLimiter: any,
    @inject('TokenCalculator') tokenCalculator: any,
    @inject('ConfigManager') configManager: any
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
    return [
      // Gemini 2.5系列
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",

      // 3.0系列
      "gemini-3.0-pro",
      "gemini-3.0-flash"
    ];
  }

  getModelConfig(): ModelConfig {
    const model = 'gemini-2.5-pro'; // 默认模型
    const configs = this.configManager.get('llm.gemini.models', {});
    const config = configs[model];

    if (!config) {
      throw new Error(`Model configuration not found for ${model}`);
    }

    return ModelConfig.create({
      model,
      provider: 'google',
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