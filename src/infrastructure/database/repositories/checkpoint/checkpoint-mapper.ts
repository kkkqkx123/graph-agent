import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { CheckpointId } from '../../../../domain/checkpoint/value-objects/checkpoint-id';
import { SessionId } from '../../../../domain/session/value-objects/session-id';
import { ThreadId } from '../../../../domain/thread/value-objects/thread-id';
import { CheckpointModel } from '../../models/checkpoint.model';

export class CheckpointMapper {
  toEntity(model: CheckpointModel): Checkpoint {
    return new Checkpoint(
      new CheckpointId(model.id),
      new SessionId(model.sessionId),
      new ThreadId(model.threadId),
      model.type,
      model.state,
      model.metadata,
      new Date(model.createdAt)
    );
  }

  toModel(entity: Checkpoint): CheckpointModel {
    const model = new CheckpointModel();
    model.id = entity.id.value;
    model.sessionId = entity.sessionId.value;
    model.threadId = entity.threadId.value;
    model.type = entity.type;
    model.state = entity.state;
    model.metadata = entity.metadata;
    model.createdAt = entity.createdAt;
    
    return model;
  }
}