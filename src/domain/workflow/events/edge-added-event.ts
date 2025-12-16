import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';

/**
 * 边添加事件接口
 */
export interface EdgeAddedEventData {
  workflowId: string;
  edgeId: string;
  edgeType: string;
  fromNodeId: string;
  toNodeId: string;
  edgeData: Record<string, unknown>;
  addedBy?: string;
  [key: string]: unknown;
}

/**
 * 边添加事件
 * 
 * 当边被添加到工作流时触发此事件
 */
export class EdgeAddedEvent extends DomainEvent {
  private readonly data: EdgeAddedEventData;

  /**
   * 构造函数
   * @param workflowId 工作流ID
   * @param edgeId 边ID
   * @param edgeType 边类型
   * @param fromNodeId 源节点ID
   * @param toNodeId 目标节点ID
   * @param edgeData 边数据
   * @param addedBy 添加者ID
   */
  constructor(
    workflowId: ID,
    edgeId: ID,
    edgeType: string,
    fromNodeId: ID,
    toNodeId: ID,
    edgeData: Record<string, unknown>,
    addedBy?: ID
  ) {
    super(workflowId);
    this.data = {
      workflowId: workflowId.toString(),
      edgeId: edgeId.toString(),
      edgeType,
      fromNodeId: fromNodeId.toString(),
      toNodeId: toNodeId.toString(),
      edgeData,
      addedBy: addedBy?.toString()
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'EdgeAdded';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): EdgeAddedEventData {
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
   * 获取边ID
   * @returns 边ID
   */
  public getEdgeId(): string {
    return this.data.edgeId;
  }

  /**
   * 获取边类型
   * @returns 边类型
   */
  public getEdgeType(): string {
    return this.data.edgeType;
  }

  /**
   * 获取源节点ID
   * @returns 源节点ID
   */
  public getFromNodeId(): string {
    return this.data.fromNodeId;
  }

  /**
   * 获取目标节点ID
   * @returns 目标节点ID
   */
  public getToNodeId(): string {
    return this.data.toNodeId;
  }

  /**
   * 获取边数据
   * @returns 边数据
   */
  public getEdgeData(): Record<string, unknown> {
    return { ...this.data.edgeData };
  }

  /**
   * 获取添加者ID
   * @returns 添加者ID
   */
  public getAddedBy(): string | undefined {
    return this.data.addedBy;
  }
}