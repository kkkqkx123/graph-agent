import { injectable, inject } from 'inversify';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { ID } from '../../../../domain/common/value-objects/id';
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
    const modelConfig = this.getModelConfig();
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

  getModelConfig(): ModelConfig {
    const model = 'gpt-3.5-turbo'; // 默认模型
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

  async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    // Check rate limit
    await this.rateLimiter.checkLimit();

    try {
      // Prepare request with streaming enabled
      const openaiRequest = {
        ...this.prepareRequest(request),
        stream: true
      };
      
      // Make streaming API call
      const response = await this.httpClient.post(`${this.baseURL}/chat/completions`, openaiRequest, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Convert to domain response stream
      return this.toLLMResponseStream(response, request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI API streaming error: ${errorMessage}`);
    }
  }

  async isModelAvailable(): Promise<boolean> {
    try {
      const response = await this.httpClient.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getModelInfo(): Promise<{
    name: string;
    provider: string;
    version: string;
    maxTokens: number;
    contextWindow: number;
    supportsStreaming: boolean;
    supportsTools: boolean;
    supportsImages: boolean;
    supportsAudio: boolean;
    supportsVideo: boolean;
  }> {
    try {
      const response = await this.httpClient.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      const model = 'gpt-3.5-turbo'; // 默认模型
      const config = this.getModelConfig();
      
      return {
        name: model,
        provider: 'openai',
        version: '1.0',
        maxTokens: config.getMaxTokens(),
        contextWindow: config.getContextWindow(),
        supportsStreaming: config.supportsStreaming(),
        supportsTools: config.supportsTools(),
        supportsImages: config.supportsImages(),
        supportsAudio: config.supportsAudio(),
        supportsVideo: config.supportsVideo()
      };
    } catch (error) {
      throw new Error(`Failed to get model info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async validateRequest(request: LLMRequest): Promise<{
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
    const isAvailable = await this.isModelAvailable();
    if (!isAvailable) {
      errors.push('Model is not available');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateParameters(parameters: any): Promise<boolean> {
    // Basic parameter validation
    return parameters && typeof parameters === 'object';
  }

  async preprocessRequest(request: LLMRequest): Promise<LLMRequest> {
    // Apply any preprocessing logic here
    return request;
  }

  async postprocessResponse(response: LLMResponse): Promise<LLMResponse> {
    // Apply any postprocessing logic here
    return response;
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }> {
    try {
      const startTime = Date.now();
      const response = await this.httpClient.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      const isHealthy = response.status === 200;
      const latency = Date.now() - startTime;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Service is operational' : 'Service is unavailable',
        latency,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Service is unavailable',
        lastChecked: new Date()
      };
    }
  }

  getClientName(): string {
    return 'OpenAI';
  }

  getClientVersion(): string {
    return '1.0.0';
  }

  async getSupportedModels(): Promise<string[]> {
    try {
      const response = await this.httpClient.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.data.data.map((model: any) => model.id);
    } catch (error) {
      throw new Error(`Failed to get supported models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getRateLimitInfo(): Promise<{
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerHour: number;
    tokensPerHour: number;
    requestsPerDay: number;
    tokensPerDay: number;
    currentRequests: number;
    currentTokens: number;
    resetTime: Date;
  }> {
    return {
      requestsPerMinute: 60,
      tokensPerMinute: 90000,
      requestsPerHour: 3600,
      tokensPerHour: 5400000,
      requestsPerDay: 86400,
      tokensPerDay: 129600000,
      currentRequests: 0,
      currentTokens: 0,
      resetTime: new Date(Date.now() + 60000)
    };
  }

  async resetRateLimit(): Promise<boolean> {
    return true;
  }

  async waitForRateLimitReset(timeout?: number): Promise<boolean> {
    return true;
  }

  async getCacheStatistics(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
    maxCacheSize: number;
  }> {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      maxCacheSize: 1000
    };
  }

  async clearCache(): Promise<boolean> {
    return true;
  }

  async getErrorStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalErrors: number;
    byType: Record<string, number>;
    byStatusCode: Record<string, number>;
    averageRetryCount: number;
    maxRetryCount: number;
  }> {
    return {
      totalErrors: 0,
      byType: {},
      byStatusCode: {},
      averageRetryCount: 0,
      maxRetryCount: 0
    };
  }

  async getPerformanceStatistics(startTime?: Date, endTime?: Date): Promise<{
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
  }> {
    return {
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      minLatency: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0
    };
  }

  async getUsageStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, {
      requests: number;
      tokens: number;
      cost: number;
    }>;
    averageTokensPerRequest: number;
    averageCostPerRequest: number;
  }> {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0
    };
  }

  async exportStatistics(
    format: 'json' | 'csv' | 'xml',
    startTime?: Date,
    endTime?: Date
  ): Promise<string> {
    return JSON.stringify({});
  }

  async configure(config: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  async getConfiguration(): Promise<Record<string, unknown>> {
    return {};
  }

  async resetConfiguration(): Promise<boolean> {
    return true;
  }

  async close(): Promise<boolean> {
    // Clean up resources if needed
    return true;
  }

  async getModelCapabilities(model: string): Promise<any> {
    const config = this.getModelConfig();
    return {
      supportsStreaming: config.supportsStreaming(),
      supportsTools: config.supportsTools(),
      supportsImages: config.supportsImages(),
      supportsAudio: config.supportsAudio(),
      supportsVideo: config.supportsVideo(),
      maxTokens: config.getMaxTokens(),
      contextWindow: config.getContextWindow()
    };
  }

  async estimateTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4); // 简单估算
  }

  async truncateText(text: string, maxTokens: number): Promise<string> {
    const estimatedTokens = Math.ceil(text.length / 4);
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    // 简单截断
    const ratio = maxTokens / estimatedTokens;
    return text.substring(0, Math.floor(text.length * ratio));
  }

  async formatMessages(messages: any[]): Promise<any[]> {
    // Format messages for OpenAI API
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  async parseResponse(response: any): Promise<LLMResponse> {
    // 简单返回错误响应
    return LLMResponse.create(
      ID.fromString('error-request-id'),
      'unknown',
      [],
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      'error',
      0,
      { metadata: { error: 'Failed to parse response' } }
    );
  }

  async handleError(error: any): Promise<LLMResponse> {
    // Create error response
    return LLMResponse.create(
      ID.fromString('error-request-id'),
      'unknown',
      [],
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      'error',
      0,
      { metadata: { error: error instanceof Error ? error.message : String(error) } }
    );
  }

  private async toLLMResponseStream(response: any, request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    async function* streamGenerator() {
      for await (const chunk of response) {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices[0];
              
              if (choice) {
                yield LLMResponse.create(
                  request.requestId,
                  request.model,
                  [{
                    index: choice.index || 0,
                    message: choice.message || { role: 'assistant', content: '' },
                    finish_reason: choice.finish_reason || 'stop'
                  }],
                  {
                    promptTokens: parsed.usage?.prompt_tokens || 0,
                    completionTokens: parsed.usage?.completion_tokens || 0,
                    totalTokens: parsed.usage?.total_tokens || 0
                  },
                  choice.finish_reason || 'stop',
                  0
                );
              }
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }
    }
    
    return streamGenerator();
  }
}