/**
 * 插件执行结果接口
 * 
 * 表示插件执行后的结果
 */
export interface PluginExecutionResult {
  /**
   * 插件ID
   */
  pluginId: string;

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
   * 是否应该继续执行后续插件
   */
  shouldContinue: boolean;

  /**
   * 是否应该重试
   */
  shouldRetry: boolean;

  /**
   * 重试次数
   */
  retryCount: number;

  /**
   * 输出数据
   */
  outputData?: any;

  /**
   * 状态变更
   */
  stateChanges?: Record<string, unknown>;

  /**
   * 元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * 插件事件接口
 */
export interface PluginEvent {
  /**
   * 事件类型
   */
  type: string;

  /**
   * 事件数据
   */
  data: any;

  /**
   * 事件源
   */
  source: string;

  /**
   * 时间戳
   */
  timestamp: Date;

  /**
   * 元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * 插件执行结果构建器
 * 
 * 用于构建插件执行结果
 */
export class PluginExecutionResultBuilder {
  private result: Partial<PluginExecutionResult> = {};

  /**
   * 设置插件ID
   */
  public setPluginId(pluginId: string): PluginExecutionResultBuilder {
    this.result.pluginId = pluginId;
    return this;
  }

  /**
   * 设置成功状态
   */
  public setSuccess(success: boolean): PluginExecutionResultBuilder {
    this.result.success = success;
    return this;
  }

  /**
   * 设置结果数据
   */
  public setResult(result: any): PluginExecutionResultBuilder {
    this.result.result = result;
    return this;
  }

  /**
   * 设置错误信息
   */
  public setError(error: Error): PluginExecutionResultBuilder {
    this.result.error = error;
    return this;
  }

  /**
   * 设置执行时间
   */
  public setExecutionTime(executionTime: number): PluginExecutionResultBuilder {
    this.result.executionTime = executionTime;
    return this;
  }

  /**
   * 设置是否应该继续
   */
  public setShouldContinue(shouldContinue: boolean): PluginExecutionResultBuilder {
    this.result.shouldContinue = shouldContinue;
    return this;
  }

  /**
   * 设置是否应该重试
   */
  public setShouldRetry(shouldRetry: boolean): PluginExecutionResultBuilder {
    this.result.shouldRetry = shouldRetry;
    return this;
  }

  /**
   * 设置重试次数
   */
  public setRetryCount(retryCount: number): PluginExecutionResultBuilder {
    this.result.retryCount = retryCount;
    return this;
  }

  /**
   * 设置输出数据
   */
  public setOutputData(outputData: any): PluginExecutionResultBuilder {
    this.result.outputData = outputData;
    return this;
  }

  /**
   * 设置状态变更
   */
  public setStateChanges(stateChanges: Record<string, unknown>): PluginExecutionResultBuilder {
    this.result.stateChanges = stateChanges;
    return this;
  }

  /**
   * 设置元数据
   */
  public setMetadata(metadata: Record<string, unknown>): PluginExecutionResultBuilder {
    this.result.metadata = metadata;
    return this;
  }

  /**
   * 添加元数据
   */
  public addMetadata(key: string, value: unknown): PluginExecutionResultBuilder {
    if (!this.result.metadata) {
      this.result.metadata = {};
    }
    this.result.metadata[key] = value;
    return this;
  }

  /**
   * 添加状态变更
   */
  public addStateChange(key: string, value: unknown): PluginExecutionResultBuilder {
    if (!this.result.stateChanges) {
      this.result.stateChanges = {};
    }
    this.result.stateChanges[key] = value;
    return this;
  }

