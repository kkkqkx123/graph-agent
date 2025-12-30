import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { BaseParameterMapper, ProviderRequest, ProviderResponse } from './base-parameter-mapper';
import { ProviderConfig } from './interfaces/provider-config.interface';
import { ParameterDefinition } from './interfaces/parameter-definition.interface';

/**
 * OpenAI 参数映射器
 * 
 * 将标准 LLM 请求转换为 OpenAI API 格式
 */
export class OpenAIParameterMapper extends BaseParameterMapper {
  constructor() {
    super('OpenAIParameterMapper', '1.0.0');
  }

  /**
   * 初始化支持的参数列表
   */
  protected override initializeSupportedParameters(): ParameterDefinition[] {
    const baseParams = super.initializeSupportedParameters();

    // 添加 OpenAI 特有参数
    const openaiSpecificParams: ParameterDefinition[] = [
      {
        name: 'reasoningEffort',
        type: 'string',
        required: false,
        options: ['low', 'medium', 'high'],
        description: '推理努力程度',
        isProviderSpecific: true
      },
      {
        name: 'responseFormat',
        type: 'object',
        required: false,
        description: '响应格式',
        isProviderSpecific: true
      },
      {
        name: 'seed',
        type: 'number',
        required: false,
        description: '确定性种子',
        isProviderSpecific: true
      },
      {
        name: 'serviceTier',
        type: 'string',
        required: false,
        description: '服务层级',
        isProviderSpecific: true
      },
      {
        name: 'user',
        type: 'string',
        required: false,
        description: '用户标识符',
        isProviderSpecific: true
      },
      {
        name: 'n',
        type: 'number',
        required: false,
        defaultValue: 1,
        description: '生成数量',
        min: 1,
        max: 10,
        isProviderSpecific: true
      },
      {
        name: 'logitBias',
        type: 'object',
        required: false,
        description: 'Logit bias',
        isProviderSpecific: true
      },
      {
        name: 'topLogprobs',
        type: 'number',
        required: false,
        description: 'Top logprobs',
        min: 0,
        max: 20,
        isProviderSpecific: true
      },
      {
        name: 'store',
        type: 'boolean',
        required: false,
        description: '存储选项',
        isProviderSpecific: true
      },
      {
        name: 'streamOptions',
        type: 'object',
        required: false,
        description: '流式选项',
        isProviderSpecific: true
      }
    ];

    return [...baseParams, ...openaiSpecificParams];
  }

  /**
   * 将标准 LLM 请求映射为 OpenAI 请求格式
   */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest {
    const baseParams = this.applyDefaultValues(request);

    // 构建 OpenAI 请求
    const openaiRequest: ProviderRequest = {
      model: request.model,
      messages: request.messages
    };

    // 基本参数映射
    if (baseParams['temperature'] !== undefined) {
      openaiRequest['temperature'] = baseParams['temperature'];
    }

    if (baseParams['maxTokens'] !== undefined) {
      openaiRequest['max_tokens'] = baseParams['maxTokens'];
    }

    if (baseParams['topP'] !== undefined) {
      openaiRequest['top_p'] = baseParams['topP'];
    }

    if (baseParams['frequencyPenalty'] !== undefined) {
      openaiRequest['frequency_penalty'] = baseParams['frequencyPenalty'];
    }

    if (baseParams['presencePenalty'] !== undefined) {
      openaiRequest['presence_penalty'] = baseParams['presencePenalty'];
    }

    if (baseParams['stop'] && baseParams['stop'].length > 0) {
      openaiRequest['stop'] = baseParams['stop'];
    }

    if (baseParams['stream'] !== undefined) {
      openaiRequest['stream'] = baseParams['stream'];
    }

    // OpenAI 特有参数
    if (request.reasoningEffort) {
      openaiRequest['reasoning_effort'] = request.reasoningEffort;
    }

    // 从元数据中获取 OpenAI 特有参数
    if (request.metadata) {
      if (request.metadata?.['responseFormat']) {
        openaiRequest['response_format'] = request.metadata['responseFormat'];
      }

      if (request.metadata?.['seed'] !== undefined) {
        openaiRequest['seed'] = request.metadata['seed'];
      }

      if (request.metadata?.['serviceTier']) {
        openaiRequest['service_tier'] = request.metadata['serviceTier'];
      }

      if (request.metadata?.['user']) {
        openaiRequest['user'] = request.metadata['user'];
      }

      if (request.metadata?.['n'] !== undefined) {
        openaiRequest['n'] = request.metadata['n'];
      }

      if (request.metadata?.['logitBias']) {
        openaiRequest['logit_bias'] = request.metadata['logitBias'];
      }

      if (request.metadata?.['topLogprobs'] !== undefined) {
        openaiRequest['top_logprobs'] = request.metadata['topLogprobs'];
      }

      if (request.metadata?.['store'] !== undefined) {
        openaiRequest['store'] = request.metadata['store'];
      }

      if (request.metadata?.['streamOptions']) {
        openaiRequest['stream_options'] = request.metadata['streamOptions'];
      }
    }

    // 工具相关参数
    if (request.tools) {
      openaiRequest['tools'] = request.tools;
    }

    if (request.toolChoice) {
      openaiRequest['tool_choice'] = request.toolChoice;
    }

    return openaiRequest;
  }

  /**
   * 将 OpenAI 响应映射为标准 LLM 响应格式
   */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse {
    const choice = response['choices']?.[0];
    const usage = response['usage'];

    if (!choice) {
      throw new Error('Invalid OpenAI response: no choices found');
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
        totalTokens: usage?.total_tokens || 0
      },
      choice.finish_reason || 'stop',
      0 // duration - would need to be calculated
    );
  }
}