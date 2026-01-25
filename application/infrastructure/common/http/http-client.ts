/**
 * HTTP Client - 基于 fetch API 的 HTTP 客户端
 *
 * 替代 Axios，使用原生 fetch API
 * 集成 RetryHandler、CircuitBreaker、RateLimiter
 * 返回 APIPromise<T> 类型
 */

import { injectable, inject } from 'inversify';
import { RetryHandler } from './retry-handler';
import { CircuitBreaker } from './circuit-breaker';
import { RateLimiter } from './rate-limiter';
import { APIPromise, APIResponseProps } from './api-promise';
import { RequestOptions, FinalRequestOptions, HTTPMethod } from './http-request-options';
import { TYPES } from '../../../di/service-keys';
import { getConfig } from '../../config/config';
import {
  HTTPError,
  HTTPErrorFactory,
  ConnectionError,
  ConnectionTimeoutError,
  UserAbortError,
  CircuitBreakerOpenError,
  RateLimiterError,
} from './errors';

export type Fetch = typeof fetch;

@injectable()
export class HttpClient {
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private fetch: Fetch;
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;
  private logEnabled: boolean;

  constructor(
    @inject(TYPES.RetryHandler) retryHandler: RetryHandler,
    @inject(TYPES.CircuitBreaker) circuitBreaker: CircuitBreaker,
    @inject(TYPES.RateLimiter) rateLimiter: RateLimiter,
    options?: {
      fetch?: Fetch;
      baseURL?: string;
      defaultHeaders?: Record<string, string>;
      defaultTimeout?: number;
      logEnabled?: boolean;
    }
  ) {
    this.retryHandler = retryHandler;
    this.circuitBreaker = circuitBreaker;
    this.rateLimiter = rateLimiter;

    this.fetch = options?.fetch || globalThis.fetch;
    this.baseURL = options?.baseURL || '';
    this.defaultHeaders = options?.defaultHeaders || {
      'Content-Type': 'application/json',
      'User-Agent': getConfig().get('http.user_agent'),
    };
    this.defaultTimeout = options?.defaultTimeout || getConfig().get('http.timeout');
    this.logEnabled = options?.logEnabled ?? getConfig().get('http.log.enabled');
  }

  /**
   * GET 请求
   */
  get<T = any>(url: string, options?: RequestOptions): APIPromise<T> {
    return this.request<T>({ ...options, method: 'GET', url });
  }

  /**
   * POST 请求
   */
  post<T = any>(url: string, body?: any, options?: RequestOptions): APIPromise<T> {
    return this.request<T>({ ...options, method: 'POST', url, body });
  }

  /**
   * PUT 请求
   */
  put<T = any>(url: string, body?: any, options?: RequestOptions): APIPromise<T> {
    return this.request<T>({ ...options, method: 'PUT', url, body });
  }

  /**
   * PATCH 请求
   */
  patch<T = any>(url: string, body?: any, options?: RequestOptions): APIPromise<T> {
    return this.request<T>({ ...options, method: 'PATCH', url, body });
  }

  /**
   * DELETE 请求
   */
  delete<T = any>(url: string, options?: RequestOptions): APIPromise<T> {
    return this.request<T>({ ...options, method: 'DELETE', url });
  }

  /**
   * 通用请求方法
   */
  request<T = any>(options: RequestOptions): APIPromise<T> {
    const finalOptions = this.buildFinalOptions(options);

    const responsePromise = this.executeRequest<T>(finalOptions);

    return new APIPromise<T>(responsePromise);
  }

  /**
   * 构建最终请求选项
   */
  private buildFinalOptions(options: RequestOptions): FinalRequestOptions {
    const method = options.method || 'GET';
    const url = this.buildURL(options.url || '', options.query);
    const timeout = options.timeout || this.defaultTimeout;
    const retry = {
      maxRetries: options.retry?.maxRetries || 2,
      baseDelay: options.retry?.baseDelay || 500,
      maxDelay: options.retry?.maxDelay || 8000,
      backoffMultiplier: options.retry?.backoffMultiplier || 2,
    };

    return {
      method,
      url,
      headers: { ...this.defaultHeaders, ...options.headers },
      body: options.body,
      timeout,
      signal: options.signal,
      retry,
      idempotencyKey: options.idempotencyKey,
      stream: options.stream,
      query: options.query,
    };
  }

