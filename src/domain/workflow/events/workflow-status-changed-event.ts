import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';
import { WorkflowStatus } from '../value-objects/workflow-status';

/**
 * 工作流状态变更事件接口
 */
export interface WorkflowStatusChangedEventData {
  workflowId: string;
  oldStatus: string;
  newStatus: string;
  changedBy?: string;
  reason?: string;
  [key: string]: unknown;
}

/**
 * 工作流状态变更事件
 * 
 * 当工作流状态发生变更时触发此事件
 */
export class WorkflowStatusChangedEvent extends DomainEvent {
  private readonly data: WorkflowStatusChangedEventData;

  /**
   * 构造函数
   * @param workflowId 工作流ID
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   */
  constructor(
    workflowId: ID,
    oldStatus: WorkflowStatus,
    newStatus: WorkflowStatus,
    changedBy?: ID,
    reason?: string
  ) {
    super(workflowId);
    this.data = {
      workflowId: workflowId.toString(),
      oldStatus: oldStatus.toString(),
      newStatus: newStatus.toString(),
      changedBy: changedBy?.toString(),
      reason
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'WorkflowStatusChanged';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): WorkflowStatusChangedEventData {
    return { ...this.data };
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public getWorkflowId(): string {
    return this.data.workflowId;
  }

  /**
   * 获取旧状态
   * @returns 旧状态
   */
  public getOldStatus(): string {
    return this.data.oldStatus;
  }

  /**
   * 获取新状态
   * @returns 新状态
   */
  public getNewStatus(): string {
    return this.data.newStatus;
  }

  /**
   * 获取变更者ID
   * @returns 变更者ID
   */
  public getChangedBy(): string | undefined {
    return this.data.changedBy;
  }

  /**
   * 获取变更原因
   * @returns 变更原因
   */
  public getReason(): string | undefined {
    return this.data.reason;
  }
}