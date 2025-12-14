import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository } from '../../../../domain/session/repositories/session-repository';
import { Session } from '../../../../domain/session/entities/session';
import { SessionId } from '../../../../domain/session/value-objects/session-id';
import { UserId } from '../../../../domain/session/value-objects/user-id';
import { ConnectionManager } from '../../connections/connection-manager';
import { SessionMapper } from './session-mapper';
import { SessionModel } from '../../models/session.model';

@injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('SessionMapper') private mapper: SessionMapper
  ) {}

  async save(session: Session): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const model = this.mapper.toModel(session);
    await repository.save(model);
  }

  async findById(id: SessionId): Promise<Session | null> {
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

  async delete(id: SessionId): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    await repository.delete({ id: id.value });
  }

  async exists(id: SessionId): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async findByUserId(userId: UserId): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find({ where: { userId: userId.value } });
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByState(state: string): Promise<Session[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    const models = await repository.find({ where: { state } });
    return models.map(model => this.mapper.toEntity(model));
  }

  async countByUserId(userId: UserId): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    return await repository.count({ where: { userId: userId.value } });
  }

  async updateState(id: SessionId, state: string): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(SessionModel);
    
    await repository.update({ id: id.value }, { state, updatedAt: new Date() });
  }
}