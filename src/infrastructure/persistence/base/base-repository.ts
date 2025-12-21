import { injectable, inject } from 'inversify';
import { Repository as IRepository, QueryOptions, PaginatedResult } from '../../../domain/common/repositories/repository';
import { ID } from '../../../domain/common/value-objects/id';
import { ConnectionManager } from '../connections/connection-manager';
import { RepositoryError } from '../../../domain/common/errors/repository-error';
import { DataSource, Repository, FindOptionsWhere, FindManyOptions, ObjectLiteral } from 'typeorm';

/**
 * 通用仓储基类
 * 
 * 提供基础的CRUD操作和错误处理
 */
@injectable()
export abstract class BaseRepository<T, TModel extends ObjectLiteral, TId = ID> implements IRepository<T, TId> {
  protected abstract getModelClass(): new () => TModel;
  protected abstract toEntity(model: TModel): T;
  protected abstract toModel(entity: T): TModel;

  constructor(
    @inject('ConnectionManager') protected connectionManager: ConnectionManager
  ) {}

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
   * 根据ID查找实体
   */
  async findById(id: TId): Promise<T | null> {
    try {
      const repository = await this.getRepository();
      const model = await repository.findOne({ 
        where: this.buildIdWhere(id) as FindOptionsWhere<TModel>
      });
      
      if (!model) {
        return null;
      }
      
      return this.toEntity(model);
    } catch (error) {
      throw new RepositoryError(`查找实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据ID查找实体，如果不存在则抛出异常
   */
  async findByIdOrFail(id: TId): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new RepositoryError(`实体不存在，ID: ${String(id)}`);
    }
    return entity;
  }

  /**
   * 查找所有实体
   */
  async findAll(): Promise<T[]> {
    try {
      const repository = await this.getRepository();
      const models = await repository.find({
        order: { createdAt: 'DESC' } as any
      });
      
      return models.map(model => this.toEntity(model));
    } catch (error) {
      throw new RepositoryError(`查找所有实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据条件查找实体
   */
  async find(options: QueryOptions): Promise<T[]> {
    try {
      const repository = await this.getRepository();
      const findOptions = this.buildFindOptions(options);
      
      const models = await repository.find(findOptions);
      return models.map(model => this.toEntity(model));
    } catch (error) {
      throw new RepositoryError(`条件查找实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据条件查找单个实体
   */
  async findOne(options: QueryOptions): Promise<T | null> {
    const results = await this.find({ ...options, limit: 1 });
    return results[0] ?? null;
  }

  /**
   * 根据条件查找单个实体，如果不存在则抛出异常
   */
  async findOneOrFail(options: QueryOptions): Promise<T> {
    const entity = await this.findOne(options);
    if (!entity) {
      throw new RepositoryError('未找到符合条件的实体');
    }
    return entity;
  }

  /**
   * 分页查询实体
   */
  async findWithPagination(options: QueryOptions): Promise<PaginatedResult<T>> {
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
      throw new RepositoryError(`分页查询实体失败: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new RepositoryError(`保存实体失败: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new RepositoryError(`批量保存实体失败: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new RepositoryError(`删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new RepositoryError(`根据ID删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new RepositoryError(`批量删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据条件删除实体
   */
  async deleteWhere(options: QueryOptions): Promise<number> {
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
      throw new RepositoryError(`条件删除实体失败: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new RepositoryError(`检查实体存在性失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 统计实体数量
   */
  async count(options?: QueryOptions): Promise<number> {
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
      throw new RepositoryError(`统计实体数量失败: ${error instanceof Error ? error.message : String(error)}`);
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
  protected buildFindOptions(options: QueryOptions): FindManyOptions<TModel> {
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
}