/**
 * 错误类型枚举
 */
export enum ErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  operation: string;
  entityName?: string;
  parameters?: Record<string, any>;
  timestamp: Date;
}

/**
 * 增强的Repository错误类
 */
export class EnhancedRepositoryError extends Error {
  public readonly context: ErrorContext;
  public readonly type: ErrorType;

  constructor(message: string, context: ErrorContext, type: ErrorType) {
    super(message);
    this.context = context;
    this.type = type;
    this.name = 'EnhancedRepositoryError';
  }
}

/**
 * 仓储错误处理器
 */
export class RepositoryErrorHandler {
  /**
   * 处理错误的统一方法
   */
  handleError(
    error: unknown, 
    operation: string, 
    entityName?: string, 
    parameters?: Record<string, any>
  ): never {
    const context: ErrorContext = {
      operation,
      entityName,
      parameters,
      timestamp: new Date()
    };

    let errorType = ErrorType.UNKNOWN_ERROR;
    let message = `未知错误`;

    if (error instanceof Error) {
      message = error.message;
      
      // 根据错误消息判断错误类型
      if (message.includes('connection') || message.includes('connect')) {
        errorType = ErrorType.CONNECTION_ERROR;
      } else if (message.includes('query') || message.includes('sql')) {
        errorType = ErrorType.QUERY_ERROR;
      } else if (message.includes('validation') || message.includes('constraint')) {
        errorType = ErrorType.VALIDATION_ERROR;
      } else if (message.includes('transaction')) {
        errorType = ErrorType.TRANSACTION_ERROR;
      }
    }

    // 构建详细的错误信息
    const detailedMessage = `${operation}失败: ${message}`;
    
    // 在开发环境中打印详细错误信息
    if (process.env['NODE_ENV'] === 'development') {
      console.error('Repository Error Details:', {
        message: detailedMessage,
        type: errorType,
        context,
        originalError: error
      });
    }

    throw new EnhancedRepositoryError(detailedMessage, context, errorType);
  }

  /**
   * 安全执行操作，统一错误处理
   */
  async safeExecute<R>(
    operation: () => Promise<R>,
    operationName: string,
    entityName?: string,
    parameters?: Record<string, any>
  ): Promise<R> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, operationName, entityName, parameters);
    }
  }
}