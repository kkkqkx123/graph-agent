import { Entity } from './entity';
import { ID } from '../value-objects/id';
import { Timestamp } from '../value-objects/timestamp';
import { Version } from '../value-objects/version';
import { DomainEvent } from '../events/domain-event';

/**
 * 聚合根基类
 * 
 * 聚合根是DDD中的核心概念，表示一个聚合的根实体。
 * 聚合根具有以下特征：
 * - 是聚合的入口点
 * - 维护聚合的不变性
 * - 控制聚合内部对象的访问
 * - 处理聚合级别的业务逻辑
 */
export abstract class AggregateRoot extends Entity {
  /**
   * 构造函数
   * @param id 聚合根ID
   * @param createdAt 创建时间
   * @param updatedAt 更新时间
   * @param version 版本
   */
  protected constructor(
    id: ID,
    createdAt: Timestamp,
    updatedAt: Timestamp,
    version: Version
  ) {
    super(id, createdAt, updatedAt, version);
  }

  /**
   * 添加领域事件
   * @param event 领域事件
   */
  protected override addDomainEvent<T = Record<string, unknown>>(event: DomainEvent<T>): void {
    // 聚合根可以添加额外的验证逻辑
    this.validateDomainEvent(event);
    super.addDomainEvent(event);
  }

  /**
   * 验证领域事件
   * 子类可以重写此方法添加特定的验证逻辑
   * @param event 领域事件
   */
  protected validateDomainEvent<T = Record<string, unknown>>(event: DomainEvent<T>): void {
    // 默认实现不做任何验证
  }

  /**
   * 标记聚合为已删除
   * 子类可以实现具体的删除逻辑
   */
  public abstract markAsDeleted(): void;

  /**
   * 检查聚合是否已删除
   * @returns 是否已删除
   */
  public abstract isDeleted(): boolean;

  /**
   * 获取聚合的业务标识
   * 子类可以实现特定的业务标识逻辑
   * @returns 业务标识
   */
  public abstract getBusinessIdentifier(): string;

}