import { DomainEvent } from '../../../common/events/domain-event';
import { ID } from '../../../common/value-objects/id';

/**
 * 图创建事件接口
 */
export interface GraphCreatedEventData {
  graphId: string;
  name: string;
  description?: string | undefined;
  nodeCount: number;
  edgeCount: number;
  createdBy?: string | undefined;
}

/**
 * 图创建事件
 * 
 * 当图被创建时触发此事件
 */
export class GraphCreatedEvent extends DomainEvent<GraphCreatedEventData> {
  private readonly data: GraphCreatedEventData;

  /**
   * 构造函数
   * @param graphId 图ID
   * @param name 图名称
   * @param description 图描述
   * @param nodeCount 节点数量
   * @param edgeCount 边数量
   * @param createdBy 创建者ID
   */
  constructor(
    graphId: ID,
    name: string,
    description?: string,
    nodeCount?: number,
    edgeCount?: number,
    createdBy?: ID
  ) {
    super(graphId);
    this.data = {
      graphId: graphId.toString(),
      name,
      description: description || undefined,
      nodeCount: nodeCount || 0,
      edgeCount: edgeCount || 0,
      createdBy: createdBy?.toString() || undefined
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'GraphCreated';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public override getData(): GraphCreatedEventData {
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
   * 获取图名称
   * @returns 图名称
   */
  public getName(): string {
    return this.data.name;
  }

  /**
   * 获取图描述
   * @returns 图描述
   */
  public getDescription(): string | undefined {
    return this.data.description;
  }

  /**
   * 获取节点数量
   * @returns 节点数量
   */
  public getNodeCount(): number {
    return this.data.nodeCount;
  }

  /**
   * 获取边数量
   * @returns 边数量
   */
  public getEdgeCount(): number {
    return this.data.edgeCount;
  }

  /**
   * 获取创建者ID
   * @returns 创建者ID
   */
  public getCreatedBy(): string | undefined {
    return this.data.createdBy;
  }
}