import { ValueObject, ID } from '../../common/value-objects';
import { ValidationError } from '../../../common/exceptions';

/**
 * ThreadId值对象属性接口
 */
export interface ThreadIdProps {
  value: ID;
}

/**
 * ThreadId值对象
 *
 * 表示线程的唯一标识符，是不可变的
 * 简化实现，直接使用ID值对象
 */
export class ThreadId extends ValueObject<ThreadIdProps> {
  /**
   * 创建新的线程ID
   * @returns 线程ID值对象
   */
  public static generate(): ThreadId {
    return new ThreadId({ value: ID.generate() });
  }

  /**
   * 从ID创建线程ID
   * @param id ID值对象
   * @returns 线程ID值对象
   */
  public static fromId(id: ID): ThreadId {
    return new ThreadId({ value: id });
  }

  /**
   * 从字符串创建线程ID
   * @param value 字符串值
   * @returns 线程ID值对象
   */
  public static fromString(value: string): ThreadId {
    return new ThreadId({ value: ID.fromString(value) });
  }

  /**
   * 获取ID值
   * @returns ID值对象
   */
  public getValue(): ID {
    return this.props.value;
  }

  /**
   * 转换为字符串
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value.toString();
  }

  /**
   * 获取短表示
   * @returns 短表示
   */
  public toShort(): string {
    return this.props.value.toShort();
  }

  /**
   * 转换为JSON
   * @returns JSON表示
   */
  public toJSON(): string {
    return this.props.value.toJSON();
  }

  /**
   * 检查是否为空
   * @returns 是否为空
   */
  public isEmpty(): boolean {
    return this.props.value.isEmpty();
  }

  /**
   * 创建空线程ID
   * @returns 空线程ID值对象
   */
  public static empty(): ThreadId {
    return new ThreadId({ value: ID.empty() });
  }

  /**
   * 比较两个线程ID是否相等
   * @param other 另一个线程ID
   * @returns 是否相等
   */
  public override equals(other?: ThreadId): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.props.value.equals(other.getValue());
  }

  /**
   * 验证线程ID的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new ValidationError('线程ID不能为空');
    }
  }
}
