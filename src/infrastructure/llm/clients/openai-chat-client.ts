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
import { loadLLMRetryConfig, toHttpRetryConfig, LLMRetryConfig } from '../retry/llm-retry-config';
import { MissingConfigurationError, InvalidConfigurationError } from '../../../common/exceptions';

@injectable()
export class OpenAIChatClient extends BaseLLMClient {
  private llmRetryConfig: LLMRetryConfig;

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
      throw new MissingConfigurationError('llm_runtime.openai.api_key');
    }
    if (!defaultModel) {
      throw new MissingConfigurationError('llm_runtime.openai.default_model');
    }
    if (!supportedModels || !Array.isArray(supportedModels) || supportedModels.length === 0) {
      throw new MissingConfigurationError('llm_runtime.openai.supported_models');
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

    // 加载LLM重试配置（必须在super()之后）
    this.llmRetryConfig = loadLLMRetryConfig('openai');
  }

  /**
   * 获取当前使用的模型
   */
  private getCurrentModel(): string {
    return this.providerConfig.defaultModel || 'gpt-4o';
  }

  /**
   * 重新加载重试配置（支持动态切换模型）
   */
  private reloadRetryConfig(): void {
    const currentModel = this.getCurrentModel();
    this.llmRetryConfig = loadLLMRetryConfig(this.providerName, currentModel);
  }

  /**
   * 重写generateResponse方法，使用Provider特定的重试配置
   */
  public override async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    await this.rateLimiter.checkLimit();

    try {
      // 1. 参数映射
      const providerRequest = this.providerConfig.parameterMapper.mapToProvider(
        request,
        this.providerConfig
      );

      // 2. 构建端点和头部
      const endpoint = this.providerConfig.endpointStrategy.buildEndpoint(
        this.providerConfig,
        providerRequest
      );
      const headers = this.providerConfig.endpointStrategy.buildHeaders(
        this.providerConfig,
        request
      );

      // 3. 创建HTTP请求配置，使用Provider特定的重试配置
      const httpConfig = {
        headers,
        timeout: this.providerConfig.timeout,
        // 使用Provider特定的重试配置
        retry: toHttpRetryConfig(this.llmRetryConfig),
      };

      // 4. 发送请求（HTTP层会自动重试）
      const response = await this.httpClient.post(endpoint, providerRequest, httpConfig);

      // 5. 转换响应
      return this.providerConfig.parameterMapper.mapFromResponse(response.data, request);
    } catch (error) {
      // 6. 处理LLM特定错误
      return this.handleLLMError(error, request);
    }
  }

  /**
   * 处理LLM特定错误
   */
  private async handleLLMError(error: any, request: LLMRequest): Promise<LLMResponse> {
    // 判断是否是LLM特定的可重试错误
    if (this.isLLMRetryableError(error) && this.llmRetryConfig.enableLLMRetry) {
      // 简单的LLM层重试
      return this.retryWithLLMLogic(error, request);
    }

    // 不可重试的错误，直接抛出
    throw error;
  }

  /**
   * 判断是否是LLM特定的可重试错误
   */
  private isLLMRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';

    // 模型临时不可用
    if (
      errorMessage.includes('model is not available') ||
      errorMessage.includes('model is overloaded') ||
      errorMessage.includes('model is temporarily unavailable')
    ) {
      return true;
    }

    // Token限制（可调整）
    if (
      errorMessage.includes('maximum context length') ||
      errorMessage.includes('token limit')
    ) {
      return true;
    }

    return false;
  }

  /**
   * 使用LLM逻辑重试
   */
  private async retryWithLLMLogic(error: any, request: LLMRequest): Promise<LLMResponse> {
    // 等待指定时间
    await this.delay(this.llmRetryConfig.llmRetryDelay * 1000);

    // 尝试调整请求参数（如截断文本）
    const adjustedRequest = this.adjustRequestForRetry(error, request);

    // 重新发送请求
    return this.generateResponse(adjustedRequest);
  }

  /**
   * 根据错误调整请求参数
   */
  private adjustRequestForRetry(error: any, request: LLMRequest): LLMRequest {
    const errorMessage = error.message?.toLowerCase() || '';

    // 如果是Token限制，尝试截断消息
    if (
      errorMessage.includes('maximum context length') ||
      errorMessage.includes('token limit')
    ) {
      return this.truncateMessages(request);
    }

    return request;
  }

  /**
   * 截断消息以减少Token数
   */
  private truncateMessages(request: LLMRequest): LLMRequest {
    // 简单实现：移除最早的消息
    if (request.messages.length > 1) {
      const truncatedMessages = request.messages.slice(1);
      return LLMRequest.create(
        request.model,
        truncatedMessages,
        {
          sessionId: request.sessionId,
          threadId: request.threadId,
          workflowId: request.workflowId,
          nodeId: request.nodeId,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          topP: request.topP,
          frequencyPenalty: request.frequencyPenalty,
          presencePenalty: request.presencePenalty,
          stop: request.stop,
          tools: request.tools,
          toolChoice: request.toolChoice,
          stream: request.stream,
          reasoningEffort: request.reasoningEffort,
          verbosity: request.verbosity,
          previousResponseId: request.previousResponseId,
          metadata: request.metadata,
          headers: request.headers,
          queryParams: request.queryParams,
        }
      );
    }
    return request;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getSupportedModelsList(): string[] {
    if (!this.providerConfig.supportedModels) {
      throw new MissingConfigurationError('llm_runtime.openai.supported_models');
    }
    return this.providerConfig.supportedModels;
  }

  public getModelConfig(): ModelConfig {
    const model = this.providerConfig.defaultModel;
    if (!model) {
      throw new MissingConfigurationError('llm_runtime.openai.default_model');
    }

    const configs = getConfig().get('llm_runtime.openai.models');
    const config = configs[model];

    if (!config) {
      throw new InvalidConfigurationError(model, `OpenAI模型配置未找到: ${model}。请在配置文件中提供该模型的完整配置。`);
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
        throw new InvalidConfigurationError(field, `OpenAI模型 ${model} 缺少必需配置字段: ${field}`);
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
