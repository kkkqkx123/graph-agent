import { ValueObject } from '../../common/value-objects/value-object';
/**
 * 线程优先级枚举
 */
export enum ThreadPriorityValue {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 20
}

/**
 * 线程优先级值对象接口
 */
export interface ThreadPriorityProps {
  value: ThreadPriorityValue;
}

/**
 * 线程优先级值对象
 * 
 * 用于表示线程的执行优先级
 */
export class ThreadPriority extends ValueObject<ThreadPriorityProps> {
  /**
   * 创建低优先级
   * @returns 低优先级实例
   */
  public static low(): ThreadPriority {
    return new ThreadPriority({ value: ThreadPriorityValue.LOW });
  }

  /**
   * 创建普通优先级
   * @returns 普通优先级实例
   */
  public static normal(): ThreadPriority {
    return new ThreadPriority({ value: ThreadPriorityValue.NORMAL });
  }

  /**
   * 创建高优先级
   * @returns 高优先级实例
   */
  public static high(): ThreadPriority {
    return new ThreadPriority({ value: ThreadPriorityValue.HIGH });
  }

  /**
   * 创建紧急优先级
   * @returns 紧急优先级实例
   */
  public static urgent(): ThreadPriority {
    return new ThreadPriority({ value: ThreadPriorityValue.URGENT });
  }

  /**
   * 从数值创建线程优先级
   * @param value 优先级数值
   * @returns 线程优先级实例
   */
  public static fromNumber(value: number): ThreadPriority {
    if (!Object.values(ThreadPriorityValue).includes(value as ThreadPriorityValue)) {
      throw new Error(`无效的线程优先级: ${value}`);
    }
    return new ThreadPriority({ value: value as ThreadPriorityValue });
  }

  /**
   * 从字符串创建线程优先级
   * @param priority 优先级字符串
   * @returns 线程优先级实例
   */
  public static fromString(priority: string): ThreadPriority {
    const priorityMap: Record<string, ThreadPriorityValue> = {
      'low': ThreadPriorityValue.LOW,
      'normal': ThreadPriorityValue.NORMAL,
      'high': ThreadPriorityValue.HIGH,
      'urgent': ThreadPriorityValue.URGENT
    };

    const value = priorityMap[priority.toLowerCase()];
    if (value === undefined) {
      throw new Error(`无效的线程优先级: ${priority}`);
    }

    return new ThreadPriority({ value });
  }

  /**
   * 获取优先级值
   * @returns 优先级值
   */
  public getValue(): ThreadPriorityValue {
    return this.props.value;
  }

  /**
   * 获取优先级数值
   * @returns 优先级数值
   */
  public getNumericValue(): number {
    return this.props.value;
  }

  /**
   * 检查是否为低优先级
   * @returns 是否为低优先级
   */
  public isLow(): boolean {
    return this.props.value === ThreadPriorityValue.LOW;
  }

  /**
   * 检查是否为普通优先级
   * @returns 是否为普通优先级
   */
  public isNormal(): boolean {
    return this.props.value === ThreadPriorityValue.NORMAL;
  }

  /**
   * 检查是否为高优先级
   * @returns 是否为高优先级
   */
  public isHigh(): boolean {
    return this.props.value === ThreadPriorityValue.HIGH;
  }

  /**
   * 检查是否为紧急优先级
   * @returns 是否为紧急优先级
   */
  public isUrgent(): boolean {
    return this.props.value === ThreadPriorityValue.URGENT;
  }

  /**
   * 检查是否为高优先级或紧急优先级
   * @returns 是否为高优先级或紧急优先级
   */
  public isHighPriority(): boolean {
    return this.isHigh() || this.isUrgent();
  }

  /**
   * 比较两个优先级
   * @param other 另一个优先级
   * @returns 比较结果：-1表示小于，0表示等于，1表示大于
   */
  public compareTo(other: ThreadPriority): number {
    if (this.props.value < other.getValue()) {
      return -1;
    } else if (this.props.value > other.getValue()) {
      return 1;
    } else {
      return 0;
    }
  }

  /**
   * 检查是否低于另一个优先级
   * @param other 另一个优先级
   * @returns 是否低于
   */
  public isLowerThan(other: ThreadPriority): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * 检查是否高于另一个优先级
   * @param other 另一个优先级
   * @returns 是否高于
   */
  public isHigherThan(other: ThreadPriority): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * 比较两个线程优先级是否相等
   * @param priority 另一个线程优先级
   * @returns 是否相等
   */
  public override equals(priority?: ThreadPriority): boolean {
    if (priority === null || priority === undefined) {
      return false;
    }
    return this.props.value === priority.getValue();
  }

  /**
   * 验证线程优先级的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new Error('线程优先级不能为空');
    }

    if (!Object.values(ThreadPriorityValue).includes(this.props.value)) {
      throw new Error(`无效的线程优先级: ${this.props.value}`);
    }
  }

  /**
   * 获取线程优先级的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    const priorityMap: Record<ThreadPriorityValue, string> = {
      [ThreadPriorityValue.LOW]: 'low',
      [ThreadPriorityValue.NORMAL]: 'normal',
      [ThreadPriorityValue.HIGH]: 'high',
      [ThreadPriorityValue.URGENT]: 'urgent'
    };

    return priorityMap[this.props.value];
  }
}