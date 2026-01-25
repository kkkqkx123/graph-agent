/**
 * HTTP错误类型体系
 * 独立定义，不复用全局异常类型
 */

/**
 * 基础HTTP错误类
 */
export class HTTPError extends Error {
  public readonly statusCode: number;
  public readonly requestId?: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number,
    requestId?: string,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.timestamp = new Date();

    if (cause) {
      this.cause = cause;
    }

    // 保持正确的原型链
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * 获取错误详情
   */
  getDetails(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * 4xx客户端错误
 */
export class ClientError extends HTTPError {
  constructor(
    message: string,
    statusCode: number,
    requestId?: string,
    cause?: Error
  ) {
    super(message, statusCode, requestId, cause);
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends ClientError {
  constructor(message: string = 'Bad Request', requestId?: string, cause?: Error) {
    super(message, 400, requestId, cause);
  }
}

/**
 * 401 Unauthorized
 */
export class AuthenticationError extends ClientError {
  constructor(message: string = 'Authentication failed', requestId?: string, cause?: Error) {
    super(message, 401, requestId, cause);
  }
}

/**
 * 403 Forbidden
 */
export class PermissionError extends ClientError {
  constructor(message: string = 'Permission denied', requestId?: string, cause?: Error) {
    super(message, 403, requestId, cause);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends ClientError {
  constructor(message: string = 'Resource not found', requestId?: string, cause?: Error) {
    super(message, 404, requestId, cause);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends ClientError {
  constructor(message: string = 'Resource conflict', requestId?: string, cause?: Error) {
    super(message, 409, requestId, cause);
  }
}

/**
 * 422 Unprocessable Entity
 */
export class UnprocessableEntityError extends ClientError {
  constructor(message: string = 'Unprocessable entity', requestId?: string, cause?: Error) {
    super(message, 422, requestId, cause);
  }
}

/**
 * 429 Too Many Requests
 */
export class RateLimitError extends ClientError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    requestId?: string,
    retryAfter?: number,
    cause?: Error
  ) {
    super(message, 429, requestId, cause);
    this.retryAfter = retryAfter;
  }

  override getDetails(): Record<string, unknown> {
    return {
      ...super.getDetails(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * 5xx服务器错误
 */
export class ServerError extends HTTPError {
  constructor(
    message: string,
    statusCode: number,
    requestId?: string,
    cause?: Error
  ) {
    super(message, statusCode, requestId, cause);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends ServerError {
  constructor(message: string = 'Internal server error', requestId?: string, cause?: Error) {
    super(message, 500, requestId, cause);
  }
}

/**
 * 502 Bad Gateway
 */
export class BadGatewayError extends ServerError {
  constructor(message: string = 'Bad gateway', requestId?: string, cause?: Error) {
    super(message, 502, requestId, cause);
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends ServerError {
  constructor(message: string = 'Service unavailable', requestId?: string, cause?: Error) {
    super(message, 503, requestId, cause);
  }
}

/**
 * 504 Gateway Timeout
 */
export class GatewayTimeoutError extends ServerError {
  constructor(message: string = 'Gateway timeout', requestId?: string, cause?: Error) {
    super(message, 504, requestId, cause);
  }
}

/**
 * 网络连接错误
 */
export class ConnectionError extends HTTPError {
  constructor(message: string = 'Connection failed', cause?: Error) {
    super(message, 0, undefined, cause);
  }
}

/**
 * 连接超时错误
 */
export class ConnectionTimeoutError extends ConnectionError {
  constructor(message: string = 'Connection timeout', cause?: Error) {
    super(message, cause);
  }
}

/**
 * 请求被用户中止
 */
export class UserAbortError extends HTTPError {
  constructor(message: string = 'Request aborted by user') {
    super(message, 0);
  }
}

/**
 * 熔断器开启错误
 */
export class CircuitBreakerOpenError extends HTTPError {
  constructor(message: string = 'Circuit breaker is open') {
    super(message, 503);
  }
}

/**
 * 限流错误
 */
export class RateLimiterError extends HTTPError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}

/**
 * 错误工厂类
 */
export class HTTPErrorFactory {
  /**
   * 根据状态码创建对应的错误实例
   */
  static fromStatusCode(
    statusCode: number,
    message: string,
    requestId?: string,
    cause?: Error
  ): HTTPError {
    switch (statusCode) {
      case 400:
        return new BadRequestError(message, requestId, cause);
      case 401:
        return new AuthenticationError(message, requestId, cause);
      case 403:
        return new PermissionError(message, requestId, cause);
      case 404:
        return new NotFoundError(message, requestId, cause);
      case 409:
        return new ConflictError(message, requestId, cause);
      case 422:
        return new UnprocessableEntityError(message, requestId, cause);
      case 429:
        return new RateLimitError(message, requestId, undefined, cause);
      case 500:
        return new InternalServerError(message, requestId, cause);
      case 502:
        return new BadGatewayError(message, requestId, cause);
      case 503:
        return new ServiceUnavailableError(message, requestId, cause);
      case 504:
        return new GatewayTimeoutError(message, requestId, cause);
      default:
        if (statusCode >= 400 && statusCode < 500) {
          return new ClientError(message, statusCode, requestId, cause);
        } else if (statusCode >= 500) {
          return new ServerError(message, statusCode, requestId, cause);
        }
        return new HTTPError(message, statusCode, requestId, cause);
    }
  }

  /**
   * 判断错误是否应该重试
   */
  static isRetryable(error: HTTPError): boolean {
    // 429 (Rate Limit) - 可重试
    if (error instanceof RateLimitError) {
      return true;
    }

    // 5xx 服务器错误 - 可重试
    if (error instanceof ServerError) {
      return true;
    }

    // 408 Request Timeout - 可重试
    if (error.statusCode === 408) {
      return true;
    }

    // 连接错误 - 可重试
    if (error instanceof ConnectionError) {
      return true;
    }

    return false;
  }
}