import { LLMRequest } from '../../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../../domain/llm/entities/llm-response';
import { BaseParameterMapper } from '../base/base-parameter-mapper';
import { ProviderConfig, ProviderRequest, ProviderResponse } from '../interfaces/parameter-mapper.interface';
import { ParameterDefinitionBuilder, CommonParameterDefinitions } from '../interfaces/parameter-definition.interface';

/**
 * Anthropic 参数映射器
 * 
 * 将标准 LLM 请求转换为 Anthropic API 格式
 */
export class AnthropicParameterMapper extends BaseParameterMapper {
  constructor() {
    super('AnthropicParameterMapper', '1.0.0');
  }

  /**
   * 初始化支持的参数列表
   */
  protected initializeSupportedParameters(): ParameterDefinition[] {
    const baseParams = super.initializeSupportedParameters();
    
    // 添加 Anthropic 特有参数
    const anthropicSpecificParams = [
      new ParameterDefinitionBuilder()
        .name('topK')
        .type('number')
        .required(false)
        .description('Top K 采样参数')
        .min(0)
        .group('provider-specific')
        .isProviderSpecific(true)
        .build(),

      new ParameterDefinitionBuilder()
        .name('system')
        .type('string')
        .required(false)
        .description('系统提示')
        .group('provider-specific')
        .isProviderSpecific(true)
        .build(),

      new ParameterDefinitionBuilder()
        .name('metadata')
        .type('object')
        .required(false)
        .description('元数据')
        .group('provider-specific')
        .isProviderSpecific(true)
        .build()
    ];

    return [...baseParams, ...anthropicSpecificParams];
  }

  /**
   * 将标准 LLM 请求映射为 Anthropic 请求格式
   */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest {
    const baseParams = this.applyDefaultValues(request);
    
    // 构建 Anthropic 请求
    const anthropicRequest: ProviderRequest = {
      model: request.model,
      max_tokens: baseParams.maxTokens || 1000
    };

    // 基本参数映射
    if (baseParams.temperature !== undefined) {
      anthropicRequest.temperature = baseParams.temperature;
    }

    if (baseParams.topP !== undefined) {
      anthropicRequest.top_p = baseParams.topP;
    }

    if (baseParams.stop && baseParams.stop.length > 0) {
      anthropicRequest.stop_sequences = baseParams.stop;
    }

    // Anthropic 特有参数
    if (request.metadata?.topK !== undefined) {
      anthropicRequest.top_k = request.metadata.topK;
    }

    // 从消息中提取系统提示
    const systemMessages = request.messages.filter(msg => msg.role === 'system');
    if (systemMessages.length > 0) {
      anthropicRequest.system = systemMessages.map(msg => msg.content).join('\n');
    }

    // 过滤掉系统消息，因为 Anthropic 使用单独的 system 参数
    const nonSystemMessages = request.messages.filter(msg => msg.role !== 'system');
    anthropicRequest.messages = nonSystemMessages;

    // 元数据处理
    if (request.metadata && Object.keys(request.metadata).length > 0) {
      // 过滤掉已经处理的特殊参数
      const { topK, ...otherMetadata } = request.metadata;
      if (Object.keys(otherMetadata).length > 0) {
        anthropicRequest.metadata = otherMetadata;
      }
    }

    // 工具相关参数
    if (request.tools && request.tools.length > 0) {
      anthropicRequest.tools = request.tools;
    }

    if (request.toolChoice) {
      anthropicRequest.tool_choice = request.toolChoice;
    }

    // 流式响应
    if (request.stream) {
      anthropicRequest.stream = request.stream;
    }

    return anthropicRequest;
  }

  /**
   * 将 Anthropic 响应映射为标准 LLM 响应格式
   */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse {
    const content = response.content?.[0]?.text || '';
    const usage = response.usage;

    if (!content && !response.content) {
      throw new Error('Invalid Anthropic response: no content found');
    }

    // 构建标准响应
    return LLMResponse.create(
      originalRequest.requestId,
      originalRequest.model,
      [{
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: response.stop_reason || 'stop'
      }],
      {
        promptTokens: usage?.input_tokens || 0,
        completionTokens: usage?.output_tokens || 0,
        totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
      },
      response.stop_reason || 'stop',
      0 // duration - would need to be calculated
    );
  }
}