  /**
   * 构建 URL
   */
  private buildURL(url: string, query?: Record<string, string | number | boolean | undefined>): string {
    let fullURL = url;

    if (this.baseURL && !url.startsWith('http://') && !url.startsWith('https://')) {
      fullURL = this.baseURL + (this.baseURL.endsWith('/') && url.startsWith('/') ? url.slice(1) : url);
    }

    if (query && Object.keys(query).length > 0) {
      const queryString = Object.entries(query)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      fullURL += (fullURL.includes('?') ? '&' : '?') + queryString;
    }

    return fullURL;
  }

  /**
   * 执行请求（集成中间件）
   */
  private async executeRequest<T>(options: FinalRequestOptions): Promise<APIResponseProps<T>> {
    // 检查限流
    try {
      await this.rateLimiter.checkLimit();
    } catch (error) {
      throw new RateLimiterError('Rate limit exceeded');
    }

    // 检查熔断器
    if (this.circuitBreaker.isOpen()) {
      throw new CircuitBreakerOpenError('Circuit breaker is OPEN. Request blocked.');
    }

    try {
      // 通过熔断器执行请求
      const result = await this.circuitBreaker.execute(() =>
        this.retryHandler.executeWithRetry(() => this.makeRequest<T>(options))
      );

      // 记录成功
      this.circuitBreaker.recordSuccess();

      return result;
    } catch (error) {
      // 记录失败
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  /**
   * 发起实际的 HTTP 请求
   */
  private async makeRequest<T>(options: FinalRequestOptions): Promise<APIResponseProps<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // 构建请求头
    const headers = new Headers(options.headers);

    // 添加幂等性 key
    if (options.idempotencyKey && options.method !== 'GET') {
      headers.set('Idempotency-Key', options.idempotencyKey);
    }

    // 添加请求 ID
    headers.set('X-Request-ID', requestId);

    // 构建请求体
    let body: any;
    if (options.body) {
      if (typeof options.body === 'string' || options.body instanceof FormData || options.body instanceof URLSearchParams) {
        body = options.body;
      } else if (options.body instanceof ArrayBuffer || ArrayBuffer.isView(options.body)) {
        body = options.body;
      } else {
        body = JSON.stringify(options.body);
      }
    }

    // 记录请求日志
    if (this.logEnabled) {
      console.log(`HTTP Request: ${options.method} ${options.url}`, {
        headers: this.headersToObject(headers),
        body: options.body,
        requestId,
      });
    }

    // 创建 AbortController 用于超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    // 合并信号
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      // 发起请求
      const response = await this.fetch(options.url, {
        method: options.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      // 记录响应日志
      if (this.logEnabled) {
        console.log(`HTTP Response: ${response.status} ${options.url}`, {
          duration: `${duration}ms`,
          headers: this.headersToObject(response.headers),
          requestId,
        });
      }

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const responseRequestId = response.headers.get('x-request-id') || requestId;
        
        // 尝试解析错误响应
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error && errorJson.error.message) {
            errorMessage = errorJson.error.message;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          // 如果不是JSON，使用原始错误文本
          if (errorText && errorText !== 'Unknown error') {
            errorMessage = errorText;
          }
        }

        // 使用错误工厂创建对应的错误实例
        const httpError = HTTPErrorFactory.fromStatusCode(
          response.status,
          errorMessage,
          responseRequestId
        );
        
        throw httpError;
      }

      // 解析响应
      let data: T;
      if (options.stream) {
        // 流式响应
        data = response.body as any;
      } else {
        // 非流式响应
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = (await response.json()) as T;
        } else {
          data = await response.text() as any;
        }
      }

      return {
        response,
        data,
        requestId: response.headers.get('x-request-id') || requestId,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // 记录错误日志
      if (this.logEnabled) {
        console.error(`HTTP Error: ${options.url}`, {
          duration: `${duration}ms`,
          error: error instanceof Error ? error.message : String(error),
          requestId,
        });
      }

      // 如果已经是HTTPError，直接抛出
      if (error instanceof HTTPError) {
        throw error;
      }

      // 检查是否是用户中止
      if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw new UserAbortError('Request aborted by user');
      }

      // 检查是否是超时错误
      if (error instanceof Error && (
        error.name === 'AbortError' ||
        /timed? ?out/i.test(error.message)
      )) {
        throw new ConnectionTimeoutError('Connection timeout');
      }

      // 其他连接错误
      if (error instanceof Error) {
        throw new ConnectionError('Connection failed', error);
      }

      // 未知错误
      throw new ConnectionError('Unknown connection error');
    }
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 将 Headers 转换为对象
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * 设置默认请求头
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * 移除默认请求头
   */
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  /**
   * 设置基础 URL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  /**
   * 设置默认超时
   */
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
}