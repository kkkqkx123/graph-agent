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

/**
 * Gemini 参数 Schema
 * 定义 Gemini 特有的参数验证规则
 */
const GeminiParameterSchema = BaseParameterSchema.extend({
  reasoningEffort: z.enum(['none', 'low', 'medium', 'high']).optional(),
  thinkingBudget: z.enum(['low', 'medium', 'high']).optional(),
  includeThoughts: z.boolean().optional(),
  cachedContent: z.string().optional(),
  topK: z.number().int().min(1).max(100).optional(),
  streamOptions: z.record(z.string(), z.any()).optional(),
});

/**
 * Gemini 特有参数键名
 */
const GEMINI_SPECIFIC_KEYS = [
  'reasoningEffort',
  'thinkingBudget',
  'includeThoughts',
  'cachedContent',
  'topK',
  'streamOptions',
];

/**
 * Gemini 参数映射器
 *
 * 将标准 LLM 请求转换为 Gemini API 格式
 * 使用 zod 进行参数验证，移除硬编码的默认值
 */
export class GeminiParameterMapper extends BaseParameterMapper {
  constructor() {
    // 注册已知的元数据键（如果有）
    super('GeminiParameterMapper', '2.0.0', GeminiParameterSchema);
  }

  /**
   * 将标准 LLM 请求映射为 Gemini 请求格式
   */
  mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest {
    const geminiRequest: ProviderRequest = {
      model: request.model,
      messages: request.messages,
    };

    // 基本参数映射（仅在值存在时添加）
    this.addOptionalParam(geminiRequest, 'temperature', request.temperature);
    this.addOptionalParam(geminiRequest, 'max_tokens', request.maxTokens);
    this.addOptionalParam(geminiRequest, 'top_p', request.topP);

    // 停止序列映射
    if (request.stop && request.stop.length > 0) {
      geminiRequest['stop'] = request.stop;
    }

    // Gemini 特有参数
    this.addOptionalParam(geminiRequest, 'reasoning_effort', request.reasoningEffort);
    this.addMetadataParam(geminiRequest, request.metadata, 'topK', 'top_k');

    // 思考预算配置（通过 extra_body）
    if (request.metadata?.['thinkingBudget'] || request.metadata?.['includeThoughts']) {
      geminiRequest['extra_body'] = {
        google: {
          thinking_config: {
            thinking_budget: request.metadata?.['thinkingBudget'] || 'medium',
            include_thoughts: request.metadata?.['includeThoughts'] || false,
          },
        },
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
    this.addOptionalParam(geminiRequest, 'stream', request.stream);
    this.addMetadataParam(geminiRequest, request.metadata, 'streamOptions', 'stream_options');

    // 传递未知的元数据参数（支持通用参数传递）
    this.passUnknownMetadataParams(geminiRequest, request.metadata);

    return geminiRequest;
  }

  /**
   * 将 Gemini 响应映射为标准 LLM 响应格式
   */
  mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse {
    // Gemini 使用 candidates 而不是 choices
    const candidate = response['candidates']?.[0];
    const usageMetadata = response['usageMetadata'];

    if (!candidate) {
      throw new Error('Invalid Gemini response: no candidates found');
    }

    // 提取内容
    const content = candidate['content'];
    let textContent = '';
    if (content && content['parts']) {
      // 提取文本内容
      const textParts = content['parts'].filter((part: any) => part['text']);
      textContent = textParts.map((part: any) => part['text']).join('');

      // 提取思考过程（如果存在）
      const thoughtParts = content['parts'].filter((part: any) => part['thought']);
      if (thoughtParts.length > 0) {
        // 思考过程可以存储在 metadata 中
      }
    }

    // 解析 token 使用信息
    const promptTokens = usageMetadata?.['promptTokenCount'] || 0;
    const completionTokens = usageMetadata?.['candidatesTokenCount'] || 0;
    const totalTokens = usageMetadata?.['totalTokenCount'] || 0;

    // 构建元数据，保留原始 API 响应的详细信息
    const metadata: Record<string, unknown> = {
      model: response['model'],
      responseId: response['id'] || response['name'],
      provider: 'gemini',
      // 保留原始详细信息用于调试和审计
      usageMetadata: usageMetadata,
      finishReason: candidate['finishReason'],
      safetyRatings: candidate['safetyRatings'],
    };

    // 构建标准响应
    return LLMResponse.create(
      originalRequest.requestId,
      originalRequest.model,
      [
        {
          index: candidate['index'] || 0,
          message: LLMMessage.createAssistant(textContent),
          finish_reason: candidate['finishReason'] || 'stop',
        },
      ],
      {
        promptTokens,
        completionTokens,
        totalTokens,
        metadata,
      },
      candidate['finishReason'] || 'stop',
      0, // duration - would need to be calculated
      { metadata }
    );
  }
}
