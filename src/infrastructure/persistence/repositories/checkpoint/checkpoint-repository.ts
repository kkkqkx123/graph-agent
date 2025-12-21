import { injectable, inject } from 'inversify';
import { CheckpointRepository as ICheckpointRepository } from '../../../../domain/checkpoint/repositories/checkpoint-repository';
import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { ID } from '../../../../domain/common/value-objects/id';
import { ConnectionManager } from '../../connections/connection-manager';
import { CheckpointMapper } from './checkpoint-mapper';
import { CheckpointModel } from '../../models/checkpoint.model';
import { Between, MoreThan, LessThan, In } from 'typeorm';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { IQueryOptions } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { BaseRepository, QueryOptions } from '../../base/base-repository';

@injectable()
export class CheckpointRepository extends BaseRepository<Checkpoint, CheckpointModel, ID> implements ICheckpointRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager,
    @inject('CheckpointMapper') mapper: CheckpointMapper
  ) {
    super(connectionManager);
    this.mapper = mapper;
  }

  protected override getModelClass(): new () => CheckpointModel {
    return CheckpointModel;
  }

  // 基础 CRUD 方法现在由 BaseRepository 提供，无需重复实现

  async findByThreadId(threadId: ID): Promise<Checkpoint[]> {
    return this.findByField('threadId', threadId.value, {
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  async findLatestByThreadId(threadId: ID): Promise<Checkpoint | null> {
    return this.findOneByField('threadId', threadId.value, {
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  async findByTimeRange(threadId: ID, startTime: Date, endTime: Date): Promise<Checkpoint[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('checkpoint.threadId = :threadId', { threadId: threadId.value })
          .andWhere('checkpoint.createdAt BETWEEN :startTime AND :endTime', { startTime, endTime });
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  async countByThreadId(threadId: ID): Promise<number> {
    return this.count({ filters: { threadId: threadId.value } });
  }

  async countByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number> {
    return this.count({
      filters: {
        threadId: threadId.value,
        checkpointType: type.toString()
      }
    });
  }

  async deleteByThreadId(threadId: ID): Promise<number> {
    return this.deleteWhere({ filters: { threadId: threadId.value } });
  }

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
      throw new RepositoryError(`按时间删除检查点失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number> {
    return this.deleteWhere({
      filters: {
        threadId: threadId.value,
        checkpointType: type.toString()
      }
    });
  }

  async findByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<Checkpoint[]> {
    return this.find({
      filters: {
        threadId: threadId.value,
        checkpointType: type.toString()
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  async findLatestByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<Checkpoint | null> {
    return this.findOne({
      filters: {
        threadId: threadId.value,
        checkpointType: type.toString()
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  async findByTag(tag: string): Promise<Checkpoint[]> {
    return this.find({
      customConditions: (qb) => {
        qb.where("checkpoint.metadata::jsonb->'tags' @> :tag", { tag: JSON.stringify([tag]) });
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  async findByTags(tags: string[]): Promise<Checkpoint[]> {
    return this.find({
      customConditions: (qb) => {
        tags.forEach((tag, index) => {
          qb.andWhere(`checkpoint.metadata::jsonb->'tags' @> :tag${index}`, { [`tag${index}`]: JSON.stringify([tag]) });
        });
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
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