  /**
   * 构建插件执行结果
   */
  public build(): PluginExecutionResult {
    // 验证必需字段
    if (!this.result.pluginId) {
      throw new Error('插件ID不能为空');
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

    if (this.result.retryCount === undefined) {
      this.result.retryCount = 0;
    }

    return this.result as PluginExecutionResult;
  }

  /**
   * 从现有结果创建构建器
   */
  public static from(result: Partial<PluginExecutionResult>): PluginExecutionResultBuilder {
    const builder = new PluginExecutionResultBuilder();
    builder.result = { ...result };
    return builder;
  }

  /**
   * 创建成功结果
   */
  public static success(
    pluginId: string,
    result?: any,
    executionTime?: number,
    outputData?: any,
    metadata?: Record<string, unknown>
  ): PluginExecutionResult {
    return new PluginExecutionResultBuilder()
      .setPluginId(pluginId)
      .setSuccess(true)
      .setResult(result)
      .setExecutionTime(executionTime || 0)
      .setOutputData(outputData)
      .setShouldContinue(true)
      .setShouldRetry(false)
      .setRetryCount(0)
      .setMetadata(metadata || {})
      .build();
  }

  /**
   * 创建失败结果
   */
  public static failure(
    pluginId: string,
    error: Error,
    executionTime?: number,
    shouldRetry?: boolean,
    retryCount?: number,
    metadata?: Record<string, unknown>
  ): PluginExecutionResult {
    return new PluginExecutionResultBuilder()
      .setPluginId(pluginId)
      .setSuccess(false)
      .setError(error)
      .setExecutionTime(executionTime || 0)
      .setShouldContinue(false)
      .setShouldRetry(shouldRetry || false)
      .setRetryCount(retryCount || 0)
      .setMetadata(metadata || {})
      .build();
  }

  /**
   * 创建跳过结果
   */
  public static skipped(
    pluginId: string,
    reason: string,
    executionTime?: number,
    metadata?: Record<string, unknown>
  ): PluginExecutionResult {
    return new PluginExecutionResultBuilder()
      .setPluginId(pluginId)
      .setSuccess(true)
      .setResult({ skipped: true, reason })
      .setExecutionTime(executionTime || 0)
      .setShouldContinue(true)
      .setShouldRetry(false)
      .setRetryCount(0)
      .setMetadata(metadata || {})
      .build();
  }

  /**
   * 检查结果是否成功
   */
  public static isSuccess(result: PluginExecutionResult): boolean {
    return result.success;
  }

  /**
   * 检查结果是否失败
   */
  public static isFailure(result: PluginExecutionResult): boolean {
    return !result.success;
  }

  /**
   * 检查是否应该继续
   */
  public static shouldContinue(result: PluginExecutionResult): boolean {
    return result.shouldContinue;
  }

  /**
   * 检查是否应该重试
   */
  public static shouldRetry(result: PluginExecutionResult): boolean {
    return result.shouldRetry;
  }

  /**
   * 获取错误消息
   */
  public static getErrorMessage(result: PluginExecutionResult): string | null {
    return result.error?.message || null;
  }

  /**
   * 获取结果摘要
   */
  public static getSummary(result: PluginExecutionResult): Record<string, unknown> {
    return {
      pluginId: result.pluginId,
      success: result.success,
      hasResult: !!result.result,
      hasError: !!result.error,
      executionTime: result.executionTime,
      shouldContinue: result.shouldContinue,
      shouldRetry: result.shouldRetry,
      retryCount: result.retryCount,
      hasOutputData: !!result.outputData,
      hasStateChanges: !!result.stateChanges,
      stateChangeCount: result.stateChanges ? Object.keys(result.stateChanges).length : 0,
      hasMetadata: !!result.metadata,
      errorMessage: result.error?.message
    };
  }

  /**
   * 创建批量结果摘要
   */
  public static createBatchSummary(results: PluginExecutionResult[]): {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    retried: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    errors: string[];
  } {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && !r.result?.skipped).length;
    const skipped = results.filter(r => r.result?.skipped).length;
    const retried = results.filter(r => r.shouldRetry).length;
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
      retried,
      totalExecutionTime,
      averageExecutionTime,
      errors
    };
  }

  /**
   * 创建插件事件
   */
  public static createEvent(
    type: string,
    data: any,
    source: string,
    metadata?: Record<string, unknown>
  ): PluginEvent {
    return {
      type,
      data,
      source,
      timestamp: new Date(),
      metadata
    };
  }

  /**
   * 创建状态变更事件
   */
  public static createStateChangeEvent(
    pluginId: string,
    stateChanges: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): PluginEvent {
    return PluginExecutionResultBuilder.createEvent(
      'state_change',
      { pluginId, stateChanges },
      pluginId,
      metadata
    );
  }

  /**
   * 创建输出数据事件
   */
  public static createOutputDataEvent(
    pluginId: string,
    outputData: any,
    metadata?: Record<string, unknown>
  ): PluginEvent {
    return PluginExecutionResultBuilder.createEvent(
      'output_data',
      { pluginId, outputData },
      pluginId,
      metadata
    );
  }

  /**
   * 创建错误事件
   */
  public static createErrorEvent(
    pluginId: string,
    error: Error,
    metadata?: Record<string, unknown>
  ): PluginEvent {
    return PluginExecutionResultBuilder.createEvent(
      'error',
      { pluginId, error: error.message, stack: error.stack },
      pluginId,
      metadata
    );
  }
}