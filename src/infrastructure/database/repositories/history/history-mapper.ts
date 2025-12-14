import { History } from '../../../../domain/history/entities/history';
import { ID } from '../../../../domain/common/value-objects/id';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';
import { Version } from '../../../../domain/common/value-objects/version';
import { HistoryType } from '../../../../domain/history/value-objects/history-type';
import { HistoryModel } from '../../models/history.model';

export class HistoryMapper {
  toEntity(model: HistoryModel): History {
    const props = {
      id: ID.fromString(model.id),
      sessionId: model.sessionId ? ID.fromString(model.sessionId) : undefined,
      threadId: model.threadId ? ID.fromString(model.threadId) : undefined,
      workflowId: model.workflowId ? ID.fromString(model.workflowId) : undefined,
      type: HistoryType.fromString(model.action),
      title: model.data?.title,
      description: model.data?.description,
      details: model.data || {},
      metadata: model.metadata || {},
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.version.toString()),
      isDeleted: false
    };

    return History.fromProps(props);
  }

  toModel(entity: History): HistoryModel {
    const model = new HistoryModel();
    model.id = entity.historyId.value;
    model.entityType = 'history';
    model.entityId = (entity.metadata as any)['entityId'] || entity.historyId.value;
    model.action = entity.type.getValue();
    model.data = {
      title: entity.title,
      description: entity.description,
      ...entity.details
    };
    model.previousData = (entity.metadata as any)['previousData'];
    model.metadata = entity.metadata;
    model.userId = (entity.metadata as any)['userId'];
    model.sessionId = entity.sessionId?.value;
    model.threadId = entity.threadId?.value;
    model.workflowId = entity.workflowId?.value;
    model.graphId = (entity.metadata as any)['graphId'];
    model.nodeId = (entity.metadata as any)['nodeId'];
    model.edgeId = (entity.metadata as any)['edgeId'];
    model.timestamp = entity.createdAt.getMilliseconds();
    model.createdAt = entity.createdAt.getDate();
    model.updatedAt = entity.updatedAt.getDate();
    model.version = parseInt(entity.version.getValue());
    
    return model;
  }
}