import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository, SessionQueryOptions } from '../../../../domain/session/repositories/session-repository';
import { Session } from '../../../../domain/session/entities/session';
import { ID } from '../../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../../domain/session/value-objects/session-status';
import { ConnectionManager } from '../../connections/connection-manager';
import { SessionMapper } from './session-mapper';
import { SessionModel } from '../../models/session.model';
import { In } from 'typeorm';

@injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('SessionMapper') private mapper: SessionMapper
  ) {}

  async save(session: Session): Promise<Session> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const model = this.mapper.toModel(session);
    await repository.save(model);
    
    return session;
  }

  async findById(id: ID): Promise<Session | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const model = await repository.findOne({ where: { id: id.value } });
    if (!model) {
      return null;
    }
    
    return this.mapper.toEntity(model);
  }

  async findAll(): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find();
    return models.map(model => this.mapper.toEntity(model));
  }

  async delete(entity: Session): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    await repository.delete({ id: entity.sessionId.value });
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async findByUserId(userId: ID, options?: SessionQueryOptions): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find({
      where: { userId: userId.value },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByStatus(status: SessionStatus, options?: SessionQueryOptions): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find({
      where: { state: status.getValue() },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    return models.map(model => this.mapper.toEntity(model));
  }

  async countByUserId(userId: ID, options?: SessionQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    return await repository.count({ where: { userId: userId.value } });
  }

  async updateState(id: ID, state: SessionStatus): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    await repository.update({ id: id.value }, { state: state.getValue(), updatedAt: new Date() });
  }

  // 实现基础 Repository 接口的方法
  async find(options: any): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find({
      where: options.filters || {},
      skip: options.offset,
      take: options.limit,
      order: options.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findOne(options: any): Promise<Session | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const model = await repository.findOne({
      where: options.filters || {}
    });
    
    if (!model) {
      return null;
    }
    
    return this.mapper.toEntity(model);
  }

  async findByIdOrFail(id: ID): Promise<Session> {
    const session = await this.findById(id);
    if (!session) {
      throw new Error(`Session with id ${id.value} not found`);
    }
    return session;
  }

  async findOneOrFail(options: any): Promise<Session> {
    const session = await this.findOne(options);
    if (!session) {
      throw new Error(`Session not found`);
    }
    return session;
  }

  async saveBatch(entities: Session[]): Promise<Session[]> {
    const results: Session[] = [];
    for (const entity of entities) {
      const result = await this.save(entity);
      results.push(result);
    }
    return results;
  }

  async deleteById(id: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    await repository.delete({ id: id.value });
  }

  async deleteBatch(entities: Session[]): Promise<void> {
    for (const entity of entities) {
      await this.delete(entity);
    }
  }

  async deleteWhere(options: any): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const result = await repository.delete(options.filters || {});
    return result.affected || 0;
  }

  async count(options?: any): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    return repository.count({ where: options?.filters || {} });
  }

  // 实现 SessionRepository 特有的方法
  async findByUserIdAndStatus(userId: ID, status: SessionStatus, options?: SessionQueryOptions): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find({
      where: { userId: userId.value, state: status.getValue() },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    
    return models.map(model => this.mapper.toEntity(model));
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
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find({
      where: { metadata: { title: { $like: `%${title}%` } } },
      skip: options?.offset,
      take: options?.limit,
      order: options?.sortBy ? { [options.sortBy]: options.sortOrder || 'asc' } : undefined
    });
    
    return models.map(model => this.mapper.toEntity(model));
  }

  async findWithPagination(options: SessionQueryOptions): Promise<{ items: Session[], total: number, page: number, pageSize: number, totalPages: number }> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const offset = options.offset || 0;
    const limit = options.limit || 10;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    
    const [models, total] = await repository.findAndCount({
      skip: offset,
      take: limit,
      order: { [sortBy]: sortOrder.toUpperCase() as 'ASC' | 'DESC' }
    });
    
    const items = models.map(model => this.mapper.toEntity(model));
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    
    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages
    };
  }

  async countByStatus(status: SessionStatus, options?: SessionQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    return repository.count({
      where: { state: status.getValue() }
    });
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
    return sessions.length > 0 ? sessions[0] : null;
  }

  async batchUpdateStatus(sessionIds: ID[], status: SessionStatus): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const result = await repository.update(
      { id: In(sessionIds.map(id => id.value)) },
      { state: status.getValue(), updatedAt: new Date() }
    );
    
    return result.affected || 0;
  }

  async batchDelete(sessionIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const result = await repository.delete({ id: In(sessionIds.map(id => id.value)) });
    return result.affected || 0;
  }

  async deleteAllByUserId(userId: ID): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const result = await repository.delete({ userId: userId.value });
    return result.affected || 0;
  }

  async softDelete(sessionId: ID): Promise<void> {
    // This would require adding an isDeleted field to the SessionModel
    // For now, we'll use regular delete
    await this.deleteById(sessionId);
  }

  async batchSoftDelete(sessionIds: ID[]): Promise<number> {
    // This would require adding an isDeleted field to the SessionModel
    // For now, we'll use regular delete
    return this.batchDelete(sessionIds);
  }

  async restoreSoftDeleted(sessionId: ID): Promise<void> {
    // This would require adding an isDeleted field to the SessionModel
    throw new Error('Soft delete not implemented');
  }

  async findSoftDeleted(options?: SessionQueryOptions): Promise<Session[]> {
    // This would require adding an isDeleted field to the SessionModel
    return [];
  }
}