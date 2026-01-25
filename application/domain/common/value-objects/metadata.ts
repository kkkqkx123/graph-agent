import { ValueObject } from '.';
import { ValidationError } from '../exceptions';

/**
 * 元数据值对象接口
 */
export interface MetadataProps {
  data: Record<string, unknown>;
}

/**
 * 元数据值对象
 *
 * 用于封装实体的元数据
 * 职责：
 * - 元数据的封装和访问
 * - 元数据的验证
 * - 元数据的不可变操作
 */
export class Metadata extends ValueObject<MetadataProps> {
  private constructor(props: MetadataProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建元数据
   * @param data 元数据
   * @returns 元数据实例
   */
  public static create(data: Record<string, unknown>): Metadata {
    const metadata = new Metadata({ data: { ...data } });
    return metadata;
  }

  /**
   * 创建空元数据
   * @returns 空元数据实例
   */
  public static empty(): Metadata {
    const metadata = new Metadata({ data: {} });
    return metadata;
  }

  /**
   * 获取元数据值
   * @param key 键
   * @returns 值
   */
  public getValue(key: string): unknown {
    return this.props.data[key];
  }

  /**
   * 设置元数据值
   * @param key 键
   * @param value 值
   * @returns 新的元数据实例
   */
  public setValue(key: string, value: unknown): Metadata {
    const newData = { ...this.props.data };
    newData[key] = value;
    return new Metadata({ data: newData });
  }

  /**
   * 检查是否有指定的元数据
   * @param key 键
   * @returns 是否有元数据
   */
  public has(key: string): boolean {
    return key in this.props.data;
  }

  /**
   * 移除元数据值
   * @param key 键
   * @returns 新的元数据实例
   */
  public remove(key: string): Metadata {
    if (!this.has(key)) {
      return this;
    }

    const newData = { ...this.props.data };
    delete newData[key];
    return new Metadata({ data: newData });
  }

  /**
   * 检查是否为空
   * @returns 是否为空
   */
  public isEmpty(): boolean {
    return Object.keys(this.props.data).length === 0;
  }

  /**
   * 转换为记录对象
   * @returns 记录对象
   */
  public toRecord(): Record<string, unknown> {
    return { ...this.props.data };
  }

  /**
   * 比较两个元数据是否相等
   * @param other 其他元数据
   * @returns 是否相等
   */
  public override equals(other?: Metadata): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return JSON.stringify(this.props.data) === JSON.stringify(other.props.data);
  }

  /**
   * 获取元数据的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `Metadata(${JSON.stringify(this.props.data)})`;
  }

  /**
   * 验证元数据的有效性
   */
  public validate(): void {
    if (this.props.data === null || this.props.data === undefined) {
      throw new ValidationError('元数据不能为空');
    }

    if (typeof this.props.data !== 'object') {
      throw new ValidationError('元数据必须是对象');
    }
  }
}