import { injectable, inject } from 'inversify';
import {
  Repository as IRepository,
  IQueryOptions,
  PaginatedResult,
} from '../../../domain/common/repositories/repository';
import { ID } from '../../../domain/common/value-objects/id';
import { ConnectionManager } from '../connection-manager';
import { DataSource, Repository, FindOptionsWhere, FindManyOptions, ObjectLiteral, EntityManager, QueryRunner } from 'typeorm';
import { TYPES } from '../../../di/service-keys';
import { EntityNotFoundError } from '../../../../common/exceptions';

/**
 * 通用仓储基类（简化版）
 *
 * 提供基础的CRUD操作
 */
@injectable()
export abstract class BaseRepository<
  T,
  TModel extends ObjectLiteral,
  TId = ID,
> implements IRepository<T, TId> {
  protected abstract getModelClass(): new () => TModel;

  constructor(@inject(TYPES.ConnectionManager) protected connectionManager: ConnectionManager) { }

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
   * 将数据库模型转换为领域实体（抽象方法，子类必须实现）
   */
  protected abstract toDomain(model: TModel): T;

  /**
   * 将领域实体转换为数据库模型（抽象方法，子类必须实现）
   */
  protected abstract toModel(domain: T): TModel;

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
  protected buildFindOptions(options?: IQueryOptions): FindManyOptions<TModel> {
    if (!options) return {};

    const findOptions: FindManyOptions<TModel> = {};

    if (options.offset !== undefined) {
      findOptions.skip = options.offset;
    }

    if (options.limit !== undefined) {
      findOptions.take = options.limit;
    }

    if (options.sortBy) {
      findOptions.order = { [options.sortBy]: options.sortOrder || 'asc' } as any;
    }

    return findOptions;
  }

  // ========== 核心CRUD操作 ==========

  /**
   * 根据ID查找实体
   */
  async findById(id: TId): Promise<T | null> {
    try {
      const repository = await this.getRepository();
      const model = await repository.findOne({
        where: this.buildIdWhere(id) as FindOptionsWhere<TModel>,
      });

      if (!model) {
        return null;
      }

      return this.toDomain(model);
    } catch (error) {
      console.error('根据ID查找实体失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID查找实体，如果不存在则抛出异常
   */
  async findByIdOrFail(id: TId): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new EntityNotFoundError('Entity', typeof id === 'string' ? id : (id as ID).value);
    }
    return entity;
  }

  /**
   * 查找所有实体
   */
  async findAll(): Promise<T[]> {
    try {
      const repository = await this.getRepository();
      const models = await repository.find();
      return models.map(model => this.toDomain(model));
    } catch (error) {
      console.error('查找所有实体失败:', error);
      throw error;
    }
  }

  /**
   * 根据条件查找实体
   */
  async find(options?: IQueryOptions): Promise<T[]> {
    try {
      const repository = await this.getRepository();
      const models = await repository.find(this.buildFindOptions(options));
      return models.map(model => this.toDomain(model));
    } catch (error) {
      console.error('条件查找实体失败:', error);
      throw error;
    }
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
      throw new EntityNotFoundError('Entity', 'with specified conditions');
    }
    return entity;
  }

  /**
   * 分页查询实体
   */
  async findWithPagination(options: IQueryOptions): Promise<PaginatedResult<T>> {
    try {
      const repository = await this.getRepository();
      const pageSize = options.limit ?? 10;
      const page = options.offset ? Math.floor(options.offset / pageSize) + 1 : 1;
      const skip = (page - 1) * pageSize;

      const findOptions = this.buildFindOptions({
        ...options,
        offset: skip,
        limit: pageSize,
      });

      const [models, total] = await repository.findAndCount(findOptions);
      const totalPages = Math.ceil(total / pageSize);

      return {
        items: models.map(model => this.toDomain(model)),
        total,
        page,
        pageSize: pageSize,
        totalPages,
      };
    } catch (error) {
      console.error('分页查询实体失败:', error);
      throw error;
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
      return this.toDomain(savedModel);
    } catch (error) {
      console.error('保存实体失败:', error);
      throw error;
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
      return savedModels.map(model => this.toDomain(model));
    } catch (error) {
      console.error('批量保存实体失败:', error);
      throw error;
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
      console.error('删除实体失败:', error);
      throw error;
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
      console.error('根据ID删除实体失败:', error);
      throw error;
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
      console.error('批量删除实体失败:', error);
      throw error;
    }
  }

  /**
   * 根据条件删除实体
   */
  async deleteWhere(options: IQueryOptions): Promise<number> {
    try {
      const repository = await this.getRepository();
      const findOptions = this.buildFindOptions(options);
      const result = await repository.delete(findOptions.where as any);
      return result.affected || 0;
    } catch (error) {
      console.error('根据条件删除实体失败:', error);
      throw error;
    }
  }

  /**
   * 检查实体是否存在
   */
  async exists(id: TId): Promise<boolean> {
    try {
      const repository = await this.getRepository();
      const count = await repository.count({
        where: this.buildIdWhere(id) as FindOptionsWhere<TModel>,
      });
      return count > 0;
    } catch (error) {
      console.error('检查实体存在性失败:', error);
      throw error;
    }
  }

  /**
   * 统计实体数量
   */
  async count(options?: IQueryOptions): Promise<number> {
    try {
      const repository = await this.getRepository();
      return repository.count(this.buildFindOptions(options));
    } catch (error) {
      console.error('统计实体数量失败:', error);
      throw error;
    }
  }

  // ========== 事务管理 ==========

  /**
   * 在事务中执行操作
   * 使用 EntityManager 事务（推荐）
   *
   * @param callback 事务回调函数
   * @returns 回调函数的返回值
   */
  async executeInTransaction<T>(
    callback: (manager: EntityManager) => Promise<T>
  ): Promise<T> {
    const dataSource = await this.getDataSource();
    return dataSource.manager.transaction(async (transactionalEntityManager) => {
      return callback(transactionalEntityManager);
    });
  }

  /**
   * 使用 QueryRunner 手动管理事务
   * 提供更细粒度的控制
   *
   * @param callback 事务回调函数
   * @returns 回调函数的返回值
   */
  async executeWithManualTransaction<T>(
    callback: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const dataSource = await this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const result = await callback(queryRunner);

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
   * 批量保存实体（在事务中）
   *
   * @param entities 实体数组
   * @returns 保存后的实体数组
   */
  async saveBatchInTransaction(entities: T[]): Promise<T[]> {
    return this.executeInTransaction(async (manager) => {
      const repository = manager.getRepository<TModel>(this.getModelClass());
      const models = entities.map(entity => this.toModel(entity));
      const savedModels = await repository.save(models);
      return savedModels.map(model => this.toDomain(model));
    });
  }

  /**
   * 批量删除实体（在事务中）
   *
   * @param entities 实体数组
   */
  async deleteBatchInTransaction(entities: T[]): Promise<void> {
    return this.executeInTransaction(async (manager) => {
      const repository = manager.getRepository<TModel>(this.getModelClass());
      const models = entities.map(entity => this.toModel(entity));
      await repository.remove(models);
    });
  }

  /**
   * 根据条件批量更新（在事务中）
   *
   * @param where 更新条件
   * @param data 更新数据
   * @returns 影响的行数
   */
  async updateWhereInTransaction(
    where: FindOptionsWhere<TModel>,
    data: Partial<TModel>
  ): Promise<number> {
    return this.executeInTransaction(async (manager) => {
      const repository = manager.getRepository<TModel>(this.getModelClass());
      const result = await repository.update(where, data);
      return result.affected || 0;
    });
  }
}
