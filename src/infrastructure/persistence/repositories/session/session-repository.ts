import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository, SessionQueryOptions } from '../../../../domain/sessions/repositories/session-repository';
import { Session } from '../../../../domain/sessions/entities/session';
import { ID } from '../../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../../domain/sessions/value-objects/session-status';
import { SessionConfig } from '../../../../domain/sessions/value-objects/session-config';
import { SessionModel } from '../../models/session.model';
import { In } from 'typeorm';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { BaseRepository, QueryOptions } from '../../base/base-repository';
import { ConnectionManager } from '../../connections/connection-manager';
import {
  IdConverter,
  OptionalIdConverter,
  TimestampConverter,
  VersionConverter,
  OptionalStringConverter,
  NumberConverter,
  BooleanConverter
} from '../../base/type-converter-base';

/**
 * 会话状态类型转换器
 * 将字符串状态转换为SessionStatus值对象
 */
interface SessionStatusConverter {
  fromStorage: (value: string) => SessionStatus;
  toStorage: (value: SessionStatus) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: SessionStatus) => boolean;
}

const SessionStatusConverter: SessionStatusConverter = {
  fromStorage: (value: string) => {
    return SessionStatus.fromString(value);
  },
  toStorage: (value: SessionStatus) => value.getValue(),
  validateStorage: (value: string) => {
    const validStates = ['active', 'inactive', 'suspended', 'terminated'];
    return typeof value === 'string' && validStates.includes(value);
  },
  validateDomain: (value: SessionStatus) => value instanceof SessionStatus
};

/**
 * 会话配置类型转换器
 * 将配置对象转换为SessionConfig值对象
 */
interface SessionConfigConverter {
  fromStorage: (value: Record<string, unknown>) => SessionConfig;
  toStorage: (value: SessionConfig) => Record<string, unknown>;
  validateStorage: (value: Record<string, unknown>) => boolean;
  validateDomain: (value: SessionConfig) => boolean;
}

const SessionConfigConverter: SessionConfigConverter = {
  fromStorage: (value: Record<string, unknown>) => {
    if (!value || Object.keys(value).length === 0) {
      return SessionConfig.default();
    }
    return SessionConfig.create(value);
  },
  toStorage: (value: SessionConfig) => value.value,
  validateStorage: (value: Record<string, unknown>) => {
    if (!value || typeof value !== 'object') return false;
    return true; // 让SessionConfig.create来处理详细验证
  },
  validateDomain: (value: SessionConfig) => value instanceof SessionConfig
};

