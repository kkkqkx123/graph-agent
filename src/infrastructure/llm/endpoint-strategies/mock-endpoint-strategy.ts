import { z } from 'zod';
import { BaseEndpointStrategy, BaseEndpointConfigSchema } from './base-endpoint-strategy';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../parameter-mappers/base-parameter-mapper';

/**
 * Mock 端点配置 Schema
 * 定义 Mock 端点特有的配置验证规则
 */
const MockEndpointConfigSchema = BaseEndpointConfigSchema.extend({
  /**
   * 提供商名称
   */
  name: z.literal('mock'),

  /**
   * API 密钥（可选，Mock 可以使用默认值）
   */
  apiKey: z.string().optional().default('mock-key')
});

/**
 * Mock 配置类型
 */
export type MockEndpointConfig = z.infer<typeof MockEndpointConfigSchema>;

/**
 * Mock 端点策略
 *
 * 用于测试和模拟场景
 */
export class MockEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('MockEndpointStrategy', '1.0.0', MockEndpointConfigSchema);
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
}