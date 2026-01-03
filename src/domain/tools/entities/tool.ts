import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { ToolType } from '../value-objects/tool-type';
import { ToolStatus } from '../value-objects/tool-status';
import { Metadata } from '../../checkpoint/value-objects/metadata';
import { Tags } from '../../checkpoint/value-objects/tags';
import { DeletionStatus } from '../../checkpoint/value-objects/deletion-status';
import { StateData } from '../../checkpoint/value-objects/state-data';

/**
 * Tool实体属性接口
 */
export interface ToolProps {
  readonly id: ID;
  readonly name: string;
  readonly description: string;
  readonly type: ToolType;
  readonly status: ToolStatus;
  readonly config: StateData;
  readonly parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: any;
      properties?: Record<string, any>;
      required?: string[];
    }>;
    required: string[];
  };
  readonly returns?: {
    type: string;
    description?: string;
    properties?: Record<string, any>;
    items?: any;
  };
  readonly metadata: Metadata;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly createdBy?: ID;
  readonly tags: Tags;
  readonly category: string;
  readonly isBuiltin: boolean;
  readonly isEnabled: boolean;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly permissions: string[];
  readonly dependencies: ID[];
  readonly deletionStatus: DeletionStatus;
}

/**
 * Tool实体
 *
 * 表示系统中的工具定义
 * 职责：
 * - 工具基本信息管理
 * - 属性访问
 * - 基本状态管理
 *
 * 不负责：
 * - 业务逻辑判断（由ToolValidationService负责）
 * - 序列化/反序列化（由Infrastructure层负责）
 * - 执行逻辑（由ToolExecutor负责）
 */
export class Tool extends Entity {
  private readonly props: ToolProps;

