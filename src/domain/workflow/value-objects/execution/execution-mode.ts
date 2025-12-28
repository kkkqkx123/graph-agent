import { ValueObject } from '../../../common/value-objects';
/**
 * 执行模式枚举
 */
export enum ExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  STREAM = 'stream'
}

/**
 * 执行模式值对象属性接口
 */
export interface ExecutionModeValueProps {
  value: ExecutionMode;
}

/**
 * 执行模式值对象
 *
 * 表示图的执行模式
 */
export class ExecutionModeValue extends ValueObject<ExecutionModeValueProps> {
  constructor(props: ExecutionModeValueProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证执行模式
   */
  public validate(): void {
    if (!Object.values(ExecutionMode).includes(this.props.value)) {
      throw new Error(`无效的执行模式: ${this.props.value}`);
    }
  }

  /**
   * 获取执行模式值
   */
  public getValue(): ExecutionMode {
    return this.props.value;
  }

  /**
   * 检查是否为同步模式
   */
  public isSync(): boolean {
    return this.props.value === ExecutionMode.SYNC;
  }

  /**
   * 检查是否为异步模式
   */
  public isAsync(): boolean {
    return this.props.value === ExecutionMode.ASYNC;
  }

  /**
   * 检查是否为流式模式
   */
  public isStream(): boolean {
    return this.props.value === ExecutionMode.STREAM;
  }

  /**
   * 创建同步执行模式
   */
  public static sync(): ExecutionModeValue {
    return new ExecutionModeValue({ value: ExecutionMode.SYNC });
  }

  /**
   * 创建异步执行模式
   */
  public static async(): ExecutionModeValue {
    return new ExecutionModeValue({ value: ExecutionMode.ASYNC });
  }

  /**
   * 创建流式执行模式
   */
  public static stream(): ExecutionModeValue {
    return new ExecutionModeValue({ value: ExecutionMode.STREAM });
  }

  /**
   * 从字符串创建执行模式
   */
  public static fromString(value: string): ExecutionModeValue {
    const mode = Object.values(ExecutionMode).find(m => m === value.toLowerCase());
    if (!mode) {
      throw new Error(`无法识别的执行模式字符串: ${value}`);
    }
    return new ExecutionModeValue({ value: mode });
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
  public override equals(vo?: ValueObject<ExecutionModeValueProps>): boolean {
    if (!vo) return false;
    return this.props.value === (vo as ExecutionModeValue).props.value;
  }

  /**
   * 转换为字符串
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): string {
    return this.props.value;
  }
}