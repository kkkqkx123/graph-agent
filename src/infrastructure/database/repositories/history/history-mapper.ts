import { History } from '../../../../domain/history/entities/history';
import { HistoryId } from '../../../../domain/history/value-objects/history-id';
import { SessionId } from '../../../../domain/session/value-objects/session-id';
import { ThreadId } from '../../../../domain/thread/value-objects/thread-id';
import { HistoryModel } from '../../models/history.model';

export class HistoryMapper {
  toEntity(model: HistoryModel): History {
    return new History(
      new HistoryId(model.id),
      new SessionId(model.sessionId),
      new ThreadId(model.threadId),
      model.type,
      model.data,
      model.metadata,
      new Date(model.timestamp)
    );
  }

  toModel(entity: History): HistoryModel {
    const model = new HistoryModel();
    model.id = entity.id.value;
    model.sessionId = entity.sessionId.value;
    model.threadId = entity.threadId.value;
    model.type = entity.type;
    model.data = entity.data;
    model.metadata = entity.metadata;
    model.timestamp = entity.timestamp;
    
    return model;
  }
}