import { ID } from './id';

/**
 * 用户ID值对象
 * 
 * 表示用户的唯一标识符
 */
export class UserId {
  /**
   * 用户ID值
   */
  readonly value: ID;

  /**
   * 构造函数
   * 
   * @param value 用户ID值
   */
  constructor(value: ID) {
    this.value = value;
  }

  /**
   * 从ID创建用户ID
   * 
   * @param id ID
   * @returns 用户ID
   */
  static fromId(id: ID): UserId {
    return new UserId(id);
  }

  /**
   * 从字符串创建用户ID
   * 
   * @param value 字符串值
   * @returns 用户ID
   */
  static fromString(value: string): UserId {
    return new UserId(ID.fromString(value));
  }

  /**
   * 生成新的用户ID
   * 
   * @returns 新用户ID
   */
  static generate(): UserId {
    return new UserId(ID.generate());
  }

  /**
   * 获取显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    return `User-${this.value.toShort()}`;
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
   * @param other 另一个用户ID
   * @returns 是否相等
   */
  equals(other: UserId): boolean {
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
   * 比较两个用户ID
   * 
   * @param other 另一个用户ID
   * @returns 比较结果
   */
  compareTo(other: UserId): number {
    return this.value.compareTo(other.value);
  }

  /**
   * 检查是否为空用户ID
   * 
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value.isEmpty();
  }

  /**
   * 创建空用户ID
   * 
   * @returns 空用户ID
   */
  static empty(): UserId {
    return new UserId(ID.empty());
  }

  /**
   * 检查是否为空用户ID
   * 
   * @param userId 用户ID
   * @returns 是否为空
   */
  static isEmpty(userId: UserId): boolean {
    return userId.isEmpty();
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
   * 克隆用户ID
   * 
   * @returns 新用户ID
   */
  clone(): UserId {
    return new UserId(this.value.clone());
  }

  /**
   * 获取用户ID的字符串表示（用于调试）
   * 
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `UserId(${this.value.toDebugString()})`;
  }
}