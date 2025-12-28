import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { CheckpointType } from '../value-objects/checkpoint-type';

/**
 * 检查点实体接口
 */
export interface CheckpointProps {
  id: ID;
  threadId: ID;
  type: CheckpointType;
  title?: string;
  description?: string;
  stateData: Record<string, unknown>;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
}

/**
 * 检查点实体
 *
 * 表示线程执行过程中的检查点
 * 职责：
 * - 检查点基本信息管理
 * - 状态数据管理
 * - 属性访问
 *
 * 不负责：
 * - 复杂的验证逻辑（由CheckpointValidationService负责）
 */
export class Checkpoint extends Entity {
  private readonly props: CheckpointProps;

  /**
   * 构造函数
   * @param props 检查点属性
   */
  private constructor(props: CheckpointProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
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
    const checkpointId = ID.generate();

    const props: CheckpointProps = {
      id: checkpointId,
      threadId,
      type,
      title,
      description,
      stateData: { ...stateData },
      tags: tags || [],
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
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
  public get checkpointId(): ID {
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
  public get stateData(): Record<string, unknown> {
    return { ...this.props.stateData };
  }

  /**
   * 获取标签
   * @returns 标签列表
   */
  public get tags(): string[] {
    return [...this.props.tags];
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 更新标题
   * @param title 新标题
   */
  public updateTitle(title: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除的检查点');
    }

    const newProps = {
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新描述
   * @param description 新描述
   */
  public updateDescription(description: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除的检查点');
    }

    const newProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新状态数据
   * @param stateData 新状态数据
   */
  public updateStateData(stateData: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除检查点的状态数据');
    }

    const newProps = {
      ...this.props,
      stateData: { ...stateData },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 添加标签
   * @param tag 标签
   */
  public addTag(tag: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法为已删除的检查点添加标签');
    }

    if (this.props.tags.includes(tag)) {
      return; // 标签已存在
    }

    const newProps = {
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除标签
   * @param tag 标签
   */
  public removeTag(tag: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法为已删除的检查点移除标签');
    }

    const index = this.props.tags.indexOf(tag);
    if (index === -1) {
      return; // 标签不存在
    }

    const newTags = [...this.props.tags];
    newTags.splice(index, 1);

    const newProps = {
      ...this.props,
      tags: newTags,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除检查点的元数据');
    }

    const newProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 设置元数据项
   * @param key 键
   * @param value 值
   */
  public setMetadata(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new Error('无法设置已删除检查点的元数据');
    }

    const newMetadata = { ...this.props.metadata };
    newMetadata[key] = value;

    const newProps = {
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除元数据项
   * @param key 键
   */
  public removeMetadata(key: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法移除已删除检查点的元数据');
    }

    const newMetadata = { ...this.props.metadata };
    delete newMetadata[key];

    const newProps = {
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 获取状态数据值
   * @param key 键
   * @returns 值
   */
  public getStateDataValue(key: string): unknown {
    return this.props.stateData[key];
  }

  /**
   * 设置状态数据值
   * @param key 键
   * @param value 值
   */
  public setStateDataValue(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new Error('无法设置已删除检查点的状态数据');
    }

    const newStateData = { ...this.props.stateData };
    newStateData[key] = value;

    const newProps = {
      ...this.props,
      stateData: newStateData,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查是否有指定标签
   * @param tag 标签
   * @returns 是否有标签
   */
  public hasTag(tag: string): boolean {
    return this.props.tags.includes(tag);
  }

  /**
   * 检查是否有指定的状态数据
   * @param key 键
   * @returns 是否有状态数据
   */
  public hasStateData(key: string): boolean {
    return key in this.props.stateData;
  }

  /**
   * 检查是否有指定的元数据
   * @param key 键
   * @returns 是否有元数据
   */
  public hasMetadata(key: string): boolean {
    return key in this.props.metadata;
  }

  /**
   * 标记检查点为已删除
   */
  public markAsDeleted(): void {
    if (this.props.isDeleted) {
      return;
    }

    const newProps = {
      ...this.props,
      isDeleted: true,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查检查点是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `checkpoint:${this.props.id.toString()}`;
  }

}