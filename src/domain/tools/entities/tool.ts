import { ID } from '../../common/value-objects/id';
import { ToolType } from '../value-objects/tool-type';
import { ToolStatus } from '../value-objects/tool-status';
import { Timestamp } from '../../common/value-objects/timestamp';

/**
 * 工具实体
 * 
 * 表示系统中的工具定义
 */
export class Tool {
  /**
   * 工具ID
   */
  readonly id: ID;

  /**
   * 工具名称
   */
  readonly name: string;

  /**
   * 工具描述
   */
  readonly description: string;

  /**
   * 工具类型
   */
  readonly type: ToolType;

  /**
   * 工具状态
   */
  readonly status: ToolStatus;

  /**
   * 工具配置
   */
  readonly config: Record<string, unknown>;

  /**
   * 工具参数定义
   */
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

  /**
   * 工具返回值定义
   */
  readonly returns?: {
    type: string;
    description?: string;
    properties?: Record<string, any>;
    items?: any;
  };

  /**
   * 工具元数据
   */
  readonly metadata: Record<string, unknown>;

  /**
   * 创建时间
   */
  readonly createdAt: Timestamp;

  /**
   * 更新时间
   */
  readonly updatedAt: Timestamp;

  /**
   * 创建者ID
   */
  readonly createdBy?: ID;

  /**
   * 版本号
   */
  readonly version: string;

  /**
   * 标签
   */
  readonly tags: string[];

  /**
   * 分类
   */
  readonly category: string;

  /**
   * 是否为内置工具
   */
  readonly isBuiltin: boolean;

  /**
   * 是否启用
   */
  readonly isEnabled: boolean;

  /**
   * 执行超时时间（毫秒）
   */
  readonly timeout: number;

  /**
   * 最大重试次数
   */
  readonly maxRetries: number;

  /**
   * 权限要求
   */
  readonly permissions: string[];

  /**
   * 依赖的其他工具
   */
  readonly dependencies: ID[];

  /**
   * 构造函数
   * 
   * @param id 工具ID
   * @param name 工具名称
   * @param description 工具描述
   * @param type 工具类型
   * @param status 工具状态
   * @param config 工具配置
   * @param parameters 工具参数定义
   * @param returns 工具返回值定义
   * @param metadata 工具元数据
   * @param createdAt 创建时间
   * @param updatedAt 更新时间
   * @param createdBy 创建者ID
   * @param version 版本号
   * @param tags 标签
   * @param category 分类
   * @param isBuiltin 是否为内置工具
   * @param isEnabled 是否启用
   * @param timeout 执行超时时间
   * @param maxRetries 最大重试次数
   * @param permissions 权限要求
   * @param dependencies 依赖的其他工具
   */
  constructor(
    id: ID,
    name: string,
    description: string,
    type: ToolType,
    status: ToolStatus,
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
    metadata: Record<string, unknown> = {},
    createdAt: Timestamp = Timestamp.now(),
    updatedAt: Timestamp = Timestamp.now(),
    createdBy?: ID,
    version: string = '1.0.0',
    tags: string[] = [],
    category: string = 'general',
    isBuiltin: boolean = false,
    isEnabled: boolean = true,
    timeout: number = 30000,
    maxRetries: number = 3,
    permissions: string[] = [],
    dependencies: ID[] = []
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.type = type;
    this.status = status;
    this.config = config;
    this.parameters = parameters;
    this.returns = returns;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.version = version;
    this.tags = tags;
    this.category = category;
    this.isBuiltin = isBuiltin;
    this.isEnabled = isEnabled;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.permissions = permissions;
    this.dependencies = dependencies;
  }

  /**
   * 创建新工具
   * 
   * @param name 工具名称
   * @param description 工具描述
   * @param type 工具类型
   * @param config 工具配置
   * @param parameters 工具参数定义
   * @param returns 工具返回值定义
   * @param createdBy 创建者ID
   * @returns 新工具
   */
  static create(
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
    const id = ID.generate();
    const now = Timestamp.now();

    return new Tool(
      id,
      name,
      description,
      type,
      ToolStatus.DRAFT,
      config,
      parameters,
      returns,
      {},
      now,
      now,
      createdBy
    );
  }

