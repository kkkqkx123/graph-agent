import { ValueObject } from '../../common/value-objects';

/**
 * 共享资源值对象
 *
 * 职责：管理会话中线程间的共享资源
 */
export class SharedResources extends ValueObject<Map<string, unknown>> {
  public validate(): void {
    // 共享资源不需要特殊验证
  }

  [Symbol.iterator](): IterableIterator<[string, unknown]> {
    return this.props.entries();
  }

  entries(): IterableIterator<[string, unknown]> {
    return this.props.entries();
  }

  values(): IterableIterator<unknown> {
    return this.props.values();
  }
  /**
   * 创建空的共享资源
   * @returns 共享资源实例
   */
  public static empty(): SharedResources {
    return new SharedResources(new Map());
  }

  /**
   * 从现有映射创建共享资源
   * @param resources 资源映射
   * @returns 共享资源实例
   */
  public static fromMap(resources: Map<string, unknown>): SharedResources {
    return new SharedResources(new Map(resources));
  }

  /**
   * 设置共享资源
   * @param key 资源键
   * @param value 资源值
   * @returns 新的共享资源实例
   */
  public set(key: string, value: unknown): SharedResources {
    const newResources = new Map(this.props);
    newResources.set(key, value);
    return new SharedResources(newResources);
  }

  /**
   * 获取共享资源值
   * @param key 资源键
   * @returns 资源值
   */
  public get(key: string): unknown {
    return this.props.get(key);
  }

  /**
   * 检查共享资源是否存在
   * @param key 资源键
   * @returns 是否存在
   */
  public has(key: string): boolean {
    return this.props.has(key);
  }

  /**
   * 移除共享资源
   * @param key 资源键
   * @returns 新的共享资源实例
   */
  public remove(key: string): SharedResources {
    const newResources = new Map(this.props);
    newResources.delete(key);
    return new SharedResources(newResources);
  }

  /**
   * 获取所有资源键
   * @returns 资源键数组
   */
  public get keys(): string[] {
    return Array.from(this.props.keys());
  }

  /**
   * 获取资源数量
   * @returns 资源数量
   */
  public get size(): number {
    return this.props.size;
  }

  /**
   * 检查是否为空
   * @returns 是否为空
   */
  public isEmpty(): boolean {
    return this.props.size === 0;
  }

  /**
   * 清空所有资源
   * @returns 新的共享资源实例
   */
  public clear(): SharedResources {
    return SharedResources.empty();
  }

  /**
   * 转换为映射
   * @returns 资源映射
   */
  public toMap(): Map<string, unknown> {
    return new Map(this.props);
  }
}