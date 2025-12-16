import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';

/**
 * 节点添加事件接口
 */
export interface NodeAddedEventData {
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  nodeData: Record<string, unknown>;
  addedBy?: string;
  [key: string]: unknown;
}

/**
 * 节点添加事件
 * 
 * 当节点被添加到工作流时触发此事件
 */
export class NodeAddedEvent extends DomainEvent {
  private readonly data: NodeAddedEventData;

  /**
   * 构造函数
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @param nodeType 节点类型
   * @param nodeName 节点名称
   * @param nodeData 节点数据
   * @param addedBy 添加者ID
   */
  constructor(
    workflowId: ID,
    nodeId: ID,
    nodeType: string,
    nodeName: string,
    nodeData: Record<string, unknown>,
    addedBy?: ID
  ) {
    super(workflowId);
    this.data = {
      workflowId: workflowId.toString(),
      nodeId: nodeId.toString(),
      nodeType,
      nodeName,
      nodeData,
      addedBy: addedBy?.toString()
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'NodeAdded';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): NodeAddedEventData {
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
   * 获取节点ID
   * @returns 节点ID
   */
  public getNodeId(): string {
    return this.data.nodeId;
  }

  /**
   * 获取节点类型
   * @returns 节点类型
   */
  public getNodeType(): string {
    return this.data.nodeType;
  }

  /**
   * 获取节点名称
   * @returns 节点名称
   */
  public getNodeName(): string {
    return this.data.nodeName;
  }

  /**
   * 获取节点数据
   * @returns 节点数据
   */
  public getNodeData(): Record<string, unknown> {
    return { ...this.data.nodeData };
  }

  /**
   * 获取添加者ID
   * @returns 添加者ID
   */
  public getAddedBy(): string | undefined {
    return this.data.addedBy;
  }
}