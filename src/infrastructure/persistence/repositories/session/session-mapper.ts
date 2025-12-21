import { injectable } from 'inversify';
import { Session } from '../../../../domain/sessions/entities/session';
import { ID } from '../../../../domain/common/value-objects/id';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';
import { Version } from '../../../../domain/common/value-objects/version';
import { SessionStatus } from '../../../../domain/sessions/value-objects/session-status';
import { SessionConfig } from '../../../../domain/sessions/value-objects/session-config';
import { SessionModel } from '../../models/session.model';

@injectable()
export class SessionMapper {
  toEntity(model: SessionModel): Session {
    const props = {
      id: ID.fromString(model.id),
      userId: model.userId ? ID.fromString(model.userId) : undefined,
      title: model.metadata?.title,
      status: SessionStatus.fromString(model.state || 'active'),
      config: model.metadata?.config ? SessionConfig.create(model.metadata.config) : SessionConfig.default(),
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.version.toString()),
      lastActivityAt: Timestamp.create(model.updatedAt), // Use updatedAt as fallback
      messageCount: model.metadata?.messageCount || 0,
      isDeleted: false
    };

    return Session.fromProps(props);
  }

  toModel(entity: Session): SessionModel {
    const model = new SessionModel();
    model.id = entity.sessionId.value;
    model.userId = entity.userId?.value;
    model.state = entity.status.getValue();
    model.context = entity.config.value;
    model.metadata = {
      title: entity.title,
      config: entity.config.value,
      messageCount: entity.messageCount
    };
    model.version = parseInt(entity.version.getValue());
    model.createdAt = entity.createdAt.getDate();
    model.updatedAt = entity.updatedAt.getDate();
    return model;
  }
}