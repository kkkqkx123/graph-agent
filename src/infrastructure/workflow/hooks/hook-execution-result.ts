/**
 * 钩子执行结果接口
 * 
 * 表示钩子执行后的结果
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
   * 执行结果数据
   */
  result?: any;

  /**
   * 错误信息
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
   * 是否应该重试
   */
  shouldRetry: boolean;

  /**
   * 元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * 钩子执行结果构建器
 * 
 * 用于构建钩子执行结果
 */
export class HookExecutionResultBuilder {
  private result: Partial<HookExecutionResult> = {};

  /**
   * 设置钩子ID
   */
  public setHookId(hookId: string): HookExecutionResultBuilder {
    this.result.hookId = hookId;
    return this;
  }

  /**
   * 设置成功状态
   */
  public setSuccess(success: boolean): HookExecutionResultBuilder {
    this.result.success = success;
    return this;
  }

  /**
   * 设置结果数据
   */
  public setResult(result: any): HookExecutionResultBuilder {
    this.result.result = result;
    return this;
  }

  /**
   * 设置错误信息
   */
  public setError(error: Error): HookExecutionResultBuilder {
    this.result.error = error;
    return this;
  }

  /**
   * 设置执行时间
   */
  public setExecutionTime(executionTime: number): HookExecutionResultBuilder {
    this.result.executionTime = executionTime;
    return this;
  }

  /**
   * 设置是否应该继续
   */
  public setShouldContinue(shouldContinue: boolean): HookExecutionResultBuilder {
    this.result.shouldContinue = shouldContinue;
    return this;
  }

  /**
   * 设置是否应该重试
   */
  public setShouldRetry(shouldRetry: boolean): HookExecutionResultBuilder {
    this.result.shouldRetry = shouldRetry;
    return this;
  }

  /**
   * 设置元数据
   */
  public setMetadata(metadata: Record<string, unknown>): HookExecutionResultBuilder {
    this.result.metadata = metadata;
    return this;
  }

  /**
   * 添加元数据
   */
  public addMetadata(key: string, value: unknown): HookExecutionResultBuilder {
    if (!this.result.metadata) {
      this.result.metadata = {};
    }
    this.result.metadata[key] = value;
    return this;
  }

  /**
   * 构建钩子执行结果
   */
  public build(): HookExecutionResult {
    // 验证必需字段
    if (!this.result.hookId) {
      throw new Error('钩子ID不能为空');
    }

    // 设置默认值
    if (this.result.success === undefined) {
      this.result.success = true;
    }

    if (this.result.executionTime === undefined) {
      this.result.executionTime = 0;
    }

    if (this.result.shouldContinue === undefined) {
      this.result.shouldContinue = true;
    }

    if (this.result.shouldRetry === undefined) {
      this.result.shouldRetry = false;
    }

    return this.result as HookExecutionResult;
  }

  /**
   * 从现有结果创建构建器
   */
  public static from(result: Partial<HookExecutionResult>): HookExecutionResultBuilder {
    const builder = new HookExecutionResultBuilder();
    builder.result = { ...result };
    return builder;
  }

  /**
   * 创建成功结果
   */
  public static success(
    hookId: string,
    result?: any,
    executionTime?: number,
    metadata?: Record<string, unknown>
  ): HookExecutionResult {
    return new HookExecutionResultBuilder()
      .setHookId(hookId)
      .setSuccess(true)
      .setResult(result)
      .setExecutionTime(executionTime || 0)
      .setShouldContinue(true)
      .setShouldRetry(false)
      .setMetadata(metadata || {})
      .build();
  }

  /**
   * 创建失败结果
   */
  public static failure(
    hookId: string,
    error: Error,
    executionTime?: number,
    shouldRetry?: boolean,
    metadata?: Record<string, unknown>
  ): HookExecutionResult {
    return new HookExecutionResultBuilder()
      .setHookId(hookId)
      .setSuccess(false)
      .setError(error)
      .setExecutionTime(executionTime || 0)
      .setShouldContinue(false)
      .setShouldRetry(shouldRetry || false)
      .setMetadata(metadata || {})
      .build();
  }

  /**
   * 创建跳过结果
   */
  public static skipped(
    hookId: string,
    reason: string,
    executionTime?: number,
    metadata?: Record<string, unknown>
  ): HookExecutionResult {
    return new HookExecutionResultBuilder()
      .setHookId(hookId)
      .setSuccess(true)
      .setResult({ skipped: true, reason })
      .setExecutionTime(executionTime || 0)
      .setShouldContinue(true)
      .setShouldRetry(false)
      .setMetadata(metadata || {})
      .build();
  }

  /**
   * 检查结果是否成功
   */
  public static isSuccess(result: HookExecutionResult): boolean {
    return result.success;
  }

  /**
   * 检查结果是否失败
   */
  public static isFailure(result: HookExecutionResult): boolean {
    return !result.success;
  }

  /**
   * 检查是否应该继续
   */
  public static shouldContinue(result: HookExecutionResult): boolean {
    return result.shouldContinue;
  }

  /**
   * 检查是否应该重试
   */
  public static shouldRetry(result: HookExecutionResult): boolean {
    return result.shouldRetry;
  }

  /**
   * 获取错误消息
   */
  public static getErrorMessage(result: HookExecutionResult): string | null {
    return result.error?.message || null;
  }

  /**
   * 获取结果摘要
   */
  public static getSummary(result: HookExecutionResult): Record<string, unknown> {
    return {
      hookId: result.hookId,
      success: result.success,
      hasResult: !!result.result,
      hasError: !!result.error,
      executionTime: result.executionTime,
      shouldContinue: result.shouldContinue,
      shouldRetry: result.shouldRetry,
      hasMetadata: !!result.metadata,
      errorMessage: result.error?.message
    };
  }

  /**
   * 创建批量结果摘要
   */
  public static createBatchSummary(results: HookExecutionResult[]): {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    errors: string[];
  } {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && !r.result?.skipped).length;
    const skipped = results.filter(r => r.result?.skipped).length;
    const totalExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    const averageExecutionTime = total > 0 ? totalExecutionTime / total : 0;
    const errors = results
      .filter(r => r.error)
      .map(r => r.error?.message || 'Unknown error');

    return {
      total,
      successful,
      failed,
      skipped,
      totalExecutionTime,
      averageExecutionTime,
      errors
    };
  }
}