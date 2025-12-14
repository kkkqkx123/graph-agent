import { ID } from '../../../common/value-objects/id';

/**
 * 边ID值对象
 */
export class EdgeId extends ID {
  /**
   * 创建边ID
   * @param value ID值
   * @returns 边ID实例
   */
  static create(value: string): EdgeId {
    return new EdgeId(value);
  }

  /**
   * 生成新的边ID
   * @returns 新的边ID实例
   */
  static generate(): EdgeId {
    return new EdgeId(ID.generate().value);
  }

  /**
   * 从字符串创建边ID
   * @param value 字符串值
   * @returns 边ID实例
   */
  static fromString(value: string): EdgeId {
    return new EdgeId(value);
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  getBusinessIdentifier(): string {
    return `edge:${this.value}`;
  }
}