import { ID } from './id';

/**
 * 边ID值对象
 * 
 * 表示边的唯一标识符
 */
export class EdgeId {
  /**
   * 边ID值
   */
  readonly value: ID;

  /**
   * 构造函数
   * 
   * @param value 边ID值
   */
  constructor(value: ID) {
    this.value = value;
  }

  /**
   * 从ID创建边ID
   * 
   * @param id ID
   * @returns 边ID
   */
  static fromId(id: ID): EdgeId {
    return new EdgeId(id);
  }

  /**
   * 从字符串创建边ID
   * 
   * @param value 字符串值
   * @returns 边ID
   */
  static fromString(value: string): EdgeId {
    return new EdgeId(ID.fromString(value));
  }

  /**
   * 生成新的边ID
   * 
   * @returns 新边ID
   */
  static generate(): EdgeId {
    return new EdgeId(ID.generate());
  }

  /**
   * 获取显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    return `Edge-${this.value.toShort()}`;
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
   * @param other 另一个边ID
   * @returns 是否相等
   */
  equals(other: EdgeId): boolean {
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
   * 比较两个边ID
   * 
   * @param other 另一个边ID
   * @returns 比较结果
   */
  compareTo(other: EdgeId): number {
    return this.value.compareTo(other.value);
  }

  /**
   * 检查是否为空边ID
   * 
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value.isEmpty();
  }

  /**
   * 创建空边ID
   * 
   * @returns 空边ID
   */
  static empty(): EdgeId {
    return new EdgeId(ID.empty());
  }

  /**
   * 检查是否为空边ID
   * 
   * @param edgeId 边ID
   * @returns 是否为空
   */
  static isEmpty(edgeId: EdgeId): boolean {
    return edgeId.isEmpty();
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
   * 克隆边ID
   * 
   * @returns 新边ID
   */
  clone(): EdgeId {
    return new EdgeId(this.value.clone());
  }

  /**
   * 获取边ID的字符串表示（用于调试）
   * 
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `EdgeId(${this.value.toDebugString()})`;
  }
}