/**
 * 统一API错误处理系统
 * 提供标准化的错误码、错误类和错误处理机制
 */

/**
 * API错误码枚举
 */
export enum APIErrorCode {
  // 资源相关错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_VALIDATION_FAILED = 'RESOURCE_VALIDATION_FAILED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // 权限相关错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // 系统错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // 参数错误
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_TYPE = 'INVALID_TYPE',
  
  // 操作错误
  OPERATION_FAILED = 'OPERATION_FAILED',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED',
  
  // 并发错误
  CONFLICT = 'CONFLICT',
  VERSION_MISMATCH = 'VERSION_MISMATCH'
}

/**
 * API错误详情接口
 */
export interface APIErrorDetails {
  /** 错误码 */
  code: APIErrorCode;
  /** 错误消息 */
  message: string;
  /** 详细信息 */
  details?: Record<string, any>;
  /** 时间戳 */
  timestamp: number;
  /** 请求ID（用于追踪） */
  requestId?: string;
  /** 原始错误（如果有） */
  cause?: Error;
}

/**
 * API错误类
 * 继承自Error，提供标准化的错误信息
 */
export class APIError extends Error {
  /** 错误码 */
  public readonly code: APIErrorCode;
  
  /** 详细信息 */
  public readonly details?: Record<string, any>;
  
  /** 时间戳 */
  public readonly timestamp: number;
  
  /** 请求ID */
  public readonly requestId?: string;
  
  /** 原始错误 */
  public override readonly cause?: Error;

  constructor(
    code: APIErrorCode,
    message: string,
    details?: Record<string, any>,
    cause?: Error
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    this.cause = cause;
    
    // 保持正确的原型链
    Object.setPrototypeOf(this, APIError.prototype);
    
    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): APIErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId
    };
  }

  /**
   * 转换为字符串
   */
  override toString(): string {
    const detailsStr = this.details ? ` | Details: ${JSON.stringify(this.details)}` : '';
    return `[${this.code}] ${this.message}${detailsStr}`;
  }

  /**
   * 设置请求ID
   */
  setRequestId(requestId: string): void {
    (this as any).requestId = requestId;
  }

  /**
   * 创建资源未找到错误
   */
  static resourceNotFound(resourceType: string, resourceId: string): APIError {
    return new APIError(
      APIErrorCode.RESOURCE_NOT_FOUND,
      `${resourceType} with ID '${resourceId}' not found`,
      { resourceType, resourceId }
    );
  }

  /**
   * 创建资源已存在错误
   */
  static resourceAlreadyExists(resourceType: string, resourceId: string): APIError {
    return new APIError(
      APIErrorCode.RESOURCE_ALREADY_EXISTS,
      `${resourceType} with ID '${resourceId}' already exists`,
      { resourceType, resourceId }
    );
  }

  /**
   * 创建资源验证失败错误
   */
  static validationFailed(errors: string[]): APIError {
    return new APIError(
      APIErrorCode.RESOURCE_VALIDATION_FAILED,
      `Resource validation failed: ${errors.join(', ')}`,
      { errors }
    );
  }

  /**
   * 创建未授权错误
   */
  static unauthorized(message: string = 'Unauthorized access'): APIError {
    return new APIError(
      APIErrorCode.UNAUTHORIZED,
      message
    );
  }

  /**
   * 创建禁止访问错误
   */
  static forbidden(message: string = 'Access forbidden'): APIError {
    return new APIError(
      APIErrorCode.FORBIDDEN,
      message
    );
  }

  /**
   * 创建内部错误
   */
  static internal(message: string, cause?: Error): APIError {
    return new APIError(
      APIErrorCode.INTERNAL_ERROR,
      message,
      undefined,
      cause
    );
  }

  /**
   * 创建无效参数错误
   */
  static invalidParameter(parameterName: string, reason: string): APIError {
    return new APIError(
      APIErrorCode.INVALID_PARAMETER,
      `Invalid parameter '${parameterName}': ${reason}`,
      { parameterName, reason }
    );
  }

  /**
   * 创建缺失参数错误
   */
  static missingParameter(parameterName: string): APIError {
    return new APIError(
      APIErrorCode.MISSING_PARAMETER,
      `Missing required parameter '${parameterName}'`,
      { parameterName }
    );
  }

  /**
   * 创建操作失败错误
   */
  static operationFailed(operation: string, reason: string): APIError {
    return new APIError(
      APIErrorCode.OPERATION_FAILED,
      `Operation '${operation}' failed: ${reason}`,
      { operation, reason }
    );
  }

  /**
   * 创建冲突错误
   */
  static conflict(message: string, details?: Record<string, any>): APIError {
    return new APIError(
      APIErrorCode.CONFLICT,
      message,
      details
    );
  }

  /**
   * 创建超时错误
   */
  static timeout(operation: string, timeoutMs: number): APIError {
    return new APIError(
      APIErrorCode.TIMEOUT,
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      { operation, timeoutMs }
    );
  }
}

