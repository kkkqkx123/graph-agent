import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository, SessionQueryOptions } from '../../../../domain/sessions/repositories/session-repository';
import { Session } from '../../../../domain/sessions/entities/session';
import { ID } from '../../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../../domain/sessions/value-objects/session-status';
import { ConnectionManager } from '../../connections/connection-manager';
import { SessionModel } from '../../models/session.model';
import { In } from 'typeorm';
import { BaseRepository, QueryOptions } from '../../base/base-repository';

@injectable()
export class SessionRepository extends BaseRepository<Session, SessionModel, ID> implements ISessionRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager,
  ) {
    super(connectionManager);
  }

  protected override getModelClass(): new () => SessionModel {
    return SessionModel;
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
    // This would require adding an isDeleted field to the SessionModel
    // For now, we'll use regular delete
    await this.deleteById(sessionId);
  }

  override async batchSoftDelete(sessionIds: ID[]): Promise<number> {
    // This would require adding an isDeleted field to the SessionModel
    // For now, we'll use regular delete
    return this.batchDelete(sessionIds);
  }

  override async restoreSoftDeleted(sessionId: ID): Promise<void> {
    // This would require adding an isDeleted field to the SessionModel
    throw new Error('Soft delete not implemented');
  }

  override async findSoftDeleted(options?: SessionQueryOptions): Promise<Session[]> {
    // This would require adding an isDeleted field to the SessionModel
    return [];
  }
}