import { ID } from '../value-objects/id';
import { Timestamp } from '../value-objects/timestamp';

/**
 * 领域事件接口
 */
export interface DomainEventProps {
  id: ID;
  aggregateId: ID;
  occurredOn: Timestamp;
  version: number;
}

/**
 * 领域事件基类
 * 
 * 领域事件是DDD中的重要概念，表示领域中发生的重要事情。
 * 领域事件具有以下特征：
 * - 不可变性：一旦创建就不能修改
 * - 包含事件发生的时间
 * - 包含相关的聚合ID
 * - 包含事件的版本信息
 */
export abstract class DomainEvent<T = Record<string, unknown>> {
  protected readonly props: DomainEventProps;

  /**
   * 构造函数
   * @param aggregateId 聚合ID
   * @param version 事件版本
   */
  protected constructor(aggregateId: ID, version: number = 1) {
    this.props = {
      id: ID.generate(),
      aggregateId,
      occurredOn: Timestamp.now(),
      version
    };
  }

  /**
   * 获取事件ID
   * @returns 事件ID
   */
  public get id(): ID {
    return this.props.id;
  }

  /**
   * 获取聚合ID
   * @returns 聚合ID
   */
  public get aggregateId(): ID {
    return this.props.aggregateId;
  }

  /**
   * 获取事件发生时间
   * @returns 事件发生时间
   */
  public get occurredOn(): Timestamp {
    return this.props.occurredOn;
  }

  /**
   * 获取事件版本
   * @returns 事件版本
   */
  public get version(): number {
    return this.props.version;
  }

  /**
   * 获取事件名称
   * 子类需要实现具体的事件名称
   * @returns 事件名称
   */
  public abstract get eventName(): string;

  /**
   * 获取事件数据
   * 子类需要实现具体的事件数据
   * @returns 事件数据
   */
  public abstract getData(): T;

  /**
   * 序列化事件
   * @returns 序列化后的事件数据
   */
  public serialize(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      aggregateId: this.props.aggregateId.toString(),
      eventName: this.eventName,
      occurredOn: this.props.occurredOn.toISOString(),
      version: this.props.version,
      data: this.getData()
    };
  }

  /**
   * 比较两个领域事件是否相等
   * @param event 另一个领域事件
   * @returns 是否相等
   */
  public equals(event?: DomainEvent): boolean {
    if (event === null || event === undefined) {
      return false;
    }
    return this.props.id.equals(event.id);
  }

  /**
   * 获取事件的字符串表示
   * @returns 字符串表示
   */
  public toString(): string {
    return `${this.eventName}[${this.props.id.toString()}]`;
  }
}