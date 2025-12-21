import { injectable } from 'inversify';

/**
 * 错误类型定义
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RESOURCE_ERROR = 'RESOURCE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  executionId?: string;
  stackTrace?: string;
}

/**
 * 错误处理配置
 */
export interface ErrorHandlerConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  logErrors?: boolean;
  notifyOnCritical?: boolean;
}

/**
 * 错误处理结果
 */
export interface ErrorHandlingResult {
  handled: boolean;
  shouldRetry: boolean;
  retryAfter?: number;
  error?: ErrorInfo;
}

/**
 * 通用错误处理器
 */
@injectable()
export class ErrorHandler {
  private errorHistory: ErrorInfo[] = [];
  private config: ErrorHandlerConfig;

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      timeout: config.timeout ?? 30000,
      logErrors: config.logErrors ?? true,
      notifyOnCritical: config.notifyOnCritical ?? false,
      ...config
    };
  }

  /**
   * 处理错误
   */
  handleError(error: unknown, executionId?: string): ErrorHandlingResult {
    const errorInfo = this.createErrorInfo(error, executionId);
    
    // 记录错误
    this.recordError(errorInfo);
    
    // 根据错误类型决定处理策略
    const handlingResult = this.determineHandlingStrategy(errorInfo);
    
    // 记录错误处理结果
    if (this.config.logErrors) {
      this.logError(errorInfo, handlingResult);
    }

    return handlingResult;
  }

  /**
   * 创建错误信息
   */
  private createErrorInfo(error: unknown, executionId?: string): ErrorInfo {
    const errorType = this.classifyError(error);
    
    return {
      type: errorType,
      message: error instanceof Error ? error.message : String(error),
      code: this.extractErrorCode(error),
      details: this.extractErrorDetails(error),
      timestamp: new Date(),
      executionId,
      stackTrace: error instanceof Error ? error.stack : undefined
    };
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: unknown): ErrorType {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('validation') || message.includes('invalid')) {
        return ErrorType.VALIDATION_ERROR;
      }
      if (message.includes('timeout') || message.includes('timed out')) {
        return ErrorType.TIMEOUT_ERROR;
      }
      if (message.includes('network') || message.includes('connection')) {
        return ErrorType.NETWORK_ERROR;
      }
      if (message.includes('resource') || message.includes('memory')) {
        return ErrorType.RESOURCE_ERROR;
      }
      if (message.includes('config') || message.includes('configuration')) {
        return ErrorType.CONFIGURATION_ERROR;
      }
    }
    
    return ErrorType.EXECUTION_ERROR;
  }

  /**
   * 提取错误代码
   */
  private extractErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'code' in error) {
      return String((error as any).code);
    }
    return undefined;
  }

  /**
   * 提取错误详情
   */
  private extractErrorDetails(error: unknown): Record<string, unknown> | undefined {
    if (error && typeof error === 'object') {
      const details: Record<string, unknown> = {};
      
      // 排除常见属性，避免信息冗余
      const excludeProps = ['message', 'name', 'stack', 'code'];
      
      Object.entries(error).forEach(([key, value]) => {
        if (!excludeProps.includes(key)) {
          details[key] = value;
        }
      });
      
      return Object.keys(details).length > 0 ? details : undefined;
    }
    
    return undefined;
  }

  /**
   * 确定处理策略
   */
  private determineHandlingStrategy(errorInfo: ErrorInfo): ErrorHandlingResult {
    const shouldRetry = this.shouldRetry(errorInfo);
    const retryAfter = shouldRetry ? this.config.retryDelay : undefined;

    return {
      handled: true,
      shouldRetry,
      retryAfter,
      error: errorInfo
    };
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(errorInfo: ErrorInfo): boolean {
    // 某些错误类型不应该重试
    const nonRetryableErrors = [
      ErrorType.VALIDATION_ERROR,
      ErrorType.CONFIGURATION_ERROR
    ];
    
    if (nonRetryableErrors.includes(errorInfo.type)) {
      return false;
    }
    
    // 检查重试次数
    const recentErrors = this.getRecentErrors(errorInfo.executionId);
    return recentErrors.length < (this.config.maxRetries ?? 3);
  }

  /**
   * 记录错误
   */
  private recordError(errorInfo: ErrorInfo): void {
    this.errorHistory.push(errorInfo);
    
    // 限制历史记录数量
    if (this.errorHistory.length > 1000) {
      this.errorHistory.shift();
    }
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo, handlingResult: ErrorHandlingResult): void {
    const logEntry = {
      timestamp: errorInfo.timestamp.toISOString(),
      executionId: errorInfo.executionId,
      errorType: errorInfo.type,
      message: errorInfo.message,
      handled: handlingResult.handled,
      shouldRetry: handlingResult.shouldRetry,
      retryAfter: handlingResult.retryAfter
    };
    
    console.error('错误处理日志:', logEntry);
    
    if (errorInfo.stackTrace) {
      console.error('堆栈跟踪:', errorInfo.stackTrace);
    }
  }

  /**
   * 获取最近的错误
   */
  private getRecentErrors(executionId?: string, timeWindowMs: number = 60000): ErrorInfo[] {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    return this.errorHistory.filter(error => {
      const matchesExecution = !executionId || error.executionId === executionId;
      const isRecent = error.timestamp >= cutoffTime;
      return matchesExecution && isRecent;
    });
  }

  /**
   * 获取错误统计
   */
  getErrorStatistics(timeWindowMs?: number): {
    totalErrors: number;
    byType: Record<ErrorType, number>;
    byExecution: Record<string, number>;
    errorRate: number;
  } {
    const errors = timeWindowMs 
      ? this.errorHistory.filter(e => e.timestamp >= new Date(Date.now() - timeWindowMs))
      : this.errorHistory;
    
    const byType: Record<ErrorType, number> = {} as Record<ErrorType, number>;
    const byExecution: Record<string, number> = {};
    
    // 初始化类型统计
    Object.values(ErrorType).forEach(type => {
      byType[type as ErrorType] = 0;
    });
    
    errors.forEach(error => {
      // 按类型统计
      byType[error.type]++;
      
      // 按执行ID统计
      if (error.executionId) {
        byExecution[error.executionId] = (byExecution[error.executionId] || 0) + 1;
      }
    });
    
    const totalErrors = errors.length;
    const errorRate = timeWindowMs ? (totalErrors / (timeWindowMs / 1000)) : 0;
    
    return {
      totalErrors,
      byType,
      byExecution,
      errorRate
    };
  }

  /**
   * 清空错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory.length = 0;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }

  /**
   * 创建预配置的错误处理器
   */
  static create(config?: ErrorHandlerConfig): ErrorHandler {
    return new ErrorHandler(config);
  }

  /**
   * 创建快速错误处理函数
   */
  static createQuickHandler(config?: ErrorHandlerConfig): (error: unknown) => ErrorHandlingResult {
    const handler = new ErrorHandler(config);
    return (error: unknown) => handler.handleError(error);
  }
}