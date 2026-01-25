import { Entity } from '../../../common/base/entity';
import { ID } from '../../../common/value-objects/id';
import { Timestamp } from '../../../common/value-objects/timestamp';
import { Version } from '../../../common/value-objects/version';
import { CheckpointType } from '../value-objects/checkpoint-type';
import { CheckpointStatus } from '../value-objects/checkpoint-status';
import { CheckpointScope } from '../value-objects/checkpoint-scope';
import { ValidationError } from '../../../common/exceptions';

/**
 * Checkpoint 实体属性接口
 */
export interface CheckpointProps {
  id: ID;
  threadId: ID;
  scope: CheckpointScope;
  type: CheckpointType;
  status: CheckpointStatus;
  title?: string;
  description?: string;
  stateData: Record<string, unknown>;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
  expiresAt?: Timestamp;
  sizeBytes: number;
  restoreCount: number;
  lastRestoredAt?: Timestamp;
}

/**
 * Checkpoint 实体
 *
 * 表示 Thread 的检查点，专注于 Thread 的状态记录
 * 
 * 设计原则：
 * - Thread 是唯一的执行引擎，负责实际的 workflow 执行和状态管理
 * - Checkpoint 只记录 Thread 的状态快照
 * - Session 的状态通过聚合其 Thread 的 checkpoint 间接获取
 * 
 * 职责：
 * - 检查点基本信息管理
 * - 状态数据管理
 * - 恢复功能
 * - 过期管理
 * - 统计信息管理
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
   * @param expirationHours 过期小时数
   * @returns 新检查点实例
   */
  public static create(
    threadId: ID,
    type: CheckpointType,
    stateData: Record<string, unknown>,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Checkpoint {
    const now = Timestamp.now();
    const checkpointId = ID.generate();
    const status = CheckpointStatus.active();
    const scope = CheckpointScope.thread();

    // 计算数据大小
    const sizeBytes = JSON.stringify(stateData).length;

    // 设置过期时间
    let expiresAt: Timestamp | undefined;
    if (expirationHours && expirationHours > 0) {
      expiresAt = now.addHours(expirationHours);
    }

    const props: CheckpointProps = {
      id: checkpointId,
      threadId,
      scope,
      type,
      status,
      title,
      description,
      stateData: { ...stateData },
      tags: tags || [],
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false,
      expiresAt,
      sizeBytes,
      restoreCount: 0,
    };

    const checkpoint = new Checkpoint(props);
    return checkpoint;
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
   */
  public get checkpointId(): ID {
    return this.props.id;
  }

  /**
   * 获取线程ID
   */
  public get threadId(): ID {
    return this.props.threadId;
  }

  /**
   * 获取检查点范围
   */
  public get scope(): CheckpointScope {
    return this.props.scope;
  }

  /**
   * 获取检查点类型
   */
  public get type(): CheckpointType {
    return this.props.type;
  }

  /**
   * 获取检查点状态
   */
  public get status(): CheckpointStatus {
    return this.props.status;
  }

  /**
   * 获取标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取状态数据
   */
  public get stateData(): Record<string, unknown> {
    return { ...this.props.stateData };
  }

  /**
   * 获取标签
   */
  public get tags(): string[] {
    return [...this.props.tags];
  }

  /**
   * 获取元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取过期时间
   */
  public get expiresAt(): Timestamp | undefined {
    return this.props.expiresAt;
  }

  /**
   * 获取数据大小（字节）
   */
  public get sizeBytes(): number {
    return this.props.sizeBytes;
  }

  /**
   * 获取恢复次数
   */
  public get restoreCount(): number {
    return this.props.restoreCount;
  }

  /**
   * 获取最后恢复时间
   */
  public get lastRestoredAt(): Timestamp | undefined {
    return this.props.lastRestoredAt;
  }

  /**
   * 检查检查点是否有效
   */
  public isValid(): boolean {
    return !this.props.isDeleted && this.props.status.isActive() && !this.isExpired();
  }

  /**
   * 检查是否可以恢复
   */
  public canRestore(): boolean {
    return this.isValid() && !this.props.status.isCorrupted();
  }

  /**
   * 检查是否已过期
   */
  public isExpired(): boolean {
    if (!this.props.expiresAt) {
      return false;
    }
    return Timestamp.now().isAfter(this.props.expiresAt);
  }

  /**
   * 获取检查点年龄（秒）
   */
  public getAgeInSeconds(): number {
    return Timestamp.now().differenceInSeconds(this.props.createdAt);
  }

  /**
   * 获取检查点年龄（小时）
   */
  public getAgeInHours(): number {
    return this.getAgeInSeconds() / 3600;
  }

  /**
   * 标记为已恢复
   */
  public markRestored(): void {
    if (!this.canRestore()) {
      throw new ValidationError('无法恢复无效的检查点');
    }

    const newProps = {
      ...this.props,
      restoreCount: this.props.restoreCount + 1,
      lastRestoredAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 标记为已过期
   */
  public markExpired(): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法标记已删除的检查点为过期');
    }

    const newProps = {
      ...this.props,
      status: CheckpointStatus.expired(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 标记为已损坏
   */
  public markCorrupted(): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法标记已删除的检查点为损坏');
    }

    const newProps = {
      ...this.props,
      status: CheckpointStatus.corrupted(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 标记为已归档
   */
  public markArchived(): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法标记已删除的检查点为归档');
    }

    const newProps = {
      ...this.props,
      status: CheckpointStatus.archived(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新状态数据
   */
  public updateStateData(stateData: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法更新已删除检查点的状态数据');
    }

    if (!stateData || Object.keys(stateData).length === 0) {
      throw new ValidationError('状态数据不能为空');
    }

    const sizeBytes = JSON.stringify(stateData).length;

    const newProps = {
      ...this.props,
      stateData: { ...stateData },
      sizeBytes,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 设置过期时间
   */
  public setExpiration(hours: number): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法为已删除的检查点设置过期时间');
    }

    if (hours <= 0) {
      throw new ValidationError('过期时间必须为正数');
    }

    const newProps = {
      ...this.props,
      expiresAt: Timestamp.now().addHours(hours),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 延长过期时间
   */
  public extendExpiration(hours: number): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法延长已删除检查点的过期时间');
    }

    if (hours <= 0) {
      throw new ValidationError('延长时间必须为正数');
    }

    const currentExpiresAt = this.props.expiresAt || Timestamp.now();
    const newExpiresAt = currentExpiresAt.addHours(hours);

    const newProps = {
      ...this.props,
      expiresAt: newExpiresAt,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新标题
   */
  public updateTitle(title: string): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法更新已删除的检查点标题');
    }

    const newProps = {
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新描述
   */
  public updateDescription(description: string): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法更新已删除的检查点描述');
    }

    const newProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 添加标签
   */
  public addTag(tag: string): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法为已删除的检查点添加标签');
    }

    if (this.props.tags.includes(tag)) {
      return; // 标签已存在
    }

    const newProps = {
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除标签
   */
  public removeTag(tag: string): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法为已删除的检查点移除标签');
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
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法更新已删除检查点的元数据');
    }

    const newProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
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
      version: this.props.version.nextPatch(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查检查点是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取业务标识
   */
  public getBusinessIdentifier(): string {
    return `checkpoint:${this.props.id.toString()}`;
  }

  /**
   * 验证检查点的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new ValidationError('检查点ID不能为空');
    }

    if (!this.props.threadId) {
      throw new ValidationError('线程ID不能为空');
    }

    if (!this.props.scope) {
      throw new ValidationError('检查点范围不能为空');
    }

    if (!this.props.type) {
      throw new ValidationError('检查点类型不能为空');
    }

    if (!this.props.status) {
      throw new ValidationError('检查点状态不能为空');
    }

    if (!this.props.stateData || Object.keys(this.props.stateData).length === 0) {
      throw new ValidationError('状态数据不能为空');
    }

    // 验证错误检查点的约束
    if (this.props.type.isError() && !this.props.description) {
      throw new ValidationError('错误检查点必须有描述');
    }

    // 验证里程碑检查点的约束
    if (this.props.type.isMilestone() && !this.props.title) {
      throw new ValidationError('里程碑检查点必须有标题');
    }

    // 验证恢复次数不能为负数
    if (this.props.restoreCount < 0) {
      throw new ValidationError('恢复次数不能为负数');
    }

    // 验证数据大小不能为负数
    if (this.props.sizeBytes < 0) {
      throw new ValidationError('数据大小不能为负数');
    }
  }

  /**
   * 转换为字典表示
   */
  public toDict(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      threadId: this.props.threadId.toString(),
      scope: this.props.scope.toString(),
      type: this.props.type.value,
      status: this.props.status.value,
      title: this.props.title,
      description: this.props.description,
      stateData: this.props.stateData,
      tags: this.props.tags,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      version: this.props.version.toString(),
      isDeleted: this.props.isDeleted,
      expiresAt: this.props.expiresAt?.toISOString(),
      sizeBytes: this.props.sizeBytes,
      restoreCount: this.props.restoreCount,
      lastRestoredAt: this.props.lastRestoredAt?.toISOString(),
    };
  }

  /**
   * 从字典创建实例
   */
  public static fromDict(data: Record<string, unknown>): Checkpoint {
    const props: CheckpointProps = {
      id: ID.fromString(data['id'] as string),
      threadId: ID.fromString(data['threadId'] as string),
      scope: CheckpointScope.fromString(data['scope'] as string || 'thread'),
      type: CheckpointType.fromString(data['type'] as string),
      status: CheckpointStatus.fromString(data['status'] as string),
      title: data['title'] as string | undefined,
      description: data['description'] as string | undefined,
      stateData: data['stateData'] as Record<string, unknown>,
      tags: (data['tags'] as string[]) || [],
      metadata: (data['metadata'] as Record<string, unknown>) || {},
      createdAt: Timestamp.fromString(data['createdAt'] as string),
      updatedAt: Timestamp.fromString(data['updatedAt'] as string),
      version: Version.fromString(data['version'] as string),
      isDeleted: data['isDeleted'] as boolean,
      expiresAt: data['expiresAt']
        ? Timestamp.fromString(data['expiresAt'] as string)
        : undefined,
      sizeBytes: data['sizeBytes'] as number,
      restoreCount: data['restoreCount'] as number,
      lastRestoredAt: data['lastRestoredAt']
        ? Timestamp.fromString(data['lastRestoredAt'] as string)
        : undefined,
    };

    return Checkpoint.fromProps(props);
  }
}