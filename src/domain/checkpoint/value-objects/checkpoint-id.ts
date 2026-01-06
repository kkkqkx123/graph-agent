import { ID } from '../../common/value-objects';

/**
 * 检查点ID值对象
 *
 * 表示检查点的唯一标识符
 */
export class CheckpointId {
  /**
   * 检查点ID值
   */
  readonly value: ID;

  /**
   * 构造函数
   *
   * @param value 检查点ID值
   */
  constructor(value: ID) {
    this.value = value;
  }

  /**
   * 从ID创建检查点ID
   *
   * @param id ID
   * @returns 检查点ID
   */
  static fromId(id: ID): CheckpointId {
    return new CheckpointId(id);
  }

  /**
   * 从字符串创建检查点ID
   *
   * @param value 字符串值
   * @returns 检查点ID
   */
  static fromString(value: string): CheckpointId {
    return new CheckpointId(ID.fromString(value));
  }

  /**
   * 生成新的检查点ID
   *
   * @returns 新检查点ID
   */
  static generate(): CheckpointId {
    return new CheckpointId(ID.generate());
  }

  /**
   * 获取显示名称
   *
   * @returns 显示名称
   */
  getDisplayName(): string {
    return `Checkpoint-${this.value.toShort()}`;
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
   * @param other 另一个检查点ID
   * @returns 是否相等
   */
  equals(other: CheckpointId): boolean {
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
   * 比较两个检查点ID
   *
   * @param other 另一个检查点ID
   * @returns 比较结果
   */
  compareTo(other: CheckpointId): number {
    return this.value.compareTo(other.value);
  }

  /**
   * 检查是否为空检查点ID
   *
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value.isEmpty();
  }

  /**
   * 创建空检查点ID
   *
   * @returns 空检查点ID
   */
  static empty(): CheckpointId {
    return new CheckpointId(ID.empty());
  }

  /**
   * 检查是否为空检查点ID
   *
   * @param checkpointId 检查点ID
   * @returns 是否为空
   */
  static isEmpty(checkpointId: CheckpointId): boolean {
    return checkpointId.isEmpty();
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
   * 克隆检查点ID
   *
   * @returns 新检查点ID
   */
  clone(): CheckpointId {
    return new CheckpointId(this.value.clone());
  }

  /**
   * 获取检查点ID的字符串表示（用于调试）
   *
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `CheckpointId(${this.value.toDebugString()})`;
  }
}
