import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { SnapshotType } from '../value-objects/snapshot-type';
import { SnapshotScope } from '../value-objects/snapshot-scope';

/**
 * Snapshot实体属性接口
 */
export interface SnapshotProps {
  id: ID;
  type: SnapshotType;
  scope: SnapshotScope;
  targetId?: ID;
  title?: string;
  description?: string;
  stateData: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
  sizeBytes: number;
  restoreCount: number;
  lastRestoredAt?: Timestamp;
}

/**
 * Snapshot实体
 *
 * 表示全局或Session级别的状态快照
 * 职责：
 * - 快照基本信息管理
 * - 状态数据管理
 * - 恢复功能
 * - 统计信息管理
 *
 * 不负责：
 * - 复杂的验证逻辑（由SnapshotValidationService负责）
 * - 状态捕获逻辑（由StateManagementService负责）
 */
export class Snapshot extends Entity {
  private readonly props: SnapshotProps;

  /**
   * 构造函数
   * @param props 快照属性
   */
  private constructor(props: SnapshotProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新快照
   * @param type 快照类型
   * @param scope 快照范围
   * @param targetId 目标ID
   * @param title 标题
   * @param description 描述
   * @param stateData 状态数据
   * @param metadata 元数据
   * @returns 新快照实例
   */
  public static create(
    type: SnapshotType,
    scope: SnapshotScope,
    targetId?: ID,
    title?: string,
    description?: string,
    stateData?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Snapshot {
    const now = Timestamp.now();
    const snapshotId = ID.generate();

    // 验证范围和目标ID的匹配
    if (scope.requiresTargetId() && !targetId) {
      throw new Error(`${scope.getDescription()}需要提供目标ID`);
    }

    if (!scope.requiresTargetId() && targetId) {
      throw new Error(`${scope.getDescription()}不需要提供目标ID`);
    }

    // 计算数据大小
    const sizeBytes = JSON.stringify(stateData || {}).length;

    const props: SnapshotProps = {
      id: snapshotId,
      type,
      scope,
      targetId,
      title,
      description,
      stateData: { ...stateData },
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false,
      sizeBytes,
      restoreCount: 0
    };

    const snapshot = new Snapshot(props);
    return snapshot;
  }

  /**
   * 从已有属性重建快照
   * @param props 快照属性
   * @returns 快照实例
   */
  public static fromProps(props: SnapshotProps): Snapshot {
    return new Snapshot(props);
  }

  /**
   * 获取快照ID
   */
  public get snapshotId(): ID {
    return this.props.id;
  }

  /**
   * 获取快照类型
   */
  public get type(): SnapshotType {
    return this.props.type;
  }

  /**
   * 获取快照范围
   */
  public get scope(): SnapshotScope {
    return this.props.scope;
  }

  /**
   * 获取目标ID
   */
  public get targetId(): ID | undefined {
    return this.props.targetId;
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
   * 获取元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
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
   * 检查快照是否有效
   */
  public isValid(): boolean {
    return !this.props.isDeleted && this.hasValidStateData();
  }

  /**
   * 检查是否可以恢复
   */
  public canRestore(): boolean {
    return this.isValid();
  }

  /**
   * 检查是否有有效的状态数据
   */
  public hasValidStateData(): boolean {
    return this.props.stateData && Object.keys(this.props.stateData).length > 0;
  }

  /**
   * 获取快照年龄（秒）
   */
  public getAgeInSeconds(): number {
    return Timestamp.now().differenceInSeconds(this.props.createdAt);
  }

  /**
   * 获取快照年龄（小时）
   */
  public getAgeInHours(): number {
    return this.getAgeInSeconds() / 3600;
  }

  /**
   * 获取快照年龄（天）
   */
  public getAgeInDays(): number {
    return this.getAgeInHours() / 24;
  }

  /**
   * 标记为已恢复
   */
  public markRestored(): void {
    if (!this.canRestore()) {
      throw new Error('无法恢复无效的快照');
    }

    const newProps = {
      ...this.props,
      restoreCount: this.props.restoreCount + 1,
      lastRestoredAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新状态数据
   */
  public updateStateData(stateData: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除快照的状态数据');
    }

    if (!stateData || Object.keys(stateData).length === 0) {
      throw new Error('状态数据不能为空');
    }

    const sizeBytes = JSON.stringify(stateData).length;

    const newProps = {
      ...this.props,
      stateData: { ...stateData },
      sizeBytes,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新标题
   */
  public updateTitle(title: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除快照的标题');
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
   */
  public updateDescription(description: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除快照的描述');
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
   * 更新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除快照的元数据');
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
   */
  public setMetadata(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new Error('无法设置已删除快照的元数据');
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
   */
  public removeMetadata(key: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法移除已删除快照的元数据');
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
   */
  public getStateDataValue(key: string): unknown {
    return this.props.stateData[key];
  }

  /**
   * 设置状态数据值
   */
  public setStateDataValue(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new Error('无法设置已删除快照的状态数据');
    }

    const newStateData = { ...this.props.stateData };
    newStateData[key] = value;

    const sizeBytes = JSON.stringify(newStateData).length;

    const newProps = {
      ...this.props,
      stateData: newStateData,
      sizeBytes,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查是否有指定的状态数据
   */
  public hasStateData(key: string): boolean {
    return key in this.props.stateData;
  }

  /**
   * 检查是否有指定的元数据
   */
  public hasMetadata(key: string): boolean {
    return key in this.props.metadata;
  }

  /**
   * 标记快照为已删除
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
   * 检查快照是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取业务标识
   */
  public getBusinessIdentifier(): string {
    return `snapshot:${this.props.id.toString()}`;
  }

  /**
   * 验证快照的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new Error('快照ID不能为空');
    }

    if (!this.props.type) {
      throw new Error('快照类型不能为空');
    }

    if (!this.props.scope) {
      throw new Error('快照范围不能为空');
    }

    if (this.props.scope.requiresTargetId() && !this.props.targetId) {
      throw new Error(`${this.props.scope.getDescription()}需要提供目标ID`);
    }

    if (!this.props.scope.requiresTargetId() && this.props.targetId) {
      throw new Error(`${this.props.scope.getDescription()}不需要提供目标ID`);
    }

    if (!this.props.stateData || Object.keys(this.props.stateData).length === 0) {
      throw new Error('状态数据不能为空');
    }

    // 验证恢复次数不能为负数
    if (this.props.restoreCount < 0) {
      throw new Error('恢复次数不能为负数');
    }

    // 验证数据大小不能为负数
    if (this.props.sizeBytes < 0) {
      throw new Error('数据大小不能为负数');
    }
  }

  /**
   * 转换为字典表示
   */
  public toDict(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      type: this.props.type.toString(),
      scope: this.props.scope.toString(),
      targetId: this.props.targetId?.toString(),
      title: this.props.title,
      description: this.props.description,
      stateData: this.props.stateData,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      version: this.props.version.toString(),
      isDeleted: this.props.isDeleted,
      sizeBytes: this.props.sizeBytes,
      restoreCount: this.props.restoreCount,
      lastRestoredAt: this.props.lastRestoredAt?.toISOString()
    };
  }

  /**
   * 从字典创建实例
   */
  public static fromDict(data: Record<string, unknown>): Snapshot {
    const props: SnapshotProps = {
      id: ID.fromString(data['id'] as string),
      type: SnapshotType.fromString(data['type'] as string),
      scope: SnapshotScope.fromString(data['scope'] as string),
      targetId: data['targetId'] ? ID.fromString(data['targetId'] as string) : undefined,
      title: data['title'] as string | undefined,
      description: data['description'] as string | undefined,
      stateData: data['stateData'] as Record<string, unknown>,
      metadata: (data['metadata'] as Record<string, unknown>) || {},
      createdAt: Timestamp.fromISOString(data['createdAt'] as string),
      updatedAt: Timestamp.fromISOString(data['updatedAt'] as string),
      version: Version.fromString(data['version'] as string),
      isDeleted: data['isDeleted'] as boolean,
      sizeBytes: data['sizeBytes'] as number,
      restoreCount: data['restoreCount'] as number,
      lastRestoredAt: data['lastRestoredAt'] ? Timestamp.fromISOString(data['lastRestoredAt'] as string) : undefined
    };

    return Snapshot.fromProps(props);
  }
}