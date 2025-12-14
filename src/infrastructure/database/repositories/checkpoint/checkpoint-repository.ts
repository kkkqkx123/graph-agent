import { injectable, inject } from 'inversify';
import { CheckpointRepository as ICheckpointRepository } from '../../../../domain/checkpoint/repositories/checkpoint-repository';
import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { CheckpointId } from '../../../../domain/checkpoint/value-objects/checkpoint-id';
import { SessionId } from '../../../../domain/session/value-objects/session-id';
import { ThreadId } from '../../../../domain/thread/value-objects/thread-id';
import { ConnectionManager } from '../../connections/connection-manager';
import { CheckpointMapper } from './checkpoint-mapper';
import { CheckpointModel } from '../../models/checkpoint.model';

@injectable()
export class CheckpointRepository implements ICheckpointRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('CheckpointMapper') private mapper: CheckpointMapper
  ) {}

  async save(checkpoint: Checkpoint): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const model = this.mapper.toModel(checkpoint);
    await repository.save(model);
  }

  async findById(id: CheckpointId): Promise<Checkpoint | null> {
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

  async delete(id: CheckpointId): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    await repository.delete({ id: id.value });
  }

  async exists(id: CheckpointId): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async findBySessionId(sessionId: SessionId): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      where: { sessionId: sessionId.value },
      order: { createdAt: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByThreadId(threadId: ThreadId): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      where: { threadId: threadId.value },
      order: { createdAt: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findBySessionIdAndThreadId(sessionId: SessionId, threadId: ThreadId): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      where: { 
        sessionId: sessionId.value,
        threadId: threadId.value 
      },
      order: { createdAt: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestBySessionId(sessionId: SessionId): Promise<Checkpoint | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const model = await repository.findOne({
      where: { sessionId: sessionId.value },
      order: { createdAt: 'DESC' }
    });
    
    if (!model) {
      return null;
    }
    
    return this.mapper.toEntity(model);
  }

  async findLatestByThreadId(threadId: ThreadId): Promise<Checkpoint | null> {
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

  async findByType(type: string): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      where: { type },
      order: { createdAt: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
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

  async countBySessionId(sessionId: SessionId): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    return repository.count({ where: { sessionId: sessionId.value } });
  }

  async countByThreadId(threadId: ThreadId): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    return repository.count({ where: { threadId: threadId.value } });
  }

  async deleteBySessionId(sessionId: SessionId): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    await repository.delete({ sessionId: sessionId.value });
  }

  async deleteByThreadId(threadId: ThreadId): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    await repository.delete({ threadId: threadId.value });
  }

  async deleteOlderThan(date: Date): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    await repository.delete({
      createdAt: {
        $lt: date
      }
    });
  }

  async findWithPagination(offset: number, limit: number): Promise<Checkpoint[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(CheckpointModel);
    
    const models = await repository.find({
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }
}