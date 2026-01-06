/**
 * 值对象基类
 *
 * 值对象是DDD中的核心概念，用于描述事物的特征。
 * 值对象具有以下特征：
 * - 不可变性：一旦创建就不能修改
 * - 值相等性：通过属性值比较相等性
 * - 自验证性：创建时验证自身有效性
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  /**
   * 构造函数
   * @param props 值对象的属性
   */
  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  /**
   * 获取值对象的属性
   * @returns 值对象的属性
   */
  public get value(): T {
    return this.props;
  }

  /**
   * 比较两个值对象是否相等
   * @param vo 另一个值对象
   * @returns 是否相等
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * 获取值对象的字符串表示
   * @returns 字符串表示
   */
  public toString(): string {
    return JSON.stringify(this.props);
  }

  /**
   * 验证值对象的有效性
   * 子类需要实现具体的验证逻辑
   */
  public abstract validate(): void;
}
