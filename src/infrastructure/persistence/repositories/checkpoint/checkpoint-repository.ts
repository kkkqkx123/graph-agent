import { injectable, inject } from 'inversify';
import { CheckpointRepository as ICheckpointRepository } from '../../../../domain/checkpoint/repositories/checkpoint-repository';
import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { ID } from '../../../../domain/common/value-objects/id';
import { ConnectionManager } from '../../connections/connection-manager';
import { CheckpointMapper } from './checkpoint-mapper';
import { CheckpointModel } from '../../models/checkpoint.model';
import { Between, MoreThan, LessThan, In } from 'typeorm';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { QueryOptions } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { BaseRepository } from '../../base/base-repository';

@injectable()
export class CheckpointRepository extends BaseRepository<Checkpoint, CheckpointModel, ID> implements ICheckpointRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager,
    @inject('CheckpointMapper') private mapper: CheckpointMapper
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => CheckpointModel {
    return CheckpointModel;
  }

  protected toEntity(model: CheckpointModel): Checkpoint {
    return this.mapper.toEntity(model);
  }

  protected toModel(entity: Checkpoint): CheckpointModel {
    return this.mapper.toModel(entity);
  }

  override async save(checkpoint: Checkpoint): Promise<Checkpoint> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const model = this.mapper.toModel(checkpoint);
    const savedModel = await repository.save(model);

    return this.mapper.toEntity(savedModel);
  }

  override async findById(id: ID): Promise<Checkpoint | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const model = await repository.findOne({ where: { id: id.value } });
    if (!model) {
      return null;
    }

    return this.mapper.toEntity(model);
  }

  override async findByIdOrFail(id: ID): Promise<Checkpoint> {
    const checkpoint = await this.findById(id);
    if (!checkpoint) {
      throw new RepositoryError(`Checkpoint with ID ${id.value} not found`);
    }
    return checkpoint;
  }

  override async findAll(): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const models = await repository.find({
      order: { createdAt: 'DESC' }
    });

    return models.map(model => this.mapper.toEntity(model));
  }

  override async find(options: QueryOptions): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const queryBuilder = repository.createQueryBuilder('checkpoint');

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`checkpoint.${key} = :${key}`, { [key]: value });
        }
      });
    }

    if (options.sortBy) {
      const order = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(`checkpoint.${options.sortBy}`, order);
    } else {
      queryBuilder.orderBy('checkpoint.createdAt', 'DESC');
    }

    if (options.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options.limit) {
      queryBuilder.take(options.limit);
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  override async findOne(options: QueryOptions): Promise<Checkpoint | null> {
    const results = await this.find({ ...options, limit: 1 });
    return results[0] ?? null;
  }

  override async findOneOrFail(options: QueryOptions): Promise<Checkpoint> {
    const checkpoint = await this.findOne(options);
    if (!checkpoint) {
      throw new RepositoryError('Checkpoint not found with given criteria');
    }
    return checkpoint;
  }

  override async findWithPagination(options: QueryOptions): Promise<{
    items: Checkpoint[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const page = options.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1;
    const pageSize = options.limit || 10;
    const skip = (page - 1) * pageSize;

    const queryBuilder = repository.createQueryBuilder('checkpoint');

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`checkpoint.${key} = :${key}`, { [key]: value });
        }
      });
    }

    const [models, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('checkpoint.createdAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: models.map(model => this.mapper.toEntity(model)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  override async saveBatch(checkpoints: Checkpoint[]): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const models = checkpoints.map(checkpoint => this.mapper.toModel(checkpoint));
    const savedModels = await repository.save(models);

    return savedModels.map(model => this.mapper.toEntity(model));
  }

  override async delete(checkpoint: Checkpoint): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    await repository.delete({ id: checkpoint.checkpointId.value });
  }

  override async deleteById(id: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    await repository.delete({ id: id.value });
  }

  override async deleteBatch(checkpoints: Checkpoint[]): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const ids = checkpoints.map(checkpoint => checkpoint.checkpointId.value);
    await repository.delete({ id: In(ids) });
  }

  override async deleteWhere(options: QueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const queryBuilder = repository.createQueryBuilder('checkpoint').delete();

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`checkpoint.${key} = :${key}`, { [key]: value });
        }
      });
    }

    const result = await queryBuilder.execute();
    return result.affected || 0;
  }

  override async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  override async count(options?: QueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    if (!options || !options.filters) {
      return repository.count();
    }

    const queryBuilder = repository.createQueryBuilder('checkpoint');

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`checkpoint.${key} = :${key}`, { [key]: value });
        }
      });
    }

    return queryBuilder.getCount();
  }

  async findByThreadId(threadId: ID): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const models = await repository.find({
      where: { threadId: threadId.value },
      order: { createdAt: 'DESC' }
    });

    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestByThreadId(threadId: ID): Promise<Checkpoint | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const model = await repository.findOne({
      where: { threadId: threadId.value },
      order: { createdAt: 'DESC' }
    });

    if (!model) {
      return null;
    }

    return this.mapper.toEntity(model);
  }

  async findByTimeRange(threadId: ID, startTime: Date, endTime: Date): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const models = await repository.find({
      where: {
        threadId: threadId.value,
        createdAt: Between(startTime, endTime)
      },
      order: { createdAt: 'DESC' }
    });

    return models.map(model => this.mapper.toEntity(model));
  }

  async countByThreadId(threadId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    return repository.count({ where: { threadId: threadId.value } });
  }

  async countByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    return repository.count({
      where: {
        threadId: threadId.value,
        checkpointType: type.toString()
      }
    });
  }

  async deleteByThreadId(threadId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const result = await repository.delete({ threadId: threadId.value });
    return result.affected || 0;
  }

  async deleteByThreadIdBeforeTime(threadId: ID, beforeTime: Date): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const result = await repository.delete({
      threadId: threadId.value,
      createdAt: LessThan(beforeTime)
    });
    return result.affected || 0;
  }

  async deleteByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const result = await repository.delete({
      threadId: threadId.value,
      checkpointType: type.toString()
    });
    return result.affected || 0;
  }

  async findByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const models = await repository.find({
      where: {
        threadId: threadId.value,
        checkpointType: type.toString()
      },
      order: { createdAt: 'DESC' }
    });

    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<Checkpoint | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    const model = await repository.findOne({
      where: {
        threadId: threadId.value,
        checkpointType: type.toString()
      },
      order: { createdAt: 'DESC' }
    });

    if (!model) {
      return null;
    }

    return this.mapper.toEntity(model);
  }

  async findByTag(tag: string): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    // 由于 CheckpointModel 没有 tags 字段，我们需要在 metadata 中查找
    const models = await repository
      .createQueryBuilder('checkpoint')
      .where("checkpoint.metadata::jsonb->'tags' @> :tag", { tag: JSON.stringify([tag]) })
      .orderBy('checkpoint.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.mapper.toEntity(model));
  }

  async findByTags(tags: string[]): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);

    // 由于 CheckpointModel 没有 tags 字段，我们需要在 metadata 中查找
    const queryBuilder = repository.createQueryBuilder('checkpoint');

    tags.forEach((tag, index) => {
      queryBuilder.andWhere(`checkpoint.metadata::jsonb->'tags' @> :tag${index}`, { [`tag${index}`]: JSON.stringify([tag]) });
    });

    const models = await queryBuilder
      .orderBy('checkpoint.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.mapper.toEntity(model));
  }

  async getCheckpointHistory(threadId: ID, limit?: number, offset?: number): Promise<Checkpoint[]> {
    return this.findByThreadId(threadId); // 使用现有的方法
  }

  async getCheckpointStatistics(threadId: ID): Promise<{
    total: number;
    byType: Record<string, number>;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
    return this.findByThreadId(threadId).then(checkpoints => {
      const byType: Record<string, number> = {};
      let latestAt: Date | undefined;
      let oldestAt: Date | undefined;

      checkpoints.forEach(checkpoint => {
        const type = checkpoint.type.getValue();
        byType[type] = (byType[type] || 0) + 1;

        const createdAt = checkpoint.createdAt.getDate();
        if (!latestAt || createdAt > latestAt) {
          latestAt = createdAt;
        }
        if (!oldestAt || createdAt < oldestAt) {
          oldestAt = createdAt;
        }
      });

      return {
        total: checkpoints.length,
        byType,
        latestAt,
        oldestAt
      };
    });
  }
}