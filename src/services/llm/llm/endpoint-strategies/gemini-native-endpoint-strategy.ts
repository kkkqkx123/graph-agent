import { z } from 'zod';
import { BaseEndpointStrategy, BaseEndpointConfigSchema } from './base-endpoint-strategy';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../parameter-mappers/base-parameter-mapper';

/**
 * Gemini 原生端点配置 Schema
 * 定义 Gemini 原生 API 特有的配置验证规则
 */
const GeminiNativeEndpointConfigSchema = BaseEndpointConfigSchema.extend({
  /**
   * 提供商名称
   */
  name: z.literal('gemini-native'),

  /**
   * 基础 URL
   */
  baseURL: z
    .string()
    .refine(url => url.includes('generativelanguage.googleapis.com'), {
      message: 'Gemini native API should use generativelanguage.googleapis.com',
    }),

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
 * Gemini 原生配置类型
 */
export type GeminiNativeEndpointConfig = z.infer<typeof GeminiNativeEndpointConfigSchema>;

/**
 * Gemini 原生端点策略
 *
 * 适用于 Gemini 原生 API，API 密钥需要包含在 URL 中
 */
export class GeminiNativeEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('GeminiNativeEndpointStrategy', '1.0.0', GeminiNativeEndpointConfigSchema);
  }

  /**
   * 构建端点 URL
   */
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string {
    // Gemini 原生 API 需要在 URL 中包含 API 密钥和模型名称
    const endpoint = this.buildPath(
      config.baseURL,
      'v1beta',
      'models',
      `${request['model']}:generateContent`
    );
    return this.addQueryParams(endpoint, { key: config.apiKey });
  }

  /**
   * 构建请求头
   */
  override buildHeaders(config: ProviderConfig): Record<string, string> {
    const headers = super.buildHeaders(config);

    // Gemini 原生 API 不需要在请求头中包含 API 密钥
    // 因为 API 密钥已经在 URL 中

    // 添加可选的版本头
    if (config.extraConfig?.['apiVersion']) {
      headers['x-goog-api-version'] = config.extraConfig['apiVersion'];
    }

    return headers;
  }

  /**
   * 处理认证
   */
  override handleAuthentication(request: any, config: ProviderConfig): any {
    // Gemini 原生 API 通过 URL 参数进行认证
    // 这里不需要修改请求体
    return request;
  }
}
