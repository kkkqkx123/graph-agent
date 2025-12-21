import { ID } from '../value-objects/id';

/**
 * 查询选项接口
 */
export interface IQueryOptions {
  /**
   * 分页偏移量
   */
  offset?: number;

  /**
   * 分页大小
   */
  limit?: number;

  /**
   * 排序字段
   */
  sortBy?: string;

  /**
   * 排序方向
   */
  sortOrder?: 'asc' | 'desc';

  /**
   * 过滤条件
   */
  filters?: Record<string, unknown>;
}

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  /**
   * 数据列表
   */
  items: T[];

  /**
   * 总数量
   */
  total: number;

  /**
   * 当前页码
   */
  page: number;

  /**
   * 每页大小
   */
  pageSize: number;

  /**
   * 总页数
   */
  totalPages: number;
}

/**
 * 仓储接口
 * 
 * 仓储是DDD中的核心概念，用于封装对象存储和检索逻辑
 */
export interface Repository<T, TId = ID> {
  /**
   * 根据ID查找实体
   * @param id 实体ID
   * @returns 实体或null
   */
  findById(id: TId): Promise<T | null>;

  /**
   * 根据ID查找实体，如果不存在则抛出异常
   * @param id 实体ID
   * @returns 实体
   * @throws RepositoryError 当实体不存在时
   */
  findByIdOrFail(id: TId): Promise<T>;

  /**
   * 查找所有实体
   * @returns 实体列表
   */
  findAll(): Promise<T[]>;

  /**
   * 根据条件查找实体
   * @param options 查询选项
   * @returns 实体列表
   */
  find(options: IQueryOptions): Promise<T[]>;

  /**
   * 根据条件查找单个实体
   * @param options 查询选项
   * @returns 实体或null
   */
  findOne(options: IQueryOptions): Promise<T | null>;

  /**
   * 根据条件查找单个实体，如果不存在则抛出异常
   * @param options 查询选项
   * @returns 实体
   * @throws RepositoryError 当实体不存在时
   */
  findOneOrFail(options: IQueryOptions): Promise<T>;

  /**
   * 分页查询实体
   * @param options 查询选项
   * @returns 分页结果
   */
  findWithPagination(options: IQueryOptions): Promise<PaginatedResult<T>>;

  /**
   * 保存实体
   * @param entity 实体
   * @returns 保存后的实体
   */
  save(entity: T): Promise<T>;

  /**
   * 批量保存实体
   * @param entities 实体列表
   * @returns 保存后的实体列表
   */
  saveBatch(entities: T[]): Promise<T[]>;

  /**
   * 删除实体
   * @param entity 实体
   */
  delete(entity: T): Promise<void>;

  /**
   * 根据ID删除实体
   * @param id 实体ID
   */
  deleteById(id: TId): Promise<void>;

  /**
   * 批量删除实体
   * @param entities 实体列表
   */
  deleteBatch(entities: T[]): Promise<void>;

  /**
   * 根据条件删除实体
   * @param options 查询选项
   * @returns 删除的实体数量
   */
  deleteWhere(options: IQueryOptions): Promise<number>;

  /**
   * 检查实体是否存在
   * @param id 实体ID
   * @returns 是否存在
   */
  exists(id: TId): Promise<boolean>;

  /**
   * 统计实体数量
   * @param options 查询选项
   * @returns 实体数量
   */
  count(options?: IQueryOptions): Promise<number>;
}