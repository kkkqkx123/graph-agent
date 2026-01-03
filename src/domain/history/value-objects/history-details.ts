import { ValueObject } from '../../common/value-objects';

/**
 * 历史详情属性接口
 */
export interface HistoryDetailsProps {
  data: Record<string, unknown>;
}

/**
 * 历史详情值对象
 *
 * 封装历史记录的详细信息
 * 职责：
 * - 封装历史详情数据
 * - 提供历史详情操作方法
 * - 验证历史详情数据
 */
export class HistoryDetails extends ValueObject<HistoryDetailsProps> {
  private constructor(props: HistoryDetailsProps) {
    super(props);
  }

  /**
   * 创建历史详情
   * @param data 历史详情数据
   * @returns 历史详情实例
   */
  public static create(data: Record<string, unknown>): HistoryDetails {
    const historyDetails = new HistoryDetails({ data: { ...data } });
    historyDetails.validate();
    return historyDetails;
  }

  /**
   * 从已有属性重建历史详情
   * @param props 历史详情属性
   * @returns 历史详情实例
   */
  public static fromProps(props: HistoryDetailsProps): HistoryDetails {
    const historyDetails = new HistoryDetails({ data: { ...props.data } });
    historyDetails.validate();
    return historyDetails;
  }

  /**
   * 获取历史详情值
   * @param key 键
   * @returns 值
   */
  public getValue(key: string): unknown {
    return this.props.data[key];
  }

  /**
   * 设置历史详情值
   * @param key 键
   * @param value 值
   * @returns 新的历史详情实例
   */
  public setValue(key: string, value: unknown): HistoryDetails {
    const newData = { ...this.props.data };
    newData[key] = value;
    return HistoryDetails.create(newData);
  }

  /**
   * 检查是否有指定的历史详情
   * @param key 键
   * @returns 是否有历史详情
   */
  public has(key: string): boolean {
    return key in this.props.data;
  }

  /**
   * 移除历史详情值
   * @param key 键
   * @returns 新的历史详情实例
   */
  public remove(key: string): HistoryDetails {
    const newData = { ...this.props.data };
    delete newData[key];
    return HistoryDetails.create(newData);
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
   * 获取所有键值对
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
   * 获取大小
   * @returns 大小
   */
  public size(): number {
    return Object.keys(this.props.data).length;
  }

  /**
   * 合并其他历史详情
   * @param other 其他历史详情
   * @returns 新的历史详情实例
   */
  public merge(other: HistoryDetails): HistoryDetails {
    return HistoryDetails.create({
      ...this.props.data,
      ...other.props.data
    });
  }

  /**
   * 比较相等性
   * @param other 其他历史详情
   * @returns 是否相等
   */
  public override equals(vo?: ValueObject<HistoryDetailsProps>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }

    if (!(vo instanceof HistoryDetails)) {
      return false;
    }

    const keys1 = Object.keys(this.props.data).sort();
    const keys2 = Object.keys(vo.props.data).sort();

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let i = 0; i < keys1.length; i++) {
      const key = keys1[i]!;
      const otherKey = keys2[i]!;
      if (key !== otherKey) {
        return false;
      }
      if (this.props.data[key] !== vo.props.data[key]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 验证历史详情数据
   * @throws 如果验证失败
   */
  public override validate(): void {
    // 历史详情数据可以是任意结构，不需要特殊验证
    // 如果需要验证，可以在这里添加
  }
}