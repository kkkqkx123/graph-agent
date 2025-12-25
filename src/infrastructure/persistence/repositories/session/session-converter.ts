import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository } from '../../../../domain/sessions/repositories/session-repository';
import { Session } from '../../../../domain/sessions/entities/session';
import { SessionActivity } from '../../../../domain/sessions/value-objects/session-activity';
import { ID } from '../../../../domain/common/value-objects/id';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';
import { SessionStatus } from '../../../../domain/sessions/value-objects/session-status';
import { SessionConfig } from '../../../../domain/sessions/value-objects/session-config';
import { SessionModel } from '../../models/session.model';
import { IQueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';
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
      const lastActivityAt = TimestampConverter.fromStorage(model.updatedAt); // 使用updatedAt作为最后活动时间
      const messageCount = model.metadata?.messageCount ? NumberConverter.fromStorage(model.metadata.messageCount as number) : 0;
      const threadCount = model.metadata?.threadCount ? NumberConverter.fromStorage(model.metadata.threadCount as number) : 0;

      // 创建SessionActivity值对象
      const activity = SessionActivity.create(lastActivityAt, messageCount, threadCount);

      const sessionData = {
        id: IdConverter.fromStorage(model.id),
        userId: model.userId ? OptionalIdConverter.fromStorage(model.userId) : undefined,
        title: model.metadata?.title ? OptionalStringConverter.fromStorage(model.metadata.title as string) : undefined,
        status: SessionStatusConverter.fromStorage(model.state),
        config: SessionConfigConverter.fromStorage(model.context),
        activity: activity,
        metadata: model.metadata || {},
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.version),
        isDeleted: model.metadata?.isDeleted ? BooleanConverter.fromStorage(model.metadata.isDeleted as boolean) : false
      };

      // 创建Session实体
      return Session.fromProps(sessionData);
    } catch (error) {
      const errorMessage = `Session模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toEntity' };
      throw customError;
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
        threadCount: NumberConverter.toStorage(entity.threadCount),
        isDeleted: BooleanConverter.toStorage(entity.isDeleted()),
        config: SessionConfigConverter.toStorage(entity.config),
        ...entity.metadata // 保留其他元数据
      };

      // 设置关联字段
      model.threadIds = []; // 默认空数组

      return model;
    } catch (error) {
      const errorMessage = `Session实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.sessionId.value, operation: 'toModel' };
      throw customError;
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
   * 查找用户的活跃会话
   */
  async findActiveSessionsForUser(userId: ID): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('userId', userId.value)
      .equals('state', 'active')
      .sortBy('createdAt')
      .sortOrder('desc')
      .excludeSoftDeleted();

    return this.findWithBuilder(builder);
  }

  /**
   * 查找即将过期的会话
   */
  async findSessionsExpiringBefore(beforeDate: Timestamp): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .sortBy('createdAt')
      .sortOrder('asc')
      .excludeSoftDeleted();

    builder.where((qb) => {
      qb.andWhere('session.createdAt < :beforeDate', { beforeDate: beforeDate.getDate() });
      qb.andWhere('session.state != :terminatedState', { terminatedState: 'terminated' });
    });

    return this.findWithBuilder(builder);
  }

  /**
   * 查找需要清理的会话（超时或过期）
   */
  async findSessionsNeedingCleanup(): Promise<Session[]> {
    const timeoutThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
    const expirationThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
    
    const builder = this.createQueryOptionsBuilder()
      .sortBy('updatedAt')
      .sortOrder('asc')
      .excludeSoftDeleted();

    builder.where((qb) => {
      qb.andWhere('(session.updatedAt < :timeoutThreshold OR session.createdAt < :expirationThreshold)', {
        timeoutThreshold,
        expirationThreshold
      });
      qb.andWhere('session.state IN (:...states)', {
        states: ['active', 'suspended']
      });
    });

    return this.findWithBuilder(builder);
  }

  /**
   * 查找高活动度的会话
   */
  async findSessionsWithHighActivity(minMessageCount: number): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .sortBy('messageCount')
      .sortOrder('desc')
      .excludeSoftDeleted();

    builder.where((qb) => {
      qb.andWhere('CAST(session.metadata->>\'messageCount\' AS INTEGER) >= :minMessageCount', { minMessageCount });
    });

    return this.findWithBuilder(builder);
  }

  /**
   * 查找用户的最近会话
   */
  async findRecentSessionsForUser(userId: ID, limit: number): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('userId', userId.value)
      .sortBy('updatedAt')
      .sortOrder('desc')
      .limit(limit)
      .excludeSoftDeleted();

    return this.findWithBuilder(builder);
  }

  /**
   * 查找用户的会话
   */
  async findSessionsForUser(userId: ID): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('userId', userId.value)
      .sortBy('createdAt')
      .sortOrder('desc')
      .excludeSoftDeleted();

    return this.findWithBuilder(builder);
  }

  /**
   * 查找指定状态的会话
   */
  async findSessionsByStatus(status: SessionStatus): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('state', status.getValue())
      .sortBy('createdAt')
      .sortOrder('desc')
      .excludeSoftDeleted();

    return this.findWithBuilder(builder);
  }

  /**
   * 获取用户的最后活动会话
   */
  async getLastActiveSessionForUser(userId: ID): Promise<Session | null> {
    const sessions = await this.findRecentSessionsForUser(userId, 1);
    return sessions.length > 0 ? sessions[0]! : null;
  }

  /**
   * 批量更新会话状态
   */
  async batchUpdateSessionStatus(sessionIds: ID[], status: SessionStatus): Promise<number> {
    const sessionIdValues = sessionIds.map(id => id.value);
    
    return this.batchUpdate(
      sessionIds,
      {
        state: status.getValue(),
        updatedAt: new Date()
      }
    );
  }

  /**
   * 批量删除会话
   */
  async batchDeleteSessions(sessionIds: ID[]): Promise<number> {
    return this.batchDeleteByIds(sessionIds);
  }

  /**
   * 删除用户的所有会话
   */
  async deleteAllSessionsForUser(userId: ID): Promise<number> {
    const sessions = await this.findSessionsForUser(userId);
    const sessionIds = sessions.map(session => session.sessionId);
    
    if (sessionIds.length === 0) {
      return 0;
    }
    
    return this.batchSoftDelete(sessionIds);
  }

  /**
   * 软删除会话
   */
  async softDeleteSession(sessionId: ID): Promise<void> {
    await super.softDelete(sessionId);
  }

  /**
   * 批量软删除会话
   */
  async batchSoftDeleteSessions(sessionIds: ID[]): Promise<number> {
    return this.batchSoftDelete(sessionIds);
  }

  /**
   * 恢复软删除的会话
   */
  async restoreSoftDeletedSession(sessionId: ID): Promise<void> {
    await super.restoreSoftDeleted(sessionId);
  }

  /**
   * 查找软删除的会话
   */
  async findSoftDeletedSessions(): Promise<Session[]> {
    const builder = this.createQueryOptionsBuilder()
      .sortBy('deletedAt')
      .sortOrder('desc');

    builder.where((qb) => {
      qb.andWhere('session.isDeleted = true');
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
    const sessions = await this.findRecentSessionsForUser(userId, 1);
    
    return sessions.length > 0 ? sessions[0]! : null;
  }

  /**
   * 删除用户的所有会话
   */
  async deleteAllByUserId(userId: ID): Promise<number> {
    const sessions = await this.findSessionsForUser(userId);
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