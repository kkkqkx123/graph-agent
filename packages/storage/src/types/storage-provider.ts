/**
 * 存储提供者接口定义
 * 定义统一的 CRUD 操作接口
 */

/**
 * 列表查询选项
 */
export interface ListOptions {
  /** 按元数据字段过滤 */
  filter?: Record<string, unknown>;
  /** 最大返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 排序字段 */
  orderBy?: string;
  /** 排序方向 */
  orderDirection?: 'asc' | 'desc';
}

/**
 * 列表查询结果
 */
export interface ListResult<T> {
  /** 实体数组 */
  items: T[];
  /** 总数量 */
  total: number;
  /** 是否有更多 */
  hasMore: boolean;
}

/**
 * 存储元数据
 * 用于索引和查询的元数据信息
 */
export interface StorageMetadata {
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
  /** 自定义标签 */
  tags?: string[];
  /** 自定义字段 */
  customFields?: Record<string, unknown>;
  /** 数据模型类型标识 */
  modelType: string;
  /** 关联的父模型 ID（如 threadId） */
  parentId?: string;
  /** 关联的工作流 ID */
  workflowId?: string;
}

/**
 * 存储提供者接口
 * 定义统一的 CRUD 操作接口
 */
export interface StorageProvider<T> {
  /**
   * 保存实体
   * @param id 实体唯一标识
   * @param entity 实体数据
   * @param metadata 可选的元数据
   */
  save(id: string, entity: T, metadata?: StorageMetadata): Promise<void>;

  /**
   * 加载实体
   * @param id 实体唯一标识
   * @returns 实体数据或 null
   */
  load(id: string): Promise<T | null>;

  /**
   * 删除实体
   * @param id 实体唯一标识
   */
  delete(id: string): Promise<void>;

  /**
   * 检查实体是否存在
   * @param id 实体唯一标识
   */
  exists(id: string): Promise<boolean>;

  /**
   * 列出实体
   * @param options 查询选项
   */
  list(options?: ListOptions): Promise<ListResult<string>>;

  /**
   * 获取实体元数据
   * @param id 实体唯一标识
   */
  getMetadata(id: string): Promise<StorageMetadata | null>;

  /**
   * 批量保存
   * @param items 实体数组
   */
  saveBatch(items: Array<{ id: string; entity: T; metadata?: StorageMetadata }>): Promise<void>;

  /**
   * 批量删除
   * @param ids 实体 ID 数组
   */
  deleteBatch(ids: string[]): Promise<void>;

  /**
   * 清空所有数据
   */
  clear(): Promise<void>;

  /**
   * 关闭存储连接
   */
  close(): Promise<void>;
}
