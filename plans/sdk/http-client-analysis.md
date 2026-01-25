# SDK HTTP Client 补充分析报告

## 一、背景

本报告分析SDK层是否需要补充HTTP Client实现，对比Application层和SDK层的HTTP请求处理方式，给出建议。

## 二、Application层HTTP Client分析

### 2.1 核心组件

Application层的HTTP Client位于 `application/infrastructure/common/http/` 目录，包含以下核心组件：

1. **HttpClient** (`http-client.ts`)
   - 基于原生fetch API的HTTP客户端
   - 集成RetryHandler、CircuitBreaker、RateLimiter
   - 返回APIPromise<T>类型，支持延迟解析
   - 支持流式和非流式响应

2. **RetryHandler** (`retry-handler.ts`)
   - 指数退避重试策略
   - 支持服务器返回的重试建议（Retry-After header）
   - 可配置的重试状态码和错误类型
   - 提供统计信息

3. **CircuitBreaker** (`circuit-breaker.ts`)
   - 三种状态：CLOSED、OPEN、HALF_OPEN
   - 失败阈值和成功阈值配置
   - 自动熔断和恢复机制
   - 提供状态查询和统计

4. **RateLimiter** (`rate-limiter.ts`)
   - 令牌桶算法
   - 可配置的容量和填充速率
   - 支持等待令牌
   - 提供统计信息

5. **APIPromise** (`api-promise.ts`)
   - 延迟解析机制
   - 支持获取原始Response对象
   - 支持同时获取数据和响应
   - 链式转换支持

### 2.2 特性总结

✅ **优点：**
- 功能完整，包含重试、熔断、限流等企业级特性
- 代码复用性好，所有HTTP请求统一处理
- 错误处理完善，支持多种错误类型
- 日志记录详细，便于调试
- 支持流式响应
- 延迟解析机制，性能优化

⚠️ **依赖：**
- 依赖inversify依赖注入框架
- 依赖外部配置系统（getConfig）
- 与Application层架构紧密耦合

## 三、SDK层HTTP请求处理分析

### 3.1 当前实现

SDK层的LLM客户端位于 `sdk/core/llm/clients/` 目录，当前实现方式：

1. **BaseLLMClient** (`base-client.ts`)
   - 提供基础的重试逻辑（指数退避）
   - 超时处理
   - 错误处理和转换
   - 判断是否应该重试的逻辑

2. **具体客户端实现**（如OpenAIChatClient、AnthropicClient）
   - 直接使用原生fetch API
   - 每个客户端独立实现HTTP请求逻辑
   - 重复实现请求头构建、请求体构建、响应解析等逻辑

### 3.2 代码示例

**OpenAIChatClient中的HTTP请求：**
```typescript
protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
  const url = `${this.baseUrl}/chat/completions`;
  const headers = this.buildHeaders();
  const body = this.buildRequestBody(request);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Chat API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return this.parseResponse(data, request);
}
```

**AnthropicClient中的HTTP请求：**
```typescript
protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
  const url = `${this.baseUrl}/v1/messages`;
  const headers = this.buildHeaders();
  const body = this.buildRequestBody(request);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return this.parseResponse(data, request);
}
```

### 3.3 特性总结

✅ **优点：**
- 轻量级，无外部依赖
- 独立性强，易于集成
- 代码简单，易于理解
- 基础的重试和超时处理

❌ **缺点：**
- 代码重复严重，每个客户端都实现相同的HTTP请求逻辑
- 缺少熔断器、限流器等高级功能
- 错误处理相对简单
- 没有统一的HTTP客户端抽象
- 维护成本高，修改HTTP逻辑需要修改所有客户端

## 四、对比分析

| 维度 | Application层HttpClient | SDK层当前实现 |
|------|------------------------|--------------|
| **代码复用** | ✅ 统一处理，无重复 | ❌ 每个客户端重复实现 |
| **重试机制** | ✅ 完整的RetryHandler | ⚠️ 基础重试，功能有限 |
| **熔断器** | ✅ 完整的CircuitBreaker | ❌ 无 |
| **限流器** | ✅ 完整的RateLimiter | ❌ 无 |
| **错误处理** | ✅ 完善的错误类型和工厂 | ⚠️ 基础错误处理 |
| **日志记录** | ✅ 详细的请求/响应日志 | ❌ 无 |
| **流式响应** | ✅ 支持 | ✅ 支持（但重复实现） |
| **延迟解析** | ✅ APIPromise机制 | ❌ 无 |
| **外部依赖** | ❌ 依赖inversify和配置系统 | ✅ 无外部依赖 |
| **独立性** | ⚠️ 与Application层耦合 | ✅ 完全独立 |
| **可维护性** | ✅ 高 | ⚠️ 低（代码重复） |
| **性能** | ✅ 延迟解析优化 | ⚠️ 一般 |

