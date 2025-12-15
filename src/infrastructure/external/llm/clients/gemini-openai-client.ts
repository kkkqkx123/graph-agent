import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { BaseLLMClient } from './base-llm-client';
import { OpenAIProvider, getMessageConverter } from '../converters';

@injectable()
export class GeminiOpenAIClient extends BaseLLMClient {
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
      'Gemini OpenAI',
      'gemini-openai',
      'https://generativelanguage.googleapis.com/v1beta/openai'
    );
  }

  protected getEndpoint(): string {
    return `${this.baseURL}/chat/completions`;
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
    
    // 使用 OpenAI 转换器准备请求
    const converter = getMessageConverter();
    const provider = new OpenAIProvider();
    
    // 转换消息格式
    const parameters: Record<string, any> = {
      model: request.model,
      temperature: request.temperature ?? modelConfig.getTemperature(),
      max_tokens: request.maxTokens ?? modelConfig.getMaxTokens(),
      top_p: request.topP ?? modelConfig.getTopP(),
      frequency_penalty: request.frequencyPenalty ?? modelConfig.getFrequencyPenalty(),
      presence_penalty: request.presencePenalty ?? modelConfig.getPresencePenalty(),
      stream: false
    };
    
    // 添加 Gemini 特有的推理努力参数
    if (request.reasoningEffort) {
      parameters['reasoning_effort'] = request.reasoningEffort;
    }
    
    // 添加思考预算配置（通过 extra_body）
    if (request.thinkingBudget || request.includeThoughts) {
      parameters['extra_body'] = {
        google: {
          thinking_config: {
            thinking_budget: request.thinkingBudget || 'medium',
            include_thoughts: request.includeThoughts || false
          }
        }
      };
    }
    
    // 添加缓存内容支持
    if (request.cachedContent) {
      if (!parameters['extra_body']) {
        parameters['extra_body'] = { google: {} };
      }
      parameters['extra_body'].google.cached_content = request.cachedContent;
    }
    
    // 添加工具相关参数
    if (request.tools) {
      parameters['tools'] = request.tools;
    }
    
    if (request.toolChoice) {
      parameters['tool_choice'] = request.toolChoice;
    }
    
    // 添加流式选项
    if (request.streamOptions) {
      parameters['stream_options'] = request.streamOptions;
    }
    
    return provider.convertRequest(request.messages, parameters);
  }

  protected toLLMResponse(geminiResponse: any, request: LLMResponse): LLMResponse {
    const choice = geminiResponse.choices[0];
    const usage = geminiResponse.usage;

    // 提取思考过程（如果存在）
    let thoughts = undefined;
    if (geminiResponse.choices?.[0]?.message?.thoughts) {
      thoughts = geminiResponse.choices[0].message.thoughts;
    }

    return LLMResponse.create(
      request.requestId,
      request.model,
      [{
        index: 0,
        message: {
          role: choice.message.role,
          content: choice.message.content,
          thoughts: thoughts
        },
        finish_reason: choice.finish_reason
      }],
      {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        reasoningTokens: usage.reasoning_tokens || 0
      },
      choice.finish_reason,
      0 // duration - would need to be calculated
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
    const configs = this.configManager.get('llm.gemini-openai.models', {});
    const config = configs[model];

    if (!config) {
      throw new Error(`Model configuration not found for ${model}`);
    }

    return ModelConfig.create({
      model,
      provider: 'google',
      maxTokens: config.maxTokens || 8192,
      contextWindow: config.contextWindow || 1048576,
      temperature: config.temperature || 0.7,
      topP: config.topP || 0.95,
      topK: config.topK || 40,
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
      supportsThinking: config.supportsThinking ?? true,
      metadata: config.metadata || {}
    });
  }

  public override async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    await this.rateLimiter.checkLimit();

    try {
      // 准备请求，启用流式模式
      const openaiRequest = {
        ...this.prepareRequest(request),
        stream: true
      };
      
      // 发送流式请求
      const response = await this.httpClient.post(this.getEndpoint(), openaiRequest, {
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
              const choice = data.choices[0];
              
              if (choice) {
                // 提取思考过程（如果存在）
                let thoughts = undefined;
                if (choice.message?.thoughts) {
                  thoughts = choice.message.thoughts;
                }
                
                yield LLMResponse.create(
                  request.requestId,
                  request.model,
                  [{
                    index: choice.index || 0,
                    message: {
                      role: 'assistant',
                      content: choice.delta?.content || '',
                      thoughts: thoughts
                    },
                    finish_reason: choice.finish_reason || ''
                  }],
                  {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                    reasoningTokens: data.usage?.reasoning_tokens || 0
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
    supportsThinking: boolean;
  }> {
    try {
      const response = await this.httpClient.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      const model = 'gemini-2.5-flash'; // 默认模型
      const config = this.getModelConfig();
      
      return {
        name: model,
        provider: 'google',
        version: '1.0',
        maxTokens: config.getMaxTokens(),
        contextWindow: config.getContextWindow(),
        supportsStreaming: config.supportsStreaming(),
        supportsTools: config.supportsTools(),
        supportsImages: config.supportsImages(),
        supportsAudio: config.supportsAudio(),
        supportsVideo: config.supportsVideo(),
        supportsThinking: config.supportsThinking()
      };
    } catch (error) {
      throw new Error(`Failed to get model info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}