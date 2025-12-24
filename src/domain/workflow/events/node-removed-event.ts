import { ID } from '../../common/value-objects/id';
import { DomainEvent } from '../../common/events/domain-event';

/**
 * 节点移除事件
 */
export class NodeRemovedEvent extends DomainEvent {
  private readonly data: Record<string, unknown>;

  constructor(
    public readonly workflowId: ID,
    public readonly nodeId: string,
    public readonly removedBy?: ID
  ) {
    super(workflowId);
    this.data = {
      workflowId: workflowId.toString(),
      nodeId,
      removedBy: removedBy?.toString()
    };
  }

  public get eventName(): string {
    return 'NodeRemoved';
  }

  public getData(): Record<string, unknown> {
    return { ...this.data };
  }
}