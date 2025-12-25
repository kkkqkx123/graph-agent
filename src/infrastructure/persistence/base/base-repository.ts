import { injectable, inject } from 'inversify';
import { Repository as IRepository, IQueryOptions, PaginatedResult } from '../../../domain/common/repositories/repository';
import { ID } from '../../../domain/common/value-objects/id';
import { ConnectionManager } from '../connections/connection-manager';
import { DataSource, Repository, FindOptionsWhere, FindManyOptions, ObjectLiteral, SelectQueryBuilder, In } from 'typeorm';
import { QueryOptionsBuilder, QueryBuilderOptions } from './query-options-builder';
import { QueryTemplateManager, QueryTemplateRegistrar } from './query-template-manager';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  operation: string;
  entityName?: string;
  parameters?: Record<string, any>;
  timestamp: Date;
}

/**
 * 增强的Repository错误类
 */
export class EnhancedRepositoryError extends Error {
  public readonly context: ErrorContext;
  public readonly type: ErrorType;

  constructor(message: string, context: ErrorContext, type: ErrorType) {
    super(message);
    this.context = context;
    this.type = type;
    this.name = 'EnhancedRepositoryError';
  }
}

/**
 * 增强的查询选项接口
 */
export interface QueryOptions<TModel extends ObjectLiteral> extends IQueryOptions {
  /**
   * 自定义查询条件
   */
  customConditions?: (qb: SelectQueryBuilder<TModel>) => void;

  /**
   * 连接查询配置
   */
  joins?: Array<{
    alias: string;
    property: string;
    condition?: string;
    type?: 'left' | 'inner';
  }>;
}

/**
 * 映射器接口
 */
export interface IMapper<T, TModel extends ObjectLiteral> {
  toEntity(model: TModel): T;
  toModel(entity: T): TModel;
}

/**
 * 查询构建器辅助类
 */
export class QueryBuilderHelper<TModel extends ObjectLiteral> {
  constructor(
    private qb: SelectQueryBuilder<TModel>,
    private alias: string
  ) { }

  /**
   * JSON 字段包含查询
   */
  whereJsonContains(field: string, value: any): this {
    this.qb.andWhere(`${this.alias}.${field}::jsonb @> :value`, { value: JSON.stringify(value) });
    return this;
  }

  /**
   * JSON 字段查询
   */
  whereJsonbField(field: string, operator: string, value: any): this {
    this.qb.andWhere(`${this.alias}.${field}::jsonb ${operator} :value`, { value });
    return this;
  }

  /**
   * 时间范围查询
   */
  whereTimeRange(field: string, startTime: Date, endTime: Date): this {
    this.qb.andWhere(`${this.alias}.${field} BETWEEN :startTime AND :endTime`, { startTime, endTime });
    return this;
  }

  /**
   * 获取原始查询构建器
   */
  getQueryBuilder(): SelectQueryBuilder<TModel> {
    return this.qb;
  }
}

/**
 * 通用仓储基类
 *
 * 提供基础的CRUD操作和错误处理
 */
@injectable()
export abstract class BaseRepository<T, TModel extends ObjectLiteral, TId = ID> implements IRepository<T, TId> {
  protected abstract getModelClass(): new () => TModel;

  // 可选的映射器，子类可以注入并使用
  protected mapper?: IMapper<T, TModel>;

  // 软删除配置
  protected softDeleteConfig = {
    enabled: true,
    fieldName: 'isDeleted' as string,
    deletedAtField: 'deletedAt' as string,
    stateField: 'state' as string,
    deletedValue: 'archived',
    activeValue: 'active'
  };

  // 查询模板管理器
  protected queryTemplateManager: QueryTemplateManager<TModel>;

  // 查询构建器选项
  protected queryBuilderOptions: QueryBuilderOptions<TModel> = {
    alias: 'entity',
    enableSoftDelete: true,
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc'
  };

  constructor(
    @inject('ConnectionManager') protected connectionManager: ConnectionManager
  ) {
    // 初始化查询模板管理器
    this.queryTemplateManager = new QueryTemplateManager<TModel>();
    QueryTemplateRegistrar.registerCommonTemplates(this.queryTemplateManager);
    
    // 设置查询构建器别名
    this.queryBuilderOptions.alias = this.getAlias();
  }

