import { ProviderConfig } from '../../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../../parameter-mappers/interfaces/parameter-mapper.interface';

/**
 * 端点策略接口
 * 
 * 定义如何构建端点 URL 和处理认证
 */
export interface IEndpointStrategy {
  /**
   * 构建端点 URL
   * @param config 提供商配置
   * @param request 提供商请求
   * @returns 端点 URL
   */
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string;

  /**
   * 构建请求头
   * @param config 提供商配置
   * @returns 请求头对象
   */
  buildHeaders(config: ProviderConfig): Record<string, string>;

  /**
   * 处理认证
   * @param request 请求对象
   * @param config 提供商配置
   * @returns 处理后的请求对象
   */
  handleAuthentication(request: any, config: ProviderConfig): any;

  /**
   * 获取策略名称
   * @returns 策略名称
   */
  getName(): string;

  /**
   * 获取策略版本
   * @returns 策略版本
   */
  getVersion(): string;

  /**
   * 验证配置
   * @param config 提供商配置
   * @returns 验证结果
   */
  validateConfig(config: ProviderConfig): {
    isValid: boolean;
    errors: string[];
  };
}