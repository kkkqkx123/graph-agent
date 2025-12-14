import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { ID } from '../../../../domain/common/value-objects/id';
import { BaseLLMClient } from './base-llm-client';

@injectable()
export class OpenAIResponseClient extends BaseLLMClient {
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
      'OpenAI Response',
      'openai',
      'https://api.openai.com/v1'
    );
  }

  protected getEndpoint(): string {
    return `${this.baseURL}/responses`;
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  protected prepareRequest(request: LLMRequest): any {
    // 获取模型配置以使用正确的默认值
    const modelConfig = this.getModelConfig();
    
    // 将消息转换为输入文本
    const inputText = this.messagesToInput(request.messages);
    
    const requestData: any = {
      model: request.model,
      input: inputText,
      stream: false
    };

    // 处理推理配置
    if (request.reasoningEffort) {
      requestData.reasoning = {
        effort: request.reasoningEffort
      };
    }

    // 处理文本配置
    if (request.verbosity) {
      requestData.text = {
        verbosity: request.verbosity
      };
    }

    // 处理工具
    if (request.tools) {
      requestData.tools = this.convertResponsesTools(request.tools);
    }

    // 处理对话连续性
    if (request.previousResponseId) {
      requestData.previous_response_id = request.previousResponseId;
    }

    // 添加其他参数
    if (request.temperature !== undefined) {
      requestData.temperature = request.temperature;
    } else {
      requestData.temperature = modelConfig.getTemperature();
    }

    if (request.maxTokens !== undefined) {
      requestData.max_tokens = request.maxTokens;
    } else {
      requestData.max_tokens = modelConfig.getMaxTokens();
    }

    return requestData;
  }

  protected toLLMResponse(response: any, request: LLMRequest): LLMResponse {
    const choices = response.choices;
    if (!choices || choices.length === 0) {
      throw new Error("Responses API响应中没有choices字段");
    }

    const choice = choices[0];
    const messageData = choice.message;

    return LLMResponse.create(
      request.requestId,
      request.model,
      [{
        index: 0,
        message: {
          role: 'assistant',
          content: messageData.content
        },
        finish_reason: choice.finish_reason
      }],
      {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        reasoningTokens: response.usage?.reasoning_tokens || 0
      },
      choice.finish_reason,
      0
    );
  }

  getSupportedModelsList(): string[] {
    return [
      // GPT-5系列
      "gpt-5", "gpt-5-codex", "gpt-5.1"
    ];
  }

  public getModelConfig(): ModelConfig {
    const model = 'gpt-5'; // 默认模型
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

  public override async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    await this.rateLimiter.checkLimit();

    try {
      // 准备请求，启用流式模式
      const responseRequest = {
        ...this.prepareRequest(request),
        stream: true
      };
      
      // 发送流式请求
      const response = await this.httpClient.post(this.getEndpoint(), responseRequest, {
        headers: this.getHeaders(),
        responseType: 'stream' // 确保获取流式响应
      });

      // 解析流式响应
      return this.parseStreamResponse(response, request);
    } catch (error) {
      this.handleError(error);
    }
  }

  protected override async parseStreamResponse(response: any, request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    const self = this;
    
    async function* streamGenerator() {
      // 处理流式响应数据
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            
            // 跳过结束标记
            if (dataStr.trim() === '[DONE]') {
              return;
            }
            
            try {
              const data = JSON.parse(dataStr);
              
              // 提取内容
              const content = self.extractContentFromResponsesChunk(data);
              if (content) {
                yield LLMResponse.create(
                  request.requestId,
                  request.model,
                  [{
                    index: 0,
                    message: {
                      role: 'assistant',
                      content: content
                    },
                    finish_reason: ''
                  }],
                  {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                  },
                  '',
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
      
      // 发送最终块
      yield LLMResponse.create(
        request.requestId,
        request.model,
        [{
          index: 0,
          message: {
            role: 'assistant',
            content: ''
          },
          finish_reason: 'stop'
        }],
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        'stop',
        0
      );
    }
    
    return streamGenerator();
  }

  private extractContentFromResponsesChunk(data: any): string | null {
    // Responses API的流式格式可能不同
    if ("content" in data) {
      return data.content || null;
    }
    
    const choices = data.choices;
    if (!choices) {
      return null;
    }
    
    const choice = choices[0];
    if ("content" in choice) {
      return choice.content || null;
    }
    
    const delta = choice.delta;
    return delta?.content || null;
  }

  private messagesToInput(messages: any[]): string {
    if (!messages) return "";
    
    const contentParts = [];
    for (const message of messages) {
      if (message.content) {
        contentParts.push(String(message.content));
      }
    }
    
    return contentParts.join("\n");
  }

  private convertResponsesTools(tools: any[]): any[] {
    const responsesTools = [];
    
    for (const tool of tools) {
      const responsesTool = {
        type: "custom",
        name: tool.name,
        description: tool.get("description", "")
      };
      
      responsesTools.push(responsesTool);
    }
    
    return responsesTools;
  }

  public override async isModelAvailable(): Promise<boolean> {
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

  public override async getModelInfo(): Promise<{
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
      const model = 'gpt-5'; // 默认模型
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

  public override async healthCheck(): Promise<{
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

  public override getClientName(): string {
    return 'OpenAI Response';
  }

  public override getClientVersion(): string {
    return '1.0.0';
  }

  public override async getSupportedModels(): Promise<string[]> {
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

  public override async getRateLimitInfo(): Promise<{
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

  public override async resetRateLimit(): Promise<boolean> {
    return true;
  }

  public override async waitForRateLimitReset(timeout?: number): Promise<boolean> {
    return true;
  }

  public override async getCacheStatistics(): Promise<{
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

  public override async clearCache(): Promise<boolean> {
    return true;
  }

  public override async getErrorStatistics(startTime?: Date, endTime?: Date): Promise<{
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

  public override async getPerformanceStatistics(startTime?: Date, endTime?: Date): Promise<{
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

  public override async getUsageStatistics(startTime?: Date, endTime?: Date): Promise<{
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

  public override async exportStatistics(
    format: 'json' | 'csv' | 'xml',
    startTime?: Date,
    endTime?: Date
  ): Promise<string> {
    return JSON.stringify({});
  }

  public override async configure(config: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  public override async getConfiguration(): Promise<Record<string, unknown>> {
    return {};
  }

  public override async resetConfiguration(): Promise<boolean> {
    return true;
  }

  public override async close(): Promise<boolean> {
    // Clean up resources if needed
    return true;
  }

  public override async getModelCapabilities(model: string): Promise<any> {
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

  public override async estimateTokens(text: string): Promise<number> {
    // 使用tiktoken进行精确计算，而不是估算
    return this.tokenCalculator.calculateTokensForModel(text, 'gpt-5');
  }

  public override async truncateText(text: string, maxTokens: number): Promise<string> {
    // 使用tiktoken进行精确截断
    // 简化实现：按字符截断
    const estimatedTokens = await this.estimateTokens(text);
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    // 粗略估算：每个token约4个字符
    const maxChars = maxTokens * 4;
    return text.substring(0, maxChars);
  }

  public override async formatMessages(messages: any[]): Promise<any[]> {
    // Format messages for OpenAI API
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  public override async parseResponse(response: any): Promise<LLMResponse> {
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

  public override async handleErrorWithResponse(error: any): Promise<LLMResponse> {
    // Create error response
    return LLMResponse.create(
      ID.fromString('error-request-id'),
      'unknown',
      [],
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      'error',
      0,
      {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      }
    );
  }
}