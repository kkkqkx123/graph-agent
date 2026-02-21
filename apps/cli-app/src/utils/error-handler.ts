/**
 * CLI 错误处理器
 * 提供统一的错误处理和用户友好的错误信息显示
 */

import { createLogger } from './logger.js';
import { ValidationError } from './validator.js';
import type { CLIError, APIError, FileOperationError } from '../types/cli-types.js';

const logger = createLogger();

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  FILE_OPERATION = 'FILE_ERROR',
  API = 'API_ERROR',
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  command?: string;
  operation?: string;
  filePath?: string;
  url?: string;
  statusCode?: number;
  additionalInfo?: Record<string, any>;
}

/**
 * 格式化的错误信息
 */
export interface FormattedError {
  message: string;
  type: ErrorType;
  severity: ErrorSeverity;
  exitCode: number;
  suggestions?: string[];
}

/**
 * CLI 错误处理器类
 */
export class CLIErrorHandler {
  private verbose: boolean;
  private debug: boolean;

  constructor(options: { verbose?: boolean; debug?: boolean } = {}) {
    this.verbose = options.verbose || false;
    this.debug = options.debug || false;
  }

  /**
   * 处理错误并退出程序
   * @param error 错误对象
   * @param context 错误上下文
   */
  handleError(error: unknown, context: ErrorContext = {}): never {
    const formattedError = this.formatError(error, context);
    this.displayError(formattedError, context);
    process.exit(formattedError.exitCode);
  }

  /**
   * 格式化错误信息
   * @param error 错误对象
   * @param context 错误上下文
   * @returns 格式化的错误信息
   */
  formatError(error: unknown, context: ErrorContext = {}): FormattedError {
    let message: string;
    let type: ErrorType;
    let severity: ErrorSeverity;
    let exitCode: number;
    let suggestions: string[] = [];

    if (error instanceof ValidationError) {
      message = error.message;
      type = ErrorType.VALIDATION;
      severity = ErrorSeverity.LOW;
      exitCode = 2;
      suggestions = this.getValidationSuggestions(error);
    } else if (this.isAPIError(error)) {
      message = error.message;
      type = ErrorType.API;
      severity = this.getAPIErrorSeverity(error.statusCode);
      exitCode = 4;
      suggestions = this.getAPISuggestions(error);
    } else if (this.isFileOperationError(error)) {
      message = error.message;
      type = ErrorType.FILE_OPERATION;
      severity = ErrorSeverity.MEDIUM;
      exitCode = 3;
      suggestions = this.getFileOperationSuggestions(error);
    } else if (this.isCLIError(error)) {
      message = error.message;
      type = ErrorType[error.code as keyof typeof ErrorType] as ErrorType || ErrorType.UNKNOWN;
      severity = ErrorSeverity.MEDIUM;
      exitCode = error.exitCode;
    } else if (error instanceof Error) {
      message = error.message;
      type = this.inferErrorType(error);
      severity = ErrorSeverity.MEDIUM;
      exitCode = 1;
      suggestions = this.getGenericSuggestions(error);
    } else {
      message = String(error);
      type = ErrorType.UNKNOWN;
      severity = ErrorSeverity.MEDIUM;
      exitCode = 1;
    }

    // 添加上下文信息
    if (context.operation) {
      message = `${context.operation}: ${message}`;
    }

    return { message, type, severity, exitCode, suggestions };
  }

