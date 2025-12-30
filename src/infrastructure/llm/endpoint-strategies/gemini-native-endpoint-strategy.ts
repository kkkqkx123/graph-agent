import { BaseEndpointStrategy } from './base-endpoint-strategy';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../parameter-mappers/base-parameter-mapper';

/**
 * Gemini 原生端点策略
 * 
 * 适用于 Gemini 原生 API，API 密钥需要包含在 URL 中
 */
export class GeminiNativeEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('GeminiNativeEndpointStrategy', '1.0.0');
  }

  /**
   * 构建端点 URL
   */
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string {
    // Gemini 原生 API 需要在 URL 中包含 API 密钥和模型名称
    const endpoint = this.buildPath(config.baseURL, 'v1beta', 'models', `${request['model']}:generateContent`);
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

  /**
   * 验证配置
   */
  override validateConfig(config: ProviderConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const result = super.validateConfig(config);

    // 验证基础 URL 格式
    if (config.baseURL && !config.baseURL.includes('generativelanguage.googleapis.com')) {
      result.errors.push('Gemini native API should use generativelanguage.googleapis.com');
    }

    return {
      isValid: result.errors.length === 0,
      errors: result.errors
    };
  }
}