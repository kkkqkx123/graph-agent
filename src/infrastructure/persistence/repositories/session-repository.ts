import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { Session } from '../../../domain/sessions/entities/session';
import { SessionActivity } from '../../../domain/sessions/value-objects/session-activity';
import { ID } from '../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../domain/sessions/value-objects/session-status';
import { SessionConfig } from '../../../domain/sessions/value-objects/session-config';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { SessionModel } from '../models/session.model';
import { In } from 'typeorm';
import { BaseRepository, QueryOptions } from '../base/base-repository';
import { ConnectionManager } from '../connections/connection-manager';
import {
  IdConverter,
  OptionalIdConverter,
  TimestampConverter,
  VersionConverter,
  OptionalStringConverter,
  NumberConverter,
  BooleanConverter
} from '../base/type-converter-base';

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
   * 查找用户的活跃会话
   */
  async findActiveSessionsForUser(userId: ID): Promise<Session[]> {
    return this.find({
      filters: { userId: userId.value, state: 'active' },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找即将过期的会话
   */
  async findSessionsExpiringBefore(beforeDate: Timestamp): Promise<Session[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('session.createdAt < :beforeDate', { beforeDate: beforeDate.getDate() });
        qb.andWhere('session.state != :terminatedState', { terminatedState: 'terminated' });
      },
      sortBy: 'createdAt',
      sortOrder: 'asc'
    });
  }

  /**
   * 查找需要清理的会话（超时或过期）
   */
  async findSessionsNeedingCleanup(): Promise<Session[]> {
    const timeoutThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
    const expirationThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前

    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('(session.updatedAt < :timeoutThreshold OR session.createdAt < :expirationThreshold)', {
          timeoutThreshold,
          expirationThreshold
        });
        qb.andWhere('session.state IN (:...states)', {
          states: ['active', 'suspended']
        });
      },
      sortBy: 'updatedAt',
      sortOrder: 'asc'
    });
  }

  /**
   * 查找高活动度的会话
   */
  async findSessionsWithHighActivity(minMessageCount: number): Promise<Session[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('CAST(session.metadata->>\'messageCount\' AS INTEGER) >= :minMessageCount', { minMessageCount });
      },
      sortBy: 'messageCount',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找用户的最近会话
   */
  async findRecentSessionsForUser(userId: ID, limit: number): Promise<Session[]> {
    return this.find({
      filters: { userId: userId.value },
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      limit
    });
  }

  /**
   * 查找用户的会话
   */
  async findSessionsForUser(userId: ID): Promise<Session[]> {
    return this.find({
      filters: { userId: userId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 检查用户是否有活跃会话
   */
  async hasActiveSession(userId: ID): Promise<boolean> {
    const sessions = await this.findActiveSessionsForUser(userId);
    return sessions.length > 0;
  }

  /**
   * 查找指定状态的会话
   */
  async findSessionsByStatus(status: SessionStatus): Promise<Session[]> {
    return this.find({
      filters: { state: status.getValue() },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
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
    const repository = await this.getRepository();
    const result = await repository.update(
      { id: In(sessionIds.map(id => id.value)) },
      { state: status.getValue(), updatedAt: new Date() }
    );

    return result.affected || 0;
  }

  /**
   * 批量删除会话
   */
  async batchDeleteSessions(sessionIds: ID[]): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ id: In(sessionIds.map(id => id.value)) });
    return result.affected || 0;
  }

  /**
   * 删除用户的所有会话
   */
  async deleteAllSessionsForUser(userId: ID): Promise<number> {
    return this.deleteWhere({ filters: { userId: userId.value } });
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
    return super.batchSoftDelete(sessionIds);
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
    return super.findSoftDeleted();
  }
}