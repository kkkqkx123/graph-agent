import { ValueObject } from './value-object';
/**
 * 时间戳值对象接口
 */
export interface TimestampProps {
  value: Date;
}

/**
 * 时间戳值对象
 * 
 * 用于表示系统中的时间信息
 */
export class Timestamp extends ValueObject<TimestampProps> {
  /**
   * 创建时间戳实例
   * @param date 日期对象
   * @returns 时间戳实例
   */
  public static create(date: Date): Timestamp {
    return new Timestamp({ value: date });
  }

  /**
   * 创建当前时间戳
   * @returns 当前时间戳实例
   */
  public static now(): Timestamp {
    return new Timestamp({ value: new Date() });
  }

  /**
   * 从字符串创建时间戳
   * @param dateString 日期字符串
   * @returns 时间戳实例
   */
  public static fromString(dateString: string): Timestamp {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('无效的日期字符串');
    }
    return new Timestamp({ value: date });
  }

  /**
   * 从ISO字符串创建时间戳
   * @param dateString ISO日期字符串
   * @returns 时间戳实例
   */
  public static fromISOString(dateString: string): Timestamp {
    return Timestamp.fromString(dateString);
  }

  /**
   * 从时间戳毫秒数创建时间戳
   * @param milliseconds 毫秒数
   * @returns 时间戳实例
   */
  public static fromMilliseconds(milliseconds: number): Timestamp {
    const date = new Date(milliseconds);
    if (isNaN(date.getTime())) {
      throw new Error('无效的时间戳毫秒数');
    }
    return new Timestamp({ value: date });
  }

  /**
   * 获取时间戳的Date对象
   * @returns Date对象
   */
  public getDate(): Date {
    return this.props.value;
  }

  /**
   * 获取时间戳的毫秒数
   * @returns 毫秒数
   */
  public getMilliseconds(): number {
    return this.props.value.getTime();
  }

  /**
   * 获取ISO格式的日期字符串
   * @returns ISO格式字符串
   */
  public toISOString(): string {
    return this.props.value.toISOString();
  }

  /**
   * 获取本地格式的日期字符串
   * @returns 本地格式字符串
   */
  public override toLocaleString(): string {
    return this.props.value.toLocaleString();
  }

  /**
   * 检查时间戳是否在另一个时间戳之前
   * @param other 另一个时间戳
   * @returns 是否在之前
   */
  public isBefore(other: Timestamp): boolean {
    return this.props.value < other.getDate();
  }

  /**
   * 检查时间戳是否在另一个时间戳之后
   * @param other 另一个时间戳
   * @returns 是否在之后
   */
  public isAfter(other: Timestamp): boolean {
    return this.props.value > other.getDate();
  }

  /**
   * 检查时间戳是否等于另一个时间戳
   * @param other 另一个时间戳
   * @returns 是否相等
   */
  public override equals(other?: Timestamp): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.props.value.getTime() === other.getMilliseconds();
  }

  /**
   * 计算与另一个时间戳的差值（毫秒）
   * @param other 另一个时间戳
   * @returns 差值（毫秒）
   */
  public diff(other: Timestamp): number {
    return this.props.value.getTime() - other.getMilliseconds();
  }

  /**
   * 计算与另一个时间戳的差值（秒）
   * @param other 另一个时间戳
   * @returns 差值（秒）
   */
  public differenceInSeconds(other: Timestamp): number {
    return Math.floor(this.diff(other) / 1000);
  }

  /**
   * 添加小时数
   * @param hours 小时数
   * @returns 新的时间戳
   */
  public addHours(hours: number): Timestamp {
    const newDate = new Date(this.props.value.getTime() + hours * 60 * 60 * 1000);
    return Timestamp.create(newDate);
  }

  /**
   * 添加天数
   * @param days 天数
   * @returns 新的时间戳
   */
  public addDays(days: number): Timestamp {
    const newDate = new Date(this.props.value.getTime() + days * 24 * 60 * 60 * 1000);
    return Timestamp.create(newDate);
  }

  /**
   * 验证时间戳的有效性
   */
  public validate(): void {
    if (!this.props.value || isNaN(this.props.value.getTime())) {
      throw new Error('无效的时间戳');
    }
  }

  /**
   * 获取时间戳的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value.toISOString();
  }
}