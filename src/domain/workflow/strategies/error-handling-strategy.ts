import { ExecutionContext, ExecutionResult, ExecutionStatus } from '../execution';
import { ExecutionStrategy } from './execution-strategy';

/**
 * 错误处理策略接口
 * 
 * 定义工作流执行过程中的错误处理策略
 */
export interface ErrorHandlingStrategy {
  /**
   * 错误处理策略名称
   */
  readonly name: string;
  
  /**
   * 错误处理策略类型
   */
  readonly type: ErrorHandlingStrategyType;
  
  /**
   * 错误处理策略描述
   */
  readonly description: string;
  
  /**
   * 处理错误
   * @param error 错误对象
   * @param context 执行上下文
   * @param executionStrategy 执行策略
   * @returns 处理结果
   */
  handleError(
    error: Error,
    context: ExecutionContext,
    executionStrategy: ExecutionStrategy
  ): Promise<ExecutionResult>;
  
  /**
   * 检查是否应该重试
   * @param error 错误对象
   * @param retryCount 已重试次数
   * @param context 执行上下文
   * @returns 是否应该重试
   */
  shouldRetry(error: Error, retryCount: number, context: ExecutionContext): boolean;
  
  /**
   * 获取重试延迟
   * @param retryCount 重试次数
   * @returns 延迟时间（毫秒）
   */
  getRetryDelay(retryCount: number): number;
  
  /**
   * 获取最大重试次数
   * @returns 最大重试次数
   */
  getMaxRetries(): number;
  
  /**
   * 验证策略配置
   */
  validate(): void;
}

/**
 * 错误处理策略类型枚举
 */
export enum ErrorHandlingStrategyType {
  FAIL_FAST = 'fail-fast',
  RETRY_ON_ERROR = 'retry-on-error',
  CONTINUE_ON_ERROR = 'continue-on-error',
  CUSTOM = 'custom'
}

/**
 * 快速失败策略
 * 
 * 遇到错误立即停止执行，适用于关键业务流程
 */
export class FailFastStrategy implements ErrorHandlingStrategy {
  readonly name = 'Fail Fast';
  readonly type = ErrorHandlingStrategyType.FAIL_FAST;
  readonly description = '遇到错误立即停止执行';
  
  async handleError(
    error: Error,
    context: ExecutionContext,
    executionStrategy: ExecutionStrategy
  ): Promise<ExecutionResult> {
    // 立即停止执行，返回失败结果
    return {
      executionId: context.executionId,
      status: ExecutionStatus.FAILED,
      error,
      statistics: {
        totalTime: Date.now() - context.startTime.getMilliseconds(),
        nodeExecutionTime: 0,
        successfulNodes: 0,
        failedNodes: 1,
        skippedNodes: 0,
        retries: 0
      }
    };
  }
  
  shouldRetry(error: Error, retryCount: number, context: ExecutionContext): boolean {
    // 快速失败策略不重试
    return false;
  }
  
  getRetryDelay(retryCount: number): number {
    return 0;
  }
  
  getMaxRetries(): number {
    return 0;
  }
  
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('错误处理策略名称不能为空');
    }
    
    if (this.type !== ErrorHandlingStrategyType.FAIL_FAST) {
      throw new Error('错误处理策略类型不匹配');
    }
  }
}

/**
 * 错误重试策略
 * 
 * 遇到错误时进行重试，适用于临时性错误
 */
export class RetryOnErrorStrategy implements ErrorHandlingStrategy {
  readonly name = 'Retry on Error';
  readonly type = ErrorHandlingStrategyType.RETRY_ON_ERROR;
  readonly description = '遇到错误时进行重试';
  
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  private backoffMultiplier: number;
  private retryableErrors: string[];
  
