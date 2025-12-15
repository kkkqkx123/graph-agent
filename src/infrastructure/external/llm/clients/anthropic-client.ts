import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../../domain/llm/value-objects/model-config';
import { BaseLLMClient } from './base-llm-client';
import { AnthropicProvider } from '../converters/providers/anthropic-provider';

@injectable()
export class AnthropicClient extends BaseLLMClient {
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
      'Anthropic',
      'anthropic',
      'https://api.anthropic.com'
    );
  }

  protected getEndpoint(): string {
    return `${this.baseURL}/v1/messages`;
  }

  protected getHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    };
  }

  protected prepareRequest(request: LLMRequest): any {
    // 获取模型配置以使用正确的默认值
    const modelConfig = this.getModelConfig();
    
    // 使用转换器准备请求
    const provider = new AnthropicProvider();
    
    // 转换消息格式
    const parameters: Record<string, any> = {
      model: request.model,
      max_tokens: request.maxTokens ?? modelConfig.getMaxTokens()
    };

    // 基础参数
    if (request.temperature !== undefined) {
      parameters['temperature'] = request.temperature;
    } else {
      // 只有在请求中没有指定温度时才使用配置中的默认值
      parameters['temperature'] = modelConfig.getTemperature();
    }

    // 添加 Anthropic 特有参数
    if (request.topP !== undefined) {
      parameters['top_p'] = request.topP;
    }
    
    // 从元数据中获取 top_k
    if (request.metadata && 'topK' in request.metadata && request.metadata['topK'] !== undefined) {
      parameters['top_k'] = request.metadata['topK'];
    }
    
    // 使用 stop 参数作为 stop_sequences
    if (request.stop && request.stop.length > 0) {
      parameters['stop_sequences'] = request.stop;
    }
    
    // 从消息中提取系统提示
    const systemMessages = request.messages.filter(msg => msg.role === 'system');
    if (systemMessages.length > 0) {
      parameters['system'] = systemMessages.map(msg => msg.content).join('\n');
    }
    
    // 元数据
    if (request.metadata && Object.keys(request.metadata).length > 0) {
      // 过滤掉已经处理的特殊参数
      const { topK, ...otherMetadata } = request.metadata;
      if (Object.keys(otherMetadata).length > 0) {
        parameters['metadata'] = otherMetadata;
      }
    }
    
    // 工具使用
    if (request.tools && request.tools.length > 0) {
      parameters['tools'] = request.tools;
    }
    
    if (request.toolChoice) {
      parameters['tool_choice'] = request.toolChoice;
    }
    
    // 流式响应
    if (request.stream) {
      parameters['stream'] = request.stream;
    }

    return provider.convertRequest(request.messages, parameters);
  }

  protected toLLMResponse(anthropicResponse: any, request: LLMRequest): LLMResponse {
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

  getSupportedModelsList(): string[] {
    return [
      // Claude 3.5系列
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      
      // Claude 4系列
      "claude-4.1-opus",
      "claude-4.0-sonnet",
      
      // 4.5系列
      "claude-4.5-opus",
      "claude-4.5-sonnet",
      "claude-4.5-haiku"
    ];
  }

  getModelConfig(): ModelConfig {
    const model = 'claude-3-sonnet-20240229'; // 默认模型
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