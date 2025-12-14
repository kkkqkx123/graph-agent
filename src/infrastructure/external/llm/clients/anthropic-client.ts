import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { HttpClient } from '../../../common/http/http-client';
import { TokenBucketLimiter } from '../rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../utils/token-calculator';

@injectable()
export class AnthropicClient implements ILLMClient {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor(
    @inject('HttpClient') private httpClient: HttpClient,
    @inject('TokenBucketLimiter') private rateLimiter: TokenBucketLimiter,
    @inject('TokenCalculator') private tokenCalculator: TokenCalculator,
    @inject('ConfigManager') private configManager: any
  ) {
    this.apiKey = this.configManager.get('llm.anthropic.apiKey');
    this.baseURL = this.configManager.get('llm.anthropic.baseURL', 'https://api.anthropic.com');
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // Check rate limit
    await this.rateLimiter.checkLimit();

    try {
      // Prepare request
      const anthropicRequest = this.prepareRequest(request);
      
      // Make API call
      const response = await this.httpClient.post(`${this.baseURL}/v1/messages`, anthropicRequest, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });

      // Parse response
      const anthropicResponse = response.data;
      
      // Convert to domain response
      return this.toLLMResponse(anthropicResponse, request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Anthropic API error: ${errorMessage}`);
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
    // Convert OpenAI-style messages to Anthropic format
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    const messages = request.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

    const anthropicRequest: any = {
      model: request.model,
      max_tokens: request.maxTokens || 1000,
      messages
    };

    if (systemMessage) {
      anthropicRequest.system = systemMessage.content;
    }

    if (request.temperature !== undefined) {
      anthropicRequest.temperature = request.temperature;
    }

    return anthropicRequest;
  }

  private toLLMResponse(anthropicResponse: any, request: LLMRequest): LLMResponse {
    const content = anthropicResponse.content[0]?.text || '';
    const usage = anthropicResponse.usage;

    return LLMResponse.create(
      request.requestId,
      request.model,
      [{
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: anthropicResponse.stop_reason
      }],
      {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens
      },
      anthropicResponse.stop_reason,
      0 // duration - would need to be calculated
    );
  }

  private getModelConfig(model: string): ModelConfig {
    const configs = this.configManager.get('llm.anthropic.models', {});
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