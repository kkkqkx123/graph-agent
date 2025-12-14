import { injectable, inject } from 'inversify';
import { HistoryRepository as IHistoryRepository } from '../../../../domain/history/repositories/history-repository';
import { History } from '../../../../domain/history/entities/history';
import { HistoryId } from '../../../../domain/history/value-objects/history-id';
import { SessionId } from '../../../../domain/session/value-objects/session-id';
import { ThreadId } from '../../../../domain/thread/value-objects/thread-id';
import { ConnectionManager } from '../../connections/connection-manager';
import { HistoryMapper } from './history-mapper';
import { HistoryModel } from '../../models/history.model';

@injectable()
export class HistoryRepository implements IHistoryRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('HistoryMapper') private mapper: HistoryMapper
  ) {}

  async save(history: History): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const model = this.mapper.toModel(history);
    await repository.save(model);
  }

  async findById(id: HistoryId): Promise<History | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const model = await repository.findOne({ where: { id: id.value } });
    if (!model) {
      return null;
    }
    
    return this.mapper.toEntity(model);
  }

  async findAll(): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async delete(id: HistoryId): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    await repository.delete({ id: id.value });
  }

  async exists(id: HistoryId): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async findBySessionId(sessionId: SessionId): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { sessionId: sessionId.value },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByThreadId(threadId: ThreadId): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { threadId: threadId.value },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findBySessionIdAndThreadId(sessionId: SessionId, threadId: ThreadId): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { 
        sessionId: sessionId.value,
        threadId: threadId.value 
      },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByType(type: string): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { type },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: {
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestBySessionId(sessionId: SessionId, limit: number = 10): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { sessionId: sessionId.value },
      order: { timestamp: 'DESC' },
      take: limit
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestByThreadId(threadId: ThreadId, limit: number = 10): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { threadId: threadId.value },
      order: { timestamp: 'DESC' },
      take: limit
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async count(): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    return repository.count();
  }

  async countBySessionId(sessionId: SessionId): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    return repository.count({ where: { sessionId: sessionId.value } });
  }

  async countByThreadId(threadId: ThreadId): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    return repository.count({ where: { threadId: threadId.value } });
  }

  async deleteBySessionId(sessionId: SessionId): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    await repository.delete({ sessionId: sessionId.value });
  }

  async deleteByThreadId(threadId: ThreadId): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    await repository.delete({ threadId: threadId.value });
  }

  async deleteOlderThan(date: Date): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    await repository.delete({
      timestamp: {
        $lt: date
      }
    });
  }
}