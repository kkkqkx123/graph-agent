import { injectable, inject } from 'inversify';
import { CheckpointRepository as ICheckpointRepository } from '../../../domain/checkpoint/repositories/checkpoint-repository';
import { Checkpoint } from '../../../domain/checkpoint/entities/checkpoint';
import { ID } from '../../../domain/common/value-objects/id';
import { CheckpointType } from '../../../domain/checkpoint/value-objects/checkpoint-type';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { CheckpointModel } from '../models/checkpoint.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class CheckpointRepository extends BaseRepository<Checkpoint, CheckpointModel, ID> implements ICheckpointRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => CheckpointModel {
    return CheckpointModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: CheckpointModel): Checkpoint {
    try {
      const checkpointData = {
        id: new ID(model.id),
        threadId: model.threadId ? new ID(model.threadId) : ID.generate(),
        type: CheckpointType.fromString(model.checkpointType),
        stateData: model.state || {},
        tags: model.metadata?.tags || [],
        metadata: model.metadata || {},
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: false
      };

      return Checkpoint.fromProps(checkpointData);
    } catch (error) {
      const errorMessage = `Checkpoint模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: Checkpoint): CheckpointModel {
    try {
      const model = new CheckpointModel();

      model.id = entity.checkpointId.value;
      model.threadId = entity.threadId ? entity.threadId.value : undefined;
      model.checkpointType = entity.type.getValue();
      model.state = entity.stateData;
      model.metadata = entity.metadata;
      model.createdAt = entity.createdAt.getDate();
      model.updatedAt = entity.updatedAt.getDate();
      model.version = entity.version.getValue();

      return model;
    } catch (error) {
      const errorMessage = `Checkpoint实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.checkpointId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 查找线程的检查点
   */
  async findByThreadId(threadId: ID): Promise<Checkpoint[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找线程的最新检查点
   */
  async findLatestByThreadId(threadId: ID): Promise<Checkpoint | null> {
    return this.findOne({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找指定时间范围内的检查点
   */
  async findByTimeRange(threadId: ID, startTime: Date, endTime: Date): Promise<Checkpoint[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('checkpoint')
      .where('checkpoint.threadId = :threadId', { threadId: threadId.value })
      .andWhere('checkpoint.createdAt BETWEEN :startTime AND :endTime', { startTime, endTime })
      .orderBy('checkpoint.createdAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 统计线程的检查点数量
   */
  async countByThreadId(threadId: ID): Promise<number> {
    return this.count({ filters: { threadId: threadId.value } });
  }

  /**
   * 统计线程指定类型的检查点数量
   */
  async countByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number> {
    return this.count({
      filters: {
        threadId: threadId.value,
        checkpointType: type.getValue()
      }
    });
  }

  /**
   * 删除线程的所有检查点
   */
  async deleteByThreadId(threadId: ID): Promise<number> {
    return this.deleteWhere({ filters: { threadId: threadId.value } });
  }

  /**
   * 删除线程在指定时间之前的检查点
   */
  async deleteByThreadIdBeforeTime(threadId: ID, beforeTime: Date): Promise<number> {
    try {
      const repository = await this.getRepository();
      const result = await repository
        .createQueryBuilder('checkpoint')
        .delete()
        .where('checkpoint.threadId = :threadId', { threadId: threadId.value })
        .andWhere('checkpoint.createdAt < :beforeTime', { beforeTime })
        .execute();

      return result.affected || 0;
    } catch (error) {
      throw new Error(`按时间删除检查点失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 删除线程指定类型的检查点
   */
  async deleteByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number> {
    return this.deleteWhere({
      filters: {
        threadId: threadId.value,
        checkpointType: type.getValue()
      }
    });
  }

  /**
   * 查找线程指定类型的检查点
   */
  async findByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<Checkpoint[]> {
    return this.find({
      filters: {
        threadId: threadId.value,
        checkpointType: type.getValue()
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找线程指定类型的最新检查点
   */
  async findLatestByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<Checkpoint | null> {
    return this.findOne({
      filters: {
        threadId: threadId.value,
        checkpointType: type.getValue()
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 按标签查找检查点
   */
  async findByTag(tag: string): Promise<Checkpoint[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('checkpoint')
      .where("checkpoint.metadata::jsonb->'tags' @> :tag", { tag: JSON.stringify([tag]) })
      .orderBy('checkpoint.createdAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 按多个标签查找检查点
   */
  async findByTags(tags: string[]): Promise<Checkpoint[]> {
    const repository = await this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('checkpoint')
      .orderBy('checkpoint.createdAt', 'DESC');

    tags.forEach((tag, index) => {
      queryBuilder.andWhere(`checkpoint.metadata::jsonb->'tags' @> :tag${index}`, { [`tag${index}`]: JSON.stringify([tag]) });
    });

    const models = await queryBuilder.getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 获取检查点历史
   */
  async getCheckpointHistory(threadId: ID, limit?: number, offset?: number): Promise<Checkpoint[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
      offset
    });
  }

  /**
   * 获取检查点统计信息
   */
  async getCheckpointStatistics(threadId: ID): Promise<{
    total: number;
    byType: Record<string, number>;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
    const checkpoints = await this.findByThreadId(threadId);
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
  }
}