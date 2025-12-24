import { ID } from '../../common/value-objects/id';
import { DomainEvent } from '../../common/events/domain-event';

/**
 * 边移除事件
 */
export class EdgeRemovedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: ID,
    public readonly edgeId: string,
    public readonly removedBy?: ID
  ) {
    super('edge.removed', {
      workflowId: workflowId.toString(),
      edgeId,
      removedBy: removedBy?.toString()
    });
  }
}