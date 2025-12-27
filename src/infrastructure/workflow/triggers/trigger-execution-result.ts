/**
 * 触发器执行结果
 */
export interface TriggerExecutionResult {
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
export class TriggerExecutionResultBuilder {
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
  setTriggerId(triggerId: string): TriggerExecutionResultBuilder {
    this.triggerId = triggerId;
    return this;
  }

  /**
   * 设置是否应该触发
   */
  setShouldTrigger(shouldTrigger: boolean): TriggerExecutionResultBuilder {
    this.shouldTrigger = shouldTrigger;
    return this;
  }

  /**
   * 设置执行成功状态
   */
  setSuccess(success: boolean): TriggerExecutionResultBuilder {
    this.success = success;
    return this;
  }

  /**
   * 设置执行错误
   */
  setError(error: Error): TriggerExecutionResultBuilder {
    this.error = error;
    return this;
  }

  /**
   * 设置执行时间
   */
  setExecutionTime(executionTime: number): TriggerExecutionResultBuilder {
    this.executionTime = executionTime;
    return this;
  }

  /**
   * 设置触发数据
   */
  setData(data: Record<string, any>): TriggerExecutionResultBuilder {
    this.data = { ...this.data, ...data };
    return this;
  }

  /**
   * 设置消息
   */
  setMessage(message: string): TriggerExecutionResultBuilder {
    this.message = message;
    return this;
  }

  /**
   * 构建触发器执行结果
   */
  build(): TriggerExecutionResult {
    return {
      triggerId: this.triggerId,
      shouldTrigger: this.shouldTrigger,
      success: this.success,
      error: this.error,
      executionTime: this.executionTime,
      data: this.data,
      message: this.message
    };
  }
}

/**
 * 触发器执行结果工具类
 */
export class TriggerExecutionResultUtils {
  /**
   * 创建成功的触发结果
   */
  static success(message: string = '触发器条件满足'): TriggerExecutionResultBuilder {
    return new TriggerExecutionResultBuilder()
      .setShouldTrigger(true)
      .setSuccess(true)
      .setMessage(message);
  }

  /**
   * 创建失败的触发结果
   */
  static failure(message: string = '触发器条件不满足', error?: Error): TriggerExecutionResultBuilder {
    const builder = new TriggerExecutionResultBuilder()
      .setShouldTrigger(false)
      .setSuccess(error ? false : true)
      .setMessage(message);

    if (error) {
      builder.setError(error);
    }

    return builder;
  }
}