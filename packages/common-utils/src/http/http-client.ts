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
  CircuitBreakerOpenError,
  HttpError,
} from '../../types/errors';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundHttpError,
  ConflictError,
  UnprocessableEntityError,
  InternalServerError,
  ServiceUnavailableError,
  RateLimitError,
} from './errors';
import { executeWithRetry, type RetryConfig } from './retry-handler';
import { CircuitBreaker } from './circuit-breaker';
import { RateLimiter } from './rate-limiter';
import { mergeHeaders } from '../../utils/http/header-builder';
import { getPlatformHeaders } from '../../utils/http/platform-info';

/**
 * HTTP客户端
 */
export class HttpClient {
  private readonly config: HttpClientConfig;
  private readonly retryConfig: RetryConfig;
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
      logger: config.logger,
    };

    this.retryConfig = {
      maxRetries: this.config.maxRetries || 3,
      baseDelay: this.config.retryDelay || 1000,
    };

    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: this.config.circuitBreakerFailureThreshold || 5,
      });
    }

    if (this.config.enableRateLimiter) {
      this.rateLimiter = new RateLimiter({
        capacity: this.config.rateLimiterCapacity || 60,
        refillRate: this.config.rateLimiterRefillRate || 10,
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
      const result = await executeWithRetry(
        () => this.executeRequest<T>(options),
        this.retryConfig
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
   * 日志记录辅助方法
   */
  private log(level: keyof import('../../types/http').HttpLogger, msg: string, context?: any) {
    if (!this.config.logger?.[level]) return;
    this.config.logger[level]!(msg, context);
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
    const startTime = Date.now();

    this.log('info', `[HTTP] ${method} ${url} starting`);

    // 使用新的 mergeHeaders 工具，添加平台诊断头
    const headers = mergeHeaders(
      this.config.defaultHeaders || {},
      getPlatformHeaders(),
      options.headers || {}
    );

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
      const duration = Date.now() - startTime;

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        this.log('warn',
          `[HTTP] ${method} ${url} failed with ${response.status} in ${duration}ms`,
          { status: response.status, error: errorText }
        );
        throw this.createHttpError(response.status, errorText, options.url);
      }

      this.log('debug',
        `[HTTP] ${method} ${url} succeeded in ${duration}ms`,
        { status: response.status }
      );

      // 如果请求指定了流式响应，返回流而不是解析数据
      if (options.stream) {
        return {
          data: response.body as T, // 返回响应流
          status: response.status,
          headers: this.headersToObject(response.headers),
          requestId: response.headers.get('x-request-id') || undefined,
        };
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
      const duration = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        this.log('error',
          `[HTTP] ${method} ${url} timeout after ${duration}ms`,
          { timeout }
        );
        throw new TimeoutError(
          `Request timeout after ${timeout}ms`,
          timeout || 30000,
          { url: options.url }
        );
      }

      this.log('error',
        `[HTTP] ${method} ${url} error after ${duration}ms`,
        { error: String(error) }
      );
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
    const context = { url, status };

    switch (status) {
      case 400:
        return new BadRequestError(`Bad request: ${message}`, context);

      case 401:
        return new UnauthorizedError(`Unauthorized: ${message}`, context);

      case 403:
        return new ForbiddenError(`Forbidden: ${message}`, context);

      case 404:
        return new NotFoundHttpError(`Not found: ${message}`, url || '', context);

      case 409:
        return new ConflictError(`Conflict: ${message}`, context);

      case 422:
        return new UnprocessableEntityError(`Unprocessable entity: ${message}`, context);

      case 429:
        return new RateLimitError(
          `Rate limit exceeded: ${message}`,
          undefined,
          context
        );

      case 500:
        return new InternalServerError(`Internal server error: ${message}`, context);

      case 503:
        return new ServiceUnavailableError(`Service unavailable: ${message}`, context);

      default:
        return new HttpError(
          `HTTP ${status}: ${message}`,
          status,
          context
        );
    }
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