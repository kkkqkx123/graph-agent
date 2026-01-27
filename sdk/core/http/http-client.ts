/**
 * HTTP客户端
 *
 * 提供统一的HTTP请求接口，集成重试、熔断、限流等特性
 */

import type {
  HttpClientConfig,
  HttpRequestOptions,
  HttpResponse,
} from '../../types/http';
import {
  NetworkError,
  TimeoutError,
  RateLimitError,
  CircuitBreakerOpenError,
  HttpError,
} from '../../types/errors';
import { RetryHandler } from './retry-handler';
import { CircuitBreaker } from './circuit-breaker';
import { RateLimiter } from './rate-limiter';

/**
 * HTTP客户端
 */
export class HttpClient {
  private readonly config: Required<HttpClientConfig>;
  private readonly retryHandler: RetryHandler;
  private readonly circuitBreaker?: CircuitBreaker;
  private readonly rateLimiter?: RateLimiter;

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      defaultHeaders: config.defaultHeaders || {
        'Content-Type': 'application/json',
      },
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      enableCircuitBreaker: config.enableCircuitBreaker || false,
      enableRateLimiter: config.enableRateLimiter || false,
      circuitBreakerFailureThreshold: config.circuitBreakerFailureThreshold || 5,
      rateLimiterCapacity: config.rateLimiterCapacity || 60,
      rateLimiterRefillRate: config.rateLimiterRefillRate || 10,
    };

    this.retryHandler = new RetryHandler({
      maxRetries: this.config.maxRetries,
      baseDelay: this.config.retryDelay,
    });

    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: this.config.circuitBreakerFailureThreshold,
      });
    }

    if (this.config.enableRateLimiter) {
      this.rateLimiter = new RateLimiter({
        capacity: this.config.rateLimiterCapacity,
        refillRate: this.config.rateLimiterRefillRate,
      });
    }
  }

  /**
   * GET请求
   */
  async get<T = any>(
    url: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'GET', url });
  }

  /**
   * POST请求
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'POST', url, body });
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'PUT', url, body });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    url: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'DELETE', url });
  }

  /**
   * 通用请求方法
   */
  private async request<T = any>(
    options: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    // 检查限流
    if (this.rateLimiter) {
      await this.rateLimiter.waitForToken();
    }

    // 检查熔断器
    if (this.circuitBreaker && this.circuitBreaker.isOpen()) {
      throw new CircuitBreakerOpenError(
        'Circuit breaker is OPEN',
        this.circuitBreaker.getState()
      );
    }

    // 执行请求（带重试）
    try {
      const result = await this.retryHandler.executeWithRetry(() =>
        this.executeRequest<T>(options)
      );

      // 记录成功
      if (this.circuitBreaker) {
        this.circuitBreaker.execute(async () => result);
      }

      return result;
    } catch (error) {
      // 记录失败
      if (this.circuitBreaker) {
        try {
          await this.circuitBreaker.execute(async () => {
            throw error;
          });
        } catch {
          // 忽略熔断器的错误
        }
      }
      
      throw error;
    }
  }

  /**
   * 执行实际的HTTP请求
   */
  private async executeRequest<T = any>(
    options: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const url = this.buildURL(options.url || '', options.query);
    const method = options.method || 'GET';
    const timeout = options.timeout || this.config.timeout;
    const headers = { ...this.config.defaultHeaders, ...options.headers };

    // 构建请求体
    let body: string | undefined;
    if (options.body !== undefined) {
      if (typeof options.body === 'string') {
        body = options.body;
      } else {
        body = JSON.stringify(options.body);
      }
    }

    // 创建AbortController用于超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw this.createHttpError(response.status, errorText, options.url);
      }

      // 解析响应
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as T;
      }

      return {
        data,
        status: response.status,
        headers: this.headersToObject(response.headers),
        requestId: response.headers.get('x-request-id') || undefined,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(
          `Request timeout after ${timeout}ms`,
          timeout,
          { url: options.url }
        );
      }

      throw error;
    }
  }

  /**
   * 构建完整URL
   */
  private buildURL(
    url: string,
    query?: Record<string, string | number | boolean>
  ): string {
    let fullURL = url;

    if (this.config.baseURL && !url.startsWith('http')) {
      fullURL = this.config.baseURL + url;
    }

    if (query && Object.keys(query).length > 0) {
      const queryString = Object.entries(query)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');
      fullURL += (fullURL.includes('?') ? '&' : '?') + queryString;
    }

    return fullURL;
  }

  /**
   * 创建HTTP错误
   */
  private createHttpError(status: number, message: string, url?: string): Error {
    if (status === 429) {
      return new RateLimitError(
        `Rate limit exceeded: ${message}`,
        undefined,
        { url, status }
      );
    }

    // 使用HttpError精确区分HTTP状态码
    return new HttpError(
      `HTTP ${status}: ${message}`,
      status,
      { url, status }
    );
  }

  /**
   * 将Headers转换为对象
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
}