import { injectable } from 'inversify';
import { Session } from '../../../../domain/session/entities/session';
import { SessionId } from '../../../../domain/session/value-objects/session-id';
import { UserId } from '../../../../domain/session/value-objects/user-id';
import { SessionModel } from '../../models/session.model';

@injectable()
export class SessionMapper {
  toEntity(model: SessionModel): Session {
    return new Session(
      new SessionId(model.id),
      model.userId ? new UserId(model.userId) : null,
      model.threadIds || [],
      model.state,
      model.context || {},
      model.metadata || {},
      model.version,
      model.createdAt,
      model.updatedAt
    );
  }

  toModel(entity: Session): SessionModel {
    const model = new SessionModel();
    model.id = entity.id.value;
    model.userId = entity.userId?.value || null;
    model.threadIds = entity.threadIds;
    model.state = entity.state;
    model.context = entity.context;
    model.metadata = entity.metadata;
    model.version = entity.version;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    return model;
  }
}