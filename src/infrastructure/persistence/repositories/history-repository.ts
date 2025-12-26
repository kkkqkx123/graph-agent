import { injectable, inject } from 'inversify';
import { HistoryRepository as IHistoryRepository } from '../../../domain/history/repositories/history-repository';
import { History } from '../../../domain/history/entities/history';
import { ID } from '../../../domain/common/value-objects/id';
import { HistoryType } from '../../../domain/history/value-objects/history-type';
import { HistoryModel } from '../models/history.model';
import { Between, LessThan, In } from 'typeorm';
import { IQueryOptions } from '../../../domain/common/repositories/repository';
import { BaseRepository, QueryOptions } from '../base/base-repository';
import { ConnectionManager } from '../connections/connection-manager';
import {
  IdConverter,
  OptionalIdConverter,
  TimestampConverter,
  VersionConverter,
  OptionalStringConverter,
  MetadataConverter
} from '../base/type-converter-base';

/**
 * 历史类型类型转换器
 * 将字符串类型转换为HistoryType值对象
 */
interface HistoryTypeConverter {
  fromStorage: (value: string) => HistoryType;
  toStorage: (value: HistoryType) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: HistoryType) => boolean;
}

const HistoryTypeConverter: HistoryTypeConverter = {
  fromStorage: (value: string) => {
    return HistoryType.fromString(value);
  },
  toStorage: (value: HistoryType) => value.getValue(),
  validateStorage: (value: string) => {
    // 定义有效的历史类型值
    const validTypes = [
      'workflow_created',
      'workflow_updated',
      'workflow_deleted',
      'workflow_executed',
      'workflow_failed',
      'workflow_completed',
      'session_created',
      'session_updated',
      'session_deleted',
      'session_closed',
      'thread_created',
      'thread_updated',
      'thread_deleted',
      'thread_started',
      'thread_paused',
      'thread_resumed',
      'thread_completed',
      'thread_failed',
      'thread_cancelled',
      'checkpoint_created',
      'checkpoint_updated',
      'checkpoint_deleted',
      'checkpoint_restored',
      'node_executed',
      'node_failed',
      'edge_traversed',
      'tool_executed',
      'tool_failed',
      'llm_called',
      'llm_failed',
      'state_changed',
      'error_occurred',
      'warning_occurred',
      'info_occurred'
    ];
    return typeof value === 'string' && validTypes.includes(value);
  },
  validateDomain: (value: HistoryType) => {
    return value instanceof HistoryType;
  }
};

