import { ID } from './id';

/**
 * 节点ID值对象
 * 
 * 表示节点的唯一标识符
 */
export class NodeId {
  /**
   * 节点ID值
   */
  readonly value: ID;

  /**
   * 构造函数
   * 
   * @param value 节点ID值
   */
  constructor(value: ID) {
    this.value = value;
  }

  /**
   * 从ID创建节点ID
   * 
   * @param id ID
   * @returns 节点ID
   */
  static fromId(id: ID): NodeId {
    return new NodeId(id);
  }

  /**
   * 从字符串创建节点ID
   * 
   * @param value 字符串值
   * @returns 节点ID
   */
  static fromString(value: string): NodeId {
    return new NodeId(ID.fromString(value));
  }

  /**
   * 生成新的节点ID
   * 
   * @returns 新节点ID
   */
  static generate(): NodeId {
    return new NodeId(ID.generate());
  }

  /**
   * 获取显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    return `Node-${this.value.toShort()}`;
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
   * @param other 另一个节点ID
   * @returns 是否相等
   */
  equals(other: NodeId): boolean {
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
   * 比较两个节点ID
   * 
   * @param other 另一个节点ID
   * @returns 比较结果
   */
  compareTo(other: NodeId): number {
    return this.value.compareTo(other.value);
  }

  /**
   * 检查是否为空节点ID
   * 
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value.isEmpty();
  }

  /**
   * 创建空节点ID
   * 
   * @returns 空节点ID
   */
  static empty(): NodeId {
    return new NodeId(ID.empty());
  }

  /**
   * 检查是否为空节点ID
   * 
   * @param nodeId 节点ID
   * @returns 是否为空
   */
  static isEmpty(nodeId: NodeId): boolean {
    return nodeId.isEmpty();
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
   * 克隆节点ID
   * 
   * @returns 新节点ID
   */
  clone(): NodeId {
    return new NodeId(this.value.clone());
  }

  /**
   * 获取节点ID的字符串表示（用于调试）
   * 
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `NodeId(${this.value.toDebugString()})`;
  }
}