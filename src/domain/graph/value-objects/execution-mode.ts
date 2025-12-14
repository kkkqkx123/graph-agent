import { ValueObject } from '../../common/base/value-object';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 执行模式枚举
 */
export enum ExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  STREAM = 'stream'
}

/**
 * 执行模式值对象
 * 
 * 表示图的执行模式
 */
export class ExecutionModeValue extends ValueObject {
  private readonly value: ExecutionMode;

  constructor(value: ExecutionMode) {
    super();
    this.value = value;
    this.validate();
  }

  /**
   * 验证执行模式
   */
  private validate(): void {
    if (!Object.values(ExecutionMode).includes(this.value)) {
      throw new DomainError(`无效的执行模式: ${this.value}`);
    }
  }

  /**
   * 获取执行模式值
   */
  public getValue(): ExecutionMode {
    return this.value;
  }

  /**
   * 检查是否为同步模式
   */
  public isSync(): boolean {
    return this.value === ExecutionMode.SYNC;
  }

  /**
   * 检查是否为异步模式
   */
  public isAsync(): boolean {
    return this.value === ExecutionMode.ASYNC;
  }

  /**
   * 检查是否为流式模式
   */
  public isStream(): boolean {
    return this.value === ExecutionMode.STREAM;
  }

  /**
   * 创建同步执行模式
   */
  public static sync(): ExecutionModeValue {
    return new ExecutionModeValue(ExecutionMode.SYNC);
  }

  /**
   * 创建异步执行模式
   */
  public static async(): ExecutionModeValue {
    return new ExecutionModeValue(ExecutionMode.ASYNC);
  }

  /**
   * 创建流式执行模式
   */
  public static stream(): ExecutionModeValue {
    return new ExecutionModeValue(ExecutionMode.STREAM);
  }

  /**
   * 从字符串创建执行模式
   */
  public static fromString(value: string): ExecutionModeValue {
    const mode = Object.values(ExecutionMode).find(m => m === value.toLowerCase());
    if (!mode) {
      throw new DomainError(`无法识别的执行模式字符串: ${value}`);
    }
    return new ExecutionModeValue(mode);
  }

  /**
   * 获取所有可用的执行模式
   */
  public static getAllModes(): ExecutionMode[] {
    return Object.values(ExecutionMode);
  }

  /**
   * 比较两个执行模式是否相等
   */
  public equals(other: ExecutionModeValue): boolean {
    return this.value === other.value;
  }

  /**
   * 转换为字符串
   */
  public toString(): string {
    return this.value;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): string {
    return this.value;
  }
}