/**
 * HTTP 请求选项接口
 */

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 基础延迟（毫秒） */
  baseDelay?: number;
  /** 最大延迟（毫秒） */
  maxDelay?: number;
  /** 退避乘数 */
  backoffMultiplier?: number;
}

export interface RequestOptions {
  /** HTTP 方法 */
  method?: HTTPMethod;
  /** 请求 URL */
  url?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: BodyInit | null;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 中止信号 */
  signal?: AbortSignal;
  /** 重试配置 */
  retry?: RetryOptions;
  /** 是否启用幂等性（自动添加 Idempotency-Key） */
  idempotencyKey?: string;
  /** 是否流式响应 */
  stream?: boolean;
  /** 查询参数 */
  query?: Record<string, string | number | boolean | undefined>;
}

export interface FinalRequestOptions extends RequestOptions {
  /** HTTP 方法（必填） */
  method: HTTPMethod;
  /** 请求 URL（必填） */
  url: string;
  /** 请求体（可选） */
  body?: BodyInit | null;
  /** 超时时间（必填，有默认值） */
  timeout: number;
  /** 重试配置（必填，有默认值） */
  retry: Required<RetryOptions>;
}