/**
 * 错误处理器接口
 */
export interface ErrorHandler {
  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文
   * @returns 处理后的错误
   */
  handle(error: unknown, context?: ErrorContext): APIError;
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 操作名称 */
  operation?: string;
  /** 资源类型 */
  resourceType?: string;
  /** 资源ID */
  resourceId?: string;
  /** 额外信息 */
  extra?: Record<string, any>;
}

/**
 * 默认错误处理器
 */
export class DefaultErrorHandler implements ErrorHandler {
  handle(error: unknown, context?: ErrorContext): APIError {
    // 如果已经是APIError，直接返回
    if (error instanceof APIError) {
      return error;
    }

    // 如果是标准Error对象
    if (error instanceof Error) {
      // 根据错误消息判断错误类型
      const message = error.message.toLowerCase();
      
      if (message.includes('not found')) {
        return new APIError(
          APIErrorCode.RESOURCE_NOT_FOUND,
          error.message,
          context,
          error
        );
      }
      
      if (message.includes('already exists')) {
        return new APIError(
          APIErrorCode.RESOURCE_ALREADY_EXISTS,
          error.message,
          context,
          error
        );
      }
      
      if (message.includes('validation') || message.includes('invalid')) {
        return new APIError(
          APIErrorCode.RESOURCE_VALIDATION_FAILED,
          error.message,
          context,
          error
        );
      }
      
      if (message.includes('unauthorized')) {
        return new APIError(
          APIErrorCode.UNAUTHORIZED,
          error.message,
          context,
          error
        );
      }
      
      if (message.includes('forbidden')) {
        return new APIError(
          APIErrorCode.FORBIDDEN,
          error.message,
          context,
          error
        );
      }
      
      if (message.includes('timeout')) {
        return new APIError(
          APIErrorCode.TIMEOUT,
          error.message,
          context,
          error
        );
      }
      
      // 默认返回内部错误
      return new APIError(
        APIErrorCode.INTERNAL_ERROR,
        error.message,
        context,
        error
      );
    }

    // 其他类型的错误
    return new APIError(
      APIErrorCode.INTERNAL_ERROR,
      String(error),
      context
    );
  }
}

/**
 * 错误处理器注册表
 */
export class ErrorHandlerRegistry {
  private static instance: ErrorHandlerRegistry;
  private handlers: Map<string, ErrorHandler> = new Map();
  private defaultHandler: ErrorHandler = new DefaultErrorHandler();

  private constructor() {}

  public static getInstance(): ErrorHandlerRegistry {
    if (!ErrorHandlerRegistry.instance) {
      ErrorHandlerRegistry.instance = new ErrorHandlerRegistry();
    }
    return ErrorHandlerRegistry.instance;
  }

  /**
   * 注册错误处理器
   */
  public register(errorType: string, handler: ErrorHandler): void {
    this.handlers.set(errorType, handler);
  }

  /**
   * 获取错误处理器
   */
  public get(errorType?: string): ErrorHandler {
    if (errorType && this.handlers.has(errorType)) {
      return this.handlers.get(errorType)!;
    }
    return this.defaultHandler;
  }

  /**
   * 设置默认错误处理器
   */
  public setDefaultHandler(handler: ErrorHandler): void {
    this.defaultHandler = handler;
  }
}