  constructor(
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 30000,
    backoffMultiplier: number = 2,
    retryableErrors?: string[]
  ) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.backoffMultiplier = backoffMultiplier;
    this.retryableErrors = retryableErrors || [
      'NetworkError',
      'TimeoutError',
      'ConnectionError',
      'ServiceUnavailableError'
    ];
  }
  
  async handleError(
    error: Error,
    context: ExecutionContext,
    executionStrategy: ExecutionStrategy
  ): Promise<ExecutionResult> {
    const retryCount = (context.metadata as any)?.['retryCount'] || 0;
    
    // 检查是否应该重试
    if (this.shouldRetry(error, retryCount, context)) {
      const delay = this.getRetryDelay(retryCount);
      
      // 等待重试延迟
      await this.sleep(delay);
      
      // 更新重试计数
      context.metadata = {
        ...context.metadata,
        retryCount: retryCount + 1
      };
      
      // 重试执行
      try {
        return await executionStrategy.execute(
          new Map(), // 这里应该传入正确的节点和边
          new Map(),
          context
        );
      } catch (retryError) {
        // 如果重试仍然失败，返回失败结果
        return this.createFailureResult(retryError as Error, context);
      }
    } else {
      // 不可重试的错误，直接返回失败结果
      return this.createFailureResult(error, context);
    }
  }
  
  shouldRetry(error: Error, retryCount: number, context: ExecutionContext): boolean {
    // 检查重试次数
    if (retryCount >= this.maxRetries) {
      return false;
    }
    
    // 检查错误类型是否可重试
    const errorType = this.getErrorType(error);
    if (!this.retryableErrors.includes(errorType)) {
      return false;
    }
    
    // 检查上下文是否允许重试
    if (context.config?.maxRetries !== undefined && retryCount >= context.config.maxRetries) {
      return false;
    }
    
    return true;
  }
  
  getRetryDelay(retryCount: number): number {
    // 指数退避
    const delay = this.baseDelay * Math.pow(this.backoffMultiplier, retryCount);
    return Math.min(delay, this.maxDelay);
  }
  
  getMaxRetries(): number {
    return this.maxRetries;
  }
  
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('错误处理策略名称不能为空');
    }
    
    if (this.type !== ErrorHandlingStrategyType.RETRY_ON_ERROR) {
      throw new Error('错误处理策略类型不匹配');
    }
    
    if (this.maxRetries < 0) {
      throw new Error('最大重试次数不能为负数');
    }
    
    if (this.baseDelay <= 0) {
      throw new Error('基础延迟必须大于0');
    }
    
    if (this.maxDelay <= 0) {
      throw new Error('最大延迟必须大于0');
    }
    
    if (this.backoffMultiplier <= 1) {
      throw new Error('退避乘数必须大于1');
    }
    
    if (this.baseDelay > this.maxDelay) {
      throw new Error('基础延迟不能大于最大延迟');
    }
  }
  
  /**
   * 获取错误类型
   */
  private getErrorType(error: Error): string {
    return error.constructor.name;
  }
  
  /**
   * 创建失败结果
   */
  private createFailureResult(error: Error, context: ExecutionContext): ExecutionResult {
    return {
      executionId: context.executionId,
      status: ExecutionStatus.FAILED,
      error,
      statistics: {
        totalTime: Date.now() - context.startTime.getMilliseconds(),
        nodeExecutionTime: 0,
        successfulNodes: 0,
        failedNodes: 1,
        skippedNodes: 0,
        retries: (context.metadata as any)?.['retryCount'] || 0
      }
    };
  }
  
  /**
   * 睡眠函数
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 继续执行策略
 * 
 * 遇到错误时跳过错误节点继续执行，适用于非关键节点
 */
export class ContinueOnErrorStrategy implements ErrorHandlingStrategy {
  readonly name = 'Continue on Error';
  readonly type = ErrorHandlingStrategyType.CONTINUE_ON_ERROR;
  readonly description = '遇到错误时跳过错误节点继续执行';
  
  private maxRetries: number;
  private skipOnError: boolean;
  
  constructor(maxRetries: number = 0, skipOnError: boolean = true) {
    this.maxRetries = maxRetries;
    this.skipOnError = skipOnError;
  }
  
