import { TriggerState } from './trigger-state';

/**
 * 触发器执行结果接口
 * 表示触发器执行后的结果
 */
export interface TriggerExecutionResult {
  /** 是否成功 */
  readonly success: boolean;
  
  /** 触发器状态 */
  readonly state: TriggerState;
  
  /** 执行消息 */
  readonly message: string;
  
  /** 执行数据 */
  readonly data: Record<string, any>;
  
  /** 错误信息 */
  readonly error?: Error;
  
  /** 执行开始时间 */
  readonly startTime: Date;
  
  /** 执行结束时间 */
  readonly endTime: Date;
  
  /** 执行持续时间（毫秒） */
  readonly duration: number;
  
  /** 执行元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 触发器执行结果构建器
 */
export class TriggerExecutionResultBuilder {
  private success: boolean;
  private state: TriggerState;
  private message: string;
  private data: Record<string, any>;
  private error?: Error;
  private startTime: Date;
  private endTime: Date;
  private duration: number;
  private metadata: Record<string, any>;

  constructor(success: boolean = true, state: TriggerState = TriggerState.ACTIVE) {
    this.success = success;
    this.state = state;
    this.message = '';
    this.data = {};
    this.startTime = new Date();
    this.endTime = new Date();
    this.duration = 0;
    this.metadata = {};
  }

  withSuccess(success: boolean): TriggerExecutionResultBuilder {
    this.success = success;
    return this;
  }

  withState(state: TriggerState): TriggerExecutionResultBuilder {
    this.state = state;
    return this;
  }

  withMessage(message: string): TriggerExecutionResultBuilder {
    this.message = message;
    return this;
  }

  withData(data: Record<string, any>): TriggerExecutionResultBuilder {
    this.data = { ...this.data, ...data };
    return this;
  }

  withError(error: Error): TriggerExecutionResultBuilder {
    this.error = error;
    this.success = false;
    this.state = TriggerState.ERROR;
    return this;
  }

  withStartTime(startTime: Date): TriggerExecutionResultBuilder {
    this.startTime = startTime;
    return this;
  }

  withEndTime(endTime: Date): TriggerExecutionResultBuilder {
    this.endTime = endTime;
    this.duration = endTime.getTime() - this.startTime.getTime();
    return this;
  }

  withDuration(duration: number): TriggerExecutionResultBuilder {
    this.duration = duration;
    return this;
  }

  withMetadata(metadata: Record<string, any>): TriggerExecutionResultBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): TriggerExecutionResult {
    return {
      success: this.success,
      state: this.state,
      message: this.message,
      data: this.data,
      error: this.error,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      metadata: this.metadata
    };
  }
}

/**
 * 触发器执行结果工具类
 */
export class TriggerExecutionResultUtils {
  /**
   * 创建成功结果
   */
  static success(
    message: string = '触发器执行成功',
    data: Record<string, any> = {}
  ): TriggerExecutionResultBuilder {
    return new TriggerExecutionResultBuilder(true, TriggerState.ACTIVE)
      .withMessage(message)
      .withData(data);
  }

  /**
   * 创建失败结果
   */
  static failure(
    message: string = '触发器执行失败',
    error?: Error
  ): TriggerExecutionResultBuilder {
    const builder = new TriggerExecutionResultBuilder(false, TriggerState.ERROR)
      .withMessage(message);
    
    if (error) {
      builder.withError(error);
    }
    
    return builder;
  }

  /**
   * 创建暂停结果
   */
  static paused(
    message: string = '触发器已暂停',
    data: Record<string, any> = {}
  ): TriggerExecutionResultBuilder {
    return new TriggerExecutionResultBuilder(true, TriggerState.PAUSED)
      .withMessage(message)
      .withData(data);
  }

  /**
   * 创建禁用结果
   */
  static disabled(
    message: string = '触发器已禁用',
    data: Record<string, any> = {}
  ): TriggerExecutionResultBuilder {
    return new TriggerExecutionResultBuilder(true, TriggerState.DISABLED)
      .withMessage(message)
      .withData(data);
  }

  /**
   * 计算执行持续时间
   */
  static calculateDuration(startTime: Date, endTime: Date): number {
    return endTime.getTime() - startTime.getTime();
  }

  /**
   * 检查结果是否成功
   */
  static isSuccess(result: TriggerExecutionResult): boolean {
    return result.success;
  }

  /**
   * 检查结果是否失败
   */
  static isFailure(result: TriggerExecutionResult): boolean {
    return !result.success;
  }

  /**
   * 检查结果是否有错误
   */
  static hasError(result: TriggerExecutionResult): boolean {
    return !!result.error;
  }

  /**
   * 获取结果摘要
   */
  static getSummary(result: TriggerExecutionResult): string {
    const status = result.success ? '成功' : '失败';
    return `触发器执行${status}: ${result.message} (耗时: ${result.duration}ms)`;
  }

  /**
   * 格式化执行时间
   */
  static formatDuration(duration: number): string {
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(2)}s`;
    } else {
      return `${(duration / 60000).toFixed(2)}m`;
    }
  }
}