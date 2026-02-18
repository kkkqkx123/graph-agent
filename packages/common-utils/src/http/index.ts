/**
 * HTTP模块导出
 */

// 导出HTTP错误类型
export {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundHttpError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
} from './errors.js';

// 导出HTTP客户端
export { HttpClient } from './http-client.js';

// 导出传输协议
export {
  HttpTransport,
  SseTransport,
  Transport,
  TransportResponse,
  TransportOptions
} from './transport.js';

// 导出重试处理器
export { executeWithRetry } from './retry-handler.js';
export { NonRetryableStatusCode } from './retry-handler.js';
export type { RetryConfig } from './retry-handler.js';

// 导出熔断器
export { CircuitBreaker } from './circuit-breaker.js';
export type { CircuitBreakerConfig } from './circuit-breaker.js';

// 导出限流器
export { RateLimiter } from './rate-limiter.js';
export type { RateLimiterConfig } from './rate-limiter.js';

// 导出拦截器
export {
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  InterceptorManager,
  createAuthInterceptor,
  createLoggingInterceptor,
  createRetryInterceptor
} from './interceptors.js';

// 导出类型
export type {
  HTTPMethod,
  HttpRequestOptions,
  HttpResponse,
  HttpClientConfig,
} from '@modular-agent/types';
