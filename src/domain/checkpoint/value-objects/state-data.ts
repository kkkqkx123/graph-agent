import { ValueObject } from '../../common/value-objects';

/**
 * 状态数据值对象接口
 */
export interface StateDataProps {
  data: Record<string, unknown>;
}

/**
 * 状态数据值对象
 *
 * 用于封装检查点的状态数据
 * 职责：
 * - 状态数据的封装和访问
 * - 状态数据的验证
 * - 状态数据的不可变操作
 */
export class StateData extends ValueObject<StateDataProps> {
  private constructor(props: StateDataProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建状态数据
   * @param data 状态数据
   * @returns 状态数据实例
   */
  public static create(data: Record<string, unknown>): StateData {
    const stateData = new StateData({ data: { ...data } });
    return stateData;
  }

  /**
   * 创建空状态数据
   * @returns 空状态数据实例
   */
  public static empty(): StateData {
    const stateData = new StateData({ data: {} });
    return stateData;
  }

  /**
   * 获取状态数据值
   * @param key 键
   * @returns 值
   */
  public getValue(key: string): unknown {
    return this.props.data[key];
  }

  /**
   * 设置状态数据值
   * @param key 键
   * @param value 值
   * @returns 新的状态数据实例
   */
  public setValue(key: string, value: unknown): StateData {
    const newData = { ...this.props.data };
    newData[key] = value;
    return new StateData({ data: newData });
  }

  /**
   * 检查是否有指定的状态数据
   * @param key 键
   * @returns 是否有状态数据
   */
  public has(key: string): boolean {
    return key in this.props.data;
  }

  /**
   * 移除状态数据值
   * @param key 键
   * @returns 新的状态数据实例
   */
  public remove(key: string): StateData {
    if (!this.has(key)) {
      return this;
    }

    const newData = { ...this.props.data };
    delete newData[key];
    return new StateData({ data: newData });
  }

  /**
   * 转换为记录对象
   * @returns 记录对象
   */
  public toRecord(): Record<string, unknown> {
    return { ...this.props.data };
  }

  /**
   * 获取所有键
   * @returns 键数组
   */
  public keys(): string[] {
    return Object.keys(this.props.data);
  }

  /**
   * 获取所有值
   * @returns 值数组
   */
  public values(): unknown[] {
    return Object.values(this.props.data);
  }

  /**
   * 获取键值对数组
   * @returns 键值对数组
   */
  public entries(): [string, unknown][] {
    return Object.entries(this.props.data);
  }

  /**
   * 检查是否为空
   * @returns 是否为空
   */
  public isEmpty(): boolean {
    return Object.keys(this.props.data).length === 0;
  }

  /**
   * 获取数据大小
   * @returns 数据大小
   */
  public size(): number {
    return Object.keys(this.props.data).length;
  }

  /**
   * 合并其他状态数据
   * @param other 其他状态数据
   * @returns 合并后的状态数据
   */
  public merge(other: StateData): StateData {
    return new StateData({
      data: { ...this.props.data, ...other.toRecord() },
    });
  }

  /**
   * 比较两个状态数据是否相等
   * @param other 其他状态数据
   * @returns 是否相等
   */
  public override equals(other?: StateData): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    const thisKeys = this.keys();
    const otherKeys = other.keys();

    if (thisKeys.length !== otherKeys.length) {
      return false;
    }

    for (const key of thisKeys) {
      if (!other.has(key)) {
        return false;
      }

      const thisValue = this.getValue(key);
      const otherValue = other.getValue(key);

      if (thisValue !== otherValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取状态数据的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `StateData(${JSON.stringify(this.props.data)})`;
  }

  /**
   * 验证状态数据的有效性
   */
  public validate(): void {
    if (this.props.data === null || this.props.data === undefined) {
      throw new Error('状态数据不能为空');
    }

    if (typeof this.props.data !== 'object') {
      throw new Error('状态数据必须是对象');
    }
  }
}
