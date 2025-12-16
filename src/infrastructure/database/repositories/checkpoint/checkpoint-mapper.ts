import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { CheckpointId } from '../../../../domain/checkpoint/value-objects/checkpoint-id';
import { ThreadId } from '../../../../domain/threads/value-objects/thread-id';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { ID } from '../../../../domain/common/value-objects/id';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';
import { Version } from '../../../../domain/common/value-objects/version';
import { CheckpointModel } from '../../models/checkpoint.model';

export class CheckpointMapper {
  toEntity(model: CheckpointModel): Checkpoint {
    const props = {
      id: ID.fromString(model.id),
      threadId: ID.fromString(model.threadId || ''),
      type: CheckpointType.fromString(model.checkpointType),
      stateData: model.state || {},
      tags: model.metadata?.tags || [],
      metadata: model.metadata || {},
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.version.toString()),
      isDeleted: false
    };

    return Checkpoint.fromProps(props);
  }

  toModel(entity: Checkpoint): CheckpointModel {
    const model = new CheckpointModel();
    model.id = entity.checkpointId.value;
    model.threadId = entity.threadId.value;
    model.checkpointType = entity.type.getValue();
    model.state = entity.stateData;
    model.metadata = entity.metadata;
    model.createdAt = entity.createdAt.getDate();
    model.updatedAt = entity.updatedAt.getDate();
    model.version = parseInt(entity.version.getValue());

    return model;
  }
}