  /**
   * 更新工具信息
   * 
   * @param name 工具名称
   * @param description 工具描述
   * @param config 工具配置
   * @param parameters 工具参数定义
   * @param returns 工具返回值定义
   * @param metadata 工具元数据
   * @returns 更新后的工具
   */
  update(
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
    return new Tool(
      this.id,
      name || this.name,
      description || this.description,
      this.type,
      this.status,
      config || this.config,
      parameters || this.parameters,
      returns || this.returns,
      metadata || this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      this.tags,
      this.category,
      this.isBuiltin,
      this.isEnabled,
      this.timeout,
      this.maxRetries,
      this.permissions,
      this.dependencies
    );
  }

  /**
   * 更改工具状态
   * 
   * @param status 新状态
   * @returns 更新后的工具
   */
  changeStatus(status: ToolStatus): Tool {
    return new Tool(
      this.id,
      this.name,
      this.description,
      this.type,
      status,
      this.config,
      this.parameters,
      this.returns,
      this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      this.tags,
      this.category,
      this.isBuiltin,
      this.isEnabled,
      this.timeout,
      this.maxRetries,
      this.permissions,
      this.dependencies
    );
  }

  /**
   * 启用工具
   * 
   * @returns 更新后的工具
   */
  enable(): Tool {
    return new Tool(
      this.id,
      this.name,
      this.description,
      this.type,
      this.status,
      this.config,
      this.parameters,
      this.returns,
      this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      this.tags,
      this.category,
      this.isBuiltin,
      true,
      this.timeout,
      this.maxRetries,
      this.permissions,
      this.dependencies
    );
  }

  /**
   * 禁用工具
   * 
   * @returns 更新后的工具
   */
  disable(): Tool {
    return new Tool(
      this.id,
      this.name,
      this.description,
      this.type,
      this.status,
      this.config,
      this.parameters,
      this.returns,
      this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      this.tags,
      this.category,
      this.isBuiltin,
      false,
      this.timeout,
      this.maxRetries,
      this.permissions,
      this.dependencies
    );
  }

  /**
   * 添加标签
   * 
   * @param tag 标签
   * @returns 更新后的工具
   */
  addTag(tag: string): Tool {
    if (this.tags.includes(tag)) {
      return this;
    }

    return new Tool(
      this.id,
      this.name,
      this.description,
      this.type,
      this.status,
      this.config,
      this.parameters,
      this.returns,
      this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      [...this.tags, tag],
      this.category,
      this.isBuiltin,
      this.isEnabled,
      this.timeout,
      this.maxRetries,
      this.permissions,
      this.dependencies
    );
  }

  /**
   * 移除标签
   * 
   * @param tag 标签
   * @returns 更新后的工具
   */
  removeTag(tag: string): Tool {
    if (!this.tags.includes(tag)) {
      return this;
    }

    return new Tool(
      this.id,
      this.name,
      this.description,
      this.type,
      this.status,
      this.config,
      this.parameters,
      this.returns,
      this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      this.tags.filter(t => t !== tag),
      this.category,
      this.isBuiltin,
      this.isEnabled,
      this.timeout,
      this.maxRetries,
      this.permissions,
      this.dependencies
    );
  }

  /**
   * 更改分类
   * 
   * @param category 新分类
   * @returns 更新后的工具
   */
  changeCategory(category: string): Tool {
    return new Tool(
      this.id,
      this.name,
      this.description,
      this.type,
      this.status,
      this.config,
      this.parameters,
      this.returns,
      this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      this.tags,
      category,
      this.isBuiltin,
      this.isEnabled,
      this.timeout,
      this.maxRetries,
      this.permissions,
      this.dependencies
    );
  }

