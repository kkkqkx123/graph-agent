import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { BaseLLMClient } from './base-llm-client';

@injectable()
export class GeminiClient extends BaseLLMClient {
  constructor(
    @inject('HttpClient') httpClient: any,
    @inject('TokenBucketLimiter') rateLimiter: any,
    @inject('TokenCalculator') tokenCalculator: any,
    @inject('ConfigManager') configManager: any
  ) {
    super(
      httpClient,
      rateLimiter,
      tokenCalculator,
      configManager,
      'Gemini',
      'gemini',
      'https://generativelanguage.googleapis.com'
    );
  }

  protected getEndpoint(): string {
    // Gemini的端点需要动态构建，因为包含模型名称
    return '';
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }

  protected override async makeRequest(data: any, endpoint?: string): Promise<any> {
    // Gemini需要特殊的请求处理，因为API密钥在URL中
    const url = endpoint || `${this.baseURL}/v1beta/models/${data.model}:generateContent?key=${this.apiKey}`;
    const headers = this.getHeaders();

    return this.httpClient.post(url, data, { headers });
  }

  protected prepareRequest(request: LLMRequest): any {
    // Convert OpenAI-style messages to Gemini format
    const systemInstruction = request.messages.find(msg => msg.role === 'system');
    const messages = request.messages.filter(msg => msg.role !== 'system');

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // 获取模型配置以使用正确的默认值
    const modelConfig = this.getModelConfig();

    const geminiRequest: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? modelConfig.getTemperature(),
        maxOutputTokens: request.maxTokens ?? modelConfig.getMaxTokens(),
        topP: request.topP ?? modelConfig.getTopP(),
        frequencyPenalty: request.frequencyPenalty ?? modelConfig.getFrequencyPenalty(),
        presencePenalty: request.presencePenalty ?? modelConfig.getPresencePenalty()
      }
    };

    if (systemInstruction) {
      geminiRequest.systemInstruction = {
        parts: [{ text: systemInstruction.content }]
      };
    }

    return geminiRequest;
  }

  protected toLLMResponse(geminiResponse: any, request: LLMRequest): LLMResponse {
    const candidate = geminiResponse.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';
    const usage = geminiResponse.usageMetadata;

    return LLMResponse.create(
      request.requestId,
      request.model,
      [{
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: candidate?.finishReason || 'STOP'
      }],
      {
        promptTokens: usage?.promptTokenCount || 0,
        completionTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0
      },
      candidate?.finishReason || 'STOP',
      0 // duration - would need to be calculated
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