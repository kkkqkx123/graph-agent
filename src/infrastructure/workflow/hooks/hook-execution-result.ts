/**
 * 钩子执行结果
 */
export interface HookExecutionResult {
  /**
   * 钩子ID
   */
  hookId: string;

  /**
   * 执行是否成功
   */
  success: boolean;

  /**
   * 执行结果
   */
  result?: any;

  /**
   * 执行错误
   */
  error?: Error;

  /**
   * 执行时间（毫秒）
   */
  executionTime: number;

  /**
   * 是否应该继续执行后续钩子
   */
  shouldContinue: boolean;

  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 钩子执行结果构建器
 */
export class HookExecutionResultBuilder {
  private hookId: string = '';
  private success: boolean = true;
  private result?: any;
  private error?: Error;
  private executionTime: number = 0;
  private shouldContinue: boolean = true;
  private metadata: Record<string, any> = {};

  /**
   * 设置钩子ID
   */
  setHookId(hookId: string): HookExecutionResultBuilder {
    this.hookId = hookId;
    return this;
  }

  /**
   * 设置执行成功状态
   */
  setSuccess(success: boolean): HookExecutionResultBuilder {
    this.success = success;
    return this;
  }

  /**
   * 设置执行结果
   */
  setResult(result: any): HookExecutionResultBuilder {
    this.result = result;
    return this;
  }

  /**
   * 设置执行错误
   */
  setError(error: Error): HookExecutionResultBuilder {
    this.error = error;
    return this;
  }

  /**
   * 设置执行时间
   */
  setExecutionTime(executionTime: number): HookExecutionResultBuilder {
    this.executionTime = executionTime;
    return this;
  }

  /**
   * 设置是否应该继续执行
   */
  setShouldContinue(shouldContinue: boolean): HookExecutionResultBuilder {
    this.shouldContinue = shouldContinue;
    return this;
  }

  /**
   * 设置元数据
   */
  setMetadata(metadata: Record<string, any>): HookExecutionResultBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * 构建钩子执行结果
   */
  build(): HookExecutionResult {
    return {
      hookId: this.hookId,
      success: this.success,
      result: this.result,
      error: this.error,
      executionTime: this.executionTime,
      shouldContinue: this.shouldContinue,
      metadata: this.metadata
    };
  }
}