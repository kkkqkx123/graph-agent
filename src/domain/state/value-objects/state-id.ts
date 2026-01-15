import { ID } from '../../common/value-objects/id';

/**
 * 状态ID值对象
 * 基于ID值对象，提供状态特定的ID管理
 */
export class StateId extends ID {
  /**
   * 生成新的状态ID
   * @returns 状态ID实例
   */
  public static override generate(): StateId {
    return new StateId(ID.generate().value);
  }

  /**
   * 从字符串创建状态ID
   * @param value ID值
   * @returns 状态ID实例
   */
  public static override fromString(value: string): StateId {
    return new StateId(value);
  }

  /**
   * 构造函数
   * @param value ID值
   */
  private constructor(value: string) {
    super(value);
  }
}