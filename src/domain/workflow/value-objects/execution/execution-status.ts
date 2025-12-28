import { ValueObject } from '../../../common/value-objects/value-object';

/**
 * 执行状态枚举
 */
export enum ExecutionStatusValue {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

/**
 * 执行状态值对象接口
 */
export interface ExecutionStatusProps {
  value: ExecutionStatusValue;
}

/**
 * 执行状态值对象
 *
 * 用于表示工作流执行的当前状态
 */
export class ExecutionStatus extends ValueObject<ExecutionStatusProps> {
  private constructor(props: ExecutionStatusProps) {
    super(props);
    if (!props.value) {
      throw new Error('执行状态不能为空');
    }
    if (!Object.values(ExecutionStatusValue).includes(props.value)) {
      throw new Error(`无效的执行状态: ${props.value}`);
    }
  }

  /**
   * 创建待执行状态
   * @returns 待执行状态实例
   */
  public static pending(): ExecutionStatus {
    return new ExecutionStatus({ value: ExecutionStatusValue.PENDING });
  }

  /**
   * 创建运行中状态
   * @returns 运行中状态实例
   */
  public static running(): ExecutionStatus {
    return new ExecutionStatus({ value: ExecutionStatusValue.RUNNING });
  }

  /**
   * 创建已完成状态
   * @returns 已完成状态实例
   */
  public static completed(): ExecutionStatus {
    return new ExecutionStatus({ value: ExecutionStatusValue.COMPLETED });
  }

  /**
   * 创建失败状态
   * @returns 失败状态实例
   */
  public static failed(): ExecutionStatus {
    return new ExecutionStatus({ value: ExecutionStatusValue.FAILED });
  }

  /**
   * 创建已取消状态
   * @returns 已取消状态实例
   */
  public static cancelled(): ExecutionStatus {
    return new ExecutionStatus({ value: ExecutionStatusValue.CANCELLED });
  }

  /**
   * 创建暂停状态
   * @returns 暂停状态实例
   */
  public static paused(): ExecutionStatus {
    return new ExecutionStatus({ value: ExecutionStatusValue.PAUSED });
  }

  /**
   * 从字符串创建执行状态
   * @param status 状态字符串
   * @returns 执行状态实例
   */
  public static fromString(status: string): ExecutionStatus {
    if (!Object.values(ExecutionStatusValue).includes(status as ExecutionStatusValue)) {
      throw new Error(`无效的执行状态: ${status}`);
    }
    return new ExecutionStatus({ value: status as ExecutionStatusValue });
  }

  /**
   * 获取状态值
   * @returns 状态值
   */
  public getValue(): ExecutionStatusValue {
    return this.props.value;
  }

  /**
   * 检查是否为待执行状态
   * @returns 是否为待执行状态
   */
  public isPending(): boolean {
    return this.props.value === ExecutionStatusValue.PENDING;
  }

  /**
   * 检查是否为运行中状态
   * @returns 是否为运行中状态
   */
  public isRunning(): boolean {
    return this.props.value === ExecutionStatusValue.RUNNING;
  }

  /**
   * 检查是否为已完成状态
   * @returns 是否为已完成状态
   */
  public isCompleted(): boolean {
    return this.props.value === ExecutionStatusValue.COMPLETED;
  }

  /**
   * 检查是否为失败状态
   * @returns 是否为失败状态
   */
  public isFailed(): boolean {
    return this.props.value === ExecutionStatusValue.FAILED;
  }

  /**
   * 检查是否为已取消状态
   * @returns 是否为已取消状态
   */
  public isCancelled(): boolean {
    return this.props.value === ExecutionStatusValue.CANCELLED;
  }

  /**
   * 检查是否为暂停状态
   * @returns 是否为暂停状态
   */
  public isPaused(): boolean {
    return this.props.value === ExecutionStatusValue.PAUSED;
  }

  /**
   * 检查是否为终止状态（已完成、失败、已取消）
   * @returns 是否为终止状态
   */
  public isTerminal(): boolean {
    return (
      this.props.value === ExecutionStatusValue.COMPLETED ||
      this.props.value === ExecutionStatusValue.FAILED ||
      this.props.value === ExecutionStatusValue.CANCELLED
    );
  }

  /**
   * 检查是否为活跃状态（运行中、暂停）
   * @returns 是否为活跃状态
   */
  public isActive(): boolean {
    return (
      this.props.value === ExecutionStatusValue.RUNNING ||
      this.props.value === ExecutionStatusValue.PAUSED
    );
  }

  /**
   * 检查是否可以开始执行
   * @returns 是否可以开始执行
   */
  public canStart(): boolean {
    return this.props.value === ExecutionStatusValue.PENDING;
  }

  /**
   * 检查是否可以暂停
   * @returns 是否可以暂停
   */
  public canPause(): boolean {
    return this.props.value === ExecutionStatusValue.RUNNING;
  }

  /**
   * 检查是否可以恢复
   * @returns 是否可以恢复
   */
  public canResume(): boolean {
    return this.props.value === ExecutionStatusValue.PAUSED;
  }

  /**
   * 检查是否可以取消
   * @returns 是否可以取消
   */
  public canCancel(): boolean {
    return (
      this.props.value === ExecutionStatusValue.PENDING ||
      this.props.value === ExecutionStatusValue.RUNNING ||
      this.props.value === ExecutionStatusValue.PAUSED
    );
  }

  /**
   * 比较两个执行状态是否相等
   * @param status 另一个执行状态
   * @returns 是否相等
   */
  public override equals(status?: ExecutionStatus): boolean {
    if (status === null || status === undefined) {
      return false;
    }
    return this.props.value === status.getValue();
  }

  /**
   * 获取执行状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    // 验证在构造时已完成
  }
}