  /**
   * 显示错误信息
   * @param formattedError 格式化的错误信息
   * @param context 错误上下文
   */
  private displayError(formattedError: FormattedError, context: ErrorContext): void {
    // 使用 logger 输出错误
    logger.error(formattedError.message);

    // 显示错误类型
    if (this.verbose) {
      logger.info(`错误类型: ${formattedError.type}`);
      logger.info(`严重程度: ${formattedError.severity}`);
    }

    // 显示建议
    if (formattedError.suggestions && formattedError.suggestions.length > 0) {
      console.log('\n建议:');
      formattedError.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    // 显示堆栈跟踪（调试模式）
    if (this.debug && this.getErrorObject(context)) {
      const error = this.getErrorObject(context);
      if (error instanceof Error && error.stack) {
        console.log('\n堆栈跟踪:');
        console.log(error.stack);
      }
    }

    // 显示上下文信息（详细模式）
    if (this.verbose && Object.keys(context).length > 0) {
      console.log('\n上下文信息:');
      Object.entries(context).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }
  }

  /**
   * 获取验证错误的建议
   */
  private getValidationSuggestions(error: ValidationError): string[] {
    const suggestions: string[] = [];

    if (error.field) {
      suggestions.push(`检查字段 "${error.field}" 的值是否正确`);
    }

    if (error.message.includes('文件路径')) {
      suggestions.push('确保文件路径正确且文件存在');
      suggestions.push('支持的文件格式: .json, .toml, .yaml, .yml');
    }

    if (error.message.includes('JSON')) {
      suggestions.push('确保 JSON 格式正确');
      suggestions.push('可以使用在线 JSON 验证工具检查格式');
    }

    if (error.message.includes('UUID')) {
      suggestions.push('确保 ID 格式为有效的 UUID');
    }

    return suggestions;
  }

  /**
   * 获取 API 错误的建议
   */
  private getAPISuggestions(error: APIError): string[] {
    const suggestions: string[] = [];

    if (error.statusCode === 401) {
      suggestions.push('检查 API 密钥是否正确');
      suggestions.push('确保 API 密钥未过期');
    } else if (error.statusCode === 403) {
      suggestions.push('检查是否有足够的权限执行此操作');
    } else if (error.statusCode === 404) {
      suggestions.push('检查请求的资源是否存在');
      suggestions.push('确认资源 ID 是否正确');
    } else if (error.statusCode === 429) {
      suggestions.push('请求过于频繁，请稍后重试');
    } else if (error.statusCode && error.statusCode >= 500) {
      suggestions.push('服务器错误，请稍后重试');
      suggestions.push('如果问题持续存在，请联系技术支持');
    }

    if (error.apiEndpoint) {
      suggestions.push(`请求的 API 端点: ${error.apiEndpoint}`);
    }

    return suggestions;
  }

  /**
   * 获取文件操作错误的建议
   */
  private getFileOperationSuggestions(error: FileOperationError): string[] {
    const suggestions: string[] = [];

    if (error.filePath) {
      suggestions.push(`检查文件路径: ${error.filePath}`);
      suggestions.push('确保文件存在且可访问');
      suggestions.push('检查文件权限');
    }

    if (error.message.includes('权限')) {
      suggestions.push('确保有足够的文件系统权限');
    }

    if (error.message.includes('磁盘空间')) {
      suggestions.push('检查磁盘空间是否充足');
    }

    return suggestions;
  }

  /**
   * 获取通用错误的建议
   */
  private getGenericSuggestions(error: Error): string[] {
    const suggestions: string[] = [];

    if (error.message.includes('网络')) {
      suggestions.push('检查网络连接');
      suggestions.push('确保可以访问服务器');
    }

    if (error.message.includes('超时')) {
      suggestions.push('操作超时，请稍后重试');
      suggestions.push('可以尝试增加超时时间');
    }

    suggestions.push('使用 --verbose 选项获取更多详细信息');
    suggestions.push('使用 --debug 选项查看完整的堆栈跟踪');

    return suggestions;
  }

  /**
   * 推断错误类型
   */
  private inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('连接')) {
      return ErrorType.NETWORK;
    }

    if (message.includes('timeout') || message.includes('超时')) {
      return ErrorType.TIMEOUT;
    }

    if (message.includes('file') || message.includes('文件')) {
      return ErrorType.FILE_OPERATION;
    }

    if (message.includes('api') || message.includes('http')) {
      return ErrorType.API;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * 获取 API 错误的严重程度
   */
  private getAPIErrorSeverity(statusCode?: number): ErrorSeverity {
    if (!statusCode) return ErrorSeverity.MEDIUM;

    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * 检查是否为 API 错误
   */
  private isAPIError(error: unknown): error is APIError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'APIError'
    );
  }

  /**
   * 检查是否为文件操作错误
   */
  private isFileOperationError(error: unknown): error is FileOperationError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'FileOperationError'
    );
  }

  /**
   * 检查是否为 CLI 错误
   */
  private isCLIError(error: unknown): error is CLIError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'CLIError'
    );
  }

  /**
   * 获取错误对象
   */
  private getErrorObject(context: ErrorContext): Error | null {
    if (context.additionalInfo?.['error'] instanceof Error) {
      return context.additionalInfo['error'];
    }
    return null;
  }

  /**
   * 设置详细模式
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * 设置调试模式
   */
  setDebug(debug: boolean): void {
    this.debug = debug;
  }
}

/**
 * 全局错误处理器实例
 */
let globalErrorHandler: CLIErrorHandler | null = null;

/**
 * 获取全局错误处理器实例
 */
export function getErrorHandler(): CLIErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new CLIErrorHandler();
  }
  return globalErrorHandler;
}

/**
 * 设置全局错误处理器
 */
export function setErrorHandler(handler: CLIErrorHandler): void {
  globalErrorHandler = handler;
}

/**
 * 便捷函数：处理错误并退出
 */
export function handleError(error: unknown, context?: ErrorContext): never {
  return getErrorHandler().handleError(error, context);
}

/**
 * 便捷函数：格式化错误信息
 */
export function formatError(error: unknown, context?: ErrorContext): FormattedError {
  return getErrorHandler().formatError(error, context);
}