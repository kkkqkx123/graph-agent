import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository } from '../../../../domain/sessions/repositories/session-repository';
import { Session } from '../../../../domain/sessions/entities/session';
import { SessionQueryOptions } from '../../../../domain/sessions/repositories/session-repository';
import { ID } from '../../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../../domain/sessions/value-objects/session-status';
import { SessionConfig } from '../../../../domain/sessions/value-objects/session-config';
import { SessionModel } from '../../models/session.model';
import { IQueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { In } from 'typeorm';
import { BaseRepository, QueryOptions } from '../../base/base-repository';
import { QueryOptionsBuilder } from '../../base/query-options-builder';
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
 * 基于类型转换器的Session Repository
 * 
 * 直接使用类型转换器进行数据映射，消除传统的mapper层
 * 提供编译时类型安全和运行时验证
 */
@injectable()
export class SessionConverterRepository extends BaseRepository<Session, SessionModel, ID> implements ISessionRepository {
  
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
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

  /**
   * 根据会话ID查找会话
   */
  async findBySessionId(sessionId: ID): Promise<Session | null> {
    return this.findOne({
      filters: { id: sessionId.value }
    });
  }

  /**
   * 根据用户ID查找会话
   */
  async findByUserId(userId: ID, options?: SessionQueryOptions): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('userId', userId.value)
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    return this.findWithBuilder(builder);
  }

  /**
   * 根据用户ID查找会话（分页）
   */
  async findByUserIdWithPagination(userId: ID, options?: SessionQueryOptions): Promise<PaginatedResult<Session>> {
    const builder = this.createQueryOptionsBuilder()
      .equals('userId', userId.value)
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    return this.findWithPaginationBuilder(builder);
  }

  /**
   * 根据状态查找会话
   */
  async findByStatus(status: SessionStatus, options?: SessionQueryOptions): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('state', status.getValue())
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.userId) {
      builder.equals('userId', options.userId);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    return this.findWithBuilder(builder);
  }

  /**
   * 根据多个用户ID查找会话
   */
  async findByUserIds(userIds: ID[], options?: SessionQueryOptions): Promise<Session[]> {
    const userIdValues = userIds.map(id => id.value);
    
    const builder = this.createQueryOptionsBuilder()
      .in('userId', userIdValues)
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    return this.findWithBuilder(builder);
  }

  /**
   * 查找过期的会话
   */
  async findExpiredSessions(options?: SessionQueryOptions): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .sortBy(options?.sortBy || 'lastActivityAt')
      .sortOrder(options?.sortOrder || 'asc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.userId) {
      builder.equals('userId', options.userId);
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    // 添加过期时间过滤条件
    const expirationTime = options?.lastActivityBefore || new Date(Date.now() - 24 * 60 * 60 * 1000); // 默认24小时前
    builder.where((qb) => {
      qb.andWhere('session.lastActivityAt < :expirationTime', { expirationTime });
      qb.andWhere('session.state != :terminatedState', { terminatedState: 'terminated' });
    });

    return this.findWithBuilder(builder);
  }

  /**
   * 统计用户会话数量
   */
  async countByUserId(userId: ID): Promise<number> {
    return this.count({
      filters: { userId: userId.value }
    });
  }

  /**
   * 统计活跃会话数量
   */
  async countActiveSessions(): Promise<number> {
    return this.count({
      filters: { state: 'active' }
    });
  }

  /**
   * 批量更新会话状态
   */
  async batchUpdateStatus(sessionIds: ID[], newStatus: SessionStatus): Promise<number> {
    const sessionIdValues = sessionIds.map(id => id.value);
    
    return this.batchUpdate(
      sessionIds,
      {
        state: newStatus.getValue(),
        updatedAt: new Date()
      }
    );
  }

  /**
   * 批量删除会话（软删除）
   */
  async batchDeleteSessions(sessionIds: ID[]): Promise<number> {
    return this.batchSoftDelete(sessionIds);
  }

  /**
   * 查找需要清理的会话
   */
  async findSessionsForCleanup(maxAge: number): Promise<Session[]> {
    const cutoffDate = new Date(Date.now() - maxAge);
    
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('session.updatedAt < :cutoffDate', { cutoffDate });
        qb.andWhere('session.state IN (:...states)', { 
          states: ['inactive', 'suspended'] 
        });
      },
      sortBy: 'updatedAt',
      sortOrder: 'asc',
      limit: 100
    });
  }
  /**
   * 根据用户ID和状态查找会话
   */
  async findByUserIdAndStatus(userId: ID, status: SessionStatus, options?: SessionQueryOptions): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('userId', userId.value)
      .equals('state', status.getValue())
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    return this.findWithBuilder(builder);
  }

  /**
   * 查找用户的活跃会话
   */
  async findActiveSessionsByUserId(userId: ID, options?: SessionQueryOptions): Promise<Session[]> {
    return this.findByUserIdAndStatus(userId, SessionStatus.active(), options);
  }

  /**
   * 查找超时的会话
   */
  async findTimeoutSessions(options?: SessionQueryOptions): Promise<Session[]> {
    const timeoutThreshold = new Date(Date.now() - 30 * 60 * 1000); // 默认30分钟前
    
    const builder = this.createQueryOptionsBuilder()
      .sortBy(options?.sortBy || 'lastActivityAt')
      .sortOrder(options?.sortOrder || 'asc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.userId) {
      builder.equals('userId', options.userId);
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    builder.where((qb) => {
      qb.andWhere('session.lastActivityAt < :timeoutThreshold', { timeoutThreshold });
      qb.andWhere('session.state = :activeState', { activeState: 'active' });
    });

    return this.findWithBuilder(builder);
  }

  /**
   * 根据标题搜索会话
   */
  async searchByTitle(title: string, options?: SessionQueryOptions): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.userId) {
      builder.equals('userId', options.userId);
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    builder.where((qb) => {
      qb.andWhere('session.metadata->>\'title\' ILIKE :title', { title: `%${title}%` });
    });

    return this.findWithBuilder(builder);
  }

  /**
   * 分页查询会话
   */
  override async findWithPagination(options: SessionQueryOptions): Promise<PaginatedResult<Session>> {
    const builder = this.createQueryOptionsBuilder()
      .sortBy(options.sortBy || 'createdAt')
      .sortOrder(options.sortOrder || 'desc');

    if (options.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options.userId) {
      builder.equals('userId', options.userId);
    }

    if (options.status) {
      builder.equals('state', options.status);
    }

    if (options.limit) {
      builder.limit(options.limit);
    }

    if (options.offset) {
      builder.offset(options.offset);
    }

    return this.findWithPaginationBuilder(builder);
  }

  /**
   * 统计指定状态的会话数量
   */
  async countByStatus(status: SessionStatus, options?: SessionQueryOptions): Promise<number> {
    const builder = this.createQueryOptionsBuilder()
      .equals('state', status.getValue());

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.userId) {
      builder.equals('userId', options.userId);
    }

    return this.countWithBuilder(builder);
  }

  /**
   * 检查用户是否有活跃会话
   */
  async hasActiveSession(userId: ID): Promise<boolean> {
    const count = await this.countByUserIdAndStatus(userId, SessionStatus.active());
    return count > 0;
  }

  /**
   * 获取用户的最后活动会话
   */
  async getLastActiveSessionByUserId(userId: ID): Promise<Session | null> {
    const sessions = await this.findByUserId(userId, {
      sortBy: 'lastActivityAt',
      sortOrder: 'desc',
      limit: 1,
      includeDeleted: false
    });
    
    return sessions.length > 0 ? sessions[0]! : null;
  }

  /**
   * 删除用户的所有会话
   */
  async deleteAllByUserId(userId: ID): Promise<number> {
    const sessions = await this.findByUserId(userId);
    const sessionIds = sessions.map(session => session.sessionId);
    
    if (sessionIds.length === 0) {
      return 0;
    }
    
    return this.batchSoftDelete(sessionIds);
  }

  /**
   * 软删除会话
   */
  override async softDelete(sessionId: ID): Promise<void> {
    await super.softDelete(sessionId);
  }

  /**
   * 恢复软删除的会话
   */
  override async restoreSoftDeleted(sessionId: ID): Promise<void> {
    await super.restoreSoftDeleted(sessionId);
  }

  /**
   * 查找软删除的会话
   */
  override async findSoftDeleted(options?: SessionQueryOptions): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .sortBy(options?.sortBy || 'deletedAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.userId) {
      builder.equals('userId', options.userId);
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    builder.where((qb) => {
      qb.andWhere('session.isDeleted = true');
    });

    return this.findWithBuilder(builder);
  }

  /**
   * 批量删除会话
   */
  async batchDelete(sessionIds: ID[]): Promise<number> {
    return this.batchDeleteByIds(sessionIds);
  }

  /**
   * 根据用户ID和状态统计会话数量
   */
  private async countByUserIdAndStatus(userId: ID, status: SessionStatus): Promise<number> {
    return this.count({
      filters: {
        userId: userId.value,
        state: status.getValue()
      }
    });
  }
}

/**
 * 会话状态类型转换器
 * 将字符串状态转换为SessionStatus值对象
 */
export interface SessionStatusConverter {
  fromStorage: (value: string) => SessionStatus;
  toStorage: (value: SessionStatus) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: SessionStatus) => boolean;
}

export const SessionStatusConverter: SessionStatusConverter = {
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
export interface SessionConfigConverter {
  fromStorage: (value: Record<string, unknown>) => SessionConfig;
  toStorage: (value: SessionConfig) => Record<string, unknown>;
  validateStorage: (value: Record<string, unknown>) => boolean;
  validateDomain: (value: SessionConfig) => boolean;
}

export const SessionConfigConverter: SessionConfigConverter = {
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