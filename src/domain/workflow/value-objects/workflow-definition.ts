import { ValueObject } from '../../common/value-objects/value-object';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { WorkflowStatus } from './workflow-status';
import { WorkflowType } from './workflow-type';
import { WorkflowConfig } from './workflow-config';
import { ErrorHandlingStrategy, ErrorHandlingStrategyFactory } from '../strategies/error-handling-strategy';
import { ExecutionStrategy, ExecutionStrategyFactory } from '../strategies/execution-strategy';

/**
 * WorkflowDefinition值对象属性接口
 */
export interface WorkflowDefinitionProps {
  readonly id: ID;
  readonly name: string;
  readonly description?: string;
  readonly status: WorkflowStatus;
  readonly type: WorkflowType;
  readonly config: WorkflowConfig;
  readonly errorHandlingStrategy: ErrorHandlingStrategy;
  readonly executionStrategy: ExecutionStrategy;
  readonly tags: string[];
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: any;
  readonly isDeleted: boolean;
  readonly createdBy?: ID;
  readonly updatedBy?: ID;
}

/**
 * WorkflowDefinition值对象
 * 
 * 表示工作流的定义信息，是不可变的
 * 包含工作流的基本属性和元数据
 */
export class WorkflowDefinition extends ValueObject<WorkflowDefinitionProps> {
  /**
   * 创建工作流定义值对象
   * @param name 工作流名称
   * @param description 工作流描述
   * @param type 工作流类型
   * @param config 工作流配置
   * @param errorHandlingStrategy 错误处理策略
   * @param executionStrategy 执行策略
   * @param tags 标签
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns 工作流定义值对象
   */
  public static create(
    name: string,
    description?: string,
    type?: WorkflowType,
    config?: WorkflowConfig,
    errorHandlingStrategy?: ErrorHandlingStrategy,
    executionStrategy?: ExecutionStrategy,
    tags?: string[],
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): WorkflowDefinition {
    const now = Timestamp.now();
    const workflowId = ID.generate();
    const workflowType = type || WorkflowType.sequential();
    const workflowStatus = WorkflowStatus.draft();
    const workflowConfig = config || WorkflowConfig.default();

    // 使用工厂方法创建默认策略
    const defaultErrorHandlingStrategy = errorHandlingStrategy ||
      ErrorHandlingStrategyFactory.default();
    
    const defaultExecutionStrategy = executionStrategy ||
      ExecutionStrategyFactory.default();

    return new WorkflowDefinition({
      id: workflowId,
      name,
      description,
      status: workflowStatus,
      type: workflowType,
      config: workflowConfig,
      errorHandlingStrategy: defaultErrorHandlingStrategy,
      executionStrategy: defaultExecutionStrategy,
      tags: tags || [],
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: { nextPatch: () => ({ toString: () => '1.0.1' }) },
      isDeleted: false,
      createdBy,
      updatedBy: createdBy
    });
  }

