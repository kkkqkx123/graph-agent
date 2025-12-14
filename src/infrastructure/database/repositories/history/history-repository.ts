import { injectable, inject } from 'inversify';
import { HistoryRepository as IHistoryRepository } from '../../../../domain/history/repositories/history-repository';
import { History } from '../../../../domain/history/entities/history';
import { ID } from '../../../../domain/common/value-objects/id';
import { HistoryType } from '../../../../domain/history/value-objects/history-type';
import { ConnectionManager } from '../../connections/connection-manager';
import { HistoryMapper } from './history-mapper';
import { HistoryModel } from '../../models/history.model';
import { Between, LessThan, In } from 'typeorm';
import { QueryOptions } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';

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

  async findByIdOrFail(id: ID): Promise<History> {
    const history = await this.findById(id);
    if (!history) {
      throw new RepositoryError(`History with ID ${id.value} not found`);
    }
    return history;
  }

  async findAll(): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async find(options: QueryOptions): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const queryBuilder = repository.createQueryBuilder('history');
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`history.${key} = :${key}`, { [key]: value });
        }
      });
    }
    
    if (options.sortBy) {
      const order = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(`history.${options.sortBy}`, order);
    } else {
      queryBuilder.orderBy('history.timestamp', 'DESC');
    }
    
    if (options.offset) {
      queryBuilder.skip(options.offset);
    }
    
    if (options.limit) {
      queryBuilder.take(options.limit);
    }
    
    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findOne(options: QueryOptions): Promise<History | null> {
    const results = await this.find({ ...options, limit: 1 });
    return results[0] ?? null;
  }

  async findOneOrFail(options: QueryOptions): Promise<History> {
    const history = await this.findOne(options);
    if (!history) {
      throw new RepositoryError('History not found with given criteria');
    }
    return history;
  }

  async findWithPagination(options: QueryOptions): Promise<{
    items: History[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const page = options.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1;
    const pageSize = options.limit || 10;
    const skip = (page - 1) * pageSize;
    
    const queryBuilder = repository.createQueryBuilder('history');
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`history.${key} = :${key}`, { [key]: value });
        }
      });
    }
    
    const [models, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('history.timestamp', 'DESC')
      .getManyAndCount();
    
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      items: models.map(model => this.mapper.toEntity(model)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async saveBatch(histories: History[]): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = histories.map(history => this.mapper.toModel(history));
    const savedModels = await repository.save(models);
    
    return savedModels.map(model => this.mapper.toEntity(model));
  }

  async delete(history: History): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    await repository.delete({ id: history.historyId.value });
  }

  async deleteById(id: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    await repository.delete({ id: id.value });
  }

  async deleteBatch(histories: History[]): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const ids = histories.map(history => history.historyId.value);
    await repository.delete({ id: In(ids) });
  }

  async deleteWhere(options: QueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const queryBuilder = repository.createQueryBuilder('history').delete();
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`history.${key} = :${key}`, { [key]: value });
        }
      });
    }
    
    const result = await queryBuilder.execute();
    return result.affected || 0;
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async count(options?: QueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    if (!options || !options.filters) {
      return repository.count();
    }
    
    const queryBuilder = repository.createQueryBuilder('history');
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`history.${key} = :${key}`, { [key]: value });
        }
      });
    }
    
    return queryBuilder.getCount();
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

  // 实现缺失的方法
  async findByEntityIdAndType(entityId: ID, type: HistoryType): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: {
        entityId: entityId.value,
        action: type.getValue()
      },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByEntityIdAndTimeRange(entityId: ID, startTime: Date, endTime: Date): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: {
        entityId: entityId.value,
        timestamp: Between(startTime.getTime(), endTime.getTime())
      },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByTypeAndTimeRange(type: HistoryType, startTime: Date, endTime: Date): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: {
        action: type.getValue(),
        timestamp: Between(startTime.getTime(), endTime.getTime())
      },
      order: { timestamp: 'DESC' }
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestByEntityId(entityId: ID, limit?: number): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { entityId: entityId.value },
      order: { timestamp: 'DESC' },
      take: limit || 10
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findLatestByType(type: HistoryType, limit?: number): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const models = await repository.find({
      where: { action: type.getValue() },
      order: { timestamp: 'DESC' },
      take: limit || 10
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async getStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    total: number;
    byType: Record<string, number>;
    byEntity: Record<string, number>;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
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
    const byEntity: Record<string, number> = {};
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let latestAt: Date | undefined;
    let oldestAt: Date | undefined;
    
    histories.forEach(history => {
      // 按类型统计
      byType[history.action] = (byType[history.action] || 0) + 1;
      
      // 按实体统计
      byEntity[history.entityId] = (byEntity[history.entityId] || 0) + 1;
      
      // 按级别统计（需要根据类型判断级别）
      if (history.action.includes('error')) {
        errorCount++;
      } else if (history.action.includes('warning')) {
        warningCount++;
      } else {
        infoCount++;
      }
      
      // 时间统计
      const historyDate = new Date(history.timestamp || 0);
      if (!latestAt || historyDate > latestAt) {
        latestAt = historyDate;
      }
      if (!oldestAt || historyDate < oldestAt) {
        oldestAt = historyDate;
      }
    });
    
    return {
      total: histories.length,
      byType,
      byEntity,
      errorCount,
      warningCount,
      infoCount,
      latestAt,
      oldestAt
    };
  }

  async cleanupExpired(retentionDays: number): Promise<number> {
    const beforeTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    return this.deleteBeforeTime(beforeTime);
  }

  async archiveBeforeTime(beforeTime: Date): Promise<number> {
    // 这里可以实现归档逻辑，暂时直接删除
    return this.deleteBeforeTime(beforeTime);
  }

  async getTrend(
    startTime: Date,
    endTime: Date,
    interval: number
  ): Promise<Array<{
    timestamp: Date;
    count: number;
    byType: Record<string, number>;
  }>> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const histories = await repository.find({
      where: {
        timestamp: Between(startTime.getTime(), endTime.getTime())
      },
      order: { timestamp: 'ASC' }
    });
    
    const trend: Array<{
      timestamp: Date;
      count: number;
      byType: Record<string, number>;
    }> = [];
    
    const intervalMs = interval * 60 * 1000; // 转换为毫秒
    let currentTime = new Date(startTime);
    
    while (currentTime <= endTime) {
      const nextTime = new Date(currentTime.getTime() + intervalMs);
      const intervalHistories = histories.filter(h =>
        (h.timestamp || 0) >= currentTime.getTime() && (h.timestamp || 0) < nextTime.getTime()
      );
      
      const byType: Record<string, number> = {};
      intervalHistories.forEach(history => {
        byType[history.action] = (byType[history.action] || 0) + 1;
      });
      
      trend.push({
        timestamp: new Date(currentTime),
        count: intervalHistories.length,
        byType
      });
      
      currentTime = nextTime;
    }
    
    return trend;
  }

  async search(
    query: string,
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      type?: HistoryType;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(HistoryModel);
    
    const queryBuilder = repository.createQueryBuilder('history');
    
    // 搜索逻辑：在 description 和 details 字段中搜索
    queryBuilder.where(
      '(history.description ILIKE :query OR history.details::text ILIKE :query)',
      { query: `%${query}%` }
    );
    
    if (options?.sessionId) {
      queryBuilder.andWhere('history.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder.andWhere('history.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder.andWhere('history.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.type) {
      queryBuilder.andWhere('history.action = :action', { action: options.type.getValue() });
    }
    if (options?.startTime && options?.endTime) {
      queryBuilder.andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
        startTime: options.startTime.getTime(),
        endTime: options.endTime.getTime()
      });
    }
    
    queryBuilder.orderBy('history.timestamp', 'DESC');
    
    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }
    
    if (options?.limit) {
      queryBuilder.take(options.limit);
    }
    
    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }
}