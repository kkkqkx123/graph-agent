/**
 * REST工具执行器
 * 执行REST API调用，支持所有HTTP方法、拦截器、缓存、熔断器等
 */

import type { Tool } from '@modular-agent/types';
import type { RestToolConfig } from '@modular-agent/types';
import { NetworkError, ToolError, ValidationError, RuntimeValidationError, TimeoutError, CircuitBreakerOpenError } from '@modular-agent/types';
import { BaseExecutor } from '../core/base/BaseExecutor';
import { ExecutorType } from '../core/types';
import { HttpClient, InterceptorManager, HttpCache } from '@modular-agent/common-utils';
import type { RestExecutorConfig } from './types';

/**
 * REST工具执行器
 */
export class RestExecutor extends BaseExecutor {
  private httpClient: HttpClient;
  private interceptorManager: InterceptorManager;
  private cache: HttpCache;
  private config: RestExecutorConfig;

  constructor(config: RestExecutorConfig = {}) {
    super();
    this.config = config;

    // 创建 common-utils 的 HttpClient
    this.httpClient = new HttpClient({
      baseURL: config.baseUrl,
      defaultHeaders: config.headers,
      timeout: config.timeout,
      enableCircuitBreaker: config.enableCircuitBreaker,
      circuitBreakerFailureThreshold: config.circuitBreaker?.failureThreshold
    });

    // 创建拦截器管理器
    this.interceptorManager = new InterceptorManager();

    // 创建缓存
    this.cache = new HttpCache({
      enabled: config.cache?.enabled ?? true,
      defaultTtl: config.cache?.defaultTtl ?? 60000,
      maxSize: 100
    });

    // 添加拦截器
    if (config.requestInterceptors) {
      config.requestInterceptors.forEach(interceptor => {
        this.interceptorManager.addRequestInterceptor(interceptor);
      });
    }

    if (config.responseInterceptors) {
      config.responseInterceptors.forEach(interceptor => {
        this.interceptorManager.addResponseInterceptor(interceptor);
      });
    }

    if (config.errorInterceptors) {
      config.errorInterceptors.forEach(interceptor => {
        this.interceptorManager.addErrorInterceptor(interceptor);
      });
    }
  }

  /**
   * 执行REST工具的具体实现
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadContext 线程上下文（可选，REST工具不使用）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: any
  ): Promise<any> {
    // 从config中获取REST配置
    const toolConfig = tool.config as RestToolConfig;

    // 从parameters中获取请求参数
    const url = parameters['url'] || parameters['endpoint'];
    const method = (parameters['method'] || 'GET').toUpperCase();
    const body = parameters['body'];
    const headers = parameters['headers'];
    const queryParams = parameters['query'] || parameters['params'];

    if (!url) {
      throw new RuntimeValidationError(
        'URL is required for REST tool',
        {
          operation: 'execute',
          field: 'url',
          value: url,
          context: { toolName: tool.name, parameters }
        }
      );
    }

    try {
      // 构建请求配置
      const requestConfig = {
        url,
        method,
        headers,
        body,
        query: queryParams
      };

      // 应用请求拦截器
      const processedConfig = await this.interceptorManager.applyRequestInterceptors(requestConfig);

      // 检查缓存（仅GET请求）
      let response;
      if (method === 'GET') {
        const cached = this.cache.get(processedConfig);
        if (cached) {
          return this.formatResponse(toolConfig, url, method, cached);
        }
      }

      // 执行请求
      switch (method) {
        case 'GET':
          response = await this.httpClient.get(url, processedConfig);
          break;
        case 'POST':
          response = await this.httpClient.post(url, body, processedConfig);
          break;
        case 'PUT':
          response = await this.httpClient.put(url, body, processedConfig);
          break;
        case 'DELETE':
          response = await this.httpClient.delete(url, processedConfig);
          break;
        case 'PATCH':
          response = await this.httpClient.post(url, body, processedConfig);
          break;
        case 'HEAD':
          response = await this.httpClient.get(url, processedConfig);
          break;
        case 'OPTIONS':
          response = await this.httpClient.get(url, processedConfig);
          break;
        default:
          throw new RuntimeValidationError(
            `Unsupported HTTP method: ${method}`,
            {
              operation: 'execute',
              field: 'method',
              value: method,
              context: { toolName: tool.name }
            }
          );
      }

      // 应用响应拦截器
      const processedResponse = await this.interceptorManager.applyResponseInterceptors(response);

      // 缓存响应（仅GET请求的成功响应）
      if (method === 'GET' && response.status >= 200 && response.status < 300) {
        this.cache.set(processedConfig, processedResponse);
      }

      return this.formatResponse(toolConfig, url, method, processedResponse);
    } catch (error) {
      // 应用错误拦截器
      let processedError = error instanceof Error ? error : new Error(String(error));
      processedError = await this.interceptorManager.applyErrorInterceptors(processedError);

      // 转换错误类型
      if (processedError instanceof NetworkError || processedError instanceof ValidationError) {
        throw processedError;
      }

      if (processedError instanceof TimeoutError) {
        throw new ToolError(
          `REST tool execution timeout: ${processedError.message}`,
          tool.name,
          'REST',
          { url, method }
        );
      }

      if (processedError instanceof CircuitBreakerOpenError) {
        const circuitError = processedError as CircuitBreakerOpenError;
        throw new ToolError(
          `REST tool circuit breaker is open: ${circuitError.message}`,
          tool.name,
          'REST',
          { url, method },
          circuitError
        );
      }

      throw new ToolError(
        `REST tool execution failed: ${processedError.message}`,
        tool.name,
        'REST',
        { url, method },
        processedError
      );
    }
  }

  /**
   * 格式化响应
   */
  private formatResponse(toolConfig: RestToolConfig, url: string, method: string, response: any): any {
    return {
      url: this.buildFullUrl(toolConfig?.baseUrl || '', url),
      method,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      requestId: response.requestId
    };
  }

  /**
   * 构建完整URL
   */
  private buildFullUrl(baseUrl: string, url: string, queryParams?: Record<string, any>): string {
    // 合并base URL和endpoint
    let fullUrl = url;

    if (baseUrl && !url.startsWith('http://') && !url.startsWith('https://')) {
      // 移除baseUrl末尾的斜杠和url开头的斜杠
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const cleanUrl = url.replace(/^\//, '');
      fullUrl = `${cleanBaseUrl}/${cleanUrl}`;
    }

    // 添加查询参数
    if (queryParams && Object.keys(queryParams).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(queryParams)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString();

      fullUrl += `?${queryString}`;
    }

    return fullUrl;
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: any): void {
    this.interceptorManager.addRequestInterceptor(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: any): void {
    this.interceptorManager.addResponseInterceptor(interceptor);
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(interceptor: any): void {
    this.interceptorManager.addErrorInterceptor(interceptor);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除指定URL的缓存
   */
  clearCacheByUrl(url: string): void {
    this.cache.clearByUrl(url);
  }

  /**
   * 获取执行器类型
   */
  getExecutorType(): string {
    return ExecutorType.REST;
  }
}