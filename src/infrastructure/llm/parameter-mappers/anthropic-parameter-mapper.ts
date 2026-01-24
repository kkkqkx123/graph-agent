import { z } from 'zod';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import {
  BaseParameterMapper,
  ProviderRequest,
  ProviderResponse,
  BaseParameterSchema,
} from './base-parameter-mapper';
import { ProviderConfig } from './interfaces/provider-config.interface';
import { ValidationError } from '../../../../common/exceptions';

/**
 * Anthropic 参数 Schema
 * 定义 Anthropic 特有的参数验证规则
 */
const AnthropicParameterSchema = BaseParameterSchema.extend({
  topK: z.number().int().min(0).optional(),
  system: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Anthropic 特有参数键名
 */
const ANTHROPIC_SPECIFIC_KEYS = ['topK', 'system', 'metadata'];

/**
 * Anthropic 参数映射器
 *
 * 将标准 LLM 请求转换为 Anthropic API 格式
 * 使用 zod 进行参数验证，移除硬编码的默认值
 */
export class AnthropicParameterMapper extends BaseParameterMapper {
  constructor() {
    // 注册已知的元数据键（如果有）
    super('AnthropicParameterMapper', '2.0.0', AnthropicParameterSchema);
  }

  /**
   * 将标准 LLM 请求映射为 Anthropic 请求格式
   */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest {
    const anthropicRequest: ProviderRequest = {
      model: request.model,
      max_tokens: request.maxTokens,
    };

    // 基本参数映射（仅在值存在时添加）
    this.addOptionalParam(anthropicRequest, 'temperature', request.temperature);
    this.addOptionalParam(anthropicRequest, 'top_p', request.topP);

    // 停止序列映射
    if (request.stop && request.stop.length > 0) {
      anthropicRequest['stop_sequences'] = request.stop;
    }

    // Anthropic 特有参数
    this.addMetadataParam(anthropicRequest, request.metadata, 'topK', 'top_k');

    // 从消息中提取系统提示
    const systemMessages = request.messages.filter(msg => msg.getRole() === 'system');
    if (systemMessages.length > 0) {
      anthropicRequest['system'] = systemMessages.map(msg => msg.getContent()).join('\n');
    }

    // 过滤掉系统消息，因为 Anthropic 使用单独的 system 参数
    const nonSystemMessages = request.messages.filter(msg => msg.getRole() !== 'system');
    anthropicRequest['messages'] = nonSystemMessages;

    // 元数据处理
    if (request.metadata && Object.keys(request.metadata).length > 0) {
      // 过滤掉已经处理的特殊参数
      const { topK, ...otherMetadata } = request.metadata;
      if (Object.keys(otherMetadata).length > 0) {
        anthropicRequest['metadata'] = otherMetadata;
      }
    }

    // 工具相关参数
    if (request.tools && request.tools.length > 0) {
      anthropicRequest['tools'] = request.tools;
    }

    if (request.toolChoice) {
      anthropicRequest['tool_choice'] = request.toolChoice;
    }

    // 流式响应
    this.addOptionalParam(anthropicRequest, 'stream', request.stream);

    // 传递未知的元数据参数（支持通用参数传递）
    this.passUnknownMetadataParams(anthropicRequest, request.metadata);

    return anthropicRequest;
  }

  /**
   * 将 Anthropic 响应映射为标准 LLM 响应格式
   */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse {
    const content = response['content'];
    const usage = response['usage'];

    if (!content || content.length === 0) {
      throw new ValidationError('Invalid Anthropic response: no content found');
    }

    // 提取文本内容
    let textContent = '';
    const textBlocks = content.filter((block: any) => block['type'] === 'text');
    if (textBlocks.length > 0) {
      textContent = textBlocks.map((block: any) => block['text']).join('');
    }

    // 解析 token 使用信息
    const promptTokens = usage?.['input_tokens'] || 0;
    const completionTokens = usage?.['output_tokens'] || 0;
    const totalTokens = promptTokens + completionTokens;

    // 构建元数据，保留原始 API 响应的详细信息
    const metadata: Record<string, unknown> = {
      model: response['model'],
      responseId: response['id'],
      provider: 'anthropic',
      // 保留原始详细信息用于调试和审计
      usage: usage,
      stopReason: response['stop_reason'],
      stopSequence: response['stop_sequence'],
      type: response['type'],
      role: response['role'],
    };

    // 构建标准响应
    return LLMResponse.create(
      originalRequest.requestId,
      originalRequest.model,
      [
        {
          index: 0,
          message: LLMMessage.createAssistant(textContent),
          finish_reason: response['stop_reason'] || 'stop',
        },
      ],
      {
        promptTokens,
        completionTokens,
        totalTokens,
        metadata,
      },
      response['stop_reason'] || 'stop',
      0, // duration - would need to be calculated
      { metadata }
    );
  }
}
