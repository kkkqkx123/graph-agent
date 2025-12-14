import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { HttpClient } from '../../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../utils/token-calculator';

@injectable()
export class GeminiClient implements ILLMClient {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor(
    @inject('HttpClient') private httpClient: HttpClient,
    @inject('TokenBucketLimiter') private rateLimiter: TokenBucketLimiter,
    @inject('TokenCalculator') private tokenCalculator: TokenCalculator,
    @inject('ConfigManager') private configManager: any
  ) {
    this.apiKey = this.configManager.get('llm.gemini.apiKey');
    this.baseURL = this.configManager.get('llm.gemini.baseURL', 'https://generativelanguage.googleapis.com');
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // Check rate limit
    await this.rateLimiter.checkLimit();

    try {
      // Prepare request
      const geminiRequest = this.prepareRequest(request);
      
      // Make API call
      const response = await this.httpClient.post(
        `${this.baseURL}/v1beta/models/${request.model}:generateContent?key=${this.apiKey}`,
        geminiRequest,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Parse response
      const geminiResponse = response.data;
      
      // Convert to domain response
      return this.toLLMResponse(geminiResponse, request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Gemini API error: ${errorMessage}`);
    }
  }

  async calculateTokens(request: LLMRequest): Promise<number> {
    return this.tokenCalculator.calculateTokens(request);
  }

  async calculateCost(request: LLMRequest, response: LLMResponse): Promise<number> {
    const modelConfig = this.getModelConfig();
    const promptTokens = await this.calculateTokens(request);
    const completionTokens = response.usage?.completionTokens || 0;
    
    return (promptTokens * modelConfig.getPromptCostPer1KTokens() +
            completionTokens * modelConfig.getCompletionCostPer1KTokens()) / 1000;
  }

  private prepareRequest(request: LLMRequest): any {
    // Convert OpenAI-style messages to Gemini format
    const systemInstruction = request.messages.find(msg => msg.role === 'system');
    const messages = request.messages.filter(msg => msg.role !== 'system');
    
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const geminiRequest: any = {
      contents,
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 1000,
      }
    };

    if (systemInstruction) {
      geminiRequest.systemInstruction = {
        parts: [{ text: systemInstruction.content }]
      };
    }

    return geminiRequest;
  }

  private toLLMResponse(geminiResponse: any, request: LLMRequest): LLMResponse {
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

  getModelConfig(): ModelConfig {
    const model = 'gemini-pro'; // 默认模型
    const configs = this.configManager.get('llm.gemini.models', {});
    const config = configs[model];
    
    if (!config) {
      throw new Error(`Model configuration not found for ${model}`);
    }

    return ModelConfig.create({
      model,
      provider: 'google',
      maxTokens: config.maxTokens || 8192,
      contextWindow: config.contextWindow || 32768,
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