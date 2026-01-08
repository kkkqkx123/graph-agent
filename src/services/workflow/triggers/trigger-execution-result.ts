/**
 * 触发器执行结果
 *
 * 注意：这是 TriggerExecutor 返回的执行结果，与 domain 层的 TriggerExecutionResult 不同
 * domain 层的 TriggerExecutionResult 用于 Trigger 实体的 evaluate() 方法
 */
export interface TriggerExecutorResult {
  /**
   * 触发器ID
   */
  triggerId: string;

  /**
   * 是否应该触发
   */
  shouldTrigger: boolean;

  /**
   * 执行是否成功
   */
  success: boolean;

  /**
   * 执行错误
   */
  error?: Error;

  /**
   * 执行时间（毫秒）
   */
  executionTime: number;

  /**
   * 触发数据
   */
  data?: Record<string, any>;

  /**
   * 消息
   */
  message?: string;
}

/**
 * 触发器执行结果构建器
 */
export class TriggerExecutorResultBuilder {
  private triggerId: string = '';
  private shouldTrigger: boolean = false;
  private success: boolean = true;
  private error?: Error;
  private executionTime: number = 0;
  private data: Record<string, any> = {};
  private message: string = '';

  /**
   * 设置触发器ID
   */
  setTriggerId(triggerId: string): TriggerExecutorResultBuilder {
    this.triggerId = triggerId;
    return this;
  }

  /**
   * 设置是否应该触发
   */
  setShouldTrigger(shouldTrigger: boolean): TriggerExecutorResultBuilder {
    this.shouldTrigger = shouldTrigger;
    return this;
  }

  /**
   * 设置执行成功状态
   */
  setSuccess(success: boolean): TriggerExecutorResultBuilder {
    this.success = success;
    return this;
  }

  /**
   * 设置执行错误
   */
  setError(error: Error): TriggerExecutorResultBuilder {
    this.error = error;
    return this;
  }

  /**
   * 设置执行时间
   */
  setExecutionTime(executionTime: number): TriggerExecutorResultBuilder {
    this.executionTime = executionTime;
    return this;
  }

  /**
   * 设置触发数据
   */
  setData(data: Record<string, any>): TriggerExecutorResultBuilder {
    this.data = { ...this.data, ...data };
    return this;
  }

  /**
   * 设置消息
   */
  setMessage(message: string): TriggerExecutorResultBuilder {
    this.message = message;
    return this;
  }

  /**
   * 构建触发器执行结果
   */
  build(): TriggerExecutorResult {
    return {
      triggerId: this.triggerId,
      shouldTrigger: this.shouldTrigger,
      success: this.success,
      error: this.error,
      executionTime: this.executionTime,
      data: this.data,
      message: this.message,
    };
  }
}

/**
 * 触发器执行结果工具类
 */
export class TriggerExecutorResultUtils {
  /**
   * 创建成功的触发结果
   */
  static success(message: string = '触发器条件满足'): TriggerExecutorResultBuilder {
    return new TriggerExecutorResultBuilder()
      .setShouldTrigger(true)
      .setSuccess(true)
      .setMessage(message);
  }

  /**
   * 创建失败的触发结果
   */
  static failure(
    message: string = '触发器条件不满足',
    error?: Error
  ): TriggerExecutorResultBuilder {
    const builder = new TriggerExecutorResultBuilder()
      .setShouldTrigger(false)
      .setSuccess(error ? false : true)
      .setMessage(message);

    if (error) {
      builder.setError(error);
    }

    return builder;
  }
}
