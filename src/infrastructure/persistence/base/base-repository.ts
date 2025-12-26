import { injectable, inject } from 'inversify';
import { Repository as IRepository, IQueryOptions, PaginatedResult } from '../../../domain/common/repositories/repository';
import { ID } from '../../../domain/common/value-objects/id';
import { ConnectionManager } from '../connections/connection-manager';
import { DataSource, Repository, FindOptionsWhere, FindManyOptions, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { QueryOptionsBuilder, QueryBuilderOptions } from './query-options-builder';
import { QueryTemplateManager, QueryTemplateRegistrar } from './query-template-manager';
import { RepositoryErrorHandler } from './repository-error-handler';
import { QueryBuilderHelper } from './query-builder-helper';
import { SoftDeleteManager, SoftDeleteConfig } from './soft-delete-manager';
import { TransactionManager } from './transaction-manager';
import { BatchOperationManager } from './batch-operation-manager';
import { QueryConditionsApplier } from './query-conditions-applier';
import { RepositoryConfig, DefaultRepositoryConfig } from './repository-config';

/**
 * 查询配置接口
 * 定义查询构建器的配置选项
 */
export interface QueryConfig<TModel extends ObjectLiteral> {
  /**
   * 查询别名
   */
  alias: string;
  
  /**
   * 是否启用软删除过滤
   */
  enableSoftDelete: boolean;
  
  /**
   * 默认排序字段
   */
  defaultSortField: string;
  
  /**
   * 默认排序方向
   */
  defaultSortOrder: 'asc' | 'desc';
}

/**
 * 默认查询配置
 */
export const DefaultQueryConfig: QueryConfig<any> = {
  alias: 'entity',
  enableSoftDelete: true,
  defaultSortField: 'createdAt',
  defaultSortOrder: 'desc'
};

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
 * 通用仓储基类（精简版）
 *
 * 提供基础的CRUD操作，其他职责已分离到专门的模块
 */
@injectable()
export abstract class BaseRepository<T, TModel extends ObjectLiteral, TId = ID> implements IRepository<T, TId> {
  protected abstract getModelClass(): new () => TModel;

  // 依赖注入的模块
  protected errorHandler: RepositoryErrorHandler;
  protected softDeleteManager: SoftDeleteManager<TModel>;
  protected transactionManager?: TransactionManager;
  protected batchOperationManager?: BatchOperationManager<TModel>;
  protected queryConditionsApplier: QueryConditionsApplier<TModel>;

  // 配置
  protected config: RepositoryConfig;
  protected queryConfig: QueryConfig<TModel>;

  // 类型转换器（可选）
  protected converters?: Record<string, any>;

  // 查询模板管理器
  protected queryTemplateManager: QueryTemplateManager<TModel>;

  constructor(
    @inject('ConnectionManager') protected connectionManager: ConnectionManager,
    config?: Partial<RepositoryConfig>
  ) {
    // 初始化配置
    this.config = new DefaultRepositoryConfig(config);
    
    // 初始化查询配置
    this.queryConfig = {
      alias: this.getAlias(),
      enableSoftDelete: true,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc'
    };

    // 初始化模块
    this.errorHandler = new RepositoryErrorHandler();
    this.softDeleteManager = new SoftDeleteManager<TModel>({
      enabled: this.config.softDeleteEnabled,
      fieldName: this.config.softDeleteField,
      deletedAtField: 'deletedAt',
      stateField: 'state',
      deletedValue: 'archived',
      activeValue: 'active'
    });
    this.queryConditionsApplier = new QueryConditionsApplier<TModel>(this.queryConfig);

    // 初始化查询模板管理器
    this.queryTemplateManager = new QueryTemplateManager<TModel>();
    QueryTemplateRegistrar.registerCommonTemplates(this.queryTemplateManager);
  }

  /**
   * 配置软删除行为 - 子类可以重写此方法来自定义软删除配置
   */
  protected configureSoftDelete(config: Partial<SoftDeleteConfig>): void {
    this.softDeleteManager.configure(config);
  }

  /**
   * 初始化事务管理器（延迟初始化）
   */
  private async initTransactionManager(): Promise<TransactionManager> {
    if (!this.transactionManager) {
      const dataSource = await this.getDataSource();
      this.transactionManager = new TransactionManager(dataSource);
    }
    return this.transactionManager;
  }

  /**
   * 初始化批量操作管理器（延迟初始化）
   */
  private async initBatchOperationManager(): Promise<BatchOperationManager<TModel>> {
    if (!this.batchOperationManager) {
      const repository = await this.getRepository();
      this.batchOperationManager = new BatchOperationManager<TModel>(repository);
    }
    return this.batchOperationManager;
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
   * 创建查询选项构建器
   */
  protected createQueryOptionsBuilder(): QueryOptionsBuilder<TModel> {
    return QueryOptionsBuilder.create<TModel>(this.queryConfig);
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
    return this.queryTemplateManager.buildWithTemplate(templateName, params, this.queryConfig);
  }

  /**
   * 使用模板组合构建查询
   */
  protected buildWithComposition(compositionName: string): QueryOptionsBuilder<TModel> {
    return this.queryTemplateManager.buildWithComposition(compositionName, this.queryConfig);
  }

  /**
   * 默认实体转换方法，子类可以重写
   */
  protected toEntity(model: TModel): T {
    // 默认实现：直接类型转换
    return model as any;
  }

  /**
   * 默认模型转换方法，子类可以重写
   */
  protected toModel(entity: T): TModel {
    // 默认实现：直接类型转换
    return entity as any;
  }

  /**
   * 获取实体名称
   */
  protected getEntityName(): string {
    return this.getModelClass().name;
  }

  /**
   * 获取查询别名
   */
  protected getAlias(): string {
    const modelName = this.getModelClass().name.toLowerCase();
    return modelName.replace('model', '');
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

  // ========== 核心CRUD操作 ==========

  /**
   * 根据ID查找实体
   */
  async findById(id: TId): Promise<T | null> {
    return this.errorHandler.safeExecute(
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
      this.getEntityName(),
      { id: String(id) }
    );
  }

  /**
   * 根据ID查找实体，如果不存在则抛出异常
   */
  async findByIdOrFail(id: TId): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      this.errorHandler.handleError(
        new Error(`实体不存在`),
        '根据ID查找实体',
        this.getEntityName(),
        { id: String(id) }
      );
    }
    return entity;
  }

  /**
   * 查找所有实体
   */
  async findAll(): Promise<T[]> {
    return this.errorHandler.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const models = await repository.find({
          order: { createdAt: 'DESC' } as any
        });

        return models.map(model => this.toEntity(model));
      },
      '查找所有实体',
      this.getEntityName()
    );
  }

  /**
   * 根据条件查找实体
   */
  async find(options: IQueryOptions | QueryOptions<TModel>): Promise<T[]> {
    return this.errorHandler.safeExecute(
      async () => {
        const qb = await this.createQueryBuilder();

        // 应用查询条件
        const enhancedOptions = options as QueryOptions<TModel>;
        this.queryConditionsApplier.applyCustomConditions(qb, enhancedOptions.customConditions);
        this.queryConditionsApplier.applyJoins(qb, enhancedOptions.joins);
        this.queryConditionsApplier.applyBasicConditions(qb, enhancedOptions);

        const models = await qb.getMany();
        return models.map(model => this.toEntity(model));
      },
      '条件查找实体',
      this.getEntityName(),
      { options }
    );
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
    return this.errorHandler.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const pageSize = options.limit ?? this.config.defaultPageSize ?? 10;
        const page = options.offset ? Math.floor(options.offset / pageSize) + 1 : 1;
        const skip = (page - 1) * pageSize;

        const findOptions = this.queryConditionsApplier.buildFindOptions({
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
          pageSize: pageSize,
          totalPages
        };
      },
      '分页查询实体',
      this.getEntityName(),
      { options }
    );
  }

  /**
   * 保存实体
   */
  async save(entity: T): Promise<T> {
    return this.errorHandler.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const model = this.toModel(entity);
        const savedModel = await repository.save(model);

        return this.toEntity(savedModel);
      },
      '保存实体',
      this.getEntityName(),
      { entity }
    );
  }

  /**
   * 删除实体
   */
  async delete(entity: T): Promise<void> {
    return this.errorHandler.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const model = this.toModel(entity);
        await repository.remove(model);
      },
      '删除实体',
      this.getEntityName(),
      { entity }
    );
  }

  /**
   * 根据ID删除实体
   */
  async deleteById(id: TId): Promise<void> {
    return this.errorHandler.safeExecute(
      async () => {
        const repository = await this.getRepository();
        await repository.delete(this.buildIdWhere(id) as FindOptionsWhere<TModel>);
      },
      '根据ID删除实体',
      this.getEntityName(),
      { id: String(id) }
    );
  }

  /**
   * 检查实体是否存在
   */
  async exists(id: TId): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        const repository = await this.getRepository();
        const count = await repository.count({
          where: this.buildIdWhere(id) as FindOptionsWhere<TModel>
        });
        return count > 0;
      },
      '检查实体存在性',
      this.getEntityName(),
      { id: String(id) }
    );
  }

  /**
   * 统计实体数量
   */
  async count(options?: IQueryOptions): Promise<number> {
    return this.errorHandler.safeExecute(
      async () => {
        const repository = await this.getRepository();

        if (!options || !options.filters) {
          return repository.count();
        }

        const qb = repository.createQueryBuilder(this.getAlias());
        this.queryConditionsApplier.applyBasicConditions(qb, options);

        return qb.getCount();
      },
      '统计实体数量',
      this.getEntityName(),
      { options }
    );
  }

  /**
   * 根据条件删除实体
   */
  async deleteWhere(options: IQueryOptions): Promise<number> {
    const batchManager = await this.initBatchOperationManager();
    return batchManager.deleteWhere(options.filters || {}, this.getAlias());
  }

  // ========== 高级功能（委托给专门模块） ==========

  /**
   * 批量保存实体
   */
  async saveBatch(entities: T[]): Promise<T[]> {
    const batchManager = await this.initBatchOperationManager();
    const models = entities.map(entity => this.toModel(entity));
    const savedModels = await batchManager.saveBatch(models);
    return savedModels.map(model => this.toEntity(model));
  }

  /**
   * 批量删除实体
   */
  async deleteBatch(entities: T[]): Promise<void> {
    const batchManager = await this.initBatchOperationManager();
    const models = entities.map(entity => this.toModel(entity));
    await batchManager.deleteBatch(models);
  }

  /**
   * 软删除实体
   */
  async softDelete(id: TId): Promise<void> {
    const repository = await this.getRepository();
    await this.softDeleteManager.softDelete(repository, this.buildIdWhere(id));
  }

  /**
   * 在事务中执行操作
   */
  async executeInTransaction<R>(operation: () => Promise<R>): Promise<R> {
    const transactionManager = await this.initTransactionManager();
    return transactionManager.executeInTransaction(operation);
  }

  // ========== 基础工具方法 ==========

  /**
   * 应用软删除过滤条件到查询构建器
   * 子类可以在customConditions中调用此方法
   */
  protected applySoftDeleteFilter(qb: SelectQueryBuilder<TModel>): void {
    this.softDeleteManager.applySoftDeleteFilter(qb, this.getAlias());
  }

  /**
   * 应用字段过滤条件到查询构建器
   * 子类可以在customConditions中调用此方法
   */
  protected applyFieldFilter(
    qb: SelectQueryBuilder<TModel>,
    field: string,
    value: any,
    operator: '=' | 'IN' | 'LIKE' | '>' | '<' | '>=' | '<=' = '='
  ): void {
    this.queryConditionsApplier.applyFieldFilter(qb, field, value, operator);
  }

  /**
   * 应用时间范围过滤条件到查询构建器
   * 子类可以在customConditions中调用此方法
   */
  protected applyTimeRangeFilter(
    qb: SelectQueryBuilder<TModel>,
    field: string,
    startTime?: Date,
    endTime?: Date
  ): void {
    this.queryConditionsApplier.applyTimeRangeFilter(qb, field, startTime, endTime);
  }

  /**
   * 应用状态过滤条件到查询构建器
   * 子类可以在customConditions中调用此方法
   */
  protected applyStatusFilter(
    qb: SelectQueryBuilder<TModel>,
    field: string,
    statuses: string[]
  ): void {
    this.queryConditionsApplier.applyStatusFilter(qb, field, statuses);
  }

  /**
   * 批量软删除实体
   */
  async batchSoftDelete(ids: TId[]): Promise<number> {
    const repository = await this.getRepository();
    return this.softDeleteManager.batchSoftDelete(repository, ids.map(id => this.buildIdWhere(id)));
  }

  /**
   * 恢复软删除的实体
   */
  async restoreSoftDeleted(id: TId): Promise<void> {
    const repository = await this.getRepository();
    await this.softDeleteManager.restoreSoftDeleted(repository, this.buildIdWhere(id));
  }

  /**
   * 查找软删除的实体
   */
  async findSoftDeleted(options?: Partial<QueryOptions<TModel>>): Promise<T[]> {
    return this.find({
      ...options,
      customConditions: (qb) => {
        this.softDeleteManager.applySoftDeleteFilter(qb, this.getAlias());
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
    const batchManager = await this.initBatchOperationManager();
    const idValues = ids.map(id => this.extractIdValue(id));
    return batchManager.batchUpdate(idValues, {
      ...updateData,
      updatedAt: new Date()
    } as any);
  }

  /**
   * 批量删除实体（根据ID列表）
   */
  async batchDeleteByIds(ids: TId[]): Promise<number> {
    const batchManager = await this.initBatchOperationManager();
    const idValues = ids.map(id => this.extractIdValue(id));
    return batchManager.batchDeleteByIds(idValues);
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