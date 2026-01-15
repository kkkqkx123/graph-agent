import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { StateId } from '../value-objects/state-id';
import { StateEntityType } from '../value-objects/state-entity-type';
import { StateData } from '../value-objects/state-data';
import { Metadata } from '../../checkpoint/value-objects/metadata';
import { Checkpoint } from '../../checkpoint/entities/checkpoint';
import { CheckpointType } from '../../checkpoint/value-objects/checkpoint-type';

/**
 * 状态实体属性接口
 */
export interface StateProps {
  readonly id: StateId;
  readonly entityId: ID;
  readonly entityType: StateEntityType;
  readonly data: StateData;
  readonly metadata: Metadata;
  readonly version: Version;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/**
 * 状态实体
 *
 * 表示Workflow、Thread或Session的运行时状态
 * 职责：
 * - 状态数据管理
 * - Checkpoint创建
 * - 状态验证
 * - 快照支持
 */
export class State extends Entity {
  private readonly props: StateProps;

  /**
   * 构造函数
   * @param props 状态属性
   */
  private constructor(props: StateProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新状态
   * @param entityId 实体ID
   * @param entityType 实体类型
   * @param data 状态数据
   * @param metadata 元数据
   * @returns 新状态实例
   */
  public static create(
    entityId: ID,
    entityType: StateEntityType,
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): State {
    const now = Timestamp.now();
    const stateId = StateId.generate();

    const props: StateProps = {
      id: stateId,
      entityId,
      entityType,
      data: StateData.create(data),
      metadata: Metadata.create(metadata || {}),
      version: Version.initial(),
      createdAt: now,
      updatedAt: now,
    };

    return new State(props);
  }

  /**
   * 从已有属性重建状态
   * @param props 状态属性
   * @returns 状态实例
   */
  public static fromProps(props: StateProps): State {
    return new State(props);
  }

  /**
   * 获取状态ID
   */
  public get stateId(): StateId {
    return this.props.id;
  }

  /**
   * 获取实体ID
   */
  public get entityId(): ID {
    return this.props.entityId;
  }

  /**
   * 获取实体类型
   */
  public get entityType(): StateEntityType {
    return this.props.entityType;
  }

  /**
   * 获取状态数据
   */
  public get data(): StateData {
    return this.props.data;
  }

  /**
   * 获取元数据
   */
  public get metadata(): Metadata {
    return this.props.metadata;
  }

  /**
   * 更新状态数据
   * @param updates 更新数据
   * @returns 新状态实例
   */
  public updateData(updates: Record<string, unknown>): State {
    const newData = this.props.data.merge(StateData.create(updates));

    return new State({
      ...this.props,
      data: newData,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 设置状态数据值
   * @param key 键
   * @param value 值
   * @returns 新状态实例
   */
  public setDataValue(key: string, value: unknown): State {
    return new State({
      ...this.props,
      data: this.props.data.setValue(key, value),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 创建Checkpoint
   * @param type Checkpoint类型
   * @param title 标题
   * @param description 描述
   * @returns Checkpoint实例
   */
  public createCheckpoint(
    type: CheckpointType,
    title?: string,
    description?: string
  ): Checkpoint {
    return Checkpoint.create(
      this.props.entityId,
      type,
      this.props.data.toRecord(),
      title,
      description,
      ['state-checkpoint'],
      {
        stateId: this.props.id.value,
        entityType: this.props.entityType.getDescription(),
      }
    );
  }

  /**
   * 从Checkpoint恢复状态
   * @param checkpoint Checkpoint实例
   * @returns 新状态实例
   */
  public restoreFromCheckpoint(checkpoint: Checkpoint): State {
    return new State({
      ...this.props,
      data: checkpoint.stateData,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 验证状态有效性
   */
  public validate(): void {
    if (!this.props.entityId) {
      throw new Error('实体ID不能为空');
    }

    if (!this.props.entityType) {
      throw new Error('实体类型不能为空');
    }

    this.props.data.validate();
  }

  /**
   * 获取业务标识
   */
  public getBusinessIdentifier(): string {
    return `state:${this.props.id.toString()}`;
  }

  /**
   * 获取完整属性（用于持久化）
   */
  public toProps(): StateProps {
    return this.props;
  }
}