@injectable()
export class HistoryRepository extends BaseRepository<History, HistoryModel, ID> implements IHistoryRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected override getModelClass(): new () => HistoryModel {
    return HistoryModel;
  }

  /**
   * 重写toEntity方法，使用类型转换器
   */
  protected override toEntity(model: HistoryModel): History {
    try {
      // 使用类型转换器进行编译时类型安全的转换
      const historyData = {
        id: IdConverter.fromStorage(model.id),
        sessionId: model.sessionId ? OptionalIdConverter.fromStorage(model.sessionId) : undefined,
        threadId: model.threadId ? OptionalIdConverter.fromStorage(model.threadId) : undefined,
        workflowId: model.workflowId ? OptionalIdConverter.fromStorage(model.workflowId) : undefined,
        type: HistoryTypeConverter.fromStorage(model.action),
        title: model.data?.title ? OptionalStringConverter.fromStorage(model.data.title) : undefined,
        description: model.data?.description ? OptionalStringConverter.fromStorage(model.data.description) : undefined,
        details: model.data || {},
        metadata: MetadataConverter.fromStorage(model.metadata || {}),
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.version),
        isDeleted: false
      };

      // 创建History实体
      return History.fromProps(historyData);
    } catch (error) {
      const errorMessage = `History模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toEntity' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法，使用类型转换器
   */
  protected override toModel(entity: History): HistoryModel {
    try {
      const model = new HistoryModel();

      // 使用类型转换器进行编译时类型安全的转换
      model.id = IdConverter.toStorage(entity.historyId);
      model.entityType = 'history';
      model.entityId = (entity.metadata as any)['entityId'] || entity.historyId.value;
      model.action = HistoryTypeConverter.toStorage(entity.type);
      model.data = {
        title: entity.title,
        description: entity.description,
        ...entity.details
      };
      model.previousData = (entity.metadata as any)['previousData'];
      model.metadata = MetadataConverter.toStorage(entity.metadata);
      model.userId = (entity.metadata as any)['userId'];
      model.sessionId = entity.sessionId?.value;
      model.threadId = entity.threadId?.value;
      model.workflowId = entity.workflowId?.value;
      model.workflowId = (entity.metadata as any)['workflowId'];
      model.nodeId = (entity.metadata as any)['nodeId'];
      model.edgeId = (entity.metadata as any)['edgeId'];
      model.timestamp = entity.createdAt.getMilliseconds();
      model.createdAt = TimestampConverter.toStorage(entity.createdAt);
      model.updatedAt = TimestampConverter.toStorage(entity.updatedAt);
      model.version = VersionConverter.toStorage(entity.version);

      return model;
    } catch (error) {
      const errorMessage = `History实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.historyId.value, operation: 'toModel' };
      throw customError;
    }
  }

  // 基础 CRUD 方法现在由 BaseRepository 提供，无需重复实现

  async findBySessionId(sessionId: ID): Promise<History[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  async findByThreadId(threadId: ID): Promise<History[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  async findByWorkflowId(workflowId: ID): Promise<History[]> {
    return this.find({
      filters: { workflowId: workflowId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  async findByType(type: HistoryType): Promise<History[]> {
    return this.find({
      filters: { action: type.getValue() },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  async findByTypes(types: HistoryType[]): Promise<History[]> {
    const typeValues = types.map(type => type.getValue());
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('history.action IN (:...typeValues)', { typeValues });
      },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  async findByTimeRange(startTime: Date, endTime: Date): Promise<History[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
          startTime: startTime.getTime(),
          endTime: endTime.getTime()
        });
      },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  async findLatest(limit?: number): Promise<History[]> {
    return this.find({
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: limit || 10
    });
  }

  async findLatestBySessionId(sessionId: ID, limit: number = 10): Promise<History[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit
    });
  }

  async findLatestByThreadId(threadId: ID, limit: number = 10): Promise<History[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit
    });
  }

  async countBySessionId(sessionId: ID): Promise<number> {
    return this.count({ filters: { sessionId: sessionId.value } });
  }

  async countByThreadId(threadId: ID): Promise<number> {
    return this.count({ filters: { threadId: threadId.value } });
  }

  async countByWorkflowId(workflowId: ID): Promise<number> {
    return this.count({ filters: { workflowId: workflowId.value } });
  }

  async countByCriteria(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    type?: HistoryType;
    startTime?: Date;
    endTime?: Date;
  }): Promise<number> {
    const queryOptions: QueryOptions<HistoryModel> = {
      customConditions: (qb: any) => {
        if (options?.sessionId) {
          qb.andWhere('history.sessionId = :sessionId', { sessionId: options.sessionId.value });
        }
        if (options?.threadId) {
          qb.andWhere('history.threadId = :threadId', { threadId: options.threadId.value });
        }
        if (options?.workflowId) {
          qb.andWhere('history.workflowId = :workflowId', { workflowId: options.workflowId.value });
        }
        if (options?.type) {
          qb.andWhere('history.action = :action', { action: options.type.getValue() });
        }
        if (options?.startTime && options?.endTime) {
          qb.andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
            startTime: options.startTime.getTime(),
            endTime: options.endTime.getTime()
          });
        }
      }
    };

    return this.count(queryOptions);
  }

  async countByType(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>> {
    const queryOptions: QueryOptions<HistoryModel> = {
      customConditions: (qb: any) => {
        if (options?.sessionId) {
          qb.andWhere('history.sessionId = :sessionId', { sessionId: options.sessionId.value });
        }
        if (options?.threadId) {
          qb.andWhere('history.threadId = :threadId', { threadId: options.threadId.value });
        }
        if (options?.workflowId) {
          qb.andWhere('history.workflowId = :workflowId', { workflowId: options.workflowId.value });
        }
        if (options?.startTime && options?.endTime) {
          qb.andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
            startTime: options.startTime.getTime(),
            endTime: options.endTime.getTime()
          });
        }
      }
    };

    const histories = await this.find(queryOptions);
    const byType: Record<string, number> = {};

    histories.forEach(history => {
      byType[history.type.getValue()] = (byType[history.type.getValue()] || 0) + 1;
    });

    return byType;
  }

  async deleteBySessionId(sessionId: ID): Promise<number> {
    return this.deleteWhere({ filters: { sessionId: sessionId.value } });
  }

  async deleteByThreadId(threadId: ID): Promise<number> {
    return this.deleteWhere({ filters: { threadId: threadId.value } });
  }

  async deleteByEntityId(entityId: ID): Promise<number> {
    return this.deleteWhere({ filters: { entityId: entityId.value } });
  }

  async deleteByType(type: HistoryType): Promise<number> {
    return this.deleteWhere({ filters: { action: type.getValue() } });
  }

  async deleteBeforeTime(beforeTime: Date): Promise<number> {
    const queryOptions: QueryOptions<HistoryModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('history.timestamp < :beforeTime', { beforeTime: beforeTime.getTime() });
      }
    };

    return this.deleteWhere(queryOptions);
  }

  // 实现缺失的方法
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

  async findByEntityIdAndTimeRange(entityId: ID, startTime: Date, endTime: Date): Promise<History[]> {
    const queryOptions: QueryOptions<HistoryModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('history.entityId = :entityId', { entityId: entityId.value })
          .andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
            startTime: startTime.getTime(),
            endTime: endTime.getTime()
          });
      },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };

    return this.find(queryOptions);
  }

  async findByTypeAndTimeRange(type: HistoryType, startTime: Date, endTime: Date): Promise<History[]> {
    const queryOptions: QueryOptions<HistoryModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('history.action = :action', { action: type.getValue() })
          .andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
            startTime: startTime.getTime(),
            endTime: endTime.getTime()
          });
      },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };

    return this.find(queryOptions);
  }

  async findLatestByEntityId(entityId: ID, limit?: number): Promise<History[]> {
    return this.find({
      filters: { entityId: entityId.value },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: limit || 10
    });
  }

  async findLatestByType(type: HistoryType, limit?: number): Promise<History[]> {
    return this.find({
      filters: { action: type.getValue() },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: limit || 10
    });
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
    const queryOptions: QueryOptions<HistoryModel> = {
      customConditions: (qb: any) => {
        // 搜索逻辑：在 description 和 details 字段中搜索
        qb.where(
          '(history.description ILIKE :query OR history.details::text ILIKE :query)',
          { query: `%${query}%` }
        );

        if (options?.sessionId) {
          qb.andWhere('history.sessionId = :sessionId', { sessionId: options.sessionId.value });
        }
        if (options?.threadId) {
          qb.andWhere('history.threadId = :threadId', { threadId: options.threadId.value });
        }
        if (options?.workflowId) {
          qb.andWhere('history.workflowId = :workflowId', { workflowId: options.workflowId.value });
        }
        if (options?.type) {
          qb.andWhere('history.action = :action', { action: options.type.getValue() });
        }
        if (options?.startTime && options?.endTime) {
          qb.andWhere('history.timestamp BETWEEN :startTime AND :endTime', {
            startTime: options.startTime.getTime(),
            endTime: options.endTime.getTime()
          });
        }
      },
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: options?.limit,
      offset: options?.offset
    };

    return this.find(queryOptions);
  }
}