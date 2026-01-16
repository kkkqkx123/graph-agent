import { ValueObject } from '../../../common/value-objects';

/**
 * 标签值对象接口
 */
export interface TagsProps {
  tags: string[];
}

/**
 * 标签值对象
 *
 * 用于封装检查点的标签
 * 职责：
 * - 标签的封装和访问
 * - 标签的验证
 * - 标签的不可变操作
 */
export class Tags extends ValueObject<TagsProps> {
  private constructor(props: TagsProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建标签
   * @param tags 标签数组
   * @returns 标签实例
   */
  public static create(tags: string[]): Tags {
    // 去重并过滤空标签
    const uniqueTags = [...new Set(tags.filter(tag => tag.trim().length > 0))];
    const tagsObj = new Tags({ tags: uniqueTags });
    return tagsObj;
  }

  /**
   * 创建空标签
   * @returns 空标签实例
   */
  public static empty(): Tags {
    const tagsObj = new Tags({ tags: [] });
    return tagsObj;
  }

  /**
   * 添加标签
   * @param tag 标签
   * @returns 新的标签实例
   */
  public add(tag: string): Tags {
    const trimmedTag = tag.trim();
    if (trimmedTag.length === 0) {
      return this;
    }

    if (this.props.tags.includes(trimmedTag)) {
      return this;
    }

    return new Tags({ tags: [...this.props.tags, trimmedTag] });
  }

  /**
   * 移除标签
   * @param tag 标签
   * @returns 新的标签实例
   */
  public remove(tag: string): Tags {
    const index = this.props.tags.indexOf(tag);
    if (index === -1) {
      return this;
    }

    const newTags = [...this.props.tags];
    newTags.splice(index, 1);
    return new Tags({ tags: newTags });
  }

  /**
   * 检查是否有指定标签
   * @param tag 标签
   * @returns 是否有标签
   */
  public has(tag: string): boolean {
    return this.props.tags.includes(tag);
  }

  /**
   * 转换为数组
   * @returns 标签数组
   */
  public toArray(): string[] {
    return [...this.props.tags];
  }

  /**
   * 检查是否为空
   * @returns 是否为空
   */
  public isEmpty(): boolean {
    return this.props.tags.length === 0;
  }

  /**
   * 获取标签数量
   * @returns 标签数量
   */
  public size(): number {
    return this.props.tags.length;
  }

  /**
   * 合并其他标签
   * @param other 其他标签
   * @returns 合并后的标签
   */
  public merge(other: Tags): Tags {
    return Tags.create([...this.props.tags, ...other.toArray()]);
  }

  /**
   * 过滤标签
   * @param predicate 过滤函数
   * @returns 过滤后的标签
   */
  public filter(predicate: (tag: string) => boolean): Tags {
    return Tags.create(this.props.tags.filter(predicate));
  }

  /**
   * 映射标签
   * @param mapper 映射函数
   * @returns 映射后的标签
   */
  public map(mapper: (tag: string) => string): Tags {
    return Tags.create(this.props.tags.map(mapper));
  }

  /**
   * 查找标签
   * @param predicate 查找函数
   * @returns 找到的标签或 undefined
   */
  public find(predicate: (tag: string) => boolean): string | undefined {
    return this.props.tags.find(predicate);
  }

  /**
   * 检查是否包含所有指定标签
   * @param tags 标签数组
   * @returns 是否包含所有标签
   */
  public hasAll(tags: string[]): boolean {
    return tags.every(tag => this.has(tag));
  }

  /**
   * 检查是否包含任意指定标签
   * @param tags 标签数组
   * @returns 是否包含任意标签
   */
  public hasAny(tags: string[]): boolean {
    return tags.some(tag => this.has(tag));
  }

  /**
   * 比较两个标签是否相等
   * @param other 其他标签
   * @returns 是否相等
   */
  public override equals(other?: Tags): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (this.props.tags.length !== other.props.tags.length) {
      return false;
    }

    return this.props.tags.every(tag => other.has(tag));
  }

  /**
   * 获取标签的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `Tags([${this.props.tags.join(', ')}])`;
  }

  /**
   * 获取标签的逗号分隔字符串
   * @returns 逗号分隔字符串
   */
  public toCommaSeparatedString(): string {
    return this.props.tags.join(', ');
  }

  /**
   * 验证标签的有效性
   */
  public validate(): void {
    if (this.props.tags === null || this.props.tags === undefined) {
      throw new Error('标签不能为空');
    }

    if (!Array.isArray(this.props.tags)) {
      throw new Error('标签必须是数组');
    }

    // 验证每个标签都是字符串
    for (const tag of this.props.tags) {
      if (typeof tag !== 'string') {
        throw new Error('标签必须是字符串');
      }

      if (tag.trim().length === 0) {
        throw new Error('标签不能为空字符串');
      }
    }
  }
}