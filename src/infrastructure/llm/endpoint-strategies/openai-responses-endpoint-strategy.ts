import { BaseEndpointStrategy } from './base-endpoint-strategy';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../parameter-mappers/base-parameter-mapper';

/**
 * OpenAI Responses API 端点策略
 *
 * 专门用于 OpenAI Responses API (GPT-5) 的端点策略
 * 支持链式思考、改进的推理控制和更高效的参数组织
 *
 * 特性：
 * - 完全配置驱动的请求头构建
 * - 无硬编码模型限制
 * - 支持自定义端点路径
 * - 灵活的认证方式
 */
export class OpenAIResponsesEndpointStrategy extends BaseEndpointStrategy {
  constructor() {
    super('OpenAIResponsesEndpointStrategy', '1.0.0');
  }

  /**
   * 构建端点 URL
   *
   * 支持配置驱动的端点路径构建
   * 注意：baseURL 通常已包含版本号（如 v1），因此端点路径不应重复包含版本号
   */
  buildEndpoint(config: ProviderConfig, request: ProviderRequest): string {
    // 从配置中获取端点路径，如果未配置则使用默认路径
    // 注意：不包含 v1 前缀，因为 baseURL 通常已经包含
    const endpointPath = config.extraConfig?.['endpointPath'] || 'responses';

    // 支持自定义端点路径
    if (endpointPath.startsWith('/')) {
      // 如果是绝对路径，直接与 baseURL 组合
      return this.buildPath(config.baseURL, endpointPath.slice(1));
    } else {
      // 如果是相对路径，按段分割
      const pathSegments = endpointPath.split('/');
      return this.buildPath(config.baseURL, ...pathSegments);
    }
  }

  /**
   * 构建请求头
   *
   * 完全配置驱动的请求头构建，支持任意自定义头部
   */
  override buildHeaders(config: ProviderConfig): Record<string, string> {
    const headers = super.buildHeaders(config);

    // 从配置中获取默认请求头
    const defaultHeaders = config.extraConfig?.['defaultHeaders'] || {};

    // 合并默认请求头
    Object.assign(headers, defaultHeaders);

    // 如果配置中没有提供认证头，则使用默认的 Bearer token 认证
    if (!headers['Authorization'] && config.apiKey) {
      const authType = config.extraConfig?.['authType'] || 'Bearer';
      headers['Authorization'] = `${authType} ${config.apiKey}`;
    }

    // 添加 OpenAI Responses API 特定的 Beta 头（如果配置中没有覆盖）
    if (!headers['OpenAI-Beta'] && config.extraConfig?.['enableBeta'] !== false) {
      headers['OpenAI-Beta'] = config.extraConfig?.['betaVersion'] || 'responses=v1';
    }

    // 处理其他可选的 OpenAI 特定头部
    const optionalHeaders = [
      'api-version',
      'OpenAI-Organization',
      'OpenAI-Project',
      'OpenAI-User'
    ];

    optionalHeaders.forEach(headerName => {
      const configKey = headerName.replace('OpenAI-', '').toLowerCase();
      if (config.extraConfig?.[configKey] && !headers[headerName]) {
        headers[headerName] = config.extraConfig[configKey];
      }
    });

    return headers;
  }

  /**
   * 处理认证
   *
   * 支持配置驱动的认证处理
   */
  override handleAuthentication(request: any, config: ProviderConfig): any {
    // 如果配置中指定了自定义认证处理
    if (config.extraConfig?.['customAuth']) {
      const authConfig = config.extraConfig['customAuth'];

      // 支持在请求体中添加认证信息
      if (authConfig.type === 'body' && authConfig.field) {
        request = { ...request };
        request[authConfig.field] = config.apiKey;
      }

      // 支持查询参数认证
      if (authConfig.type === 'query' && authConfig.param) {
        // 注意：这里不直接修改 URL，而是标记需要在 HTTP 客户端层面处理
        request._authQuery = {
          param: authConfig.param,
          value: config.apiKey
        };
      }
    }

    return request;
  }

  /**
   * 验证配置
   *
   * 基本配置验证，不包含硬编码的模型或 URL 限制
   */
  override validateConfig(config: ProviderConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const result = super.validateConfig(config);

    // 验证自定义认证配置
    if (config.extraConfig?.['customAuth']) {
      const authConfig = config.extraConfig['customAuth'];
      if (!authConfig.type || !['header', 'body', 'query'].includes(authConfig.type)) {
        result.errors.push('Custom auth type must be one of: header, body, query');
      }

      if (authConfig.type === 'body' && !authConfig.field) {
        result.errors.push('Body auth requires a field name');
      }

      if (authConfig.type === 'query' && !authConfig.param) {
        result.errors.push('Query auth requires a parameter name');
      }
    }

    // 验证端点路径配置
    if (config.extraConfig?.['endpointPath'] && typeof config.extraConfig['endpointPath'] !== 'string') {
      result.errors.push('Endpoint path must be a string');
    }

    return {
      isValid: result.errors.length === 0,
      errors: result.errors
    };
  }

  /**
   * 获取默认配置建议
   *
   * @returns 默认配置建议
   */
  getDefaultConfig(): Record<string, any> {
    return {
      endpointPath: 'responses',  // 不包含 v1，因为 baseURL 通常已经包含
      authType: 'Bearer',
      enableBeta: true,
      betaVersion: 'responses=v1',
      defaultHeaders: {
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * 检查是否支持流式响应
   *
   * @returns 是否支持流式响应
   */
  supportsStreaming(): boolean {
    return true;
  }

  /**
   * 检查是否支持多模态输入
   *
   * @returns 是否支持多模态输入
   */
  supportsMultimodal(): boolean {
    return true;
  }

  /**
   * 检查是否支持工具调用
   *
   * @returns 是否支持工具调用
   */
  supportsTools(): boolean {
    return true;
  }

  /**
   * 检查是否支持链式思考
   *
   * @returns 是否支持链式思考
   */
  supportsChainOfThought(): boolean {
    return true;
  }
}