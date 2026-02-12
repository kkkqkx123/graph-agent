/**
 * REST执行器类型定义
 */

// 从 @modular-agent/types/http 导入基础类型
import type { HTTPMethod, HttpResponse } from '@modular-agent/types/http';
// 从 @modular-agent/common-utils/http 导入拦截器和缓存类型
import type {
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  CacheConfig
} from '@modular-agent/common-utils/http';

// 重新导出 HTTPMethod 以保持向后兼容
export type { HTTPMethod };

/**
 * HTTP请求配置
 */
export interface HttpRequestConfig {
  /** 请求URL */
  url: string;
  /** HTTP方法 */
  method: HTTPMethod;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: any;
  /** 查询参数 */
  query?: Record<string, any>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 基础URL */
  baseUrl?: string;
}

// 重新导出类型以保持向后兼容
export type { HttpResponse, RequestInterceptor, ResponseInterceptor, ErrorInterceptor, CacheConfig };

/**
 * REST执行器配置
 */
export interface RestExecutorConfig {
  /** 基础URL */
  baseUrl?: string;
  /** 默认请求头 */
  headers?: Record<string, string>;
  /** 默认超时时间（毫秒） */
  timeout?: number;
  /** 请求拦截器 */
  requestInterceptors?: RequestInterceptor[];
  /** 响应拦截器 */
  responseInterceptors?: ResponseInterceptor[];
  /** 错误拦截器 */
  errorInterceptors?: ErrorInterceptor[];
  /** 缓存配置 */
  cache?: CacheConfig;
  /** 是否启用熔断器 */
  enableCircuitBreaker?: boolean;
  /** 熔断器配置 */
  circuitBreaker?: {
    /** 失败阈值 */
    failureThreshold: number;
    /** 重置超时（毫秒） */
    resetTimeout: number;
    /** 半开状态请求数 */
    halfOpenRequests: number;
  };
}