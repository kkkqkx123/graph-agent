/**
 * REST API工具执行器
 * 执行REST API调用
 */

import type { Tool } from '@modular-agent/types/tool';
import type { RestToolConfig } from '@modular-agent/types/tool';
import type { ThreadContext } from '@modular-agent/types/common';
import { NetworkError, ToolError, ValidationError, TimeoutError, CircuitBreakerOpenError } from '@modular-agent/types/errors';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundHttpError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
} from '@modular-agent/common-utils/http/errors';
import { HttpTransport } from '@modular-agent/common-utils/http/transport';
import type { IToolExecutor } from '@modular-agent/types/tool';

/**
 * REST工具执行器
 */
export class RestExecutor implements IToolExecutor {
  /**
   * 执行REST工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadContext 线程上下文（可选，REST工具不使用）
   * @returns 执行结果
   */
  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    options?: any,
    threadContext?: ThreadContext
  ): Promise<any> {
    // 从config中获取REST配置
    const config = tool.config as RestToolConfig;

    // 从parameters中获取请求参数
    const url = parameters['url'] || parameters['endpoint'];
    const method = (parameters['method'] || 'GET').toUpperCase();
    const body = parameters['body'];
    const headers = parameters['headers'];
    const queryParams = parameters['query'] || parameters['params'];

    if (!url) {
      throw new ValidationError(
        'URL is required for REST tool',
        'url',
        url,
        { toolName: tool.name, parameters }
      );
    }

    // 创建HttpTransport实例
    const transport = new HttpTransport(
      config?.baseUrl,
      config?.headers,
      config?.timeout
    );

    try {
      // 根据HTTP方法准备请求
      // 简化处理，实际实现中可能需要更复杂的HTTP方法支持
      const requestOptions = {
        headers,
        query: queryParams,
        // 对于非GET请求，body需要特殊处理，这里简化为仅支持GET
      };

      // 执行请求
      const response = await transport.execute(url, requestOptions);

      // 转换响应格式以匹配RestToolExecutor的原始格式
      return {
        url: this.buildFullUrl(config?.baseUrl || '', url, queryParams),
        method,
        status: response.status,
        statusText: this.getStatusText(response.status || 200),
        headers: response.headers,
        data: response.data
      };
    } catch (error) {
      // 转换错误类型
      if (error instanceof NetworkError || error instanceof ValidationError) {
        throw error;
      }

      // HTTP 错误类型处理
      if (error instanceof BadRequestError ||
          error instanceof UnauthorizedError ||
          error instanceof ForbiddenError ||
          error instanceof NotFoundHttpError ||
          error instanceof ConflictError ||
          error instanceof UnprocessableEntityError ||
          error instanceof RateLimitError ||
          error instanceof InternalServerError ||
          error instanceof ServiceUnavailableError) {
        throw error;
      }

      if (error instanceof TimeoutError) {
        throw new ToolError(
          `REST tool execution timeout: ${error.message}`,
          tool.name,
          'REST',
          { url, method }
        );
      }

      if (error instanceof CircuitBreakerOpenError) {
        throw new ToolError(
          `REST tool circuit breaker is open: ${error.message}`,
          tool.name,
          'REST',
          { url, method },
          error
        );
      }

      throw new ToolError(
        `REST tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tool.name,
        'REST',
        { url, method },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 构建完整URL（用于响应中的url字段）
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
   * 根据状态码获取状态文本
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return statusTexts[status] || '';
  }
}