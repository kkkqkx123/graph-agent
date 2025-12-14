import { injectable } from 'inversify';
import { Thread } from '../../../../domain/thread/entities/thread';
import { ID } from '../../../../domain/common/value-objects/id';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';
import { Version } from '../../../../domain/common/value-objects/version';
import { ThreadStatus } from '../../../../domain/thread/value-objects/thread-status';
import { ThreadPriority } from '../../../../domain/thread/value-objects/thread-priority';
import { ThreadModel } from '../../models/thread.model';

@injectable()
export class ThreadMapper {
  toEntity(model: ThreadModel): Thread {
    const props = {
      id: ID.fromString(model.id),
      sessionId: ID.fromString(model.sessionId),
      status: ThreadStatus.fromString(model.state),
      priority: ThreadPriority.fromString(model.priority),
      title: model.name,
      description: model.description,
      metadata: model.context || {},
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.version.toString()),
      isDeleted: false
    };

    return Thread.fromProps(props);
  }

  toModel(entity: Thread): ThreadModel {
    const model = new ThreadModel();
    model.id = entity.threadId.value;
    model.sessionId = entity.sessionId.value;
    model.name = entity.title || '';
    model.description = entity.description || undefined;
    model.state = entity.status.getValue();
    model.priority = entity.priority.toString();
    model.context = entity.metadata;
    model.metadata = entity.metadata;
    model.version = parseInt(entity.version.getValue());
    model.createdAt = entity.createdAt.getDate();
    model.updatedAt = entity.updatedAt.getDate();
    return model;
  }

}