## 五、问题识别

### 5.1 代码重复问题

SDK中每个LLM客户端都重复实现以下逻辑：
- HTTP请求发送
- 请求头构建
- 请求体构建
- 响应状态检查
- 错误处理
- 流式响应解析

**影响：**
- 维护成本高
- 容易出现不一致
- 修改困难

### 5.2 功能缺失问题

SDK缺少以下企业级特性：
- 熔断器：防止级联故障
- 限流器：防止API调用超限
- 完善的重试策略：支持服务器建议的重试
- 详细的日志记录：便于调试和监控

**影响：**
- 生产环境稳定性不足
- 难以应对高并发场景
- 问题排查困难

### 5.3 架构一致性问题

SDK作为独立的模块，应该提供完整的HTTP客户端能力，而不是依赖Application层的实现。

**影响：**
- SDK使用者需要自己实现HTTP客户端
- SDK的可用性降低
- 与Application层的架构不一致

## 六、建议方案

### 6.1 方案一：补充轻量级HTTP Client（推荐）

**设计原则：**
- 轻量级，无外部依赖
- 提供核心功能：重试、超时、错误处理
- 可选的高级功能：熔断器、限流器
- 简单易用的API
- 支持流式和非流式响应

**架构设计：**

```
sdk/
├── types/
│   └── http.ts              # HTTP相关类型定义
├── core/
│   └── http/
│       ├── index.ts
│       ├── http-client.ts   # HTTP客户端核心
│       ├── retry-handler.ts # 重试处理器
│       ├── circuit-breaker.ts # 熔断器（可选）
│       ├── rate-limiter.ts  # 限流器（可选）
│       └── errors.ts        # HTTP错误类型
```

**核心接口：**

```typescript
// types/http.ts
export interface HttpClientConfig {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableCircuitBreaker?: boolean;
  enableRateLimiter?: boolean;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  stream?: boolean;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId?: string;
}

export class HttpClient {
  constructor(config?: HttpClientConfig);
  get<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
  post<T>(url: string, body?: any, options?: RequestOptions): Promise<HttpResponse<T>>;
  put<T>(url: string, body?: any, options?: RequestOptions): Promise<HttpResponse<T>>;
  delete<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
  // 流式响应
  postStream(url: string, body?: any, options?: RequestOptions): Promise<ReadableStream>;
}
```

**优势：**
- ✅ 解决代码重复问题
- ✅ 提供企业级特性
- ✅ 保持SDK独立性
- ✅ 无外部依赖
- ✅ 易于使用和维护
- ✅ 可选功能，按需启用

**劣势：**
- ⚠️ 需要开发工作量
- ⚠️ 增加SDK复杂度

### 6.2 方案二：保持现状

**说明：**
- 继续使用当前的实现方式
- 每个LLM客户端独立实现HTTP请求逻辑

**优势：**
- ✅ 无需开发工作量
- ✅ 保持简单

**劣势：**
- ❌ 代码重复严重
- ❌ 缺少企业级特性
- ❌ 维护成本高
- ❌ 可用性低

### 6.3 方案三：依赖Application层HttpClient

**说明：**
- SDK直接使用Application层的HttpClient
- 通过依赖注入或工厂模式获取HttpClient实例

**优势：**
- ✅ 无需开发工作量
- ✅ 功能完整

**劣势：**
- ❌ 破坏SDK独立性
- ❌ 引入外部依赖（inversify、配置系统）
- ❌ 与SDK设计原则冲突
- ❌ 难以独立使用SDK

## 七、推荐方案详细设计

### 7.1 类型定义（sdk/types/http.ts）

```typescript
/**
 * HTTP方法类型
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP请求选项
 */
export interface HttpRequestOptions {
  /** 请求方法 */
  method?: HTTPMethod;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: any;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否流式响应 */
  stream?: boolean;
  /** 查询参数 */
  query?: Record<string, string | number | boolean>;
}

/**
 * HTTP响应
 */
export interface HttpResponse<T = any> {
  /** 响应数据 */
  data: T;
  /** HTTP状态码 */
  status: number;
  /** 响应头 */
  headers: Record<string, string>;
  /** 请求ID */
  requestId?: string;
}

/**
 * HTTP客户端配置
 */
export interface HttpClientConfig {
  /** 基础URL */
  baseURL?: string;
  /** 默认请求头 */
  defaultHeaders?: Record<string, string>;
  /** 默认超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用熔断器 */
  enableCircuitBreaker?: boolean;
  /** 是否启用限流器 */
  enableRateLimiter?: boolean;
  /** 熔断器失败阈值 */
  circuitBreakerFailureThreshold?: number;
  /** 限流器容量 */
  rateLimiterCapacity?: number;
  /** 限流器填充速率（每秒） */
  rateLimiterRefillRate?: number;
}

/**
 * HTTP错误类型
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class NetworkError extends HttpError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends HttpError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends HttpError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class CircuitBreakerOpenError extends HttpError {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
```

