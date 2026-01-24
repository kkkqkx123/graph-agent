import { BaseEndpointStrategy } from '../../endpoint-strategies/base-endpoint-strategy';
import { BaseParameterMapper } from '../base-parameter-mapper';
import { FeatureSupport } from './feature-support.interface';
import { ConfigurationError } from '../../../../common/exceptions';

/**
 * API 类型枚举
 */
export enum ApiType {
  OPENAI_COMPATIBLE = 'openai-compatible',
  NATIVE = 'native',
  CUSTOM = 'custom',
}

/**
 * 提供商配置接口
 *
 * 包含提供商的所有配置信息，包括端点策略、参数映射器和功能支持
 */
export interface ProviderConfig {
  /**
   * 提供商名称
   */
  name: string;

  /**
   * API 类型
   */
  apiType: ApiType;

  /**
   * 基础 URL
   */
  baseURL: string;

  /**
   * API 密钥
   */
  apiKey: string;

  /**
   * 端点策略
   */
  endpointStrategy: BaseEndpointStrategy;

  /**
   * 参数映射器
   */
  parameterMapper: BaseParameterMapper;

  /**
   * 功能支持
   */
  featureSupport: FeatureSupport;

  /**
   * 默认模型
   */
  defaultModel?: string;

  /**
   * 支持的模型列表
   */
  supportedModels?: string[];

  /**
   * 额外配置
   */
  extraConfig?: Record<string, any>;

  /**
   * 请求超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 重试次数
   */
  retryCount?: number;

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number;
}

/**
 * 提供商配置构建器
 */
export class ProviderConfigBuilder {
  private config: Partial<ProviderConfig> = {};

  /**
   * 设置提供商名称
   */
  name(name: string): ProviderConfigBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * 设置 API 类型
   */
  apiType(apiType: ApiType): ProviderConfigBuilder {
    this.config.apiType = apiType;
    return this;
  }

  /**
   * 设置基础 URL
   */
  baseURL(baseURL: string): ProviderConfigBuilder {
    this.config.baseURL = baseURL;
    return this;
  }

  /**
   * 设置 API 密钥
   */
  apiKey(apiKey: string): ProviderConfigBuilder {
    this.config.apiKey = apiKey;
    return this;
  }

  /**
   * 设置端点策略
   */
  endpointStrategy(endpointStrategy: BaseEndpointStrategy): ProviderConfigBuilder {
    this.config.endpointStrategy = endpointStrategy;
    return this;
  }

  /**
   * 设置参数映射器
   */
  parameterMapper(parameterMapper: BaseParameterMapper): ProviderConfigBuilder {
    this.config.parameterMapper = parameterMapper;
    return this;
  }

  /**
   * 设置功能支持
   */
  featureSupport(featureSupport: FeatureSupport): ProviderConfigBuilder {
    this.config.featureSupport = featureSupport;
    return this;
  }

  /**
   * 设置默认模型
   */
  defaultModel(defaultModel: string): ProviderConfigBuilder {
    this.config.defaultModel = defaultModel;
    return this;
  }

  /**
   * 设置支持的模型列表
   */
  supportedModels(supportedModels: string[]): ProviderConfigBuilder {
    this.config.supportedModels = supportedModels;
    return this;
  }

  /**
   * 设置额外配置
   */
  extraConfig(extraConfig: Record<string, any>): ProviderConfigBuilder {
    this.config.extraConfig = extraConfig;
    return this;
  }

  /**
   * 设置超时时间
   */
  timeout(timeout: number): ProviderConfigBuilder {
    this.config.timeout = timeout;
    return this;
  }

  /**
   * 设置重试次数
   */
  retryCount(retryCount: number): ProviderConfigBuilder {
    this.config.retryCount = retryCount;
    return this;
  }

  /**
   * 设置重试延迟
   */
  retryDelay(retryDelay: number): ProviderConfigBuilder {
    this.config.retryDelay = retryDelay;
    return this;
  }

  /**
   * 构建提供商配置
   */
  build(): ProviderConfig {
    if (!this.config.name) {
      throw new ConfigurationError('Provider name is required');
    }
    if (!this.config.apiType) {
      throw new ConfigurationError('API type is required');
    }
    if (!this.config.baseURL) {
      throw new ConfigurationError('Base URL is required');
    }
    if (!this.config.apiKey) {
      throw new ConfigurationError('API key is required');
    }
    if (!this.config.endpointStrategy) {
      throw new ConfigurationError('Endpoint strategy is required');
    }
    if (!this.config.parameterMapper) {
      throw new ConfigurationError('Parameter mapper is required');
    }
    if (!this.config.featureSupport) {
      throw new ConfigurationError('Feature support is required');
    }

    return this.config as ProviderConfig;
  }
}
