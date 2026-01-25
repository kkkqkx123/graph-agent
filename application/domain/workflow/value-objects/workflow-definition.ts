import { ValueObject, ID, Timestamp, Version } from '../../common/value-objects';
import { WorkflowStatus } from './workflow-status';
import { WorkflowType } from './workflow-type';
import { WorkflowConfig } from './workflow-config';
import { ExecutionStrategy } from './execution/execution-strategy';
import { ValidationError } from '../../common/exceptions';

/**
 * WorkflowDefinition值对象属性接口
 */
export interface WorkflowDefinitionProps {
  readonly id: ID;
  readonly name: string;
  readonly description?: string;
  readonly status: WorkflowStatus;
  readonly type: WorkflowType; // 现在是枚举类型
  readonly config: WorkflowConfig;
  readonly executionStrategy: ExecutionStrategy;
  readonly tags: string[];
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly isDeleted: boolean;
  readonly createdBy?: ID;
  readonly updatedBy?: ID;
}

/**
 * WorkflowDefinition值对象
 *
 * 表示工作流的定义信息，是不可变的
 * 只包含数据访问方法，不包含业务逻辑
 */
export class WorkflowDefinition extends ValueObject<WorkflowDefinitionProps> {
  /**
   * 构造函数
   * @param props 工作流定义属性
   */
  protected constructor(props: WorkflowDefinitionProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证工作流定义的有效性
   * 在构造时调用，如果验证失败则抛出异常
   */
  public validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new ValidationError('工作流名称不能为空');
    }

    if (this.props.name.length > 100) {
      throw new ValidationError('工作流名称不能超过100个字符');
    }

    if (this.props.description && this.props.description.length > 500) {
      throw new ValidationError('工作流描述不能超过500个字符');
    }

    if (this.props.tags.length > 20) {
      throw new ValidationError('标签数量不能超过20个');
    }

    for (const tag of this.props.tags) {
      if (tag.length > 50) {
        throw new ValidationError('标签长度不能超过50个字符');
      }
    }
  }

  /**
   * 创建工作流定义值对象
   * @param props 工作流定义属性
   * @returns 工作流定义值对象
   */
  public static create(props: WorkflowDefinitionProps): WorkflowDefinition {
    return new WorkflowDefinition(props);
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
   * 获取执行策略
   */
  public get executionStrategy(): ExecutionStrategy {
    return this.props.executionStrategy;
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  /**
   * 获取更新时间
   * @returns 更新时间
   */
  public get updatedAt(): Timestamp {
    return this.props.updatedAt;
  }

  /**
   * 获取版本
   * @returns 版本
   */
  public get version(): Version {
    return this.props.version;
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
      updatedBy,
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
      updatedBy,
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
      updatedBy,
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
      updatedBy,
    });
  }

  /**
   * 更改状态（创建新实例）
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @returns 新的工作流定义值对象
   */
  public changeStatus(newStatus: WorkflowStatus, changedBy?: ID): WorkflowDefinition {
    return new WorkflowDefinition({
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      updatedBy: changedBy,
    });
  }

  /**
   * 添加标签（创建新实例）
   * @param tag 标签
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public addTag(tag: string, updatedBy?: ID): WorkflowDefinition {
    if (this.props.tags.includes(tag)) {
      return this; // 标签已存在
    }

    return new WorkflowDefinition({
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: Timestamp.now(),
      updatedBy,
    });
  }

  /**
   * 移除标签（创建新实例）
   * @param tag 标签
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public removeTag(tag: string, updatedBy?: ID): WorkflowDefinition {
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
      updatedBy,
    });
  }

  /**
   * 更新元数据（创建新实例）
   * @param metadata 新元数据
   * @param updatedBy 更新者ID
   * @returns 新的工作流定义值对象
   */
  public updateMetadata(metadata: Record<string, unknown>, updatedBy?: ID): WorkflowDefinition {
    return new WorkflowDefinition({
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      updatedBy,
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
      updatedAt: Timestamp.now(),
    });
  }
}
