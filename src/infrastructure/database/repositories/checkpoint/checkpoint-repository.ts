import { injectable, inject } from 'inversify';
import { CheckpointRepository as ICheckpointRepository } from '../../../../domain/checkpoint/repositories/checkpoint-repository';
import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { ID } from '../../../../domain/common/value-objects/id';
import { ConnectionManager } from '../../connections/connection-manager';
import { CheckpointMapper } from './checkpoint-mapper';
import { CheckpointModel } from '../../models/checkpoint.model';
import { Between, MoreThan, LessThan, In, ArrayContains, ArrayOverlap } from 'typeorm';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';

@injectable()
export class CheckpointRepository implements ICheckpointRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('CheckpointMapper') private mapper: CheckpointMapper
  ) {}

  async save(checkpoint: Checkpoint): Promise<Checkpoint> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const model = this.mapper.toModel(checkpoint);
    const savedModel = await repository.save(model);
    
    return this.mapper.toEntity(savedModel);
  }

  async findById(id: ID): Promise<Checkpoint | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const model = await repository.findOne({ where: { id: id.value } });
    if (!model) {
      return null;
    }
    
    return this.mapper.toEntity(model);
  }

  async findAll(): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      order: { createdAt: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async delete(checkpoint: Checkpoint): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    await repository.delete({ id: checkpoint.checkpointId.value });
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
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

  async count(): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    return repository.count();
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

  async getCheckpointHistory(threadId: ID, limit?: number, offset?: number): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      where: { threadId: threadId.value },
      order: { createdAt: 'DESC' },
      skip: offset || 0,
      take: limit || 10
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async getCheckpointStatistics(threadId: ID): Promise<{
    total: number;
    byType: Record<string, number>;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const checkpoints = await repository.find({
      where: { threadId: threadId.value },
      order: { createdAt: 'DESC' }
    });
    
    const byType: Record<string, number> = {};
    let latestAt: Date | undefined;
    let oldestAt: Date | undefined;
    
    checkpoints.forEach(checkpoint => {
      // 统计类型
      byType[checkpoint.checkpointType] = (byType[checkpoint.checkpointType] || 0) + 1;
      
      // 更新最新和最旧时间
      if (!latestAt || checkpoint.createdAt > latestAt) {
        latestAt = checkpoint.createdAt;
      }
      if (!oldestAt || checkpoint.createdAt < oldestAt) {
        oldestAt = checkpoint.createdAt;
      }
    });
    
    return {
      total: checkpoints.length,
      byType,
      latestAt,
      oldestAt
    };
  }

  // 实现缺失的方法
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
    
    const models = await repository.find({
      where: { tags: ArrayContains([tag]) },
      order: { createdAt: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByTags(tags: string[]): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      where: { tags: ArrayOverlap(tags) },
      order: { createdAt: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
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