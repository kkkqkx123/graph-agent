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
}
