import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { CheckpointType } from '../value-objects/checkpoint-type';
import { CheckpointId } from '../value-objects/checkpoint-id';
import { StateData } from '../value-objects/state-data';
import { Metadata } from '../value-objects/metadata';
import { Tags } from '../value-objects/tags';
import { DeletionStatus } from '../value-objects/deletion-status';

/**
 * 检查点实体接口
 */
export interface CheckpointProps {
  id: CheckpointId;
  threadId: ID;
  type: CheckpointType;
  title?: string;
  description?: string;
  stateData: StateData;
  tags: Tags;
  metadata: Metadata;
  deletionStatus: DeletionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
}

/**
 * 检查点实体
 *
 * 表示线程执行过程中的检查点
 * 职责：
 * - 检查点基本信息管理
 * - 协调值对象进行状态管理
 * - 属性访问
 *
 * 不负责：
 * - 复杂的验证逻辑（由CheckpointValidationService负责）
 * - 数据操作的细节（由值对象负责）
 */
export class Checkpoint extends Entity {
  private readonly props: CheckpointProps;

  /**
   * 构造函数
   * @param props 检查点属性
   */
  private constructor(props: CheckpointProps) {
    super(props.id.value, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新检查点
   * @param threadId 线程ID
   * @param type 检查点类型
   * @param stateData 状态数据
   * @param title 标题
   * @param description 描述
   * @param tags 标签
   * @param metadata 元数据
   * @returns 新检查点实例
   */
  public static create(
    threadId: ID,
    type: CheckpointType,
    stateData: Record<string, unknown>,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ): Checkpoint {
    const now = Timestamp.now();
    const checkpointId = CheckpointId.generate();

    const props: CheckpointProps = {
      id: checkpointId,
      threadId,
      type,
      title,
      description,
      stateData: StateData.create(stateData),
      tags: Tags.create(tags || []),
      metadata: Metadata.create(metadata || {}),
      deletionStatus: DeletionStatus.active(),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
    };

    return new Checkpoint(props);
  }

  /**
   * 从已有属性重建检查点
   * @param props 检查点属性
   * @returns 检查点实例
   */
  public static fromProps(props: CheckpointProps): Checkpoint {
    return new Checkpoint(props);
  }

  /**
   * 获取检查点ID
   * @returns 检查点ID
   */
  public get checkpointId(): CheckpointId {
    return this.props.id;
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID {
    return this.props.threadId;
  }

  /**
   * 获取检查点类型
   * @returns 检查点类型
   */
  public get type(): CheckpointType {
    return this.props.type;
  }

  /**
   * 获取标题
   * @returns 标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取描述
   * @returns 描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取状态数据
   * @returns 状态数据
   */
  public get stateData(): StateData {
    return this.props.stateData;
  }

  /**
   * 获取标签
   * @returns 标签
   */
  public get tags(): Tags {
    return this.props.tags;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Metadata {
    return this.props.metadata;
  }

  /**
   * 获取删除状态
   * @returns 删除状态
   */
  public get deletionStatus(): DeletionStatus {
    return this.props.deletionStatus;
  }

  /**
   * 更新标题
   * @param title 新标题
   * @returns 新检查点实例
   */
  public updateTitle(title: string): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新描述
   * @param description 新描述
   * @returns 新检查点实例
   */
  public updateDescription(description: string): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新状态数据
   * @param stateData 新状态数据
   * @returns 新检查点实例
   */
  public updateStateData(stateData: Record<string, unknown>): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      stateData: StateData.create(stateData),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 设置状态数据值
   * @param key 键
   * @param value 值
   * @returns 新检查点实例
   */
  public setStateDataValue(key: string, value: unknown): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      stateData: this.props.stateData.setValue(key, value),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 添加标签
   * @param tag 标签
   * @returns 新检查点实例
   */
  public addTag(tag: string): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      tags: this.props.tags.add(tag),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 移除标签
   * @param tag 标签
   * @returns 新检查点实例
   */
  public removeTag(tag: string): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      tags: this.props.tags.remove(tag),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 新检查点实例
   */
  public updateMetadata(metadata: Record<string, unknown>): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      metadata: Metadata.create(metadata),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 设置元数据项
   * @param key 键
   * @param value 值
   * @returns 新检查点实例
   */
  public setMetadata(key: string, value: unknown): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      metadata: this.props.metadata.setValue(key, value),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 移除元数据项
   * @param key 键
   * @returns 新检查点实例
   */
  public removeMetadata(key: string): Checkpoint {
    this.props.deletionStatus.ensureActive();

    return new Checkpoint({
      ...this.props,
      metadata: this.props.metadata.remove(key),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 检查是否有指定标签
   * @param tag 标签
   * @returns 是否有标签
   */
  public hasTag(tag: string): boolean {
    return this.props.tags.has(tag);
  }

  /**
   * 检查是否有指定的状态数据
   * @param key 键
   * @returns 是否有状态数据
   */
  public hasStateData(key: string): boolean {
    return this.props.stateData.has(key);
  }

  /**
   * 检查是否有指定的元数据
   * @param key 键
   * @returns 是否有元数据
   */
  public hasMetadata(key: string): boolean {
    return this.props.metadata.has(key);
  }

  /**
   * 标记检查点为已删除
   * @returns 新检查点实例
   */
  public markAsDeleted(): Checkpoint {
    if (this.props.deletionStatus.isDeleted()) {
      return this;
    }

    return new Checkpoint({
      ...this.props,
      deletionStatus: this.props.deletionStatus.markAsDeleted(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 检查检查点是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.deletionStatus.isDeleted();
  }

  /**
   * 检查检查点是否活跃
   * @returns 是否活跃
   */
  public isActive(): boolean {
    return this.props.deletionStatus.isActive();
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `checkpoint:${this.props.id.toString()}`;
  }

  /**
   * 获取检查点的完整属性（用于持久化）
   * @returns 检查点属性
   */
  public toProps(): CheckpointProps {
    return this.props;
  }
}
