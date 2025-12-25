import { DomainError } from '../../../domain/common/errors/domain-error';

/**
 * 错误处理策略枚举
 */
export enum ErrorHandlingStrategy {
  /** 立即抛出错误 */
  THROW_IMMEDIATELY = 'throw_immediately',
  /** 记录错误并继续 */
  LOG_AND_CONTINUE = 'log_and_continue',
  /** 记录错误并抛出 */
  LOG_AND_THROW = 'log_and_throw',
  /** 重试 */
  RETRY = 'retry',
  /** 使用默认值 */
  USE_DEFAULT = 'use_default'
}

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  /** 错误发生的组件 */
  component: string;
  /** 操作名称 */
  operation: string;
  /** 相关实体ID */
  entityId?: string;
  /** 额外的上下文信息 */
  metadata?: Record<string, any>;
}

/**
 * 错误处理结果接口
 */
export interface ErrorHandlingResult {
  /** 是否成功处理 */
  handled: boolean;
  /** 处理策略 */
  strategy: ErrorHandlingStrategy;
  /** 处理后的错误（可能被转换） */
  error?: Error;
  /** 默认值（如果使用默认策略） */
  defaultValue?: any;
  /** 是否应该重试 */
  shouldRetry?: boolean;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * 领域错误处理器抽象基类
 * 
 * 提供统一的错误处理框架
 */
export abstract class DomainErrorHandler {
  constructor(
    protected readonly strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.LOG_AND_THROW
  ) {}

  /**
   * 处理错误
   * @param error 原始错误
   * @param context 错误上下文
   * @returns 错误处理结果
   */
  abstract handle(error: Error, context: ErrorContext): ErrorHandlingResult;

  /**
   * 记录错误
   * @param error 错误
   * @param context 上下文
   */
  protected logError(error: Error, context: ErrorContext): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${context.component}.${context.operation}: ${error.message}`;
    
    if (context.entityId) {
      console.error(`${logMessage} (Entity: ${context.entityId})`);
    } else {
      console.error(logMessage);
    }

    if (error.stack) {
      console.error(error.stack);
    }

    if (context.metadata) {
      console.error('Context:', JSON.stringify(context.metadata, null, 2));
    }
  }

  /**
   * 创建领域错误
   * @param message 错误消息
   * @param context 上下文
   * @returns 领域错误
   */
  protected createDomainError(message: string, context: ErrorContext): DomainError {
    const fullMessage = `${context.component}.${context.operation}: ${message}`;
    const error = new DomainError(fullMessage);
    
    // 添加上下文信息到错误
    (error as any).context = context;
    
    return error;
  }

  /**
   * 判断是否应该重试
   * @param error 错误
   * @param attempt 当前尝试次数
   * @param maxAttempts 最大尝试次数
   * @returns 是否应该重试
   */
  protected shouldRetry(error: Error, attempt: number, maxAttempts: number): boolean {
    if (attempt >= maxAttempts) {
      return false;
    }

    // 某些错误类型不应该重试
    if (error instanceof DomainError) {
      const domainError = error as DomainError;
      if (domainError.code === 'VALIDATION_ERROR' || 
          domainError.code === 'AUTHORIZATION_ERROR') {
        return false;
      }
    }

    // 网络错误或临时性错误可以重试
    if (error.message.includes('timeout') || 
        error.message.includes('connection') ||
        error.message.includes('temporary')) {
      return true;
    }

    return false;
  }

  /**
   * 计算重试延迟
   * @param attempt 当前尝试次数
   * @param baseDelay 基础延迟
   * @returns 重试延迟
   */
  protected calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
    // 指数退避策略
    return baseDelay * Math.pow(2, attempt - 1);
  }
}

/**
 * 工作流错误处理器
 */
export class WorkflowErrorHandler extends DomainErrorHandler {
  handle(error: Error, context: ErrorContext): ErrorHandlingResult {
    this.logError(error, context);

    switch (this.strategy) {
      case ErrorHandlingStrategy.THROW_IMMEDIATELY:
        return {
          handled: false,
          strategy: this.strategy,
          error: this.createDomainError(error.message, context)
        };

      case ErrorHandlingStrategy.LOG_AND_CONTINUE:
        return {
          handled: true,
          strategy: this.strategy
        };

      case ErrorHandlingStrategy.LOG_AND_THROW:
        return {
          handled: false,
          strategy: this.strategy,
          error: this.createDomainError(error.message, context)
        };

      case ErrorHandlingStrategy.RETRY:
        const shouldRetry = this.shouldRetry(error, 1, 3);
        return {
          handled: true,
          strategy: this.strategy,
          shouldRetry,
          retryDelay: shouldRetry ? this.calculateRetryDelay(1) : undefined
        };

      case ErrorHandlingStrategy.USE_DEFAULT:
        return {
          handled: true,
          strategy: this.strategy,
          defaultValue: this.getDefaultValue(context)
        };

      default:
        return {
          handled: false,
          strategy: this.strategy,
          error: this.createDomainError(`未知的错误处理策略: ${this.strategy}`, context)
        };
    }
  }

  private getDefaultValue(context: ErrorContext): any {
    switch (context.operation) {
      case 'execute':
        return { success: false, error: '执行失败' };
      case 'validate':
        return { valid: false, errors: ['验证失败'] };
      case 'compile':
        return { success: false, compiled: false };
      default:
        return null;
    }
  }
}

/**
 * 会话错误处理器
 */
export class SessionErrorHandler extends DomainErrorHandler {
  handle(error: Error, context: ErrorContext): ErrorHandlingResult {
    this.logError(error, context);

    // 会话相关的特殊处理
    if (error.message.includes('timeout')) {
      return {
        handled: true,
        strategy: ErrorHandlingStrategy.USE_DEFAULT,
        defaultValue: {
          status: 'timeout',
          message: '会话超时'
        }
      };
    }

    if (error.message.includes('expired')) {
      return {
        handled: true,
        strategy: ErrorHandlingStrategy.USE_DEFAULT,
        defaultValue: {
          status: 'expired',
          message: '会话过期'
        }
      };
    }

    switch (this.strategy) {
      case ErrorHandlingStrategy.LOG_AND_THROW:
        return {
          handled: false,
          strategy: this.strategy,
          error: this.createDomainError(error.message, context)
        };

      default:
        return {
          handled: true,
          strategy: this.strategy
        };
    }
  }
}

/**
 * 错误处理器工厂
 */
export class ErrorHandlerFactory {
  private static handlers = new Map<string, DomainErrorHandler>();

  /**
   * 注册错误处理器
   */
  static register(component: string, handler: DomainErrorHandler): void {
    this.handlers.set(component, handler);
  }

  /**
   * 获取错误处理器
   */
  static get(component: string): DomainErrorHandler {
    return this.handlers.get(component) || new DefaultErrorHandler();
  }

  /**
   * 处理错误的便捷方法
   */
  static handle(error: Error, context: ErrorContext): ErrorHandlingResult {
    const handler = this.get(context.component);
    return handler.handle(error, context);
  }
}

/**
 * 默认错误处理器
 */
export class DefaultErrorHandler extends DomainErrorHandler {
  handle(error: Error, context: ErrorContext): ErrorHandlingResult {
    this.logError(error, context);
    
    return {
      handled: false,
      strategy: ErrorHandlingStrategy.LOG_AND_THROW,
      error: this.createDomainError(error.message, context)
    };
  }
}

// 注册默认的错误处理器
ErrorHandlerFactory.register('workflow', new WorkflowErrorHandler());
ErrorHandlerFactory.register('session', new SessionErrorHandler());