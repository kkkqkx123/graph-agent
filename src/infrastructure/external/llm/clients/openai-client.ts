import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { HttpClient } from '../../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../utils/token-calculator';

@injectable()
export class OpenAIClient implements ILLMClient {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor(
    @inject('HttpClient') private httpClient: HttpClient,
    @inject('TokenBucketLimiter') private rateLimiter: TokenBucketLimiter,
    @inject('TokenCalculator') private tokenCalculator: TokenCalculator,
    @inject('ConfigManager') private configManager: any
  ) {
    this.apiKey = this.configManager.get('llm.openai.apiKey');
    this.baseURL = this.configManager.get('llm.openai.baseURL', 'https://api.openai.com/v1');
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // Check rate limit
    await this.rateLimiter.checkLimit();

    try {
      // Prepare request
      const openaiRequest = this.prepareRequest(request);
      
      // Make API call
      const response = await this.httpClient.post(`${this.baseURL}/chat/completions`, openaiRequest, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Parse response
      const openaiResponse = response.data;
      
      // Convert to domain response
      return this.toLLMResponse(openaiResponse, request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  async calculateTokens(request: LLMRequest): Promise<number> {
    return this.tokenCalculator.calculateTokens(request);
  }

  async calculateCost(request: LLMRequest, response: LLMResponse): Promise<number> {
    const modelConfig = this.getModelConfig(request.model);
    const promptTokens = await this.calculateTokens(request);
    const completionTokens = response.usage?.completionTokens || 0;
    
    return (promptTokens * modelConfig.getPromptCostPer1KTokens() +
            completionTokens * modelConfig.getCompletionCostPer1KTokens()) / 1000;
  }

  private prepareRequest(request: LLMRequest): any {
    return {
      model: request.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
      stream: false
    };
  }

  private toLLMResponse(openaiResponse: any, request: LLMRequest): LLMResponse {
    const choice = openaiResponse.choices[0];
    const usage = openaiResponse.usage;

    return LLMResponse.create(
      request.requestId,
      request.model,
      [{
        index: 0,
        message: {
          role: choice.message.role,
          content: choice.message.content
        },
        finish_reason: choice.finish_reason
      }],
      {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      choice.finish_reason,
      0 // duration - would need to be calculated
    );
  }

  private getModelConfig(model: string): ModelConfig {
    const configs = this.configManager.get('llm.openai.models', {});
    const config = configs[model];
    
    if (!config) {
      throw new Error(`Model configuration not found for ${model}`);
    }

    return ModelConfig.create({
      model,
      provider: 'openai',
      maxTokens: config.maxTokens || 4096,
      contextWindow: config.contextWindow || 16384,
      temperature: config.temperature || 0.7,
      topP: config.topP || 1.0,
      frequencyPenalty: config.frequencyPenalty || 0.0,
      presencePenalty: config.presencePenalty || 0.0,
      costPer1KTokens: {
        prompt: config.promptTokenPrice || 0.001,
        completion: config.completionTokenPrice || 0.002
      },
      supportsStreaming: config.supportsStreaming ?? true,
      supportsTools: config.supportsTools ?? true,
      supportsImages: config.supportsImages ?? false,
      supportsAudio: config.supportsAudio ?? false,
      supportsVideo: config.supportsVideo ?? false,
      metadata: config.metadata || {}
    });
  }
}