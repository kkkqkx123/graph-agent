import { ID } from '../../../common/value-objects/id';
import { Timestamp } from '../../../common/value-objects/timestamp';
import { OperationResult, OperationMetadata, createOperationMetadata, createOperationError } from './operation-result';

/**
 * 线程操作基类
 * 
 * 所有线程操作的抽象基类，定义了操作的基本结构和行为
 */
export abstract class ThreadOperation<TInput, TOutput> {
  protected readonly operationId: ID;
  protected readonly timestamp: Timestamp;
  protected readonly operatorId?: ID;

  /**
   * 构造函数
   * @param operatorId 操作者ID
   */
  constructor(operatorId?: ID) {
    this.operationId = ID.generate();
    this.timestamp = Timestamp.now();
    this.operatorId = operatorId;
  }

  /**
   * 执行操作
   * @param input 操作输入
   * @returns 操作结果
   */
  public abstract execute(input: TInput): Promise<OperationResult<TOutput>>;

  /**
   * 验证输入
   * @param input 操作输入
   * @returns 验证结果
   */
  protected abstract validateInput(input: TInput): { valid: boolean; error?: string };

  /**
   * 创建操作元数据
   * @param additionalInfo 附加信息
   * @returns 操作元数据
   */
  protected createMetadata(additionalInfo?: Record<string, unknown>): OperationMetadata {
    return createOperationMetadata(
      this.getOperationType(),
      this.operatorId,
      additionalInfo
    );
  }

  /**
   * 获取操作类型
   * @returns 操作类型
   */
  protected abstract getOperationType(): string;

  /**
   * 获取操作ID
   * @returns 操作ID
   */
  public getOperationId(): ID {
    return this.operationId;
  }

  /**
   * 获取操作时间戳
   * @returns 操作时间戳
   */
  public getTimestamp(): Timestamp {
    return this.timestamp;
  }

  /**
   * 获取操作者ID
   * @returns 操作者ID
   */
  public getOperatorId(): ID | undefined {
    return this.operatorId;
  }

  /**
   * 执行操作（带验证）
   * @param input 操作输入
   * @returns 操作结果
   */
  protected async executeWithValidation(input: TInput): Promise<OperationResult<TOutput>> {
    // 验证输入
    const validation = this.validateInput(input);
    if (!validation.valid) {
      const error = createOperationError(
        'INVALID_INPUT',
        validation.error || '输入验证失败',
        { input }
      );
      return {
        success: false,
        error,
        metadata: this.createMetadata({ validationError: validation.error })
      };
    }

    // 执行操作
    try {
      const startTime = Date.now();
      const result = await this.execute(input);
      const duration = Date.now() - startTime;

      // 更新元数据中的执行时长
      return {
        ...result,
        metadata: {
          ...result.metadata,
          duration
        }
      };
    } catch (error) {
      const operationError = createOperationError(
        'EXECUTION_ERROR',
        error instanceof Error ? error.message : String(error),
        { error }
      );
      return {
        success: false,
        error: operationError,
        metadata: this.createMetadata({ executionError: true })
      };
    }
  }
}