  /**
   * 从已有属性重建工作流定义
   * @param props 工作流定义属性
   * @returns 工作流定义值对象
   */
  public static fromProps(props: WorkflowDefinitionProps): WorkflowDefinition {
    return new WorkflowDefinition(props);
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get id(): ID {
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
   * 获取错误处理策略
   */
  public get errorHandlingStrategy(): ErrorHandlingStrategy {
    return this.props.errorHandlingStrategy;
  }

  /**
   * 获取执行策略
   */
  public get executionStrategy(): ExecutionStrategy {
    return this.props.executionStrategy;
  }

  /**
   * 更新名称（创建新实例）
   * @param name 新名称
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public updateName(name: string, updatedBy?: ID): WorkflowDefinition {
    return new WorkflowDefinition({
      ...this.props,
      name,
      updatedAt: Timestamp.now(),
      updatedBy
    });
  }

  /**
   * 更新描述（创建新实例）
   * @param description 新描述
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public updateDescription(description: string, updatedBy?: ID): WorkflowDefinition {
    return new WorkflowDefinition({
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      updatedBy
    });
  }

  /**
   * 更新类型（创建新实例）
   * @param type 新类型
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public updateType(type: WorkflowType, updatedBy?: ID): WorkflowDefinition {
    return new WorkflowDefinition({
      ...this.props,
      type,
      updatedAt: Timestamp.now(),
      updatedBy
    });
  }

  /**
   * 更新配置（创建新实例）
   * @param config 新配置
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public updateConfig(config: WorkflowConfig, updatedBy?: ID): WorkflowDefinition {
    return new WorkflowDefinition({
      ...this.props,
      config,
      updatedAt: Timestamp.now(),
      updatedBy
    });
  }

  /**
   * 更改状态（创建新实例）
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   * @returns 新的工作流定义值对象
   */
  public changeStatus(
    newStatus: WorkflowStatus,
    changedBy?: ID,
    reason?: string
  ): WorkflowDefinition {
    if (this.props.isDeleted) {
      throw new Error('无法更改已删除工作流的状态');
    }

    if (this.props.status.equals(newStatus)) {
      return this; // 状态未变更
    }

    // 验证状态转换的有效性
    this.validateStatusTransition(this.props.status, newStatus);

    return new WorkflowDefinition({
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      updatedBy: changedBy
    });
  }

  /**
   * 添加标签（创建新实例）
   * @param tag 标签
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public addTag(tag: string, updatedBy?: ID): WorkflowDefinition {
    if (this.props.isDeleted) {
      throw new Error('无法为已删除的工作流添加标签');
    }

    if (this.props.tags.includes(tag)) {
      return this; // 标签已存在
    }

    return new WorkflowDefinition({
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: Timestamp.now(),
      updatedBy
    });
  }

  /**
   * 移除标签（创建新实例）
   * @param tag 标签
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public removeTag(tag: string, updatedBy?: ID): WorkflowDefinition {
    if (this.props.isDeleted) {
      throw new Error('无法为已删除的工作流移除标签');
    }

    const index = this.props.tags.indexOf(tag);
    if (index === -1) {
      return this; // 标签不存在
    }

    const newTags = [...this.props.tags];
    newTags.splice(index, 1);

    return new WorkflowDefinition({
      ...this.props,
      tags: newTags,
      updatedAt: Timestamp.now(),
      updatedBy
    });
  }

  /**
   * 更新元数据（创建新实例）
   * @param metadata 新元数据
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public updateMetadata(metadata: Record<string, unknown>, updatedBy?: ID): WorkflowDefinition {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除工作流的元数据');
    }

    return new WorkflowDefinition({
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      updatedBy
    });
  }

  /**
   * 标记为已删除（创建新实例）
   * @returns 新的工作流定义值对象
   */
  public markAsDeleted(): WorkflowDefinition {
    if (this.props.isDeleted) {
      return this;
    }

    return new WorkflowDefinition({
      ...this.props,
      isDeleted: true,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 检查是否已删除
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
      throw new Error('已归档的工作流不能变更到其他状态');
    }

    // 草稿状态只能激活或归档
    if (oldStatus.isDraft() &&
      !newStatus.isActive() &&
      !newStatus.isArchived()) {
      throw new Error('草稿状态的工作流只能激活或归档');
    }

    // 活跃状态只能变为非活跃或归档
    if (oldStatus.isActive() &&
      !newStatus.isInactive() &&
      !newStatus.isArchived()) {
      throw new Error('活跃状态的工作流只能变为非活跃或归档');
    }

    // 非活跃状态只能变为活跃或归档
    if (oldStatus.isInactive() &&
      !newStatus.isActive() &&
      !newStatus.isArchived()) {
      throw new Error('非活跃状态的工作流只能变为活跃或归档');
    }
  }

  /**
   * 验证工作流定义的有效性
   */
  public validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('工作流名称不能为空');
    }

    if (!this.props.status) {
      throw new Error('工作流状态不能为空');
    }

    if (!this.props.type) {
      throw new Error('工作流类型不能为空');
    }

    if (!this.props.config) {
      throw new Error('工作流配置不能为空');
    }

    if (this.props.description && this.props.description.trim().length === 0) {
      throw new Error('工作流描述不能为空字符串');
    }
  }
}