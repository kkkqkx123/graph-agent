/**
 * HTTP 错误类型定义
 * 定义 HTTP 客户端专用的错误类型
 */

import {
  SDKError,
  ErrorCode,
} from '../../types/errors';

/**
 * HTTP 400 - 请求格式错误
 */
export class BadRequestError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, context, cause);
    this.name = 'BadRequestError';
  }
}

/**
 * HTTP 401 - 认证失败
 */
export class UnauthorizedError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, context, cause);
    this.name = 'UnauthorizedError';
  }
}

/**
 * HTTP 403 - 权限不足
 */
export class ForbiddenError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'ForbiddenError';
  }
}

/**
 * HTTP 404 - 资源不存在
 */
export class NotFoundHttpError extends SDKError {
  constructor(
    message: string,
    public readonly url: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.NOT_FOUND_ERROR, message, { ...context, url }, cause);
    this.name = 'NotFoundHttpError';
  }
}

/**
 * HTTP 409 - 冲突
 */
export class ConflictError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'ConflictError';
  }
}

/**
 * HTTP 422 - 无法处理的实体
 */
export class UnprocessableEntityError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, context, cause);
    this.name = 'UnprocessableEntityError';
  }
}

/**
 * HTTP 429 - 限流错误
 */
export class RateLimitError extends SDKError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(ErrorCode.RATE_LIMIT_ERROR, message, context);
    this.name = 'RateLimitError';
  }
}

/**
 * HTTP 500 - 服务器错误
 */
export class InternalServerError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'InternalServerError';
  }
}

/**
 * HTTP 503 - 服务不可用
 */
export class ServiceUnavailableError extends SDKError {
  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, context, cause);
    this.name = 'ServiceUnavailableError';
  }
}