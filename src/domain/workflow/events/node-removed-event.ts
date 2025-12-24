import { ID } from '../../common/value-objects/id';
import { DomainEvent } from '../../common/events/domain-event';

/**
 * 节点移除事件
 */
export class NodeRemovedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: ID,
    public readonly nodeId: string,
    public readonly removedBy?: ID
  ) {
    super('node.removed', {
      workflowId: workflowId.toString(),
      nodeId,
      removedBy: removedBy?.toString()
    });
  }
}