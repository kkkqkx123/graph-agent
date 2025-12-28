import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { HistoryType } from '../value-objects/history-type';

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
  details: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
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
      details: { ...details },
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
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
  public get details(): Record<string, unknown> {
    return { ...this.props.details };
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
      throw new Error('无法更新已删除的历史记录');
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
      throw new Error('无法更新已删除的历史记录');
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
   * 更新详细信息
   * @param details 新详细信息
   */
  public updateDetails(details: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除历史记录的详细信息');
    }

    const newProps = {
      ...this.props,
      details: { ...details },
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
      throw new Error('无法更新已删除历史记录的元数据');
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
      throw new Error('无法设置已删除历史记录的元数据');
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
      throw new Error('无法移除已删除历史记录的元数据');
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
   * 获取详细信息值
   * @param key 键
   * @returns 值
   */
  public getDetailValue(key: string): unknown {
    return this.props.details[key];
  }

  /**
   * 设置详细信息值
   * @param key 键
   * @param value 值
   */
  public setDetailValue(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new Error('无法设置已删除历史记录的详细信息');
    }

    const newDetails = { ...this.props.details };
    newDetails[key] = value;

    const newProps = {
      ...this.props,
      details: newDetails,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除详细信息项
   * @param key 键
   */
  public removeDetail(key: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法移除已删除历史记录的详细信息');
    }

    const newDetails = { ...this.props.details };
    delete newDetails[key];

    const newProps = {
      ...this.props,
      details: newDetails,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查是否有指定的详细信息
   * @param key 键
   * @returns 是否有详细信息
   */
  public hasDetail(key: string): boolean {
    return key in this.props.details;
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
   * 标记历史记录为已删除
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
   * 检查历史记录是否已删除
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
    return `history:${this.props.id.toString()}`;
  }

}