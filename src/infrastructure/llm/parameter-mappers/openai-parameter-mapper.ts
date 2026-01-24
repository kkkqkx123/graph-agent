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
 * OpenAI 参数 Schema
 * 定义 OpenAI 特有的参数验证规则
 */
const OpenAIParameterSchema = BaseParameterSchema.extend({
  reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
  responseFormat: z.record(z.string(), z.any()).optional(),
  seed: z.number().int().optional(),
  serviceTier: z.string().optional(),
  user: z.string().optional(),
  n: z.number().int().min(1).max(10).optional(),
  logitBias: z.record(z.number(), z.number()).optional(),
  topLogprobs: z.number().int().min(0).max(20).optional(),
  store: z.boolean().optional(),
  streamOptions: z.record(z.string(), z.any()).optional(),
});

/**
 * OpenAI 特有参数键名
 */
const OPENAI_SPECIFIC_KEYS = [
  'reasoningEffort',
  'responseFormat',
  'seed',
  'serviceTier',
  'user',
  'n',
  'logitBias',
  'topLogprobs',
  'store',
  'streamOptions',
];

/**
 * OpenAI 参数映射器
 *
 * 将标准 LLM 请求转换为 OpenAI API 格式
 * 使用 zod 进行参数验证，移除硬编码的默认值
 */
export class OpenAIParameterMapper extends BaseParameterMapper {
  constructor() {
    super('OpenAIParameterMapper', '2.0.0', OpenAIParameterSchema);
    
    // 注册已知的元数据键
    this.addKnownMetadataKey('responseFormat');
    this.addKnownMetadataKey('seed');
    this.addKnownMetadataKey('serviceTier');
    this.addKnownMetadataKey('user');
    this.addKnownMetadataKey('n');
    this.addKnownMetadataKey('logitBias');
    this.addKnownMetadataKey('topLogprobs');
    this.addKnownMetadataKey('store');
    this.addKnownMetadataKey('streamOptions');
  }

  /**
   * 将标准 LLM 请求映射为 OpenAI 请求格式
   */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest {
    const openaiRequest: ProviderRequest = {
      model: request.model,
      messages: request.messages,
    };

    // 基本参数映射（仅在值存在时添加）
    this.addOptionalParam(openaiRequest, 'temperature', request.temperature);
    this.addOptionalParam(openaiRequest, 'max_tokens', request.maxTokens);
    this.addOptionalParam(openaiRequest, 'top_p', request.topP);
    this.addOptionalParam(openaiRequest, 'frequency_penalty', request.frequencyPenalty);
    this.addOptionalParam(openaiRequest, 'presence_penalty', request.presencePenalty);
    this.addOptionalParam(openaiRequest, 'stream', request.stream);

    // 停止序列映射
    if (request.stop && request.stop.length > 0) {
      openaiRequest['stop'] = request.stop;
    }

    // OpenAI 特有参数
    this.addOptionalParam(openaiRequest, 'reasoning_effort', request.reasoningEffort);

    // 从元数据中获取 OpenAI 特有参数
    if (request.metadata) {
      this.addMetadataParam(openaiRequest, request.metadata, 'responseFormat', 'response_format');
      this.addMetadataParam(openaiRequest, request.metadata, 'seed');
      this.addMetadataParam(openaiRequest, request.metadata, 'serviceTier', 'service_tier');
      this.addMetadataParam(openaiRequest, request.metadata, 'user');
      this.addMetadataParam(openaiRequest, request.metadata, 'n');
      this.addMetadataParam(openaiRequest, request.metadata, 'logitBias', 'logit_bias');
      this.addMetadataParam(openaiRequest, request.metadata, 'topLogprobs', 'top_logprobs');
      this.addMetadataParam(openaiRequest, request.metadata, 'store');
      this.addMetadataParam(openaiRequest, request.metadata, 'streamOptions', 'stream_options');
    }

    // 工具相关参数
    if (request.tools) {
      openaiRequest['tools'] = request.tools;
    }

    if (request.toolChoice) {
      openaiRequest['tool_choice'] = request.toolChoice;
    }

    // 传递未知的元数据参数（支持通用参数传递）
    this.passUnknownMetadataParams(openaiRequest, request.metadata);

    return openaiRequest;
  }

  /**
   * 将 OpenAI 响应映射为标准 LLM 响应格式
   */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse {
    const choice = response['choices']?.[0];
    const usage = response['usage'];

    if (!choice) {
      throw new ValidationError('Invalid OpenAI response: no choices found');
    }

    // 解析详细信息
    const promptDetails = usage?.prompt_tokens_details || {};
    const completionDetails = usage?.completion_tokens_details || {};

    // 推理 token（单独统计，但已包含在 completion_tokens 中）
    const reasoningTokens = completionDetails['reasoning_tokens'] || 0;

    // 构建元数据，保留原始 API 响应的详细信息
    const metadata: Record<string, unknown> = {
      model: response['model'],
      responseId: response['id'],
      object: response['object'],
      created: response['created'],
      systemFingerprint: response['system_fingerprint'],
      provider: 'openai',
      // 保留原始详细信息用于调试和审计
      promptTokensDetails: promptDetails,
      completionTokensDetails: completionDetails,
    };

    // 构建标准响应
    return LLMResponse.create(
      originalRequest.requestId,
      originalRequest.model,
      [
        {
          index: choice.index || 0,
          message: LLMMessage.createAssistant(choice.message.content || ''),
          finish_reason: choice.finish_reason || 'stop',
        },
      ],
      {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        reasoningTokens,
        metadata,
      },
      choice.finish_reason || 'stop',
      0, // duration - would need to be calculated
      { metadata }
    );
  }
}