  /**
   * 配置软删除行为 - 子类可以重写此方法来自定义软删除配置
   */
  protected configureSoftDelete(config: Partial<typeof this.softDeleteConfig>): void {
    this.softDeleteConfig = { ...this.softDeleteConfig, ...config };
  }

  /**
   * 配置查询构建器选项
   */
  protected configureQueryBuilder(options: Partial<QueryBuilderOptions<TModel>>): void {
    this.queryBuilderOptions = { ...this.queryBuilderOptions, ...options };
  }

  /**
   * 创建查询选项构建器
   */
  protected createQueryOptionsBuilder(): QueryOptionsBuilder<TModel> {
    return QueryOptionsBuilder.create<TModel>(this.queryBuilderOptions);
  }

  /**
   * 使用查询构建器查找实体
   */
  protected async findWithBuilder(builder: QueryOptionsBuilder<TModel>): Promise<T[]> {
    const options = builder.build();
    return this.find(options);
  }

  /**
   * 使用查询构建器查找单个实体
   */
  protected async findOneWithBuilder(builder: QueryOptionsBuilder<TModel>): Promise<T | null> {
    const options = builder.build();
    return this.findOne(options);
  }

  /**
   * 使用查询构建器进行分页查询
   */
  protected async findWithPaginationBuilder(builder: QueryOptionsBuilder<TModel>): Promise<PaginatedResult<T>> {
    const options = builder.build();
    return this.findWithPagination(options);
  }

  /**
   * 使用查询构建器统计数量
   */
  protected async countWithBuilder(builder: QueryOptionsBuilder<TModel>): Promise<number> {
    const options = builder.build();
    return this.count(options);
  }

  /**
   * 使用模板构建查询
   */
  protected buildWithTemplate(templateName: string, params: any): QueryOptionsBuilder<TModel> {
    return this.queryTemplateManager.buildWithTemplate(templateName, params, this.queryBuilderOptions);
  }

  /**
   * 使用模板组合构建查询
   */
  protected buildWithComposition(compositionName: string): QueryOptionsBuilder<TModel> {
    return this.queryTemplateManager.buildWithComposition(compositionName, this.queryBuilderOptions);
  }

  /**
   * 检查是否支持软删除
   */
  protected supportsSoftDelete(): boolean {
    return this.softDeleteConfig.enabled;
  }

  /**
   * 获取实体名称
   */
  protected getEntityName(): string {
    return this.getModelClass().name;
  }

  /**
   * 处理错误的统一方法
   */
  protected handleError(error: unknown, operation: string, parameters?: Record<string, any>): never {
    const context: ErrorContext = {
      operation,
      entityName: this.getEntityName(),
      parameters,
      timestamp: new Date()
    };

    let errorType = ErrorType.UNKNOWN_ERROR;
    let message = `未知错误`;

    if (error instanceof Error) {
      message = error.message;
      
      // 根据错误消息判断错误类型
      if (message.includes('connection') || message.includes('connect')) {
        errorType = ErrorType.CONNECTION_ERROR;
      } else if (message.includes('query') || message.includes('sql')) {
        errorType = ErrorType.QUERY_ERROR;
      } else if (message.includes('validation') || message.includes('constraint')) {
        errorType = ErrorType.VALIDATION_ERROR;
      } else if (message.includes('transaction')) {
        errorType = ErrorType.TRANSACTION_ERROR;
      }
    }

    // 构建详细的错误信息
    const detailedMessage = `${operation}失败: ${message}`;
    
    // 在开发环境中打印详细错误信息
    if (process.env['NODE_ENV'] === 'development') {
      console.error('Repository Error Details:', {
        message: detailedMessage,
        type: errorType,
        context,
        originalError: error
      });
    }

    throw new EnhancedRepositoryError(detailedMessage, context, errorType);
  }