  async handleError(
    error: Error,
    context: ExecutionContext,
    executionStrategy: ExecutionStrategy
  ): Promise<ExecutionResult> {
    const retryCount = (context.metadata as any)?.['retryCount'] || 0;
    
    // 首先尝试重试（如果有重试次数）
    if (this.shouldRetry(error, retryCount, context)) {
      const delay = this.getRetryDelay(retryCount);
      await this.sleep(delay);
      
      context.metadata = {
        ...context.metadata,
        retryCount: retryCount + 1
      };
      
      try {
        return await executionStrategy.execute(
          new Map(),
          new Map(),
          context
        );
      } catch (retryError) {
        // 重试失败，继续执行或跳过
        return this.handleContinueOnError(retryError as Error, context);
      }
    } else {
      // 直接处理继续执行逻辑
      return this.handleContinueOnError(error, context);
    }
  }
  
  shouldRetry(error: Error, retryCount: number, context: ExecutionContext): boolean {
    return retryCount < this.maxRetries;
  }
  
  getRetryDelay(retryCount: number): number {
    return 1000; // 固定1秒延迟
  }
  
  getMaxRetries(): number {
    return this.maxRetries;
  }
  
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('错误处理策略名称不能为空');
    }
    
    if (this.type !== ErrorHandlingStrategyType.CONTINUE_ON_ERROR) {
      throw new Error('错误处理策略类型不匹配');
    }
    
    if (this.maxRetries < 0) {
      throw new Error('最大重试次数不能为负数');
    }
  }
  
  /**
   * 处理继续执行逻辑
   */
  private handleContinueOnError(error: Error, context: ExecutionContext): ExecutionResult {
    if (this.skipOnError) {
      // 跳过错误节点，标记为成功但跳过
      return {
        executionId: context.executionId,
        status: ExecutionStatus.COMPLETED,
        data: {
          skipped: true,
          error: error.message
        },
        statistics: {
          totalTime: Date.now() - context.startTime.getMilliseconds(),
          nodeExecutionTime: 0,
          successfulNodes: 0,
          failedNodes: 0,
          skippedNodes: 1,
          retries: (context.metadata as any)?.['retryCount'] || 0
        }
      };
    } else {
      // 不跳过，返回失败
      return {
        executionId: context.executionId,
        status: ExecutionStatus.FAILED,
        error,
        statistics: {
          totalTime: Date.now() - context.startTime.getMilliseconds(),
          nodeExecutionTime: 0,
          successfulNodes: 0,
          failedNodes: 1,
          skippedNodes: 0,
          retries: (context.metadata as any)?.['retryCount'] || 0
        }
      };
    }
  }
  
  /**
   * 睡眠函数
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 错误处理策略工厂
 */
export class ErrorHandlingStrategyFactory {
  /**
   * 创建错误处理策略
   */
  static create(
    type: ErrorHandlingStrategyType,
    options?: Record<string, any>
  ): ErrorHandlingStrategy {
    switch (type) {
      case ErrorHandlingStrategyType.FAIL_FAST:
        return new FailFastStrategy();
      
      case ErrorHandlingStrategyType.RETRY_ON_ERROR:
        return new RetryOnErrorStrategy(
          (options as any)?.['maxRetries'],
          (options as any)?.['baseDelay'],
          (options as any)?.['maxDelay'],
          (options as any)?.['backoffMultiplier'],
          (options as any)?.['retryableErrors']
        );
      
      case ErrorHandlingStrategyType.CONTINUE_ON_ERROR:
        return new ContinueOnErrorStrategy(
          (options as any)?.['maxRetries'],
          (options as any)?.['skipOnError']
        );
      
      // TODO: 实现自定义错误处理策略
      // case ErrorHandlingStrategyType.CUSTOM:
      //   return new CustomErrorHandlingStrategy(options);
      
      default:
        throw new Error(`不支持错误处理策略类型: ${type}`);
    }
  }
  
  /**
   * 创建默认错误处理策略
   */
  static default(): ErrorHandlingStrategy {
    return new FailFastStrategy();
  }
}