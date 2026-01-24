import { injectable, inject } from 'inversify';
import { ISessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { Session } from '../../../domain/sessions/entities/session';
import { ID } from '../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../domain/sessions/value-objects/session-status';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { SessionModel } from '../models/session.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';
import { TYPES } from '../../../di/service-keys';
import { SessionMapper } from '../mappers/session-mapper';
import { ExecutionError } from '../../../domain/common/exceptions';

@injectable()
export class SessionRepository
  extends BaseRepository<Session, SessionModel, ID>
  implements ISessionRepository {
  private mapper: SessionMapper;

  constructor(@inject(TYPES.ConnectionManager) connectionManager: ConnectionManager) {
    super(connectionManager);
    this.mapper = new SessionMapper();
  }

  protected getModelClass(): new () => SessionModel {
    return SessionModel;
  }

  /**
   * 使用Mapper将数据库模型转换为领域实体
   */
  protected override toDomain(model: SessionModel): Session {
    return this.mapper.toDomain(model);
  }

  /**
   * 使用Mapper将领域实体转换为数据库模型
   */
  protected override toModel(entity: Session): SessionModel {
    return this.mapper.toModel(entity);
  }

  /**
   * 查找用户的活跃会话
   */
  async findActiveSessionsForUser(userId: ID): Promise<Session[]> {
    return this.find({
      filters: { userId: userId.value, state: 'active' },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找即将过期的会话
   */
  async findSessionsExpiringBefore(beforeDate: Timestamp): Promise<Session[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('session')
      .where('session.createdAt < :beforeDate', { beforeDate: beforeDate.toDate() })
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
      .where(
        '(session.updatedAt < :timeoutThreshold OR session.createdAt < :expirationThreshold)',
        {
          timeoutThreshold,
          expirationThreshold,
        }
      )
      .andWhere('session.state IN (:...states)', {
        states: ['active', 'suspended'],
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
      .where("CAST(session.metadata->>'messageCount' AS INTEGER) >= :minMessageCount", {
        minMessageCount,
      })
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
      limit,
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
      sortOrder: 'desc',
    });
  }

  /**
   * 查找用户的会话
   */
  async findSessionsForUser(userId: ID): Promise<Session[]> {
    return this.find({
      filters: { userId: userId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
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
      const deletedSession = session.markAsDeleted();
      await this.save(deletedSession);
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
      throw new ExecutionError('恢复软删除功能尚未实现');
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
