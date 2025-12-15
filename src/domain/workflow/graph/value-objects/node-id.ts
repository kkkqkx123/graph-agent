import { ID } from '@domain/common/value-objects/id';

/**
 * 节点ID值对象
 */
export class NodeId extends ID {
  /**
   * 创建节点ID
   * @param value ID值
   * @returns 节点ID实例
   */
  static create(value: string): NodeId {
    return new NodeId(value);
  }

  /**
   * 生成新的节点ID
   * @returns 新的节点ID实例
   */
  static override generate(): NodeId {
    return new NodeId(ID.generate().value);
  }

  /**
   * 从字符串创建节点ID
   * @param value 字符串值
   * @returns 节点ID实例
   */
  static override fromString(value: string): NodeId {
    return new NodeId(value);
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  getBusinessIdentifier(): string {
    return `node:${this.value}`;
  }
}