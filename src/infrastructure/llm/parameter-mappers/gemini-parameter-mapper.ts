import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { BaseParameterMapper, ProviderRequest, ProviderResponse } from './base-parameter-mapper';
import { ProviderConfig } from './interfaces/provider-config.interface';
import { ParameterDefinition } from './interfaces/parameter-definition.interface';

/**
 * Gemini 参数映射器
 * 
 * 将标准 LLM 请求转换为 Gemini API 格式
 */
export class GeminiParameterMapper extends BaseParameterMapper {
  constructor() {
    super('GeminiParameterMapper', '1.0.0');
  }

  /**
   * 初始化支持的参数列表
   */
  protected override initializeSupportedParameters(): ParameterDefinition[] {
    const baseParams = super.initializeSupportedParameters();

    // 添加 Gemini 特有参数
    const geminiSpecificParams: ParameterDefinition[] = [
      {
        name: 'reasoningEffort',
        type: 'string',
        required: false,
        options: ['none', 'low', 'medium', 'high'],
        description: '推理努力程度',
        isProviderSpecific: true
      },
      {
        name: 'thinkingBudget',
        type: 'string',
        required: false,
        options: ['low', 'medium', 'high'],
        description: '思考预算',
        isProviderSpecific: true
      },
      {
        name: 'includeThoughts',
        type: 'boolean',
        required: false,
        defaultValue: false,
        description: '是否包含思考过程',
        isProviderSpecific: true
      },
      {
        name: 'cachedContent',
        type: 'string',
        required: false,
        description: '缓存内容标识符',
        isProviderSpecific: true
      },
      {
        name: 'topK',
        type: 'number',
        required: false,
        defaultValue: 40,
        description: 'Top K 采样参数',
        min: 1,
        max: 100,
        isProviderSpecific: true
      }
    ];

    return [...baseParams, ...geminiSpecificParams];
  }

  /**
   * 将标准 LLM 请求映射为 Gemini 请求格式
   */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest {
    const baseParams = this.applyDefaultValues(request);

    // 构建 Gemini 请求
    const geminiRequest: ProviderRequest = {
      model: request.model,
      messages: request.messages
    };

    // 基本参数映射
    if (baseParams['temperature'] !== undefined) {
      geminiRequest['temperature'] = baseParams['temperature'];
    }

    if (baseParams['maxTokens'] !== undefined) {
      geminiRequest['max_tokens'] = baseParams['maxTokens'];
    }

    if (baseParams['topP'] !== undefined) {
      geminiRequest['top_p'] = baseParams['topP'];
    }

    if (baseParams['stop'] && baseParams['stop'].length > 0) {
      geminiRequest['stop'] = baseParams['stop'];
    }

    // Gemini 特有参数
    if (request.reasoningEffort) {
      geminiRequest['reasoning_effort'] = request.reasoningEffort;
    }

    if (request.metadata?.['topK'] !== undefined) {
      geminiRequest['top_k'] = request.metadata['topK'];
    }

    // 思考预算配置（通过 extra_body）
    if (request.metadata?.['thinkingBudget'] || request.metadata?.['includeThoughts']) {
      geminiRequest['extra_body'] = {
        google: {
          thinking_config: {
            thinking_budget: request.metadata?.['thinkingBudget'] || 'medium',
            include_thoughts: request.metadata?.['includeThoughts'] || false
          }
        }
      };
    }

    // 缓存内容支持
    if (request.metadata?.['cachedContent']) {
      if (!geminiRequest['extra_body']) {
        geminiRequest['extra_body'] = { google: {} };
      }
      geminiRequest['extra_body'].google.cached_content = request.metadata['cachedContent'];
    }

    // 工具相关参数
    if (request.tools) {
      geminiRequest['tools'] = request.tools;
    }

    if (request.toolChoice) {
      geminiRequest['tool_choice'] = request.toolChoice;
    }

    // 流式选项
    if (request.stream) {
      geminiRequest['stream'] = request.stream;
    }

    if (request.metadata?.['streamOptions']) {
      geminiRequest['stream_options'] = request.metadata['streamOptions'];
    }

    return geminiRequest;
  }

  /**
   * 将 Gemini 响应映射为标准 LLM 响应格式
   */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse {
    const choice = response['choices']?.[0];
    const usage = response['usage'];

    if (!choice) {
      throw new Error('Invalid Gemini response: no choices found');
    }

    // 提取思考过程（如果存在）
    let thoughts = undefined;
    if (choice.message?.thoughts) {
      thoughts = choice.message.thoughts;
    }

    // 构建标准响应
    return LLMResponse.create(
      originalRequest.requestId,
      originalRequest.model,
      [{
        index: choice.index || 0,
        message: LLMMessage.createAssistant(choice.message.content || ''),
        finish_reason: choice.finish_reason || 'stop'
      }],
      {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        reasoningTokens: usage?.reasoning_tokens || 0
      },
      choice.finish_reason || 'stop',
      0 // duration - would need to be calculated
    );
  }
}