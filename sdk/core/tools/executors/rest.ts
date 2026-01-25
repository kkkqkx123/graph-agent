/**
 * REST API工具执行器
 * 执行REST API调用
 */

import type { Tool } from '../../../types/tool';
import { BaseToolExecutor } from '../executor-base';
import { NetworkError, RateLimitError } from '../../../types/errors';

/**
 * REST工具执行器
 */
export class RestToolExecutor extends BaseToolExecutor {
  /**
   * 执行REST工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>
  ): Promise<any> {
    // 从metadata中获取REST配置
    const baseUrl = tool.metadata?.customFields?.['baseUrl'] || '';
    const defaultHeaders = tool.metadata?.customFields?.['headers'] || {};

    // 从parameters中获取请求参数
    const url = parameters['url'] || parameters['endpoint'];
    const method = (parameters['method'] || 'GET').toUpperCase();
    const body = parameters['body'];
    const headers = { ...defaultHeaders, ...parameters['headers'] };
    const queryParams = parameters['query'] || parameters['params'];

    if (!url) {
      throw new Error('URL is required for REST tool');
    }

    // 构建完整URL
    const fullUrl = this.buildUrl(baseUrl, url, queryParams);

    try {
      // 构建请求选项
      const options: RequestInit = {
        method,
        headers: this.buildHeaders(headers)
      };

      // 添加请求体（仅对非GET/HEAD请求）
      if (body && method !== 'GET' && method !== 'HEAD') {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // 发送HTTP请求
      const response = await fetch(fullUrl, options);

      // 处理速率限制
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(
          'Rate limit exceeded',
          retryAfter ? parseInt(retryAfter) * 1000 : undefined
        );
      }

      // 处理HTTP错误
      if (!response.ok) {
        throw new NetworkError(
          `HTTP request failed with status ${response.status}: ${response.statusText}`,
          response.status,
          { url: fullUrl }
        );
      }

      // 解析响应
      const contentType = response.headers.get('content-type');
      let result: any;

      if (contentType?.includes('application/json')) {
        result = await response.json();
      } else if (contentType?.includes('text/')) {
        result = await response.text();
      } else {
        result = await response.blob();
      }

      return {
        url: fullUrl,
        method,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        data: result
      };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof RateLimitError) {
        throw error;
      }

      // 处理网络错误
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ENOTFOUND')) {
          throw new NetworkError(
            `Network error: ${error.message}`,
            undefined,
            { url: fullUrl },
            error
          );
        }
      }

      throw new Error(
        `REST tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 构建完整URL
   */
  private buildUrl(baseUrl: string, url: string, queryParams?: Record<string, any>): string {
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
   * 构建请求头
   */
  private buildHeaders(headers: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }

    // 默认添加Content-Type（如果没有设置）
    if (!result['Content-Type'] && !result['content-type']) {
      result['Content-Type'] = 'application/json';
    }

    return result;
  }

  /**
   * 解析响应头
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};

    headers.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }
}