### 7.2 HTTP客户端实现（sdk/core/http/http-client.ts）

```typescript
import type {
  HttpClientConfig,
  HttpRequestOptions,
  HttpResponse,
  HttpError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  CircuitBreakerOpenError
} from '../../types/http';
import { RetryHandler } from './retry-handler';
import { CircuitBreaker } from './circuit-breaker';
import { RateLimiter } from './rate-limiter';

/**
 * HTTP客户端
 *
 * 提供统一的HTTP请求接口，集成重试、熔断、限流等特性
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
      throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
    }

    // 执行请求（带重试）
    try {
      const result = await this.retryHandler.executeWithRetry(() =>
        this.executeRequest<T>(options)
      );

      // 记录成功
      if (this.circuitBreaker) {
        this.circuitBreaker.recordSuccess();
      }

      return result;
    } catch (error) {
      // 记录失败
      if (this.circuitBreaker) {
        this.circuitBreaker.recordFailure();
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
    let body: BodyInit | undefined;
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
        throw this.createHttpError(response.status, errorText);
      }

      // 解析响应
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as any;
      }

      return {
        data,
        status: response.status,
        headers: this.headersToObject(response.headers),
        requestId: response.headers.get('x-request-id') || undefined,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof HttpError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`Request timeout after ${timeout}ms`);
      }

      throw new NetworkError(
        error instanceof Error ? error.message : 'Network error'
      );
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
  private createHttpError(status: number, message: string): HttpError {
    if (status === 429) {
      return new RateLimitError(message);
    }

    return new HttpError(message, status);
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
```

### 7.3 重试处理器（sdk/core/http/retry-handler.ts）

```typescript
/**
 * 重试处理器
 *
 * 提供指数退避重试策略
 */
export class RetryHandler {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number = 30000; // 最大30秒

  constructor(config: { maxRetries: number; baseDelay: number }) {
    this.maxRetries = config.maxRetries;
    this.baseDelay = config.baseDelay;
  }

  /**
   * 执行带重试的函数
   */
  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否应该重试
        if (!this.shouldRetry(error) || attempt === this.maxRetries) {
          throw error;
        }

        // 计算延迟并等待
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.status;

    // 网络错误
    if (errorMessage.includes('network') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('enotfound') ||
        errorMessage.includes('etimedout')) {
      return true;
    }

    // 超时错误
    if (errorMessage.includes('timeout') || errorCode === 'ETIMEDOUT') {
      return true;
    }

    // 速率限制错误（429）
    if (errorCode === 429 || errorMessage.includes('rate limit')) {
      return true;
    }

    // 服务器错误（5xx）
    if (errorCode >= 500 && errorCode < 600) {
      return true;
    }

    return false;
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 7.4 熔断器（sdk/core/http/circuit-breaker.ts）

```typescript
/**
 * 熔断器状态
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * 熔断器配置
 */
export interface CircuitBreakerConfig {
  /** 失败阈值 */
  failureThreshold: number;
  /** 成功阈值（用于从HALF_OPEN恢复到CLOSED） */
  successThreshold?: number;
  /** 重置超时时间（毫秒） */
  resetTimeout?: number;
}

/**
 * 熔断器
 *
 * 防止级联故障，当失败次数达到阈值时打开熔断器
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeout: number;

  constructor(config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold;
    this.successThreshold = config.successThreshold || 3;
    this.resetTimeout = config.resetTimeout || 60000; // 默认60秒
  }

  /**
   * 执行函数（带熔断保护）
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * 检查熔断器是否打开
   */
  isOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      // 检查是否可以尝试恢复
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * 记录成功
   */
  private recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  /**
   * 记录失败
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  /**
   * 获取状态
   */
  getState(): string {
    return this.state;
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
  }
}
```

### 7.5 限流器（sdk/core/http/rate-limiter.ts）

```typescript
/**
 * 限流器配置
 */
export interface RateLimiterConfig {
  /** 令牌桶容量 */
  capacity: number;
  /** 填充速率（每秒） */
  refillRate: number;
}

