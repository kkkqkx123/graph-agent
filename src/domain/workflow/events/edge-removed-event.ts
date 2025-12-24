import { ID } from '../../common/value-objects/id';
import { DomainEvent } from '../../common/events/domain-event';

/**
 * 边移除事件
 */
export class EdgeRemovedEvent extends DomainEvent {
  private readonly data: Record<string, unknown>;

  constructor(
    public readonly workflowId: ID,
    public readonly edgeId: string,
    public readonly removedBy?: ID
  ) {
    super(workflowId);
    this.data = {
      workflowId: workflowId.toString(),
      edgeId,
      removedBy: removedBy?.toString()
    };
  }

  public get eventName(): string {
    return 'EdgeRemoved';
  }

  public getData(): Record<string, unknown> {
    return { ...this.data };
  }
}