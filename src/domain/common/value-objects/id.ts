import { v4 as uuidv4 } from 'uuid';

/**
 * ID值对象
 *
 * 表示实体的唯一标识符
 */
export class ID {
  /**
   * ID值
   */
  readonly value: string;

  /**
   * 构造函数
   *
   * @param value ID值
   */
  constructor(value: string) {
    if (!ID.isValid(value)) {
      throw new Error(`Invalid ID: ${value}`);
    }

    this.value = value;
  }

  /**
   * 检查ID值是否有效
   *
   * @param value ID值
   * @returns 是否有效
   */
  static isValid(value: string): boolean {
    // 检查是否为有效的UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * 生成新的ID
   *
   * @returns 新ID
   */
  static generate(): ID {
    return new ID(uuidv4());
  }

  /**
   * 从字符串创建ID
   *
   * @param value 字符串值
   * @returns ID
   */
  static fromString(value: string): ID {
    return new ID(value);
  }

  /**
   * 检查是否为空ID
   *
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value === '00000000-0000-0000-0000-000000000000';
  }

  /**
   * 获取ID的短表示（前8位）
   *
   * @returns 短表示
   */
  toShort(): string {
    return this.value.substring(0, 8);
  }

  /**
   * 转换为字符串
   *
   * @returns 字符串表示
   */
  toString(): string {
    return this.value;
  }

  /**
   * 转换为JSON
   *
   * @returns JSON表示
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * 检查是否相等
   *
   * @param other 另一个ID
   * @returns 是否相等
   */
  equals(other: ID): boolean {
    return this.value === other.value;
  }



  /**
   * 创建空ID
   *
   * @returns 空ID
   */
  static empty(): ID {
    return new ID('00000000-0000-0000-0000-000000000000');
  }

  /**
   * 检查是否为空ID
   *
   * @param id ID
   * @returns 是否为空
   */
  static isEmpty(id: ID): boolean {
    return id.isEmpty();
  }



}
