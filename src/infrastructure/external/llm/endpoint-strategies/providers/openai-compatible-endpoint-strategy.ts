import { BaseEndpointStrategy } from '../base/base-endpoint-strategy';
import { ProviderConfig } from '../../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../../parameter-mappers/interfaces/parameter-mapper.interface';

/**
 * OpenAI 兼容端点策略
 * 
 * 适用于使用 OpenAI API 格式的提供商，包括 OpenAI 本身和 Gemini OpenAI 兼容端点
 */
export class OpenAICompatibleEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('OpenAICompatibleEndpointStrategy', '1.0.0');
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
  buildHeaders(config: ProviderConfig): Record<string, string> {
    const headers = super.buildHeaders(config);
    
    // 添加 Bearer token 认证
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    
    // 添加可选的版本头
    if (config.extraConfig?.apiVersion) {
      headers['api-version'] = config.extraConfig.apiVersion;
    }
    
    return headers;
  }

  /**
   * 处理认证
   */
  handleAuthentication(request: any, config: ProviderConfig): any {
    // OpenAI 兼容端点通过 Authorization 头部进行认证
    // 这里不需要修改请求体
    return request;
  }

  /**
   * 验证配置
   */
  validateConfig(config: ProviderConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const result = super.validateConfig(config);
    
    // 验证 API 密钥格式（OpenAI 通常以 sk- 开头）
    if (config.apiKey && !config.apiKey.startsWith('sk-') && config.name === 'openai') {
      result.errors.push('OpenAI API key should start with "sk-"');
    }
    
    return {
      isValid: result.errors.length === 0,
      errors: result.errors
    };
  }
}