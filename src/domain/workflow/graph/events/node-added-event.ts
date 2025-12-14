import { DomainEvent } from '../../../common/events/domain-event';
import { ID } from '../../../common/value-objects/id';
import { NodeType } from '../value-objects/node-type';

/**
 * 节点添加事件接口
 */
export interface NodeAddedEventData {
  graphId: string;
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  position?: { x: number; y: number };
  properties?: Record<string, unknown>;
  addedBy?: string;
  [key: string]: unknown;
}

/**
 * 节点添加事件
 * 
 * 当节点被添加到图时触发此事件
 */
export class NodeAddedEvent extends DomainEvent {
  private readonly data: NodeAddedEventData;

  /**
   * 构造函数
   * @param graphId 图ID
   * @param nodeId 节点ID
   * @param nodeType 节点类型
   * @param nodeName 节点名称
   * @param position 节点位置
   * @param properties 节点属性
   * @param addedBy 添加者ID
   */
  constructor(
    graphId: ID,
    nodeId: ID,
    nodeType: NodeType,
    nodeName?: string,
    position?: { x: number; y: number },
    properties?: Record<string, unknown>,
    addedBy?: ID
  ) {
    super(graphId);
    this.data = {
      graphId: graphId.toString(),
      nodeId: nodeId.toString(),
      nodeType: nodeType.toString(),
      nodeName,
      position,
      properties: properties || {},
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
   * 获取图ID
   * @returns 图ID
   */
  public getGraphId(): string {
    return this.data.graphId;
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
  public getNodeName(): string | undefined {
    return this.data.nodeName;
  }

  /**
   * 获取节点位置
   * @returns 节点位置
   */
  public getPosition(): { x: number; y: number } | undefined {
    return this.data.position;
  }

  /**
   * 获取节点属性
   * @returns 节点属性
   */
  public getProperties(): Record<string, unknown> {
    return { ...this.data.properties };
  }

  /**
   * 获取添加者ID
   * @returns 添加者ID
   */
  public getAddedBy(): string | undefined {
    return this.data.addedBy;
  }
}