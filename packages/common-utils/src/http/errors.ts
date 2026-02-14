/**
 * HTTP 错误类型定义
 * 定义 HTTP 客户端专用的错误类型
 */

import {
  SDKError,
  HttpError,
} from '@modular-agent/types';

/**
 * HTTP 400 - 请求格式错误
 */
export class BadRequestError extends HttpError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 400, context, cause);
  }
}

/**
 * HTTP 401 - 认证失败
 */
export class UnauthorizedError extends HttpError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 401, context, cause);
  }
}

/**
 * HTTP 403 - 权限不足
 */
export class ForbiddenError extends HttpError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 403, context, cause);
  }
}

/**
 * HTTP 404 - 资源不存在
 */
export class NotFoundHttpError extends HttpError {
  constructor(
    message: string,
    public readonly url: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 404, { ...context, url }, cause);
  }
}

/**
 * HTTP 409 - 冲突
 */
export class ConflictError extends HttpError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 409, context, cause);
  }
}

/**
 * HTTP 422 - 无法处理的实体
 */
export class UnprocessableEntityError extends HttpError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 422, context, cause);
  }
}

/**
 * HTTP 429 - 限流错误
 */
export class RateLimitError extends HttpError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(message, 429, context);
  }
}

/**
 * HTTP 500 - 服务器错误
 */
export class InternalServerError extends HttpError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 500, context, cause);
  }
}

/**
 * HTTP 503 - 服务不可用
 */
export class ServiceUnavailableError extends HttpError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, 503, context, cause);
  }
}