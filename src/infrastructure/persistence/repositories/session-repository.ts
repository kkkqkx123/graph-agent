import { injectable, inject } from 'inversify';
import { ISessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { Session } from '../../../domain/sessions/entities/session';
import { SessionActivity } from '../../../domain/sessions/value-objects/session-activity';
import { ID } from '../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../domain/sessions/value-objects/session-status';
import { SessionConfig } from '../../../domain/sessions/value-objects/session-config';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { SessionModel } from '../models/session.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class SessionRepository extends BaseRepository<Session, SessionModel, ID> implements ISessionRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager,
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => SessionModel {
    return SessionModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: SessionModel): Session {
    try {
      const lastActivityAt = Timestamp.create(model.updatedAt);
      const messageCount = model.metadata?.messageCount as number || 0;
      const threadCount = model.metadata?.threadCount as number || 0;

      const activity = SessionActivity.create(lastActivityAt, messageCount, threadCount);

      const sessionData = {
        id: new ID(model.id),
        userId: model.userId ? new ID(model.userId) : undefined,
        title: model.metadata?.title as string || undefined,
        status: SessionStatus.fromString(model.state),
        config: SessionConfig.create(model.context || {}),
        activity: activity,
        metadata: model.metadata || {},
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: model.metadata?.isDeleted as boolean || false
      };

      return Session.fromProps(sessionData);
    } catch (error) {
      const errorMessage = `Session模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: Session): SessionModel {
    try {
      const model = new SessionModel();

      model.id = entity.sessionId.value;
      model.userId = entity.userId ? entity.userId.value : undefined;
      model.state = entity.status.getValue();
      model.context = entity.config.value;
      model.version = entity.version.getValue();
      model.createdAt = entity.createdAt.getDate();
      model.updatedAt = entity.updatedAt.getDate();

      model.metadata = {
        title: entity.title,
        messageCount: entity.messageCount,
        threadCount: entity.threadCount,
        isDeleted: entity.isDeleted(),
        config: entity.config.value,
        ...entity.metadata
      };

      model.threadIds = [];

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
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('session')
      .where('session.createdAt < :beforeDate', { beforeDate: beforeDate.getDate() })
      .andWhere('session.state != :terminatedState', { terminatedState: 'terminated' })
      .orderBy('session.createdAt', 'ASC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找需要清理的会话（超时或过期）
   */
  async findSessionsNeedingCleanup(): Promise<Session[]> {
    const timeoutThreshold = new Date(Date.now() - 30 * 60 * 1000);
    const expirationThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('session')
      .where('(session.updatedAt < :timeoutThreshold OR session.createdAt < :expirationThreshold)', {
        timeoutThreshold,
        expirationThreshold
      })
      .andWhere('session.state IN (:...states)', {
        states: ['active', 'suspended']
      })
      .orderBy('session.updatedAt', 'ASC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找高活动度的会话
   */
  async findSessionsWithHighActivity(minMessageCount: number): Promise<Session[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('session')
      .where("CAST(session.metadata->>'messageCount' AS INTEGER) >= :minMessageCount", { minMessageCount })
      .orderBy('session.metadata->>messageCount', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
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
   * 检查用户是否有活跃会话
   */
  async hasActiveSession(userId: ID): Promise<boolean> {
    const sessions = await this.findActiveSessionsForUser(userId);
    return sessions.length > 0;
  }

  /**
   * 获取用户的最后活动会话
   */
  async getLastActiveSessionForUser(userId: ID): Promise<Session | null> {
    const sessions = await this.findRecentSessionsForUser(userId, 1);
    return sessions.length > 0 ? sessions[0]! : null;
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
    const session = await this.findById(sessionId);
    if (session) {
      session.markAsDeleted();
      await this.save(session);
    }
  }

  /**
   * 批量软删除会话
   */
  async batchSoftDeleteSessions(sessionIds: ID[]): Promise<number> {
    let count = 0;
    for (const sessionId of sessionIds) {
      await this.softDeleteSession(sessionId);
      count++;
    }
    return count;
  }

  /**
   * 恢复软删除的会话
   */
  async restoreSoftDeletedSession(sessionId: ID): Promise<void> {
    const session = await this.findById(sessionId);
    if (session && session.isDeleted()) {
      // 需要实现恢复逻辑，这里暂时抛出异常
      throw new Error('恢复软删除功能尚未实现');
    }
  }

  /**
   * 查找软删除的会话
   */
  async findSoftDeletedSessions(): Promise<Session[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('session')
      .where("session.metadata->>'isDeleted' = :isDeleted", { isDeleted: true })
      .getMany();
    return models.map(model => this.toDomain(model));
  }
}