  /**
   * 添加依赖
   * 
   * @param dependency 依赖的工具ID
   * @returns 更新后的工具
   */
  addDependency(dependency: ID): Tool {
    if (this.dependencies.some(d => d.equals(dependency))) {
      return this;
    }

    return new Tool(
      this.id,
      this.name,
      this.description,
      this.type,
      this.status,
      this.config,
      this.parameters,
      this.returns,
      this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      this.tags,
      this.category,
      this.isBuiltin,
      this.isEnabled,
      this.timeout,
      this.maxRetries,
      this.permissions,
      [...this.dependencies, dependency]
    );
  }

  /**
   * 移除依赖
   * 
   * @param dependency 依赖的工具ID
   * @returns 更新后的工具
   */
  removeDependency(dependency: ID): Tool {
    const newDependencies = this.dependencies.filter(d => !d.equals(dependency));
    
    if (newDependencies.length === this.dependencies.length) {
      return this;
    }

    return new Tool(
      this.id,
      this.name,
      this.description,
      this.type,
      this.status,
      this.config,
      this.parameters,
      this.returns,
      this.metadata,
      this.createdAt,
      Timestamp.now(),
      this.createdBy,
      this.version,
      this.tags,
      this.category,
      this.isBuiltin,
      this.isEnabled,
      this.timeout,
      this.maxRetries,
      this.permissions,
      newDependencies
    );
  }

  /**
   * 检查是否可以执行
   * 
   * @returns 是否可以执行
   */
  canExecute(): boolean {
    return this.isEnabled && this.status === ToolStatus.ACTIVE;
  }

  /**
   * 检查是否有指定权限
   * 
   * @param permission 权限
   * @returns 是否有权限
   */
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * 检查是否有指定标签
   * 
   * @param tag 标签
   * @returns 是否有标签
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * 检查是否属于指定分类
   * 
   * @param category 分类
   * @returns 是否属于分类
   */
  isInCategory(category: string): boolean {
    return this.category === category;
  }

  /**
   * 检查是否依赖指定工具
   * 
   * @param toolId 工具ID
   * @returns 是否依赖
   */
  dependsOn(toolId: ID): boolean {
    return this.dependencies.some(d => d.equals(toolId));
  }

  /**
   * 转换为JSON对象
   * 
   * @returns JSON对象
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id.value,
      name: this.name,
      description: this.description,
      type: this.type.value,
      status: this.status.value,
      config: this.config,
      parameters: this.parameters,
      returns: this.returns,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      createdBy: this.createdBy?.value,
      version: this.version,
      tags: this.tags,
      category: this.category,
      isBuiltin: this.isBuiltin,
      isEnabled: this.isEnabled,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      permissions: this.permissions,
      dependencies: this.dependencies.map(d => d.value)
    };
  }

  /**
   * 从JSON对象创建工具
   * 
   * @param json JSON对象
   * @returns 工具
   */
  static fromJSON(json: Record<string, unknown>): Tool {
    return new Tool(
      ID.fromString(json['id'] as string),
      json['name'] as string,
      json['description'] as string,
      ToolType.fromString(json['type'] as string),
      ToolStatus.fromString(json['status'] as string),
      json['config'] as Record<string, unknown>,
      json['parameters'] as {
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
      json['returns'] as {
        type: string;
        description?: string;
        properties?: Record<string, any>;
        items?: any;
      },
      json['metadata'] as Record<string, unknown>,
      Timestamp.fromString(json['createdAt'] as string),
      Timestamp.fromString(json['updatedAt'] as string),
      json['createdBy'] ? ID.fromString(json['createdBy'] as string) : undefined,
      json['version'] as string,
      json['tags'] as string[],
      json['category'] as string,
      json['isBuiltin'] as boolean,
      json['isEnabled'] as boolean,
      json['timeout'] as number,
      json['maxRetries'] as number,
      json['permissions'] as string[],
      (json['dependencies'] as string[]).map(d => ID.fromString(d))
    );
  }
}