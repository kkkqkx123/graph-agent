import { injectable, inject } from 'inversify';
import { CheckpointRepository as ICheckpointRepository } from '../../../../domain/checkpoint/repositories/checkpoint-repository';
import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { ID } from '../../../../domain/common/value-objects/id';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { CheckpointModel } from '../../models/checkpoint.model';
import { Between, MoreThan, LessThan, In } from 'typeorm';
import { IQueryOptions } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { BaseRepository, QueryOptions } from '../../base/base-repository';
import { ConnectionManager } from '../../connections/connection-manager';
import {
  IdConverter,
  TimestampConverter,
  VersionConverter,
  MetadataConverter
} from '../../base/type-converter-base';

/**
 * 基于类型转换器的Checkpoint Repository
 * 
 * 直接使用类型转换器进行数据映射，消除传统的mapper层
 * 提供编译时类型安全和运行时验证
 */
@injectable()
export class CheckpointConverterRepository extends BaseRepository<Checkpoint, CheckpointModel, ID> implements ICheckpointRepository {
  
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
      throw new RepositoryError(
        `Checkpoint模型转换失败: ${error instanceof Error ? error.message : String(error)}`,
        'MAPPING_ERROR',
        { modelId: model.id, operation: 'toEntity' }
      );
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
      throw new RepositoryError(
        `Checkpoint实体转换失败: ${error instanceof Error ? error.message : String(error)}`,
        'MAPPING_ERROR',
        { entityId: entity.checkpointId.value, operation: 'toModel' }
      );
    }
  }

  /**
   * 根据线程ID查找检查点
   */
  async findByThreadId(threadId: ID): Promise<Checkpoint[]> {
    return this.findByField('threadId', threadId.value, {
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找线程的最新检查点
   */
  async findLatestByThreadId(threadId: ID): Promise<Checkpoint | null> {
    return this.findOneByField('threadId', threadId.value, {
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 根据时间范围查找检查点
   */
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

  /**
   * 统计线程中的检查点数量
   */
  async countByThreadId(threadId: ID): Promise<number> {
    return this.count({ filters: { threadId: threadId.value } });
  }

  /**
   * 统计线程中指定类型的检查点数量
   */
  async countByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number> {
    return this.count({
      filters: {
        threadId: threadId.value,
        checkpointType: type.toString()
      }
    });
  }

  /**
   * 删除线程中的所有检查点
   */
  async deleteByThreadId(threadId: ID): Promise<number> {
    return this.deleteWhere({ filters: { threadId: threadId.value } });
  }

  /**
   * 删除线程中指定时间之前的检查点
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
      throw new RepositoryError(`按时间删除检查点失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 删除线程中指定类型的检查点
   */
  async deleteByThreadIdAndType(threadId: ID, type: CheckpointType): Promise<number> {
    return this.deleteWhere({
      filters: {
        threadId: threadId.value,
        checkpointType: type.toString()
      }
    });
  }

  /**
   * 根据线程ID和类型查找检查点
   */
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

  /**
   * 查找线程中指定类型的最新检查点
   */
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

  /**
   * 根据标签查找检查点
   */
  async findByTag(tag: string): Promise<Checkpoint[]> {
    return this.find({
      customConditions: (qb) => {
        qb.where("checkpoint.metadata::jsonb->'tags' @> :tag", { tag: JSON.stringify([tag]) });
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 根据多个标签查找检查点
   */
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

  /**
   * 获取检查点历史记录
   */
  async getCheckpointHistory(threadId: ID, limit?: number, offset?: number): Promise<Checkpoint[]> {
    return this.findByThreadId(threadId); // 使用现有的方法
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

/**
 * 检查点类型类型转换器
 * 将字符串类型转换为CheckpointType值对象
 */
export interface CheckpointTypeConverter {
  fromStorage: (value: string) => CheckpointType;
  toStorage: (value: CheckpointType) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: CheckpointType) => boolean;
}

export const CheckpointTypeConverter: CheckpointTypeConverter = {
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