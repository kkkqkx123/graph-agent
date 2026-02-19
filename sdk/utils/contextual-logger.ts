/**
 * 上下文日志记录器
 *
 * 设计目的：
 * - 替代警告级别和info级别的错误抛出
 * - 提供结构化的上下文日志记录
 * - 减少不必要的栈追踪开销
 * - 保持与现有日志系统的兼容性
 *
 * 使用场景：
 * - 需要记录但不中断执行的警告信息
 * - 需要记录上下文的调试信息
 * - 需要结构化日志输出的场景
 *
 * 设计原则：
 * - 默认使用 SDK 全局 logger 实例，保持日志配置一致性
 * - 支持自定义 logger 实例，提供灵活性
 * - 提供便捷的工厂函数，简化使用
 */

import type { Logger } from '@modular-agent/common-utils';
import type { ErrorContext } from '@modular-agent/types';
import { logger as sdkLogger } from './logger.js';

/**
 * 日志记录选项
 */
export interface LogOptions {
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 日志消息 */
  message: string;
  /** 错误上下文 */
  context?: ErrorContext;
  /** 额外的上下文数据 */
  data?: Record<string, any>;
  /** 原始错误对象（可选） */
  error?: Error;
}

/**
 * 上下文日志记录器类
 * 提供结构化的日志记录能力，支持错误上下文
 */
export class ContextualLogger {
  constructor(
    private readonly logger: Logger,
    private readonly baseContext: ErrorContext = {}
  ) { }

  /**
   * 记录调试信息
   */
  debug(message: string, context?: ErrorContext, data?: Record<string, any>): void {
    this.log({
      level: 'debug',
      message,
      context,
      data
    });
  }

  /**
   * 记录信息
   */
  info(message: string, context?: ErrorContext, data?: Record<string, any>): void {
    this.log({
      level: 'info',
      message,
      context,
      data
    });
  }

  /**
   * 记录警告
   */
  warn(message: string, context?: ErrorContext, data?: Record<string, any>, error?: Error): void {
    this.log({
      level: 'warn',
      message,
      context,
      data,
      error
    });
  }

  /**
   * 记录错误
   * 用于记录但不抛出的错误场景
   */
  error(message: string, context?: ErrorContext, data?: Record<string, any>, error?: Error): void {
    this.log({
      level: 'error',
      message,
      context,
      data,
      error
    });
  }

  /**
   * 记录验证警告
   * 替代 ConfigurationValidationError with severity: 'warning'
   */
  validationWarning(
    message: string,
    field: string,
    value: any,
    context?: ErrorContext
  ): void {
    this.warn(message, {
      ...context,
      field,
      value,
      operation: 'validation'
    });
  }

  /**
   * 记录资源未找到警告
   * 替代 NotFoundError with severity: 'warning'
   */
  resourceNotFoundWarning(
    resourceType: string,
    resourceId: string,
    context?: ErrorContext
  ): void {
    this.warn(
      `${resourceType} not found: ${resourceId}`,
      {
        ...context,
        resourceType,
        resourceId,
        operation: 'resource_lookup'
      }
    );
  }

  /**
   * 记录网络警告
   * 替代 NetworkError/HttpError with severity: 'warning'
   */
  networkWarning(
    message: string,
    statusCode?: number,
    context?: ErrorContext,
    error?: Error
  ): void {
    this.warn(message, {
      ...context,
      statusCode,
      operation: 'network_request'
    }, undefined, error);
  }

  /**
   * 记录执行警告
   * 替代 ExecutionError with severity: 'warning'
   */
  executionWarning(
    message: string,
    nodeId?: string,
    context?: ErrorContext,
    error?: Error
  ): void {
    this.warn(message, {
      ...context,
      nodeId,
      operation: 'node_execution'
    }, undefined, error);
  }

  /**
   * 核心日志记录方法
   */
  private log(options: LogOptions): void {
    const { level, message, context, data, error } = options;

    // 合并基础上下文和传入的上下文
    const mergedContext = {
      ...this.baseContext,
      ...context,
      ...data
    };

    // 构建日志数据
    const logData: Record<string, any> = {
      ...mergedContext
    };

    // 如果有错误对象，添加错误信息
    if (error) {
      logData['error'] = {
        name: error.name,
        message: error.message,
        // 只在 error 级别时包含栈追踪
        stack: level === 'error' ? error.stack : undefined
      };
    }

    // 根据级别调用相应的日志方法
    switch (level) {
      case 'debug':
        this.logger.debug(message, logData);
        break;
      case 'info':
        this.logger.info(message, logData);
        break;
      case 'warn':
        this.logger.warn(message, logData);
        break;
      case 'error':
        this.logger.error(message, logData);
        break;
    }
  }

  /**
   * 创建子日志记录器
   * 继承基础上下文，可以添加额外的上下文
   */
  child(additionalContext: ErrorContext): ContextualLogger {
    return new ContextualLogger(
      this.logger,
      {
        ...this.baseContext,
        ...additionalContext
      }
    );
  }
}

/**
 * 创建上下文日志记录器工厂函数
 *
 * 使用 SDK 全局 logger 实例，保持日志配置一致性
 *
 * @param baseContext 基础错误上下文
 * @returns ContextualLogger 实例
 *
 * @example
 * // 创建带工作流上下文的日志器
 * const logger = createContextualLogger({ workflowId: 'wf-123' });
 *
 * // 创建带线程上下文的日志器
 * const threadLogger = createContextualLogger({
 *   workflowId: 'wf-123',
 *   threadId: 'thread-456'
 * });
 */
export function createContextualLogger(
  baseContext?: ErrorContext
): ContextualLogger {
  return new ContextualLogger(sdkLogger, baseContext);
}