  /**
   * 构造函数
   * @param props 工具属性
   */
  private constructor(props: ToolProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新工具
   * @param name 工具名称
   * @param description 工具描述
   * @param type 工具类型
   * @param config 工具配置
   * @param parameters 工具参数定义
   * @param returns 工具返回值定义
   * @param createdBy 创建者ID
   * @returns 新工具
   */
  public static create(
    name: string,
    description: string,
    type: ToolType,
    config: Record<string, unknown>,
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        items?: any;
        properties?: Record<string, any>;
        required?: string[];
      }>;
      required: string[];
    },
    returns?: {
      type: string;
      description?: string;
      properties?: Record<string, any>;
      items?: any;
    },
    createdBy?: ID
  ): Tool {
    const now = Timestamp.now();
    const toolId = ID.generate();

    const props: ToolProps = {
      id: toolId,
      name,
      description,
      type,
      status: ToolStatus.DRAFT,
      config: StateData.create(config),
      parameters,
      returns,
      metadata: Metadata.create({}),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      createdBy,
      tags: Tags.create([]),
      category: 'general',
      isBuiltin: false,
      isEnabled: true,
      timeout: 30000,
      maxRetries: 3,
      permissions: [],
      dependencies: [],
      deletionStatus: DeletionStatus.active()
    };

    return new Tool(props);
  }

  /**
   * 从已有属性重建工具
   * @param props 工具属性
   * @returns 工具实例
   */
  public static fromProps(props: ToolProps): Tool {
    return new Tool(props);
  }

  // 属性访问器

  /**
   * 获取工具ID
   * @returns 工具ID
   */
  public get toolId(): ID {
    return this.props.id;
  }

  /**
   * 获取工具名称
   * @returns 工具名称
   */
  public get name(): string {
    return this.props.name;
  }

  /**
   * 获取工具描述
   * @returns 工具描述
   */
  public get description(): string {
    return this.props.description;
  }

  /**
   * 获取工具类型
   * @returns 工具类型
   */
  public get type(): ToolType {
    return this.props.type;
  }

  /**
   * 获取工具状态
   * @returns 工具状态
   */
  public get status(): ToolStatus {
    return this.props.status;
  }

  /**
   * 获取工具配置
   * @returns 工具配置
   */
  public get config(): StateData {
    return this.props.config;
  }

  /**
   * 获取工具参数定义
   * @returns 工具参数定义
   */
  public get parameters(): {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: any;
      properties?: Record<string, any>;
      required?: string[];
    }>;
    required: string[];
  } {
    return this.props.parameters;
  }

  /**
   * 获取工具返回值定义
   * @returns 工具返回值定义
   */
  public get returns(): {
    type: string;
    description?: string;
    properties?: Record<string, any>;
    items?: any;
  } | undefined {
    return this.props.returns;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Metadata {
    return this.props.metadata;
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public override get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  /**
   * 获取更新时间
   * @returns 更新时间
   */
  public override get updatedAt(): Timestamp {
    return this.props.updatedAt;
  }

  /**
   * 获取创建者ID
   * @returns 创建者ID
   */
  public get createdBy(): ID | undefined {
    return this.props.createdBy;
  }

  /**
   * 获取版本号
   * @returns 版本号
   */
  public override get version(): Version {
    return this.props.version;
  }

  /**
   * 获取标签
   * @returns 标签列表
   */
  public get tags(): Tags {
    return this.props.tags;
  }

  /**
   * 获取分类
   * @returns 分类
   */
  public get category(): string {
    return this.props.category;
  }

  /**
   * 获取是否为内置工具
   * @returns 是否为内置工具
   */
  public get isBuiltin(): boolean {
    return this.props.isBuiltin;
  }

  /**
   * 获取是否启用
   * @returns 是否启用
   */
  public get isEnabled(): boolean {
    return this.props.isEnabled;
  }

  /**
   * 获取执行超时时间
   * @returns 执行超时时间（毫秒）
   */
  public get timeout(): number {
    return this.props.timeout;
  }

  /**
   * 获取最大重试次数
   * @returns 最大重试次数
   */
  public get maxRetries(): number {
    return this.props.maxRetries;
  }

  /**
   * 获取权限要求
   * @returns 权限要求列表
   */
  public get permissions(): string[] {
    return [...this.props.permissions];
  }

  /**
   * 获取依赖的其他工具
   * @returns 依赖的工具ID列表
   */
  public get dependencies(): ID[] {
    return [...this.props.dependencies];
  }

  // 更新方法

  /**
   * 更新工具信息
   * @param name 工具名称
   * @param description 工具描述
   * @param config 工具配置
   * @param parameters 工具参数定义
   * @param returns 工具返回值定义
   * @param metadata 工具元数据
   */
  public updateTool(
    name?: string,
    description?: string,
    config?: Record<string, unknown>,
    parameters?: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        items?: any;
        properties?: Record<string, any>;
        required?: string[];
      }>;
      required: string[];
    },
    returns?: {
      type: string;
      description?: string;
      properties?: Record<string, any>;
      items?: any;
    },
    metadata?: Record<string, unknown>
  ): Tool {
    this.props.deletionStatus.ensureActive();

    const newProps: ToolProps = {
      ...this.props,
      name: name || this.props.name,
      description: description || this.props.description,
      config: config ? StateData.create(config) : this.props.config,
      parameters: parameters || this.props.parameters,
      returns: returns !== undefined ? returns : this.props.returns,
      metadata: metadata ? Metadata.create(metadata) : this.props.metadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 更改工具状态
   * @param status 新状态
   */
  public changeStatus(status: ToolStatus): Tool {
    this.props.deletionStatus.ensureActive();

    const newProps: ToolProps = {
      ...this.props,
      status,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 启用工具
   */
  public enable(): Tool {
    this.props.deletionStatus.ensureActive();

    const newProps: ToolProps = {
      ...this.props,
      isEnabled: true,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 禁用工具
   */
  public disable(): Tool {
    this.props.deletionStatus.ensureActive();

    const newProps: ToolProps = {
      ...this.props,
      isEnabled: false,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 添加标签
   * @param tag 标签
   */
  public addTag(tag: string): Tool {
    this.props.deletionStatus.ensureActive();

    const newProps: ToolProps = {
      ...this.props,
      tags: this.props.tags.add(tag),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 移除标签
   * @param tag 标签
   */
  public removeTag(tag: string): Tool {
    this.props.deletionStatus.ensureActive();

    const newProps: ToolProps = {
      ...this.props,
      tags: this.props.tags.remove(tag),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 更改分类
   * @param category 新分类
   */
  public changeCategory(category: string): Tool {
    this.props.deletionStatus.ensureActive();

    const newProps: ToolProps = {
      ...this.props,
      category,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 添加依赖
   * @param dependency 依赖的工具ID
   */
  public addDependency(dependency: ID): Tool {
    this.props.deletionStatus.ensureActive();

    if (this.props.dependencies.some(d => d.equals(dependency))) {
      return this;
    }

    const newProps: ToolProps = {
      ...this.props,
      dependencies: [...this.props.dependencies, dependency],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 移除依赖
   * @param dependency 依赖的工具ID
   */
  public removeDependency(dependency: ID): Tool {
    this.props.deletionStatus.ensureActive();

    const newDependencies = this.props.dependencies.filter(d => !d.equals(dependency));
    
    if (newDependencies.length === this.props.dependencies.length) {
      return this;
    }

    const newProps: ToolProps = {
      ...this.props,
      dependencies: newDependencies,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): Tool {
    this.props.deletionStatus.ensureActive();

    const newProps: ToolProps = {
      ...this.props,
      metadata: Metadata.create(metadata),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 标记工具为已删除
   */
  public markAsDeleted(): Tool {
    const newProps: ToolProps = {
      ...this.props,
      deletionStatus: this.props.deletionStatus.markAsDeleted(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    return new Tool(newProps);
  }

  /**
   * 检查工具是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.deletionStatus.isDeleted();
  }

  /**
   * 检查工具是否活跃
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
    return `tool:${this.props.id.toString()}`;
  }

  /**
   * 更新实体
   */
  protected override update(): void {
    // 不再需要此方法，因为所有更新方法都返回新实例
    super.update();
  }
}