  /**
   * 安全执行操作，统一错误处理
   */
  protected async safeExecute<R>(
    operation: () => Promise<R>,
    operationName: string,
    parameters?: Record<string, any>
  ): Promise<R> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, operationName, parameters);
    }
  }

  /**
   * 默认实体转换方法，子类可以重写
   */
  protected toEntity(model: TModel): T {
    if (!this.mapper) {
      throw new Error('Mapper not provided. Either inject a mapper or override toEntity method.');
    }
    return this.mapper.toEntity(model);
  }

  /**
   * 默认模型转换方法，子类可以重写
   */
  protected toModel(entity: T): TModel {
    if (!this.mapper) {
      throw new Error('Mapper not provided. Either inject a mapper or override toModel method.');
    }
    return this.mapper.toModel(entity);
  }

  /**
   * 获取TypeORM仓储实例
   */
  protected async getRepository(): Promise<Repository<TModel>> {
    const connection = await this.connectionManager.getConnection();
    return connection.getRepository<TModel>(this.getModelClass());
  }

  /**
   * 获取数据源
   */
  protected async getDataSource(): Promise<DataSource> {
    return this.connectionManager.getConnection();
  }

  /**
   * 创建查询构建器
   */
  protected async createQueryBuilder(alias?: string): Promise<SelectQueryBuilder<TModel>> {
    const repository = await this.getRepository();
    return repository.createQueryBuilder(alias || this.getAlias());
  }

  /**
   * 获取查询构建器辅助类
   */
  protected async getQueryBuilderHelper(alias?: string): Promise<QueryBuilderHelper<TModel>> {
    const qb = await this.createQueryBuilder(alias);
    return new QueryBuilderHelper(qb, alias || this.getAlias());
  }

  /**
   * 应用基础查询条件
   */
  protected applyBasicConditions(qb: SelectQueryBuilder<TModel>, options: QueryOptions<TModel>): void {
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          qb.andWhere(`${this.getAlias()}.${key} = :${key}`, { [key]: value });
        }
      });
    }

    if (options.sortBy) {
      const order = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      qb.orderBy(`${this.getAlias()}.${options.sortBy}`, order);
    } else {
      qb.orderBy(`${this.getAlias()}.createdAt`, 'DESC');
    }

    if (options.offset) {
      qb.skip(options.offset);
    }

    if (options.limit) {
      qb.take(options.limit);
    }
  }

  /**
   * 根据ID查找实体
   */
  async findById(id: TId): Promise<T | null> {
    return this.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const model = await repository.findOne({
          where: this.buildIdWhere(id) as FindOptionsWhere<TModel>
        });

        if (!model) {
          return null;
        }

        return this.toEntity(model);
      },
      '根据ID查找实体',
      { id: String(id) }
    );
  }

  /**
   * 根据ID查找实体，如果不存在则抛出异常
   */
  async findByIdOrFail(id: TId): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      this.handleError(
        new Error(`实体不存在`),
        '根据ID查找实体',
        { id: String(id) }
      );
    }
    return entity;
  }

  /**
   * 查找所有实体
   */
  async findAll(): Promise<T[]> {
    return this.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const models = await repository.find({
          order: { createdAt: 'DESC' } as any
        });

        return models.map(model => this.toEntity(model));
      },
      '查找所有实体'
    );
  }

  /**
   * 根据条件查找实体
   */
  async find(options: IQueryOptions | QueryOptions<TModel>): Promise<T[]> {
    try {
      const qb = await this.createQueryBuilder();

      // 如果是增强查询选项，应用自定义条件和连接查询
      const Options = options as QueryOptions<TModel>;
      if (Options.customConditions) {
        Options.customConditions(qb);
      }

      if (Options.joins) {
        Options.joins.forEach(join => {
          const joinMethod = join.type === 'left' ? 'leftJoin' : 'innerJoin';
          qb[joinMethod](`${this.getAlias()}.${join.property}`, join.alias);
          if (join.condition) {
            qb.andWhere(join.condition);
          }
        });
      }

      // 应用基础条件
      this.applyBasicConditions(qb, Options);

      const models = await qb.getMany();
      return models.map(model => this.toEntity(model));
    } catch (error) {
      throw new Error(`条件查找实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 按字段查找实体模板方法
   */
  protected async findByField<K extends keyof TModel>(
    field: K,
    value: TModel[K],
    options?: Partial<QueryOptions<TModel>>
  ): Promise<T[]> {
    return this.find({
      ...options,
      customConditions: (qb) => {
        qb.andWhere(`${this.getAlias()}.${String(field)} = :value`, { value });
        if (options?.customConditions) {
          options.customConditions(qb);
        }
      }
    });
  }

  /**
   * 按字段查找单个实体模板方法
   */
  protected async findOneByField<K extends keyof TModel>(
    field: K,
    value: TModel[K],
    options?: Partial<QueryOptions<TModel>>
  ): Promise<T | null> {
    const results = await this.findByField(field, value, { ...options, limit: 1 });
    return results[0] ?? null;
  }

  /**
   * 按时间范围查找实体模板方法
   */
  protected async findByTimeRangeField<K extends keyof TModel>(
    field: K,
    startTime: Date,
    endTime: Date,
    options?: Partial<QueryOptions<TModel>>
  ): Promise<T[]> {
    return this.find({
      ...options,
      customConditions: (qb) => {
        qb.andWhere(`${this.getAlias()}.${String(field)} BETWEEN :startTime AND :endTime`, {
          startTime,
          endTime
        });
        if (options?.customConditions) {
          options.customConditions(qb);
        }
      }
    });
  }

  /**
   * 多字段组合查询模板方法
   */
  protected async findByMultipleFields(
    fields: Record<string, any>,
    options?: Partial<QueryOptions<TModel>>
  ): Promise<T[]> {
    return this.find({
      ...options,
      customConditions: (qb) => {
        Object.entries(fields).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              qb.andWhere(`${this.getAlias()}.${key} IN (:...${key})`, { [key]: value });
            } else {
              qb.andWhere(`${this.getAlias()}.${key} = :${key}`, { [key]: value });
            }
          }
        });
        if (options?.customConditions) {
          options.customConditions(qb);
        }
      }
    });
  }

  /**
   * 关联查询支持模板方法
   */
  protected async findWithRelations(
    relations: Array<{
      alias: string;
      property: string;
      condition?: string;
      type?: 'left' | 'inner';
    }>,
    options?: Partial<QueryOptions<TModel>>
  ): Promise<T[]> {
    return this.find({
      ...options,
      joins: relations,
      customConditions: options?.customConditions
    });
  }

  /**
   * 自定义查询执行模板方法
   */
  protected async executeCustomQuery(
    queryBuilder: (qb: SelectQueryBuilder<TModel>) => void,
    options?: Partial<QueryOptions<TModel>>
  ): Promise<T[]> {
    return this.find({
      ...options,
      customConditions: queryBuilder
    });
  }

  /**
   * 根据条件查找单个实体
   */
  async findOne(options: IQueryOptions): Promise<T | null> {
    const results = await this.find({ ...options, limit: 1 });
    return results[0] ?? null;
  }

  /**
   * 根据条件查找单个实体，如果不存在则抛出异常
   */
  async findOneOrFail(options: IQueryOptions): Promise<T> {
    const entity = await this.findOne(options);
    if (!entity) {
      throw new Error('未找到符合条件的实体');
    }
    return entity;
  }

  /**
   * 分页查询实体
   */
  async findWithPagination(options: IQueryOptions): Promise<PaginatedResult<T>> {
    try {
      const repository = await this.getRepository();
      const page = options.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1;
      const pageSize = options.limit || 10;
      const skip = (page - 1) * pageSize;

      const findOptions = this.buildFindOptions({
        ...options,
        offset: skip,
        limit: pageSize
      });

      const [models, total] = await repository.findAndCount(findOptions);
      const totalPages = Math.ceil(total / pageSize);

      return {
        items: models.map(model => this.toEntity(model)),
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      throw new Error(`分页查询实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 保存实体
   */
  async save(entity: T): Promise<T> {
    try {
      const repository = await this.getRepository();
      const model = this.toModel(entity);
      const savedModel = await repository.save(model);

      return this.toEntity(savedModel);
    } catch (error) {
      throw new Error(`保存实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量保存实体
   */
  async saveBatch(entities: T[]): Promise<T[]> {
    try {
      const repository = await this.getRepository();
      const models = entities.map(entity => this.toModel(entity));
      const savedModels = await repository.save(models);

      return savedModels.map(model => this.toEntity(model));
    } catch (error) {
      throw new Error(`批量保存实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 删除实体
   */
  async delete(entity: T): Promise<void> {
    try {
      const repository = await this.getRepository();
      const model = this.toModel(entity);
      await repository.remove(model);
    } catch (error) {
      throw new Error(`删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据ID删除实体
   */
  async deleteById(id: TId): Promise<void> {
    try {
      const repository = await this.getRepository();
      await repository.delete(this.buildIdWhere(id) as FindOptionsWhere<TModel>);
    } catch (error) {
      throw new Error(`根据ID删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量删除实体
   */
  async deleteBatch(entities: T[]): Promise<void> {
    try {
      const repository = await this.getRepository();
      const models = entities.map(entity => this.toModel(entity));
      await repository.remove(models);
    } catch (error) {
      throw new Error(`批量删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据条件删除实体
   */
  async deleteWhere(options: IQueryOptions): Promise<number> {
    try {
      const repository = await this.getRepository();
      const queryBuilder = repository.createQueryBuilder().delete();

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined) {
            queryBuilder.andWhere(`${this.getAlias()}.${key} = :${key}`, { [key]: value });
          }
        });
      }

      const result = await queryBuilder.execute();
      return result.affected || 0;
    } catch (error) {
      throw new Error(`条件删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查实体是否存在
   */
  async exists(id: TId): Promise<boolean> {
    try {
      const repository = await this.getRepository();
      const count = await repository.count({
        where: this.buildIdWhere(id) as FindOptionsWhere<TModel>
      });
      return count > 0;
    } catch (error) {
      throw new Error(`检查实体存在性失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 统计实体数量
   */
  async count(options?: IQueryOptions): Promise<number> {
    try {
      const repository = await this.getRepository();

      if (!options || !options.filters) {
        return repository.count();
      }

      const queryBuilder = repository.createQueryBuilder(this.getAlias());

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined) {
            queryBuilder.andWhere(`${this.getAlias()}.${key} = :${key}`, { [key]: value });
          }
        });
      }

      return queryBuilder.getCount();
    } catch (error) {
      throw new Error(`统计实体数量失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 构建ID查询条件
   */
  protected buildIdWhere(id: TId): Record<string, unknown> {
    if (id instanceof ID) {
      return { id: id.value };
    }
    return { id };
  }

  /**
   * 构建查询选项
   */
  protected buildFindOptions(options: IQueryOptions): FindManyOptions<TModel> {
    const findOptions: FindManyOptions<TModel> = {};

    if (options.filters) {
      findOptions.where = options.filters as FindOptionsWhere<TModel>;
    }

    if (options.sortBy) {
      findOptions.order = {
        [options.sortBy]: options.sortOrder === 'desc' ? 'DESC' : 'ASC'
      } as any;
    } else {
      findOptions.order = { createdAt: 'DESC' } as any;
    }

    if (options.offset) {
      findOptions.skip = options.offset;
    }

    if (options.limit) {
      findOptions.take = options.limit;
    }

    return findOptions;
  }

  /**
   * 获取查询别名
   */
  protected getAlias(): string {
    const modelName = this.getModelClass().name.toLowerCase();
    return modelName.replace('model', '');
  }

  /**
   * 在事务中执行操作
   */
  async executeInTransaction<R>(operation: () => Promise<R>): Promise<R> {
    const dataSource = await this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation();
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 软删除实体 - 可被子类重写以自定义行为
   */
  async softDelete(id: TId): Promise<void> {
    if (!this.supportsSoftDelete()) {
      // 如果不支持软删除，使用硬删除
      return this.deleteById(id);
    }

    return this.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const updateData: any = {
          updatedAt: new Date()
        };

        // 设置删除标记
        if (this.softDeleteConfig.fieldName) {
          updateData[this.softDeleteConfig.fieldName] = true;
        }

        // 设置删除时间
        if (this.softDeleteConfig.deletedAtField) {
          updateData[this.softDeleteConfig.deletedAtField] = new Date();
        }

        // 设置状态字段
        if (this.softDeleteConfig.stateField && this.softDeleteConfig.deletedValue) {
          updateData[this.softDeleteConfig.stateField] = this.softDeleteConfig.deletedValue;
        }

        await repository.update(this.buildIdWhere(id) as FindOptionsWhere<TModel>, updateData);
      },
      '软删除实体',
      { id: String(id) }
    );
  }

  /**
   * 批量软删除实体 - 可被子类重写以自定义行为
   */
  async batchSoftDelete(ids: TId[]): Promise<number> {
    if (!this.supportsSoftDelete()) {
      // 如果不支持软删除，使用硬删除
      return this.batchDeleteByIds(ids);
    }

    return this.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const idValues = ids.map(id => this.extractIdValue(id));
        
        const updateData: any = {
          updatedAt: new Date()
        };

        // 设置删除标记
        if (this.softDeleteConfig.fieldName) {
          updateData[this.softDeleteConfig.fieldName] = true;
        }

        // 设置删除时间
        if (this.softDeleteConfig.deletedAtField) {
          updateData[this.softDeleteConfig.deletedAtField] = new Date();
        }

        // 设置状态字段
        if (this.softDeleteConfig.stateField && this.softDeleteConfig.deletedValue) {
          updateData[this.softDeleteConfig.stateField] = this.softDeleteConfig.deletedValue;
        }

        const result = await repository.createQueryBuilder()
          .update()
          .set(updateData)
          .where(`id IN (:...ids)`, { ids: idValues })
          .execute();
        
        return result.affected || 0;
      },
      '批量软删除实体',
      { ids: ids.map(id => String(id)) }
    );
  }

  /**
   * 恢复软删除的实体 - 可被子类重写以自定义行为
   */
  async restoreSoftDeleted(id: TId): Promise<void> {
    if (!this.supportsSoftDelete()) {
      throw new Error('软删除功能未启用');
    }

    return this.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const updateData: any = {
          updatedAt: new Date()
        };

        // 清除删除标记
        if (this.softDeleteConfig.fieldName) {
          updateData[this.softDeleteConfig.fieldName] = false;
        }

        // 清除删除时间
        if (this.softDeleteConfig.deletedAtField) {
          updateData[this.softDeleteConfig.deletedAtField] = null;
        }

        // 设置状态字段
        if (this.softDeleteConfig.stateField && this.softDeleteConfig.activeValue) {
          updateData[this.softDeleteConfig.stateField] = this.softDeleteConfig.activeValue;
        }

        await repository.update(this.buildIdWhere(id) as FindOptionsWhere<TModel>, updateData);
      },
      '恢复软删除实体',
      { id: String(id) }
    );
  }

  /**
   * 查找软删除的实体 - 可被子类重写以自定义行为
   */
  async findSoftDeleted(options?: Partial<QueryOptions<TModel>>): Promise<T[]> {
    if (!this.supportsSoftDelete()) {
      return [];
    }

    return this.find({
      ...options,
      customConditions: (qb) => {
        // 添加软删除条件
        if (this.softDeleteConfig.fieldName) {
          qb.andWhere(`${this.getAlias()}.${String(this.softDeleteConfig.fieldName)} = :isDeleted`, { isDeleted: true });
        }
        
        if (options?.customConditions) {
          options.customConditions(qb);
        }
      }
    });
  }

  /**
   * 批量更新实体字段
   */
  async batchUpdate(ids: TId[], updateData: Partial<TModel>): Promise<number> {
    try {
      const repository = await this.getRepository();
      const idValues = ids.map(id => this.extractIdValue(id));
      
      const result = await repository.createQueryBuilder()
        .update()
        .set({
          ...updateData,
          updatedAt: new Date()
        } as any)
        .where(`id IN (:...ids)`, { ids: idValues })
        .execute();
      
      return result.affected || 0;
    } catch (error) {
      throw new Error(`批量更新实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量删除实体（根据ID列表）
   */
  async batchDeleteByIds(ids: TId[]): Promise<number> {
    try {
      const repository = await this.getRepository();
      const idValues = ids.map(id => this.extractIdValue(id));
      
      const result = await repository.createQueryBuilder()
        .delete()
        .where(`id IN (:...ids)`, { ids: idValues })
        .execute();
      
      return result.affected || 0;
    } catch (error) {
      throw new Error(`批量删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 在事务中执行批量操作
   */
  async executeBatchInTransaction<R>(operations: Array<() => Promise<R>>): Promise<R[]> {
    return this.executeInTransaction(async () => {
      const results: R[] = [];
      for (const operation of operations) {
        results.push(await operation());
      }
      return results;
    });
  }

  /**
   * 提取ID值的辅助方法
   */
  private extractIdValue(id: TId): any {
    if (id instanceof ID) {
      return id.value;
    }
    return id;
  }
}