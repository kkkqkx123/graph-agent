import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';
import { ExecutionStatus } from '../value-objects/execution-status';

/**
 * 状态变更事件数据接口
 */
export interface StateChangedEventData {
  executionId: string;
  workflowId: string;
  threadId: string;
  oldStatus: string;
  newStatus: string;
  nodeId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * 状态变更事件
 *
 * 当执行状态、工作流状态或节点状态发生变化时触发此事件
 */
export class StateChangedEvent extends DomainEvent {
  private readonly data: StateChangedEventData;

  /**
   * 构造函数
   * @param executionId 执行ID
   * @param workflowId 工作流ID
   * @param threadId 线程ID
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   * @param nodeId 节点ID（可选）
   * @param metadata 元数据
   */
  constructor(
    executionId: ID,
    workflowId: ID,
    threadId: ID,
    oldStatus: ExecutionStatus,
    newStatus: ExecutionStatus,
    nodeId?: ID,
    metadata?: Record<string, unknown>
  ) {
    super(executionId);
    this.data = {
      executionId: executionId.toString(),
      workflowId: workflowId.toString(),
      threadId: threadId.toString(),
      oldStatus: oldStatus.toString(),
      newStatus: newStatus.toString(),
      nodeId: nodeId?.toString(),
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'StateChanged';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): StateChangedEventData {
    return { ...this.data };
  }

  /**
   * 获取执行ID
   * @returns 执行ID
   */
  public getExecutionId(): string {
    return this.data.executionId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public getWorkflowId(): string {
    return this.data.workflowId;
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public getThreadId(): string {
    return this.data.threadId;
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
   * 获取节点ID
   * @returns 节点ID
   */
  public getNodeId(): string | undefined {
    return this.data.nodeId;
  }

  /**
   * 获取时间戳
   * @returns 时间戳
   */
  public getTimestamp(): string {
    return this.data.timestamp;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public getMetadata(): Record<string, unknown> | undefined {
    return this.data.metadata;
  }
}