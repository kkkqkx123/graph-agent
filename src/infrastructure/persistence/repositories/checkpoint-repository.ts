import { injectable, inject } from 'inversify';
import { ICheckpointRepository } from '../../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { Checkpoint } from '../../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointStatus } from '../../../domain/threads/checkpoints/value-objects/checkpoint-status';
import { CheckpointType } from '../../../domain/threads/checkpoints/value-objects/checkpoint-type';
import { CheckpointScope } from '../../../domain/threads/checkpoints/value-objects/checkpoint-scope';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { CheckpointModel } from '../models/checkpoint.model';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';
import { In } from 'typeorm';
import { TYPES } from '../../../di/service-keys';

@injectable()
export class CheckpointRepository
  extends BaseRepository<Checkpoint, CheckpointModel, ID>
  implements ICheckpointRepository {
  constructor(@inject(TYPES.ConnectionManager) connectionManager: ConnectionManager) {
    super(connectionManager);
  }

  protected getModelClass(): new () => CheckpointModel {
    return CheckpointModel;
  }

  /**
   * 将模型转换为领域实体
   */
  protected override toDomain(model: CheckpointModel): Checkpoint {
    try {
      const props = {
        id: new ID(model.id),
        threadId: new ID(model.threadId),
        scope: CheckpointScope.fromString(model.scope || 'thread'),
        type: CheckpointType.fromString(model.type),
        status: CheckpointStatus.fromString(model.status),
        title: model.title,
        description: model.description,
        stateData: model.stateData,
        tags: model.tags || [],
        metadata: model.metadata || {},
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: model.isDeleted,
        expiresAt: model.expiresAt ? Timestamp.create(model.expiresAt) : undefined,
        sizeBytes: model.sizeBytes,
        restoreCount: model.restoreCount,
        lastRestoredAt: model.lastRestoredAt ? Timestamp.create(model.lastRestoredAt) : undefined,
      };

      return Checkpoint.fromProps(props);
    } catch (error) {
      const errorMessage = `Checkpoint模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 将领域实体转换为模型
   */
  protected override toModel(entity: Checkpoint): CheckpointModel {
    try {
      const model = new CheckpointModel();

      model.id = entity.checkpointId.value;
      model.threadId = entity.threadId.value;
      model.scope = entity.scope.toString();
      model.type = entity.type.toString();
      model.status = entity.status.value;
      model.title = entity.title;
      model.description = entity.description;
      model.stateData = entity.stateData;
      model.tags = entity.tags;
      model.metadata = entity.metadata;
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();
      model.version = entity.version.toString();
      model.isDeleted = entity.isDeleted();
      model.expiresAt = entity.expiresAt?.toDate();
      model.sizeBytes = entity.sizeBytes;
      model.restoreCount = entity.restoreCount;
      model.lastRestoredAt = entity.lastRestoredAt?.toDate();

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
   * 根据线程ID查找检查点
   */
  async findByThreadId(threadId: ID): Promise<Checkpoint[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据状态查找检查点
   */
  async findByStatus(status: CheckpointStatus): Promise<Checkpoint[]> {
    return this.find({
      filters: { status: status.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据类型查找检查点
   */
  async findByType(type: CheckpointType): Promise<Checkpoint[]> {
    return this.find({
      filters: { type: type.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 获取线程的检查点历史
   */
  async getThreadHistory(
    threadId: ID,
    limit?: number,
    offset?: number
  ): Promise<Checkpoint[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
      offset,
    });
  }

  /**
   * 获取最新的检查点
   */
  async getLatest(threadId: ID): Promise<Checkpoint | null> {
    return this.findOne({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 批量删除检查点
   */
  async batchDelete(checkpointIds: ID[]): Promise<number> {
    try {
      const repository = await this.getRepository();
      const result = await repository.delete({
        id: In(checkpointIds.map(id => id.value)),
      });
      return result.affected || 0;
    } catch (error) {
      throw new Error(
        `批量删除检查点失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}