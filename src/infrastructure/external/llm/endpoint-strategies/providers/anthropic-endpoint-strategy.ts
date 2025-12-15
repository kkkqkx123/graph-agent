import { BaseEndpointStrategy } from '../base/base-endpoint-strategy';
import { ProviderConfig } from '../../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../../parameter-mappers/interfaces/parameter-mapper.interface';

/**
 * Anthropic 端点策略
 * 
 * 适用于 Anthropic Claude API
 */
export class AnthropicEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('AnthropicEndpointStrategy', '1.0.0');
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

  /**
   * 验证配置
   */
  override validateConfig(config: ProviderConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const result = super.validateConfig(config);
    
    // 验证基础 URL 格式
    if (config.baseURL && !config.baseURL.includes('api.anthropic.com')) {
      result.errors.push('Anthropic API should use api.anthropic.com');
    }
    
    // 验证 API 密钥格式（Anthropic 通常以 sk-ant- 开头）
    if (config.apiKey && !config.apiKey.startsWith('sk-ant-')) {
      result.errors.push('Anthropic API key should start with "sk-ant-"');
    }
    
    return {
      isValid: result.errors.length === 0,
      errors: result.errors
    };
  }
}