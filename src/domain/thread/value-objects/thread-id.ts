import { ID } from '../../common/value-objects/id';

/**
 * 线程ID值对象
 * 
 * 表示线程的唯一标识符
 */
export class ThreadId {
  /**
   * 线程ID值
   */
  readonly value: ID;

  /**
   * 构造函数
   * 
   * @param value 线程ID值
   */
  constructor(value: ID) {
    this.value = value;
  }

  /**
   * 从ID创建线程ID
   * 
   * @param id ID
   * @returns 线程ID
   */
  static fromId(id: ID): ThreadId {
    return new ThreadId(id);
  }

  /**
   * 从字符串创建线程ID
   * 
   * @param value 字符串值
   * @returns 线程ID
   */
  static fromString(value: string): ThreadId {
    return new ThreadId(ID.fromString(value));
  }

  /**
   * 生成新的线程ID
   * 
   * @returns 新线程ID
   */
  static generate(): ThreadId {
    return new ThreadId(ID.generate());
  }

  /**
   * 获取显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    return `Thread-${this.value.toShort()}`;
  }

  /**
   * 转换为字符串
   * 
   * @returns 字符串表示
   */
  toString(): string {
    return this.value.toString();
  }

  /**
   * 转换为JSON
   * 
   * @returns JSON表示
   */
  toJSON(): string {
    return this.value.toJSON();
  }

  /**
   * 检查是否相等
   * 
   * @param other 另一个线程ID
   * @returns 是否相等
   */
  equals(other: ThreadId): boolean {
    return this.value.equals(other.value);
  }

  /**
   * 哈希值
   * 
   * @returns 哈希值
   */
  hashCode(): number {
    return this.value.hashCode();
  }

  /**
   * 比较两个线程ID
   * 
   * @param other 另一个线程ID
   * @returns 比较结果
   */
  compareTo(other: ThreadId): number {
    return this.value.compareTo(other.value);
  }

  /**
   * 检查是否为空线程ID
   * 
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value.isEmpty();
  }

  /**
   * 创建空线程ID
   * 
   * @returns 空线程ID
   */
  static empty(): ThreadId {
    return new ThreadId(ID.empty());
  }

  /**
   * 检查是否为空线程ID
   * 
   * @param threadId 线程ID
   * @returns 是否为空
   */
  static isEmpty(threadId: ThreadId): boolean {
    return threadId.isEmpty();
  }

  /**
   * 获取ID的短表示
   * 
   * @returns 短表示
   */
  toShort(): string {
    return this.value.toShort();
  }

  /**
   * 克隆线程ID
   * 
   * @returns 新线程ID
   */
  clone(): ThreadId {
    return new ThreadId(this.value.clone());
  }

  /**
   * 获取线程ID的字符串表示（用于调试）
   * 
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `ThreadId(${this.value.toDebugString()})`;
  }
}