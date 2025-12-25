import { injectable, inject } from 'inversify';
import { CheckpointRepository as ICheckpointRepository } from '../../../../domain/checkpoint/repositories/checkpoint-repository';
import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { ID } from '../../../../domain/common/value-objects/id';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { CheckpointModel } from '../../models/checkpoint.model';
import { Between, MoreThan, LessThan, In } from 'typeorm';
import { IQueryOptions } from '../../../../domain/common/repositories/repository';
import { BaseRepository, QueryOptions } from '../../base/base-repository';
import { ConnectionManager } from '../../connections/connection-manager';
import {
  IdConverter,
  TimestampConverter,
  VersionConverter,
  MetadataConverter
} from '../../base/type-converter-base';

/**
 * 检查点类型类型转换器
 * 将字符串类型转换为CheckpointType值对象
 */
interface CheckpointTypeConverter {
  fromStorage: (value: string) => CheckpointType;
  toStorage: (value: CheckpointType) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: CheckpointType) => boolean;
}

const CheckpointTypeConverter: CheckpointTypeConverter = {
  fromStorage: (value: string) => {
    return CheckpointType.fromString(value);
  },
  toStorage: (value: CheckpointType) => value.getValue(),
  validateStorage: (value: string) => {
    const validTypes = ['auto', 'manual', 'error', 'milestone'];
    return typeof value === 'string' && validTypes.includes(value);
  },
  validateDomain: (value: CheckpointType) => {
    return value instanceof CheckpointType;
  }
};

@injectable()
export class CheckpointRepository extends BaseRepository<Checkpoint, CheckpointModel, ID> implements ICheckpointRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected override getModelClass(): new () => CheckpointModel {
    return CheckpointModel;
  }

  /**
   * 重写toEntity方法，使用类型转换器
   */
  protected override toEntity(model: CheckpointModel): Checkpoint {
    try {
      // 使用类型转换器进行编译时类型安全的转换
      const checkpointData = {
        id: IdConverter.fromStorage(model.id),
        threadId: model.threadId ? IdConverter.fromStorage(model.threadId) : ID.generate(), // 临时解决方案，实际应该确保threadId不为空
        type: CheckpointTypeConverter.fromStorage(model.checkpointType),
        stateData: model.state || {},
        tags: model.metadata?.tags || [],
        metadata: MetadataConverter.fromStorage(model.metadata || {}),
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.version),
        isDeleted: false
      };

      // 创建Checkpoint实体
      return Checkpoint.fromProps(checkpointData);
    } catch (error) {
      const errorMessage = `Checkpoint模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toEntity' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法，使用类型转换器
   */
  protected override toModel(entity: Checkpoint): CheckpointModel {
    try {
      const model = new CheckpointModel();
      
      // 使用类型转换器进行编译时类型安全的转换
      model.id = IdConverter.toStorage(entity.checkpointId);
      model.threadId = entity.threadId ? IdConverter.toStorage(entity.threadId) : undefined;
      model.checkpointType = CheckpointTypeConverter.toStorage(entity.type);
      model.state = entity.stateData;
      model.metadata = MetadataConverter.toStorage(entity.metadata);
      model.createdAt = TimestampConverter.toStorage(entity.createdAt);
      model.updatedAt = TimestampConverter.toStorage(entity.updatedAt);
      model.version = VersionConverter.toStorage(entity.version);
      
      return model;
    } catch (error) {
      const errorMessage = `Checkpoint实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.checkpointId.value, operation: 'toModel' };
      throw customError;
    }
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
      throw new Error(`按时间删除检查点失败: ${error instanceof Error ? error.message : String(error)}`);
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