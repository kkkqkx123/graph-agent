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
      id: new ID(model.id),
      sessionId: new ID(model.sessionId),
      workflowId: model.workflowId ? new ID(model.workflowId) : undefined,
      status: ThreadStatus.fromString(model.status),
      priority: ThreadPriority.fromNumber(model.priority),
      title: model.name,
      description: model.description,
      metadata: model.context || {},
      createdAt: new Timestamp(model.createdAt),
      updatedAt: new Timestamp(model.updatedAt),
      version: new Version(model.version),
      startedAt: model.startedAt ? new Timestamp(model.startedAt) : undefined,
      completedAt: model.completedAt ? new Timestamp(model.completedAt) : undefined,
      errorMessage: model.errorMessage,
      isDeleted: model.isDeleted || false
    };

    return Thread.fromProps(props);
  }

  toModel(entity: Thread): ThreadModel {
    const model = new ThreadModel();
    model.id = entity.threadId.value;
    model.sessionId = entity.sessionId.value;
    model.workflowId = entity.workflowId?.value || null;
    model.name = entity.title || '';
    model.description = entity.description || null;
    model.state = this.mapStatusToState(entity.status.getValue());
    model.priority = this.mapPriorityToString(entity.priority);
    model.context = entity.metadata;
    model.metadata = entity.metadata;
    model.version = entity.version.getValue();
    model.createdAt = entity.createdAt.toDate();
    model.updatedAt = entity.updatedAt.toDate();
    model.startedAt = entity.startedAt?.toDate() || null;
    model.completedAt = entity.completedAt?.toDate() || null;
    model.errorMessage = entity.errorMessage || null;
    model.isDeleted = entity.isDeleted();
    return model;
  }

  private mapStatusToState(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'active',
      'running': 'active',
      'paused': 'paused',
      'completed': 'completed',
      'failed': 'completed',
      'cancelled': 'completed'
    };
    return statusMap[status] || 'active';
  }

  private mapPriorityToString(priority: ThreadPriority): string {
    if (priority.isLow()) return 'low';
    if (priority.isNormal()) return 'medium';
    if (priority.isHigh()) return 'high';
    if (priority.isUrgent()) return 'urgent';
    return 'medium';
  }
}