import { z } from 'zod';
import { BaseEndpointStrategy, BaseEndpointConfigSchema } from './base-endpoint-strategy';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../parameter-mappers/base-parameter-mapper';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';

/**
 * OpenAI 兼容端点配置 Schema
 * 定义 OpenAI 兼容 API 特有的配置验证规则
 */
const OpenAICompatibleEndpointConfigSchema = BaseEndpointConfigSchema.extend({
  /**
   * 提供商名称
   */
  name: z.union([z.literal('openai'), z.literal('openai-compatible')]),

  /**
   * API 密钥
   * OpenAI 通常以 sk- 开头，但其他兼容提供商可能不同
   */
  apiKey: z.string().min(1, 'API key is required'),

  /**
   * 额外配置
   */
  extraConfig: z
    .object({
      /**
       * API 版本
       */
      apiVersion: z.string().optional(),
    })
    .optional(),
});

/**
 * OpenAI 兼容配置类型
 */
export type OpenAICompatibleEndpointConfig = z.infer<typeof OpenAICompatibleEndpointConfigSchema>;

/**
 * OpenAI 兼容端点策略
 *
 * 适用于使用 OpenAI API 格式的提供商，包括 OpenAI 本身和 Gemini OpenAI 兼容端点
 */
export class OpenAICompatibleEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('OpenAICompatibleEndpointStrategy', '1.0.0', OpenAICompatibleEndpointConfigSchema);
  }

  /**
   * 构建端点 URL
   */
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string {
    // OpenAI 兼容端点通常使用固定的路径
    return this.buildPath(config.baseURL, 'chat', 'completions');
  }

  /**
   * 构建请求头
   */
  override buildHeaders(config: ProviderConfig, request?: LLMRequest): Record<string, string> {
    const headers = super.buildHeaders(config, request);

    // 添加 Bearer token 认证
    headers['Authorization'] = `Bearer ${config.apiKey}`;

    // 添加可选的版本头
    if (config.extraConfig?.['apiVersion']) {
      headers['api-version'] = config.extraConfig['apiVersion'];
    }

    return headers;
  }

  /**
   * 处理认证
   */
  override handleAuthentication(request: any, config: ProviderConfig): any {
    // OpenAI 兼容端点通过 Authorization 头部进行认证
    // 这里不需要修改请求体
    return request;
  }
}
