/**
 * 重试处理器
 * 仅函数导出，不导出类
 *
 * 提供指数退避重试策略，自动处理可重试的错误
 */

import { TimeoutError, NetworkError, HttpError } from '../../types/errors';
import {
  RateLimitError,
} from './errors';

/**
 * 不应该重试的 HTTP 状态码枚举
 * 这些错误码表示客户端错误或永久性错误，重试无法解决问题
 */
export enum NonRetryableStatusCode {
  /** Bad Request - 请求格式错误 */
  BAD_REQUEST = 400,
  /** Unauthorized - 认证失败 */
  UNAUTHORIZED = 401,
  /** Forbidden - 权限不足 */
  FORBIDDEN = 403,
  /** Not Found - 资源不存在 */
  NOT_FOUND = 404,
  /** Method Not Allowed - 方法不允许 */
  METHOD_NOT_ALLOWED = 405,
  /** Gone - 资源已永久删除 */
  GONE = 410,
  /** Length Required - 需要Content-Length */
  LENGTH_REQUIRED = 411,
  /** Precondition Failed - 前置条件失败 */
  PRECONDITION_FAILED = 412,
  /** Payload Too Large - 请求体过大 */
  PAYLOAD_TOO_LARGE = 413,
  /** URI Too Long - URI过长 */
  URI_TOO_LONG = 414,
  /** Unsupported Media Type - 不支持的媒体类型 */
  UNSUPPORTED_MEDIA_TYPE = 415,
  /** Range Not Satisfiable - 范围不满足 */
  RANGE_NOT_SATISFIABLE = 416,
  /** Expectation Failed - 期望失败 */
  EXPECTATION_FAILED = 417,
  /** I'm a teapot - 茶壶（RFC 2324） */
  IM_A_TEAPOT = 418,
  /** Unprocessable Entity - 无法处理的实体 */
  UNPROCESSABLE_ENTITY = 422,
  /** Upgrade Required - 需要升级协议 */
  UPGRADE_REQUIRED = 426,
  /** Precondition Required - 需要前置条件 */
  PRECONDITION_REQUIRED = 428,
  /** Request Header Fields Too Large - 请求头过大 */
  REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
  /** Unavailable For Legal Reasons - 法律原因不可用 */
  UNAVAILABLE_FOR_LEGAL_REASONS = 451,
}

/**
 * 重试处理器配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟时间（毫秒） */
  baseDelay: number;
  /** 最大延迟时间（毫秒） */
  maxDelay?: number;
}

/**
 * 不应该重试的 HTTP 状态码集合
 * 从枚举值构建，用于快速查找
 */
const NON_RETRYABLE_STATUS_CODES = new Set<number>(
  Object.values(NonRetryableStatusCode).filter(value => typeof value === 'number')
);

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 计算重试延迟（指数退避）
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay?: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  const finalMaxDelay = maxDelay || 30000; // 默认30秒
  return Math.min(delay, finalMaxDelay);
}

/**
 * 判断错误是否可重试
 *
 * 采用黑名单策略：除了明确不应该重试的错误，其他都重试
 *
 * 可重试的错误类型：
 * - TimeoutError: 请求超时
 * - NetworkError: 网络错误
 * - RateLimitError (429): 限流错误
 * - 5xx 服务器错误：服务器临时问题
 * - 4xx 客户端错误（除了黑名单中的）：可能是临时性问题（如 426 Upgrade Required）
 *
 * 不可重试的错误（黑名单）：
 * - 400, 401, 403, 404, 405, 410, 411, 412, 413, 414, 415, 416, 417, 418, 422, 426, 428, 431, 451
 */
function shouldRetry(error: any): boolean {
  // TimeoutError - 超时重试
  if (error instanceof TimeoutError) {
    return true;
  }

  // NetworkError - 网络错误重试
  if (error instanceof NetworkError) {
    return true;
  }

  // RateLimitError - 限流重试
  if (error instanceof RateLimitError) {
    return true;
  }

  // HttpError - 检查状态码
  if (error instanceof HttpError) {
    const statusCode = error.statusCode;

    // 检查是否在黑名单中
    if (NON_RETRYABLE_STATUS_CODES.has(statusCode)) {
      return false;
    }

    // 其他所有 HTTP 错误都重试
    // 包括：429（限流）、5xx（服务器错误）、以及其他4xx（如426等）
    return true;
  }

  return false;
}

/**
 * 执行带重试的函数
 *
 * @param fn 要执行的异步函数
 * @param config 重试配置
 * @returns 函数的返回值
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (!shouldRetry(error) || attempt === config.maxRetries) {
        throw error;
      }

      // 计算延迟并等待
      const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Unknown error');
}
