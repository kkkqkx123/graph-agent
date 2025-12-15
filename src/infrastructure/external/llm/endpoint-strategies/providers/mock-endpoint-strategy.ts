import { BaseEndpointStrategy } from '../base/base-endpoint-strategy';
import { ProviderConfig } from '../../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../../parameter-mappers/interfaces/parameter-mapper.interface';

/**
 * Mock 端点策略
 * 
 * 用于测试和模拟场景
 */
export class MockEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('MockEndpointStrategy', '1.0.0');
  }

  /**
    * 构建端点 URL
    */
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string {
    // Mock API 使用固定的路径
    return this.buildPath(config.baseURL, 'mock', 'generate');
  }

  /**
    * 构建请求头
    */
  override buildHeaders(config: ProviderConfig): Record<string, string> {
    const headers = super.buildHeaders(config);
    
    // Mock API 使用自定义头部进行认证
    headers['x-mock-api-key'] = config.apiKey || 'mock-key';
    
    return headers;
  }

  /**
    * 处理认证
    */
  override handleAuthentication(request: any, config: ProviderConfig): any {
    // Mock API 通过自定义头部进行认证
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
    
    // Mock API 不需要特殊验证
    
    return {
      isValid: result.errors.length === 0,
      errors: result.errors
    };
  }
}