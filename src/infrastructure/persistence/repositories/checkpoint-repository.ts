import { injectable, inject } from 'inversify';
import { ICheckpointRepository } from '../../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { Checkpoint } from '../../../domain/threads/checkpoints/entities/checkpoint';
import { ID } from '../../../domain/common/value-objects/id';
import { CheckpointStatus } from '../../../domain/threads/checkpoints/value-objects/checkpoint-status';
import { CheckpointType } from '../../../domain/threads/checkpoints/value-objects/checkpoint-type';
import { CheckpointModel } from '../models/checkpoint.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';
import { TYPES } from '../../../di/service-keys';
import { CheckpointMapper } from '../mappers/checkpoint-mapper';

@injectable()
export class CheckpointRepository
  extends BaseRepository<Checkpoint, CheckpointModel, ID>
  implements ICheckpointRepository {
  private mapper: CheckpointMapper;

  constructor(@inject(TYPES.ConnectionManager) connectionManager: ConnectionManager) {
    super(connectionManager);
    this.mapper = new CheckpointMapper();
  }

  protected getModelClass(): new () => CheckpointModel {
    return CheckpointModel;
  }

  /**
   * 使用Mapper将数据库模型转换为领域实体
   */
  protected override toDomain(model: CheckpointModel): Checkpoint {
    return this.mapper.toDomain(model);
  }

  /**
   * 使用Mapper将领域实体转换为数据库模型
   */
  protected override toModel(entity: Checkpoint): CheckpointModel {
    return this.mapper.toModel(entity);
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