import { ValueObject } from '../../common/value-objects';
/**
 * 线程状态枚举
 */
export enum ThreadStatusValue {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 线程状态值对象接口
 */
export interface ThreadStatusProps {
  value: ThreadStatusValue;
}

/**
 * 线程状态值对象
 *
 * 用于表示线程的当前状态
 */
export class ThreadStatus extends ValueObject<ThreadStatusProps> {
  /**
   * 创建待执行状态
   * @returns 待执行状态实例
   */
  public static pending(): ThreadStatus {
    return new ThreadStatus({ value: ThreadStatusValue.PENDING });
  }

  /**
   * 创建运行中状态
   * @returns 运行中状态实例
   */
  public static running(): ThreadStatus {
    return new ThreadStatus({ value: ThreadStatusValue.RUNNING });
  }

  /**
   * 创建暂停状态
   * @returns 暂停状态实例
   */
  public static paused(): ThreadStatus {
    return new ThreadStatus({ value: ThreadStatusValue.PAUSED });
  }

  /**
   * 创建完成状态
   * @returns 完成状态实例
   */
  public static completed(): ThreadStatus {
    return new ThreadStatus({ value: ThreadStatusValue.COMPLETED });
  }

  /**
   * 创建失败状态
   * @returns 失败状态实例
   */
  public static failed(): ThreadStatus {
    return new ThreadStatus({ value: ThreadStatusValue.FAILED });
  }

  /**
   * 创建取消状态
   * @returns 取消状态实例
   */
  public static cancelled(): ThreadStatus {
    return new ThreadStatus({ value: ThreadStatusValue.CANCELLED });
  }

  /**
   * 从字符串创建线程状态
   * @param status 状态字符串
   * @returns 线程状态实例
   */
  public static fromString(status: string): ThreadStatus {
    if (!Object.values(ThreadStatusValue).includes(status as ThreadStatusValue)) {
      throw new Error(`无效的线程状态: ${status}`);
    }
    return new ThreadStatus({ value: status as ThreadStatusValue });
  }

  /**
   * 获取状态值
   * @returns 状态值
   */
  public getValue(): ThreadStatusValue {
    return this.props.value;
  }

  /**
   * 检查是否为待执行状态
   * @returns 是否为待执行状态
   */
  public isPending(): boolean {
    return this.props.value === ThreadStatusValue.PENDING;
  }

  /**
   * 检查是否为运行中状态
   * @returns 是否为运行中状态
   */
  public isRunning(): boolean {
    return this.props.value === ThreadStatusValue.RUNNING;
  }

  /**
   * 检查是否为暂停状态
   * @returns 是否为暂停状态
   */
  public isPaused(): boolean {
    return this.props.value === ThreadStatusValue.PAUSED;
  }

  /**
   * 检查是否为完成状态
   * @returns 是否为完成状态
   */
  public isCompleted(): boolean {
    return this.props.value === ThreadStatusValue.COMPLETED;
  }

  /**
   * 检查是否为失败状态
   * @returns 是否为失败状态
   */
  public isFailed(): boolean {
    return this.props.value === ThreadStatusValue.FAILED;
  }

  /**
   * 检查是否为取消状态
   * @returns 是否为取消状态
   */
  public isCancelled(): boolean {
    return this.props.value === ThreadStatusValue.CANCELLED;
  }

  /**
   * 检查是否为终止状态（完成、失败或取消）
   * @returns 是否为终止状态
   */
  public isTerminal(): boolean {
    return this.isCompleted() || this.isFailed() || this.isCancelled();
  }

  /**
   * 检查是否为活跃状态（待执行、运行中或暂停）
   * @returns 是否为活跃状态
   */
  public isActive(): boolean {
    return this.isPending() || this.isRunning() || this.isPaused();
  }

  /**
   * 检查是否可以进行操作
   * @returns 是否可以进行操作
   */
  public canOperate(): boolean {
    return this.isPending() || this.isRunning() || this.isPaused();
  }

  /**
   * 检查是否可以执行
   * @returns 是否可以执行
   */
  public canExecute(): boolean {
    return this.isPending() || this.isRunning();
  }

  /**
   * 比较两个线程状态是否相等
   * @param status 另一个线程状态
   * @returns 是否相等
   */
  public override equals(status?: ThreadStatus): boolean {
    if (status === null || status === undefined) {
      return false;
    }
    return this.props.value === status.getValue();
  }

  /**
   * 验证线程状态的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new Error('线程状态不能为空');
    }

    if (!Object.values(ThreadStatusValue).includes(this.props.value)) {
      throw new Error(`无效的线程状态: ${this.props.value}`);
    }
  }

  /**
   * 获取线程状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }
}
