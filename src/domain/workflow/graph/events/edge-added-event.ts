import { DomainEvent } from '../../../common/events/domain-event';
import { ID } from '../../../common/value-objects/id';
import { EdgeType } from '../value-objects/edge-type';

/**
 * 边添加事件接口
 */
export interface EdgeAddedEventData {
  graphId: string;
  edgeId: string;
  edgeType: string;
  fromNodeId: string;
  toNodeId: string;
  condition?: string;
  weight?: number;
  properties?: Record<string, unknown>;
  addedBy?: string;
  [key: string]: unknown;
}

/**
 * 边添加事件
 * 
 * 当边被添加到图时触发此事件
 */
export class EdgeAddedEvent extends DomainEvent {
  private readonly data: EdgeAddedEventData;

  /**
   * 构造函数
   * @param graphId 图ID
   * @param edgeId 边ID
   * @param edgeType 边类型
   * @param fromNodeId 源节点ID
   * @param toNodeId 目标节点ID
   * @param condition 条件表达式
   * @param weight 权重
   * @param properties 边属性
   * @param addedBy 添加者ID
   */
  constructor(
    graphId: ID,
    edgeId: ID,
    edgeType: EdgeType,
    fromNodeId: ID,
    toNodeId: ID,
    condition?: string,
    weight?: number,
    properties?: Record<string, unknown>,
    addedBy?: ID
  ) {
    super(graphId);
    this.data = {
      graphId: graphId.toString(),
      edgeId: edgeId.toString(),
      edgeType: edgeType.toString(),
      fromNodeId: fromNodeId.toString(),
      toNodeId: toNodeId.toString(),
      condition,
      weight,
      properties: properties || {},
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
   * 获取图ID
   * @returns 图ID
   */
  public getGraphId(): string {
    return this.data.graphId;
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
   * 获取条件表达式
   * @returns 条件表达式
   */
  public getCondition(): string | undefined {
    return this.data.condition;
  }

  /**
   * 获取权重
   * @returns 权重
   */
  public getWeight(): number | undefined {
    return this.data.weight;
  }

  /**
   * 获取边属性
   * @returns 边属性
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