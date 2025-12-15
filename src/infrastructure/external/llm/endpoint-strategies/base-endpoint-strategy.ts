import { IEndpointStrategy } from './endpoint-strategy.interface';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../parameter-mappers/interfaces/parameter-mapper.interface';

/**
 * 基础端点策略
 * 
 * 提供通用的端点策略功能，子类可以扩展实现特定提供商的策略
 */
export abstract class BaseEndpointStrategy implements IEndpointStrategy {
  protected readonly name: string;
  protected readonly version: string;

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  /**
   * 构建端点 URL
   * 子类必须实现此方法
   */
  abstract buildEndpoint(config: ProviderConfig, request: ProviderRequest): string;

  /**
   * 构建请求头
   * 默认实现包含 Content-Type，子类可以扩展
   */
  buildHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }

  /**
   * 处理认证
   * 默认实现不做任何处理，子类可以重写
   */
  handleAuthentication(request: any, config: ProviderConfig): any {
    return request;
  }

  /**
   * 获取策略名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取策略版本
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * 验证配置
   * 默认验证基本配置项
   */
  validateConfig(config: ProviderConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.baseURL) {
      errors.push('Base URL is required');
    }

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 构建 URL 路径
   * 辅助方法，用于安全地拼接 URL 路径
   */
  protected buildPath(baseURL: string, ...pathSegments: string[]): string {
    const url = new URL(baseURL);
    const currentPath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
    const cleanSegments = pathSegments.map(segment =>
      segment.startsWith('/') ? segment.slice(1) : segment
    ).filter(segment => segment.length > 0);

    const newPath = cleanSegments.length > 0
      ? `${currentPath}/${cleanSegments.join('/')}`
      : currentPath;

    url.pathname = newPath;
    return url.toString();
  }

  /**
   * 添加查询参数
   * 辅助方法，用于向 URL 添加查询参数
   */
  protected addQueryParams(url: string, params: Record<string, string>): string {
    const urlObj = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.set(key, value);
      }
    });
    return urlObj.toString();
  }

  /**
   * 验证 URL 格式
   * 辅助方法，用于验证 URL 格式是否正确
   */
  protected isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}