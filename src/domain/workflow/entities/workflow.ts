import { AggregateRoot } from '../../common/base/aggregate-root';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { WorkflowCreatedEvent } from '../events/workflow-created-event';
import { WorkflowStatusChangedEvent } from '../events/workflow-status-changed-event';

/**
 * Workflow实体接口
 */
export interface WorkflowProps {
  id: ID;
  name: string;
  description?: string;
  status: WorkflowStatus;
  type: WorkflowType;
  config: WorkflowConfig;
  graphId?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  lastExecutedAt?: Timestamp;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime?: number; // 平均执行时间（秒）
  tags: string[];
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdBy?: ID;
  updatedBy?: ID;
}

/**
 * Workflow实体
 * 
 * 表示工作流的聚合根
 */
export class Workflow extends AggregateRoot {
  private readonly props: WorkflowProps;

  /**
   * 构造函数
   * @param props 工作流属性
   */
  private constructor(props: WorkflowProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新工作流
   * @param name 工作流名称
   * @param description 工作流描述
   * @param type 工作流类型
   * @param config 工作流配置
   * @param graphId 图ID
   * @param tags 标签
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns 新工作流实例
   */
  public static create(
    name: string,
    description?: string,
    type?: WorkflowType,
    config?: WorkflowConfig,
    graphId?: ID,
    tags?: string[],
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): Workflow {
    const now = Timestamp.now();
    const workflowId = ID.generate();
    const workflowType = type || WorkflowType.sequential();
    const workflowStatus = WorkflowStatus.draft();
    const workflowConfig = config || WorkflowConfig.default();

    const props: WorkflowProps = {
      id: workflowId,
      name,
      description,
      status: workflowStatus,
      type: workflowType,
      config: workflowConfig,
      graphId,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      tags: tags || [],
      metadata: metadata || {},
      isDeleted: false,
      createdBy,
      updatedBy: createdBy
    };

    const workflow = new Workflow(props);
    
    // 添加工作流创建事件
    workflow.addDomainEvent(new WorkflowCreatedEvent(
      workflowId,
      name,
      description,
      workflowType.toString(),
      workflowStatus.toString(),
      workflowConfig.value,
      graphId,
      createdBy
    ));

    return workflow;
  }

  /**
   * 从已有属性重建工作流
   * @param props 工作流属性
   * @returns 工作流实例
   */
  public static fromProps(props: WorkflowProps): Workflow {
    return new Workflow(props);
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID {
    return this.props.id;
  }

  /**
   * 获取工作流名称
   * @returns 工作流名称
   */
  public get name(): string {
    return this.props.name;
  }

  /**
   * 获取工作流描述
   * @returns 工作流描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取工作流状态
   * @returns 工作流状态
   */
  public get status(): WorkflowStatus {
    return this.props.status;
  }

  /**
   * 获取工作流类型
   * @returns 工作流类型
   */
  public get type(): WorkflowType {
    return this.props.type;
  }

  /**
   * 获取工作流配置
   * @returns 工作流配置
   */
  public get config(): WorkflowConfig {
    return this.props.config;
  }

  /**
   * 获取图ID
   * @returns 图ID
   */
  public get graphId(): ID | undefined {
    return this.props.graphId;
  }

  /**
   * 获取最后执行时间
   * @returns 最后执行时间
   */
  public get lastExecutedAt(): Timestamp | undefined {
    return this.props.lastExecutedAt;
  }

  /**
   * 获取执行次数
   * @returns 执行次数
   */
  public get executionCount(): number {
    return this.props.executionCount;
  }

  /**
   * 获取成功次数
   * @returns 成功次数
   */
  public get successCount(): number {
    return this.props.successCount;
  }

  /**
   * 获取失败次数
   * @returns 失败次数
   */
  public get failureCount(): number {
    return this.props.failureCount;
  }

  /**
   * 获取平均执行时间
   * @returns 平均执行时间（秒）
   */
  public get averageExecutionTime(): number | undefined {
    return this.props.averageExecutionTime;
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
   * 获取创建者ID
   * @returns 创建者ID
   */
  public get createdBy(): ID | undefined {
    return this.props.createdBy;
  }

  /**
   * 获取更新者ID
   * @returns 更新者ID
   */
  public get updatedBy(): ID | undefined {
    return this.props.updatedBy;
  }

  /**
   * 更新工作流名称
   * @param name 新名称
   * @param updatedBy 更新者ID
   */
  public updateName(name: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的工作流');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态的工作流');
    }

    const newProps = {
      ...this.props,
      name,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新工作流描述
   * @param description 新描述
   * @param updatedBy 更新者ID
   */
  public updateDescription(description: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的工作流');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态的工作流');
    }

    const newProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新工作流类型
   * @param type 新类型
   * @param updatedBy 更新者ID
   */
  public updateType(type: WorkflowType, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的类型');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的类型');
    }

    const newProps = {
      ...this.props,
      type,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新工作流配置
   * @param config 新配置
   * @param updatedBy 更新者ID
   */
  public updateConfig(config: WorkflowConfig, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的配置');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的配置');
    }

    const newProps = {
      ...this.props,
      config,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新图ID
   * @param graphId 新图ID
   * @param updatedBy 更新者ID
   */
  public updateGraphId(graphId: ID, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的图ID');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的图ID');
    }

    const newProps = {
      ...this.props,
      graphId,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更改工作流状态
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   */
  public changeStatus(
    newStatus: WorkflowStatus,
    changedBy?: ID,
    reason?: string
  ): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更改已删除工作流的状态');
    }

    const oldStatus = this.props.status;
    if (oldStatus.equals(newStatus)) {
      return; // 状态未变更
    }

    // 验证状态转换的有效性
    this.validateStatusTransition(oldStatus, newStatus);

    const newProps = {
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: changedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new WorkflowStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      changedBy,
      reason
    ));
  }

  /**
   * 添加标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   */
  public addTag(tag: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法为已删除的工作流添加标签');
    }

    if (this.props.tags.includes(tag)) {
      return; // 标签已存在
    }

    const newProps = {
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   */
  public removeTag(tag: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法为已删除的工作流移除标签');
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
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @param updatedBy 更新者ID
   */
  public updateMetadata(metadata: Record<string, unknown>, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的元数据');
    }

    const newProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 记录执行结果
   * @param success 是否成功
   * @param executionTime 执行时间（秒）
   */
  public recordExecution(success: boolean, executionTime: number): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法记录已删除工作流的执行结果');
    }

    const newExecutionCount = this.props.executionCount + 1;
    const newSuccessCount = success ? this.props.successCount + 1 : this.props.successCount;
    const newFailureCount = success ? this.props.failureCount : this.props.failureCount + 1;

    // 计算新的平均执行时间
    const currentTotalTime = (this.props.averageExecutionTime || 0) * this.props.executionCount;
    const newAverageExecutionTime = (currentTotalTime + executionTime) / newExecutionCount;

    const newProps = {
      ...this.props,
      executionCount: newExecutionCount,
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      averageExecutionTime: newAverageExecutionTime,
      lastExecutedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 标记工作流为已删除
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
   * 检查工作流是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取成功率
   * @returns 成功率（0-1）
   */
  public getSuccessRate(): number {
    if (this.props.executionCount === 0) {
      return 0;
    }
    return this.props.successCount / this.props.executionCount;
  }

  /**
   * 获取失败率
   * @returns 失败率（0-1）
   */
  public getFailureRate(): number {
    if (this.props.executionCount === 0) {
      return 0;
    }
    return this.props.failureCount / this.props.executionCount;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `workflow:${this.props.id.toString()}`;
  }

  /**
   * 验证状态转换的有效性
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   */
  private validateStatusTransition(
    oldStatus: WorkflowStatus,
    newStatus: WorkflowStatus
  ): void {
    // 已归档的工作流不能变更到其他状态
    if (oldStatus.isArchived() && !newStatus.isArchived()) {
      throw new DomainError('已归档的工作流不能变更到其他状态');
    }

    // 草稿状态只能激活或归档
    if (oldStatus.isDraft() && 
        !newStatus.isActive() && 
        !newStatus.isArchived()) {
      throw new DomainError('草稿状态的工作流只能激活或归档');
    }

    // 活跃状态只能变为非活跃或归档
    if (oldStatus.isActive() && 
        !newStatus.isInactive() && 
        !newStatus.isArchived()) {
      throw new DomainError('活跃状态的工作流只能变为非活跃或归档');
    }

    // 非活跃状态只能变为活跃或归档
    if (oldStatus.isInactive() && 
        !newStatus.isActive() && 
        !newStatus.isArchived()) {
      throw new DomainError('非活跃状态的工作流只能变为活跃或归档');
    }
  }

  /**
   * 验证聚合的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('工作流ID不能为空');
    }

    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new DomainError('工作流名称不能为空');
    }

    if (!this.props.status) {
      throw new DomainError('工作流状态不能为空');
    }

    if (!this.props.type) {
      throw new DomainError('工作流类型不能为空');
    }

    if (!this.props.config) {
      throw new DomainError('工作流配置不能为空');
    }

    if (this.props.executionCount < 0) {
      throw new DomainError('执行次数不能为负数');
    }

    if (this.props.successCount < 0) {
      throw new DomainError('成功次数不能为负数');
    }

    if (this.props.failureCount < 0) {
      throw new DomainError('失败次数不能为负数');
    }

    if (this.props.successCount + this.props.failureCount > this.props.executionCount) {
      throw new DomainError('成功和失败次数之和不能超过总执行次数');
    }

    if (this.props.averageExecutionTime !== undefined && this.props.averageExecutionTime < 0) {
      throw new DomainError('平均执行时间不能为负数');
    }
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    this.validateInvariants();
    this.props.status.validate();
    this.props.type.validate();
    this.props.config.validate();
  }
}