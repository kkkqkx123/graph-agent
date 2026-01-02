import { z } from 'zod';
import { BaseEndpointStrategy, BaseEndpointConfigSchema } from './base-endpoint-strategy';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../parameter-mappers/base-parameter-mapper';

/**
 * Anthropic 端点配置 Schema
 * 定义 Anthropic 特有的配置验证规则
 */
const AnthropicEndpointConfigSchema = BaseEndpointConfigSchema.extend({
  /**
   * 提供商名称
   */
  name: z.literal('anthropic'),

  /**
   * 基础 URL
   */
  baseURL: z.string().refine(
    (url) => url.includes('api.anthropic.com'),
    { message: 'Anthropic API should use api.anthropic.com' }
  ),

  /**
   * API 密钥
   */
  apiKey: z.string().refine(
    (key) => key.startsWith('sk-ant-'),
    { message: 'Anthropic API key should start with "sk-ant-"' }
  ),

  /**
   * 额外配置
   */
  extraConfig: z.object({
    /**
     * API 版本
     */
    apiVersion: z.string().default('2023-06-01'),

    /**
     * 客户端名称
     */
    clientName: z.string().optional()
  }).optional()
});

/**
 * Anthropic 配置类型
 */
export type AnthropicEndpointConfig = z.infer<typeof AnthropicEndpointConfigSchema>;

/**
 * Anthropic 端点策略
 *
 * 适用于 Anthropic Claude API
 */
export class AnthropicEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('AnthropicEndpointStrategy', '1.0.0', AnthropicEndpointConfigSchema);
  }

  /**
   * 构建端点 URL
   */
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string {
    // Anthropic API 使用固定的路径
    return this.buildPath(config.baseURL, 'v1', 'messages');
  }

  /**
   * 构建请求头
   */
  override buildHeaders(config: ProviderConfig): Record<string, string> {
    const headers = super.buildHeaders(config);

    // Anthropic 使用 x-api-key 头部进行认证
    headers['x-api-key'] = config.apiKey;

    // 添加 Anthropic 版本头
    headers['anthropic-version'] = config.extraConfig?.['apiVersion'] || '2023-06-01';

    // 添加可选的客户端信息
    if (config.extraConfig?.['clientName']) {
      headers['anthropic-client'] = config.extraConfig['clientName'];
    }

    return headers;
  }

  /**
   * 处理认证
   */
  override handleAuthentication(request: any, config: ProviderConfig): any {
    // Anthropic 通过 x-api-key 头部进行认证
    // 这里不需要修改请求体
    return request;
  }
}