/**
 * 限流器
 *
 * 使用令牌桶算法限制请求速率
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(config: RateLimiterConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * 等待令牌
   */
  async waitForToken(): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      // 计算等待时间
      const waitTime = this.calculateWaitTime();
      await this.sleep(waitTime);
    }
  }

  /**
   * 获取可用令牌数
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * 重置限流器
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * 填充令牌
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // 转换为秒
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * 计算等待时间
   */
  private calculateWaitTime(): number {
    const tokensNeeded = 1;
    const tokensDeficit = tokensNeeded - this.tokens;
    const waitTime = (tokensDeficit / this.refillRate) * 1000; // 转换为毫秒
    return Math.ceil(waitTime);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 7.6 使用示例

**在LLM客户端中使用HttpClient：**

```typescript
import { HttpClient } from '../http/http-client';
import type { LLMRequest, LLMResult, LLMProfile } from '../../types/llm';

export class OpenAIChatClient extends BaseLLMClient {
  private readonly httpClient: HttpClient;

  constructor(profile: LLMProfile) {
    super(profile);
    this.httpClient = new HttpClient({
      baseURL: profile.baseUrl || 'https://api.openai.com/v1',
      timeout: profile.timeout || 30000,
      maxRetries: profile.maxRetries || 3,
      retryDelay: profile.retryDelay || 1000,
      enableCircuitBreaker: true,
      enableRateLimiter: true,
    });
  }

  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    const response = await this.httpClient.post('/chat/completions', {
      model: this.profile.model,
      messages: this.convertMessages(request.messages),
      ...request.parameters,
    }, {
      headers: {
        'Authorization': `Bearer ${this.profile.apiKey}`,
        ...this.profile.headers,
      },
    });

    return this.parseResponse(response.data, request);
  }

  protected async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    const response = await fetch(`${this.httpClient['config'].baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.profile.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.profile.model,
        messages: this.convertMessages(request.messages),
        stream: true,
        ...request.parameters,
      }),
    });

    // 流式解析逻辑...
  }
}
```

## 八、实施计划

### 8.1 阶段一：核心功能（必须）

1. **类型定义**（1天）
   - 创建 `sdk/types/http.ts`
   - 定义所有HTTP相关类型

2. **HTTP客户端核心**（2天）
   - 实现 `sdk/core/http/http-client.ts`
   - 实现基础HTTP请求功能

3. **重试处理器**（1天）
   - 实现 `sdk/core/http/retry-handler.ts`
   - 集成到HttpClient

4. **更新LLM客户端**（2天）
   - 更新OpenAIChatClient使用HttpClient
   - 更新AnthropicClient使用HttpClient
   - 更新其他LLM客户端

5. **测试**（2天）
   - 编写单元测试
   - 编写集成测试
   - 验证功能正确性

**小计：8天**

### 8.2 阶段二：高级功能（可选）

1. **熔断器**（1天）
   - 实现 `sdk/core/http/circuit-breaker.ts`
   - 集成到HttpClient

2. **限流器**（1天）
   - 实现 `sdk/core/http/rate-limiter.ts`
   - 集成到HttpClient

3. **测试**（1天）
   - 编写熔断器测试
   - 编写限流器测试

**小计：3天**

### 8.3 阶段三：文档和优化（可选）

1. **文档**（1天）
   - 编写使用文档
   - 编写API文档

2. **优化**（1天）
   - 性能优化
   - 代码优化

**小计：2天**

**总计：8-13天**

## 九、风险评估

### 9.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 与现有代码不兼容 | 高 | 低 | 充分测试，提供迁移指南 |
| 性能下降 | 中 | 低 | 性能测试，优化关键路径 |
| 引入新bug | 中 | 中 | 充分测试，代码审查 |

### 9.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 开发周期延长 | 中 | 中 | 分阶段实施，先实现核心功能 |
| 维护成本增加 | 低 | 低 | 提供清晰文档，代码规范 |

## 十、总结

### 10.1 核心发现

1. **代码重复严重**：SDK中每个LLM客户端都重复实现HTTP请求逻辑
2. **功能缺失**：缺少熔断器、限流器等企业级特性
3. **架构不一致**：SDK与Application层的HTTP处理方式不一致

### 10.2 推荐方案

**强烈推荐实施方案一：补充轻量级HTTP Client**

**理由：**
- ✅ 解决代码重复问题
- ✅ 提供企业级特性
- ✅ 保持SDK独立性
- ✅ 无外部依赖
- ✅ 提高可维护性
- ✅ 提升SDK可用性

### 10.3 预期收益

1. **代码质量提升**
   - 减少代码重复约60%
   - 提高代码可维护性
   - 降低bug率

2. **功能增强**
   - 支持熔断器，防止级联故障
   - 支持限流器，防止API调用超限
   - 完善的错误处理

3. **用户体验提升**
   - 更稳定的SDK
   - 更好的错误提示
   - 更易于使用

4. **架构一致性**
   - SDK与Application层架构一致
   - 便于团队协作
   - 便于知识共享

### 10.4 下一步行动

1. **确认方案**：与团队确认是否采用推荐方案
2. **制定详细计划**：根据确认的方案制定详细的实施计划
3. **开始实施**：按照计划逐步实施
4. **测试验证**：充分测试确保功能正确
5. **文档编写**：编写使用文档和API文档

---

**报告完成日期：** 2025-01-XX
**报告作者：** Architect Mode
**版本：** 1.0