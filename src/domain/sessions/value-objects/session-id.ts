import { ID } from '../../common/value-objects';

/**
 * 会话ID值对象
 * 
 * 表示会话的唯一标识符
 */
export class SessionId {
  /**
   * 会话ID值
   */
  readonly value: ID;

  /**
   * 构造函数
   * 
   * @param value 会话ID值
   */
  constructor(value: ID) {
    this.value = value;
  }

  /**
   * 从ID创建会话ID
   * 
   * @param id ID
   * @returns 会话ID
   */
  static fromId(id: ID): SessionId {
    return new SessionId(id);
  }

  /**
   * 从字符串创建会话ID
   * 
   * @param value 字符串值
   * @returns 会话ID
   */
  static fromString(value: string): SessionId {
    return new SessionId(ID.fromString(value));
  }

  /**
   * 生成新的会话ID
   * 
   * @returns 新会话ID
   */
  static generate(): SessionId {
    return new SessionId(ID.generate());
  }

  /**
   * 获取显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    return `Session-${this.value.toShort()}`;
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
   * @param other 另一个会话ID
   * @returns 是否相等
   */
  equals(other: SessionId): boolean {
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
   * 比较两个会话ID
   * 
   * @param other 另一个会话ID
   * @returns 比较结果
   */
  compareTo(other: SessionId): number {
    return this.value.compareTo(other.value);
  }

  /**
   * 检查是否为空会话ID
   * 
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value.isEmpty();
  }

  /**
   * 创建空会话ID
   * 
   * @returns 空会话ID
   */
  static empty(): SessionId {
    return new SessionId(ID.empty());
  }

  /**
   * 检查是否为空会话ID
   * 
   * @param sessionId 会话ID
   * @returns 是否为空
   */
  static isEmpty(sessionId: SessionId): boolean {
    return sessionId.isEmpty();
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
   * 克隆会话ID
   * 
   * @returns 新会话ID
   */
  clone(): SessionId {
    return new SessionId(this.value.clone());
  }

  /**
   * 获取会话ID的字符串表示（用于调试）
   * 
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `SessionId(${this.value.toDebugString()})`;
  }
}