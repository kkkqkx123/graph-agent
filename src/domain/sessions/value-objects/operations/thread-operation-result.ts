import { ID, Timestamp, ValueObject } from '../../../common/value-objects';
import { ValidationError } from '../../../../common/exceptions';

/**
 * 线程操作错误值对象
 */
export class ThreadOperationError extends ValueObject<{
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly timestamp: Timestamp;
}> {
  private constructor(props: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: Timestamp;
  }) {
    super(props);
  }

  /**
   * 创建线程操作错误
   */
  public static create(code: string, message: string, details?: unknown): ThreadOperationError {
    return new ThreadOperationError({
      code,
      message,
      details,
      timestamp: Timestamp.now(),
    });
  }

  public get code(): string {
    return this.props.code;
  }

  public get message(): string {
    return this.props.message;
  }

  public get details(): unknown {
    return this.props.details;
  }

  public get timestamp(): Timestamp {
    return this.props.timestamp;
  }

  public validate(): void {
    if (!this.props.code || this.props.code.trim() === '') {
      throw new ValidationError('错误代码不能为空');
    }
    if (!this.props.message || this.props.message.trim() === '') {
      throw new ValidationError('错误消息不能为空');
    }
  }
}

/**
 * 线程操作元数据值对象
 */
export class ThreadOperationMetadata extends ValueObject<{
  readonly operationId: ID;
  readonly operationType: string;
  readonly timestamp: Timestamp;
  readonly duration?: number;
  readonly operatorId?: ID;
  readonly additionalInfo?: Record<string, unknown>;
}> {
  private constructor(props: {
    operationId: ID;
    operationType: string;
    timestamp: Timestamp;
    duration?: number;
    operatorId?: ID;
    additionalInfo?: Record<string, unknown>;
  }) {
    super(props);
  }

  /**
   * 创建线程操作元数据
   */
  public static create(
    operationType: string,
    operatorId?: ID,
    additionalInfo?: Record<string, unknown>
  ): ThreadOperationMetadata {
    return new ThreadOperationMetadata({
      operationId: ID.generate(),
      operationType,
      timestamp: Timestamp.now(),
      operatorId,
      additionalInfo,
    });
  }

  /**
   * 创建带持续时间的线程操作元数据
   */
  public static createWithDuration(
    operationType: string,
    duration: number,
    operatorId?: ID,
    additionalInfo?: Record<string, unknown>
  ): ThreadOperationMetadata {
    return new ThreadOperationMetadata({
      operationId: ID.generate(),
      operationType,
      timestamp: Timestamp.now(),
      duration,
      operatorId,
      additionalInfo,
    });
  }

  public get operationId(): ID {
    return this.props.operationId;
  }

  public get operationType(): string {
    return this.props.operationType;
  }

  public get timestamp(): Timestamp {
    return this.props.timestamp;
  }

  public get duration(): number | undefined {
    return this.props.duration;
  }

  public get operatorId(): ID | undefined {
    return this.props.operatorId;
  }

  public get additionalInfo(): Record<string, unknown> | undefined {
    return this.props.additionalInfo;
  }

  public validate(): void {
    if (!this.props.operationType || this.props.operationType.trim() === '') {
      throw new ValidationError('操作类型不能为空');
    }
  }
}

/**
 * 线程操作结果值对象
 */
export class ThreadOperationResult<T> extends ValueObject<{
  readonly success: boolean;
  readonly result?: T;
  readonly error?: ThreadOperationError;
  readonly metadata: ThreadOperationMetadata;
}> {
  private constructor(props: {
    success: boolean;
    result?: T;
    error?: ThreadOperationError;
    metadata: ThreadOperationMetadata;
  }) {
    super(props);
  }

  /**
   * 创建成功的线程操作结果
   */
  public static createSuccess<T>(
    result: T,
    metadata: ThreadOperationMetadata
  ): ThreadOperationResult<T> {
    return new ThreadOperationResult<T>({
      success: true,
      result,
      metadata,
    });
  }

  /**
   * 创建失败的线程操作结果
   */
  public static createFailure<T>(
    error: ThreadOperationError,
    metadata: ThreadOperationMetadata
  ): ThreadOperationResult<T> {
    return new ThreadOperationResult<T>({
      success: false,
      error,
      metadata,
    });
  }

  public get success(): boolean {
    return this.props.success;
  }

  public get result(): T | undefined {
    return this.props.result;
  }

  public get error(): ThreadOperationError | undefined {
    return this.props.error;
  }

  public get metadata(): ThreadOperationMetadata {
    return this.props.metadata;
  }

  public isSuccess(): boolean {
    return this.props.success;
  }

  public isFailure(): boolean {
    return !this.props.success;
  }

  public validate(): void {
    if (this.props.success && this.props.error) {
      throw new ValidationError('成功的操作结果不能包含错误信息');
    }
    if (!this.props.success && !this.props.error) {
      throw new ValidationError('失败的操作结果必须包含错误信息');
    }
    if (this.props.success && !this.props.result) {
      throw new ValidationError('成功的操作结果应该包含结果数据');
    }
  }
}
