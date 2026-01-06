import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { HistoryType } from '../value-objects/history-type';
import { HistoryDetails } from '../value-objects/history-details';
import { Metadata } from '../../checkpoint/value-objects/metadata';
import { DeletionStatus } from '../../checkpoint/value-objects/deletion-status';

/**
 * 历史实体接口
 */
export interface HistoryProps {
  id: ID;
  sessionId?: ID;
  threadId?: ID;
  workflowId?: ID;
  type: HistoryType;
  title?: string;
  description?: string;
  details: HistoryDetails;
  metadata: Metadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  deletionStatus: DeletionStatus;
}

/**
 * 历史实体
 *
 * 表示系统中的历史记录
 * 职责：
 * - 历史记录基本信息管理
 * - 详细信息管理
 * - 属性访问
 *
 * 不负责：
 * - 复杂的验证逻辑（由HistoryValidationService负责）
 */
export class History extends Entity {
  private readonly props: HistoryProps;

  /**
   * 构造函数
   * @param props 历史属性
   */
  private constructor(props: HistoryProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新历史记录
   * @param type 历史类型
   * @param details 详细信息
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param title 标题
   * @param description 描述
   * @param metadata 元数据
   * @returns 新历史记录实例
   */
  public static create(
    type: HistoryType,
    details: Record<string, unknown>,
    sessionId?: ID,
    threadId?: ID,
    workflowId?: ID,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): History {
    const now = Timestamp.now();
    const historyId = ID.generate();

    const props: HistoryProps = {
      id: historyId,
      sessionId,
      threadId,
      workflowId,
      type,
      title,
      description,
      details: HistoryDetails.create(details),
      metadata: Metadata.create(metadata || {}),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      deletionStatus: DeletionStatus.active(),
    };

    return new History(props);
  }

  /**
   * 从已有属性重建历史记录
   * @param props 历史属性
   * @returns 历史记录实例
   */
  public static fromProps(props: HistoryProps): History {
    return new History(props);
  }

  /**
   * 获取历史记录ID
   * @returns 历史记录ID
   */
  public get historyId(): ID {
    return this.props.id;
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public get sessionId(): ID | undefined {
    return this.props.sessionId;
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID | undefined {
    return this.props.threadId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID | undefined {
    return this.props.workflowId;
  }

  /**
   * 获取历史类型
   * @returns 历史类型
   */
  public get type(): HistoryType {
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
   * 获取详细信息
   * @returns 详细信息
   */
  public get details(): HistoryDetails {
    return this.props.details;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Metadata {
    return this.props.metadata;
  }

  /**
   * 更新标题
   * @param title 新标题
   */
  public updateTitle(title: string): History {
    this.props.deletionStatus.ensureActive();

    const newProps: HistoryProps = {
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 更新描述
   * @param description 新描述
   */
  public updateDescription(description: string): History {
    this.props.deletionStatus.ensureActive();

    const newProps: HistoryProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 更新详细信息
   * @param details 新详细信息
   */
  public updateDetails(details: Record<string, unknown>): History {
    this.props.deletionStatus.ensureActive();

    const newProps: HistoryProps = {
      ...this.props,
      details: HistoryDetails.create(details),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): History {
    this.props.deletionStatus.ensureActive();

    const newProps: HistoryProps = {
      ...this.props,
      metadata: Metadata.create(metadata),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 设置元数据项
   * @param key 键
   * @param value 值
   */
  public setMetadata(key: string, value: unknown): History {
    this.props.deletionStatus.ensureActive();

    const newProps: HistoryProps = {
      ...this.props,
      metadata: this.props.metadata.setValue(key, value),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 移除元数据项
   * @param key 键
   */
  public removeMetadata(key: string): History {
    this.props.deletionStatus.ensureActive();

    const newProps: HistoryProps = {
      ...this.props,
      metadata: this.props.metadata.remove(key),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 获取详细信息值
   * @param key 键
   * @returns 值
   */
  public getDetailValue(key: string): unknown {
    return this.props.details.getValue(key);
  }

  /**
   * 设置详细信息值
   * @param key 键
   * @param value 值
   */
  public setDetailValue(key: string, value: unknown): History {
    this.props.deletionStatus.ensureActive();

    const newProps: HistoryProps = {
      ...this.props,
      details: this.props.details.setValue(key, value),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 移除详细信息项
   * @param key 键
   */
  public removeDetail(key: string): History {
    this.props.deletionStatus.ensureActive();

    const newProps: HistoryProps = {
      ...this.props,
      details: this.props.details.remove(key),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 检查是否有指定的详细信息
   * @param key 键
   * @returns 是否有详细信息
   */
  public hasDetail(key: string): boolean {
    return this.props.details.has(key);
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
   * 标记历史记录为已删除
   */
  public markAsDeleted(): History {
    const newProps: HistoryProps = {
      ...this.props,
      deletionStatus: this.props.deletionStatus.markAsDeleted(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    return new History(newProps);
  }

  /**
   * 检查历史记录是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.deletionStatus.isDeleted();
  }

  /**
   * 检查历史记录是否活跃
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
    return `history:${this.props.id.toString()}`;
  }
}
