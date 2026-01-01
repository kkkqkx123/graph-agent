import { injectable, inject } from 'inversify';
import { IHistoryRepository } from '../../../domain/history/repositories/history-repository';
import { History } from '../../../domain/history/entities/history';
import { ID } from '../../../domain/common/value-objects/id';
import { HistoryType } from '../../../domain/history/value-objects/history-type';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { HistoryModel } from '../models/history.model';
import { In, Between } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class HistoryRepository extends BaseRepository<History, HistoryModel, ID> implements IHistoryRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => HistoryModel {
    return HistoryModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: HistoryModel): History {
    try {
      const historyData = {
        id: new ID(model.id),
        sessionId: model.sessionId ? new ID(model.sessionId) : undefined,
        threadId: model.threadId ? new ID(model.threadId) : undefined,
        workflowId: model.workflowId ? new ID(model.workflowId) : undefined,
        type: HistoryType.fromString(model.action),
        title: model.data?.title as string || undefined,
        description: model.data?.description as string || undefined,
        details: model.data || {},
        metadata: model.metadata || {},
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: false
      };

      return History.fromProps(historyData);
    } catch (error) {
      const errorMessage = `History模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: History): HistoryModel {
    try {
      const model = new HistoryModel();

      model.id = entity.historyId.value;
      model.entityType = 'history';
      model.entityId = (entity.metadata as any)['entityId'] || entity.historyId.value;
      model.action = entity.type.getValue();
      model.data = {
        title: entity.title,
        description: entity.description,
        ...entity.details
      };
      model.previousData = (entity.metadata as any)['previousData'];
      model.metadata = entity.metadata;
      model.userId = (entity.metadata as any)['userId'];
      model.sessionId = entity.sessionId?.value;
      model.threadId = entity.threadId?.value;
      model.workflowId = entity.workflowId?.value;
      model.nodeId = (entity.metadata as any)['nodeId'];
      model.edgeId = (entity.metadata as any)['edgeId'];
      model.timestamp = entity.createdAt.getMilliseconds();
      model.createdAt = entity.createdAt.getDate();
      model.updatedAt = entity.updatedAt.getDate();
      model.version = entity.version.getValue();

      return model;
    } catch (error) {
      const errorMessage = `History实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.historyId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 查找会话的历史记录
   */
  async findBySessionId(sessionId: ID): Promise<History[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找线程的历史记录
   */
  async findByThreadId(threadId: ID): Promise<History[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找工作流的历史记录
   */
  async findByWorkflowId(workflowId: ID): Promise<History[]> {
    return this.find({
      filters: { workflowId: workflowId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找指定类型的历史记录
   */
  async findByType(type: HistoryType): Promise<History[]> {
    return this.find({
      filters: { action: type.getValue() },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找指定类型的历史记录（多个类型）
   */
  async findByTypes(types: HistoryType[]): Promise<History[]> {
    const repository = await this.getRepository();
    const typeValues = types.map(type => type.getValue());
    const models = await repository
      .createQueryBuilder('history')
      .where('history.action IN (:...typeValues)', { typeValues })
      .orderBy('history.timestamp', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找指定时间范围内的历史记录
   */
  async findByTimeRange(startTime: Date, endTime: Date): Promise<History[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('history')
      .where('history.timestamp BETWEEN :startTime AND :endTime', {
        startTime: startTime.getTime(),
        endTime: endTime.getTime()
      })
      .orderBy('history.timestamp', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找最新的历史记录
   */
  async findLatest(limit?: number): Promise<History[]> {
    return this.find({
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: limit || 10
    });
  }

  /**
   * 查找会话的最新历史记录
   */
  async findLatestBySessionId(sessionId: ID, limit: number = 10): Promise<History[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit
    });
  }

  /**
   * 查找线程的最新历史记录
   */
  async findLatestByThreadId(threadId: ID, limit: number = 10): Promise<History[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit
    });
  }

  /**
   * 统计会话的历史记录数量
   */
  async countBySessionId(sessionId: ID): Promise<number> {
    return this.count({ filters: { sessionId: sessionId.value } });
  }

  /**
   * 统计线程的历史记录数量
   */
  async countByThreadId(threadId: ID): Promise<number> {
    return this.count({ filters: { threadId: threadId.value } });
  }

  /**
   * 统计工作流的历史记录数量
   */
  async countByWorkflowId(workflowId: ID): Promise<number> {
    return this.count({ filters: { workflowId: workflowId.value } });
  }

  /**
   * 删除会话的所有历史记录
   */
  async deleteBySessionId(sessionId: ID): Promise<number> {
    return this.deleteWhere({ filters: { sessionId: sessionId.value } });
  }

  /**
   * 删除线程的所有历史记录
   */
  async deleteByThreadId(threadId: ID): Promise<number> {
    return this.deleteWhere({ filters: { threadId: threadId.value } });
  }

  /**
   * 删除实体的所有历史记录
   */
  async deleteByEntityId(entityId: ID): Promise<number> {
    return this.deleteWhere({ filters: { entityId: entityId.value } });
  }

  /**
   * 删除指定类型的历史记录
   */
  async deleteByType(type: HistoryType): Promise<number> {
    return this.deleteWhere({ filters: { action: type.getValue() } });
  }

  /**
   * 删除指定时间之前的历史记录
   */
  async deleteBeforeTime(beforeTime: Date): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository
      .createQueryBuilder('history')
      .delete()
      .where('history.timestamp < :beforeTime', { beforeTime: beforeTime.getTime() })
      .execute();
    return result.affected || 0;
  }

  /**
   * 查找实体指定类型的历史记录
   */
  async findByEntityIdAndType(entityId: ID, type: HistoryType): Promise<History[]> {
    return this.find({
      filters: {
        entityId: entityId.value,
        action: type.getValue()
      },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找实体指定时间范围内的历史记录
   */
  async findByEntityIdAndTimeRange(entityId: ID, startTime: Date, endTime: Date): Promise<History[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('history')
      .where('history.entityId = :entityId', { entityId: entityId.value })
      .andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
        startTime: startTime.getTime(),
        endTime: endTime.getTime()
      })
      .orderBy('history.timestamp', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找指定类型指定时间范围内的历史记录
   */
  async findByTypeAndTimeRange(type: HistoryType, startTime: Date, endTime: Date): Promise<History[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('history')
      .where('history.action = :action', { action: type.getValue() })
      .andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
        startTime: startTime.getTime(),
        endTime: endTime.getTime()
      })
      .orderBy('history.timestamp', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找实体的最新历史记录
   */
  async findLatestByEntityId(entityId: ID, limit?: number): Promise<History[]> {
    return this.find({
      filters: { entityId: entityId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: limit || 10
    });
  }

  /**
   * 查找指定类型的最新历史记录
   */
  async findLatestByType(type: HistoryType, limit?: number): Promise<History[]> {
    return this.find({
      filters: { action: type.getValue() },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: limit || 10
    });
  }

  /**
   * 清理过期历史记录
   */
  async cleanupExpired(retentionDays: number): Promise<number> {
    const beforeTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    return this.deleteBeforeTime(beforeTime);
  }

  /**
   * 归档指定时间之前的历史记录
   */
  async archiveBeforeTime(beforeTime: Date): Promise<number> {
    return this.deleteBeforeTime(beforeTime);
  }

  /**
   * 按条件统计历史记录
   */
  async countByCriteria(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    type?: HistoryType;
    startTime?: Date;
    endTime?: Date;
  }): Promise<number> {
    const repository = await this.getRepository();
    const queryBuilder = repository.createQueryBuilder('history');

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

    return queryBuilder.getCount();
  }

  /**
   * 按类型统计历史记录
   */
  async countByType(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>> {
    const repository = await this.getRepository();
    const queryBuilder = repository.createQueryBuilder('history');

    if (options?.sessionId) {
      queryBuilder.andWhere('history.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder.andWhere('history.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder.andWhere('history.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.startTime && options?.endTime) {
      queryBuilder.andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
        startTime: options.startTime.getTime(),
        endTime: options.endTime.getTime()
      });
    }

    const models = await queryBuilder.getMany();
    const byType: Record<string, number> = {};

    models.forEach(model => {
      byType[model.action] = (byType[model.action] || 0) + 1;
    });

    return byType;
  }

  /**
   * 获取历史记录统计信息
   */
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
    const repository = await this.getRepository();
    const queryBuilder = repository.createQueryBuilder('history');

    if (options?.sessionId) {
      queryBuilder.andWhere('history.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder.andWhere('history.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder.andWhere('history.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.startTime && options?.endTime) {
      queryBuilder.andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
        startTime: options.startTime.getTime(),
        endTime: options.endTime.getTime()
      });
    }

    const models = await queryBuilder.getMany();

    const byType: Record<string, number> = {};
    const byEntity: Record<string, number> = {};
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let latestAt: Date | undefined;
    let oldestAt: Date | undefined;

    models.forEach(model => {
      byType[model.action] = (byType[model.action] || 0) + 1;
      byEntity[model.entityId] = (byEntity[model.entityId] || 0) + 1;

      if (model.action.includes('error')) {
        errorCount++;
      } else if (model.action.includes('warning')) {
        warningCount++;
      } else {
        infoCount++;
      }

      const historyDate = new Date(model.timestamp || 0);
      if (!latestAt || historyDate > latestAt) {
        latestAt = historyDate;
      }
      if (!oldestAt || historyDate < oldestAt) {
        oldestAt = historyDate;
      }
    });

    return {
      total: models.length,
      byType,
      byEntity,
      errorCount,
      warningCount,
      infoCount,
      latestAt,
      oldestAt
    };
  }

  /**
   * 获取历史记录趋势
   */
  async getTrend(
    startTime: Date,
    endTime: Date,
    interval: number
  ): Promise<Array<{
    timestamp: Date;
    count: number;
    byType: Record<string, number>;
  }>> {
    const repository = await this.getRepository();
    const models = await repository.find({
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

    const intervalMs = interval * 60 * 1000;
    let currentTime = new Date(startTime);

    while (currentTime <= endTime) {
      const nextTime = new Date(currentTime.getTime() + intervalMs);
      const intervalModels = models.filter(m =>
        (m.timestamp || 0) >= currentTime.getTime() && (m.timestamp || 0) < nextTime.getTime()
      );

      const byType: Record<string, number> = {};
      intervalModels.forEach(model => {
        byType[model.action] = (byType[model.action] || 0) + 1;
      });

      trend.push({
        timestamp: new Date(currentTime),
        count: intervalModels.length,
        byType
      });

      currentTime = nextTime;
    }

    return trend;
  }

  /**
   * 搜索历史记录
   */
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
    const repository = await this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('history')
      .where(
        '(history.data::text ILIKE :query OR history.metadata::text ILIKE :query)',
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

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }
    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.toDomain(model));
  }
}