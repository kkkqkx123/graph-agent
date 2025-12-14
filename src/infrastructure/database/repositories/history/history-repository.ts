import { injectable, inject } from 'inversify';
import { HistoryRepository as IHistoryRepository } from '../../../../domain/history/repositories/history-repository';
import { History } from '../../../../domain/history/entities/history';
import { ID } from '../../../../domain/common/value-objects/id';
import { HistoryType } from '../../../../domain/history/value-objects/history-type';
import { ConnectionManager } from '../../connections/connection-manager';
import { HistoryMapper } from './history-mapper';
import { HistoryModel } from '../../models/history.model';
import { Between, LessThan, In } from 'typeorm';

@injectable()
export class HistoryRepository implements IHistoryRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('HistoryMapper') private mapper: HistoryMapper
  ) {}

  async save(history: History): Promise<History> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const model = this.mapper.toModel(history);
    const savedModel = await repository.save(model);
    
    return this.mapper.toEntity(savedModel);
  }

  async findById(id: ID): Promise<History | null> {
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

  async delete(history: History): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    await repository.delete({ id: history.historyId.value });
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async findBySessionId(sessionId: ID): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { sessionId: sessionId.value },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByThreadId(threadId: ID): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { threadId: threadId.value },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByWorkflowId(workflowId: ID): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { workflowId: workflowId.value },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByType(type: HistoryType): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { action: type.getValue() },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByTypes(types: HistoryType[]): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const typeValues = types.map(type => type.getValue());
    const models = await repository.find({
      where: { action: In(typeValues) },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByTimeRange(startTime: Date, endTime: Date): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: {
        timestamp: Between(startTime.getTime(), endTime.getTime())
      },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatest(limit?: number): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      order: { timestamp: 'DESC' },
      take: limit || 10
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestBySessionId(sessionId: ID, limit: number = 10): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { sessionId: sessionId.value },
      order: { timestamp: 'DESC' },
      take: limit
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestByThreadId(threadId: ID, limit: number = 10): Promise<History[]> {
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

  async countBySessionId(sessionId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    return repository.count({ where: { sessionId: sessionId.value } });
  }

  async countByThreadId(threadId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    return repository.count({ where: { threadId: threadId.value } });
  }

  async countByWorkflowId(workflowId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    return repository.count({ where: { workflowId: workflowId.value } });
  }

  async countByCriteria(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    type?: HistoryType;
    startTime?: Date;
    endTime?: Date;
  }): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const where: any = {};
    
    if (options?.sessionId) {
      where.sessionId = options.sessionId.value;
    }
    if (options?.threadId) {
      where.threadId = options.threadId.value;
    }
    if (options?.workflowId) {
      where.workflowId = options.workflowId.value;
    }
    if (options?.type) {
      where.action = options.type.getValue();
    }
    if (options?.startTime && options?.endTime) {
      where.timestamp = Between(options.startTime.getTime(), options.endTime.getTime());
    }
    
    return repository.count({ where });
  }

  async countByType(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const where: any = {};
    
    if (options?.sessionId) {
      where.sessionId = options.sessionId.value;
    }
    if (options?.threadId) {
      where.threadId = options.threadId.value;
    }
    if (options?.workflowId) {
      where.workflowId = options.workflowId.value;
    }
    if (options?.startTime && options?.endTime) {
      where.timestamp = Between(options.startTime.getTime(), options.endTime.getTime());
    }
    
    const histories = await repository.find({ where });
    const byType: Record<string, number> = {};
    
    histories.forEach(history => {
      byType[history.action] = (byType[history.action] || 0) + 1;
    });
    
    return byType;
  }

  async deleteBySessionId(sessionId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const result = await repository.delete({ sessionId: sessionId.value });
    return result.affected || 0;
  }

  async deleteByThreadId(threadId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const result = await repository.delete({ threadId: threadId.value });
    return result.affected || 0;
  }

  async deleteByEntityId(entityId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const result = await repository.delete({ entityId: entityId.value });
    return result.affected || 0;
  }

  async deleteByType(type: HistoryType): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const result = await repository.delete({ action: type.getValue() });
    return result.affected || 0;
  }

  async deleteBeforeTime(beforeTime: Date): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const result = await repository.delete({
      timestamp: LessThan(beforeTime.getTime())
    });
    return result.affected || 0;
  }
}