@injectable()
export class SessionRepository extends BaseRepository<Session, SessionModel, ID> implements ISessionRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager,
  ) {
    super(connectionManager);
    
    // 配置软删除行为
    this.configureSoftDelete({
      fieldName: 'isDeleted',
      deletedAtField: 'deletedAt',
      stateField: 'state',
      deletedValue: 'terminated',
      activeValue: 'active'
    });
  }

  protected override getModelClass(): new () => SessionModel {
    return SessionModel;
  }

  /**
   * 重写toEntity方法，使用类型转换器
   */
  protected override toEntity(model: SessionModel): Session {
    try {
      // 使用类型转换器进行编译时类型安全的转换
      const sessionData = {
        id: IdConverter.fromStorage(model.id),
        userId: model.userId ? OptionalIdConverter.fromStorage(model.userId) : undefined,
        title: model.metadata?.title ? OptionalStringConverter.fromStorage(model.metadata.title as string) : undefined,
        status: SessionStatusConverter.fromStorage(model.state),
        config: SessionConfigConverter.fromStorage(model.context),
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.version),
        lastActivityAt: TimestampConverter.fromStorage(model.updatedAt), // 使用updatedAt作为最后活动时间
        messageCount: model.metadata?.messageCount ? NumberConverter.fromStorage(model.metadata.messageCount as number) : 0,
        isDeleted: model.metadata?.isDeleted ? BooleanConverter.fromStorage(model.metadata.isDeleted as boolean) : false
      };

      // 创建Session实体
      return Session.fromProps(sessionData);
    } catch (error) {
      throw new RepositoryError(
        `Session模型转换失败: ${error instanceof Error ? error.message : String(error)}`,
        'MAPPING_ERROR',
        { modelId: model.id, operation: 'toEntity' }
      );
    }
  }

  /**
   * 重写toModel方法，使用类型转换器
   */
  protected override toModel(entity: Session): SessionModel {
    try {
      const model = new SessionModel();
      
      // 使用类型转换器进行编译时类型安全的转换
      model.id = IdConverter.toStorage(entity.sessionId);
      model.userId = entity.userId ? OptionalIdConverter.toStorage(entity.userId) : undefined;
      model.state = SessionStatusConverter.toStorage(entity.status);
      model.context = SessionConfigConverter.toStorage(entity.config);
      model.version = VersionConverter.toStorage(entity.version);
      model.createdAt = TimestampConverter.toStorage(entity.createdAt);
      model.updatedAt = TimestampConverter.toStorage(entity.updatedAt);
      
      // 设置元数据
      model.metadata = {
        title: entity.title ? OptionalStringConverter.toStorage(entity.title) : undefined,
        messageCount: NumberConverter.toStorage(entity.messageCount),
        isDeleted: BooleanConverter.toStorage(entity.isDeleted()),
        config: SessionConfigConverter.toStorage(entity.config)
      };
      
      // 设置关联字段
      model.threadIds = []; // 默认空数组
      
      return model;
    } catch (error) {
      throw new RepositoryError(
        `Session实体转换失败: ${error instanceof Error ? error.message : String(error)}`,
        'MAPPING_ERROR',
        { entityId: entity.sessionId.value, operation: 'toModel' }
      );
    }
  }

  // 基础 CRUD 方法现在由 BaseRepository 提供，无需重复实现

  async findByUserId(userId: ID, options?: SessionQueryOptions): Promise<Session[]> {
    const queryOptions: QueryOptions<SessionModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('session.userId = :userId', { userId: userId.value });
      },
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      limit: options?.limit,
      offset: options?.offset
    };

    return this.find(queryOptions);
  }

  async findByStatus(status: SessionStatus, options?: SessionQueryOptions): Promise<Session[]> {
    return this.find({
      filters: { state: status.getValue() },
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async countByUserId(userId: ID, options?: SessionQueryOptions): Promise<number> {
    return this.count({ filters: { userId: userId.value } });
  }

  async updateState(id: ID, state: SessionStatus): Promise<void> {
    const repository = await this.getRepository();
    await repository.update({ id: id.value }, { state: state.getValue(), updatedAt: new Date() });
  }

  // 基础 CRUD 方法现在由 BaseRepository 提供，无需重复实现

  // 实现 SessionRepository 特有的方法
  async findByUserIdAndStatus(userId: ID, status: SessionStatus, options?: SessionQueryOptions): Promise<Session[]> {
    return this.find({
      filters: { userId: userId.value, state: status.getValue() },
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async findActiveSessionsByUserId(userId: ID, options?: SessionQueryOptions): Promise<Session[]> {
    return this.findByUserIdAndStatus(userId, SessionStatus.active(), options);
  }

  async findTimeoutSessions(options?: SessionQueryOptions): Promise<Session[]> {
    // This would require more complex logic to check timeout
    // For now, return empty array
    return [];
  }

  async findExpiredSessions(options?: SessionQueryOptions): Promise<Session[]> {
    // This would require more complex logic to check expiration
    // For now, return empty array
    return [];
  }

  async searchByTitle(title: string, options?: SessionQueryOptions): Promise<Session[]> {
    const queryOptions: QueryOptions<SessionModel> = {
      customConditions: (qb: any) => {
        qb.andWhere('session.metadata->>\'title\' ILIKE :title', { title: `%${title}%` });
      },
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      limit: options?.limit,
      offset: options?.offset
    };

    return this.find(queryOptions);
  }

  override async findWithPagination(options: SessionQueryOptions): Promise<{ items: Session[], total: number, page: number, pageSize: number, totalPages: number }> {
    const queryOptions: QueryOptions<SessionModel> = {
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit || 10,
      offset: options?.offset || 0
    };

    return super.findWithPagination(queryOptions);
  }

  async countByStatus(status: SessionStatus, options?: SessionQueryOptions): Promise<number> {
    return this.count({ filters: { state: status.getValue() } });
  }

  async hasActiveSession(userId: ID): Promise<boolean> {
    const sessions = await this.findActiveSessionsByUserId(userId, { limit: 1 });
    return sessions.length > 0;
  }

  async getLastActiveSessionByUserId(userId: ID): Promise<Session | null> {
    const sessions = await this.findByUserId(userId, {
      sortBy: 'lastActivityAt',
      sortOrder: 'desc',
      limit: 1
    });
    return sessions[0] ?? null;
  }

  async batchUpdateStatus(sessionIds: ID[], status: SessionStatus): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.update(
      { id: In(sessionIds.map(id => id.value)) },
      { state: status.getValue(), updatedAt: new Date() }
    );

    return result.affected || 0;
  }

  async batchDelete(sessionIds: ID[]): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ id: In(sessionIds.map(id => id.value)) });
    return result.affected || 0;
  }

  async deleteAllByUserId(userId: ID): Promise<number> {
    return this.deleteWhere({ filters: { userId: userId.value } });
  }

  override async softDelete(sessionId: ID): Promise<void> {
    await super.softDelete(sessionId);
  }

  override async batchSoftDelete(sessionIds: ID[]): Promise<number> {
    return super.batchSoftDelete(sessionIds);
  }

  override async restoreSoftDeleted(sessionId: ID): Promise<void> {
    await super.restoreSoftDeleted(sessionId);
  }

  override async findSoftDeleted(options?: SessionQueryOptions): Promise<Session[]> {
    return super.findSoftDeleted(options);
  }
}