/**
 * HTTP类型定义
 * 定义HTTP客户端所需的所有类型和接口
 */

/**
 * HTTP方法类型
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP请求选项
 */
export interface HttpRequestOptions {
  /** 请求URL */
  url?: string;
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