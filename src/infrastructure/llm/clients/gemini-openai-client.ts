import { injectable, inject } from 'inversify';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { BaseLLMClient } from './base-llm-client';
import { ProviderConfig, ApiType, ProviderConfigBuilder } from '../parameter-mappers';
import { GeminiParameterMapper } from '../parameter-mappers/gemini-parameter-mapper';
import { OpenAICompatibleEndpointStrategy } from '../endpoint-strategies/openai-compatible-endpoint-strategy';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';

@injectable()
export class GeminiOpenAIClient extends BaseLLMClient {
  constructor(
    @inject('HttpClient') httpClient: any,
    @inject('TokenBucketLimiter') rateLimiter: any,
    @inject('TokenCalculator') tokenCalculator: any,
    @inject('ConfigLoadingModule') configManager: ConfigLoadingModule
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

    // 创建提供商配置
    const providerConfig = new ProviderConfigBuilder()
      .name('gemini-openai')
      .apiType(ApiType.OPENAI_COMPATIBLE)
      .baseURL('https://generativelanguage.googleapis.com/v1beta/openai')
      .apiKey(configManager.get('llm.gemini-openai.apiKey'))
      .endpointStrategy(new OpenAICompatibleEndpointStrategy())
      .parameterMapper(new GeminiParameterMapper())
      .featureSupport(featureSupport)
      .defaultModel('gemini-2.5-flash')
      .timeout(30000)
      .retryCount(3)
      .retryDelay(1000)
      .build();

    super(
      httpClient,
      rateLimiter,
      tokenCalculator,
      configManager,
      providerConfig
    );
  }


  getSupportedModelsList(): string[] {
    return [
      // Gemini 2.5系列
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",

      // Gemini 2.0系列
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash-thinking-exp",

      // Gemini 1.5系列
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b"
    ];
  }

  getModelConfig(): ModelConfig {
    const model = 'gemini-2.5-flash'; // 默认模型
    const configs: Record<string, any> = this.configLoadingModule.get('llm.gemini-openai.models', {});
    const config = configs[model];

    if (!config) {
      throw new Error(`Model configuration not found for ${model}`);
    }

    return ModelConfig.create({
      model,
      provider: 'gemini',
      maxTokens: config.maxTokens || 8192,
      contextWindow: config.contextWindow || 1048576,
      temperature: config.temperature || 0.7,
      topP: config.topP || 0.95,
      frequencyPenalty: config.frequencyPenalty || 0.0,
      presencePenalty: config.presencePenalty || 0.0,
      costPer1KTokens: {
        prompt: config.promptTokenPrice || 0.000125,
        completion: config.completionTokenPrice || 0.000375
      },
      supportsStreaming: config.supportsStreaming ?? true,
      supportsTools: config.supportsTools ?? true,
      supportsImages: config.supportsImages ?? true,
      supportsAudio: config.supportsAudio ?? true,
      supportsVideo: config.supportsVideo ?? true,
      metadata: {
        ...config.metadata,
        topK: config.topK || 40,
        supportsThinking: config.supportsThinking ?? true
      }
    });
  }

}