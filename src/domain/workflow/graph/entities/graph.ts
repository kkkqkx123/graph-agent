import { AggregateRoot } from '../../../common/base/aggregate-root';
import { ID } from '../../../common/value-objects/id';
import { Timestamp } from '../../../common/value-objects/timestamp';
import { Version } from '../../../common/value-objects/version';
import { DomainError } from '../../../common/errors/domain-error';
import { Node } from './node';
import { Edge } from './edge';
import { GraphCreatedEvent } from '../events/graph-created-event';
import { NodeAddedEvent } from '../events/node-added-event';
import { EdgeAddedEvent } from '../events/edge-added-event';

/**
 * Graph实体接口
 */
export interface GraphProps {
  id: ID;
  name: string;
  description?: string | undefined;
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdBy?: ID | undefined;
  updatedBy?: ID | undefined;
}

/**
 * Graph实体
 * 
 * 表示图的聚合根
 */
export class Graph extends AggregateRoot {
  private readonly props: GraphProps;

  /**
   * 构造函数
   * @param props 图属性
   */
  private constructor(props: GraphProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新图
   * @param name 图名称
   * @param description 图描述
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns 新图实例
   */
  public static create(
    name: string,
    description?: string,
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): Graph {
    const now = Timestamp.now();
    const graphId = ID.generate();

    const props: GraphProps = {
      id: graphId,
      name,
      description: description || undefined,
      nodes: new Map(),
      edges: new Map(),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      metadata: metadata || {},
      isDeleted: false,
      createdBy: createdBy || undefined,
      updatedBy: createdBy || undefined
    };

    const graph = new Graph(props);

    // 添加图创建事件
    graph.addDomainEvent(new GraphCreatedEvent(
      graphId,
      name,
      description,
      0, // 节点数量
      0, // 边数量
      createdBy
    ));

    return graph;
  }

  /**
   * 从已有属性重建图
   * @param props 图属性
   * @returns 图实例
   */
  public static fromProps(props: GraphProps): Graph {
    return new Graph(props);
  }

  /**
   * 获取图ID
   * @returns 图ID
   */
  public get graphId(): ID {
    return this.props.id;
  }

  /**
   * 获取图名称
   * @returns 图名称
   */
  public get name(): string {
    return this.props.name;
  }

  /**
   * 获取图描述
   * @returns 图描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取所有节点
   * @returns 节点映射
   */
  public get nodes(): Map<string, Node> {
    return new Map(this.props.nodes);
  }

  /**
   * 获取所有边
   * @returns 边映射
   */
  public get edges(): Map<string, Edge> {
    return new Map(this.props.edges);
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取创建者ID
   * @returns 创建者ID
   */
  public get createdBy(): ID | undefined {
    return this.props.createdBy;
  }

  /**
   * 获取更新者ID
   * @returns 更新者ID
   */
  public get updatedBy(): ID | undefined {
    return this.props.updatedBy;
  }

  /**
   * 获取节点数量
   * @returns 节点数量
   */
  public getNodeCount(): number {
    return this.props.nodes.size;
  }

  /**
   * 获取边数量
   * @returns 边数量
   */
  public getEdgeCount(): number {
    return this.props.edges.size;
  }

  /**
   * 根据ID获取节点
   * @param nodeId 节点ID
   * @returns 节点或null
   */
  public getNode(nodeId: ID): Node | null {
    return this.props.nodes.get(nodeId.toString()) || null;
  }

  /**
   * 根据ID获取边
   * @param edgeId 边ID
   * @returns 边或null
   */
  public getEdge(edgeId: ID): Edge | null {
    return this.props.edges.get(edgeId.toString()) || null;
  }

  /**
   * 检查节点是否存在
   * @param nodeId 节点ID
   * @returns 是否存在
   */
  public hasNode(nodeId: ID): boolean {
    return this.props.nodes.has(nodeId.toString());
  }

  /**
   * 检查边是否存在
   * @param edgeId 边ID
   * @returns 是否存在
   */
  public hasEdge(edgeId: ID): boolean {
    return this.props.edges.has(edgeId.toString());
  }

  /**
   * 获取节点的入边
   * @param nodeId 节点ID
   * @returns 入边列表
   */
  public getIncomingEdges(nodeId: ID): Edge[] {
    const incomingEdges: Edge[] = [];
    for (const edge of this.props.edges.values()) {
      if (edge.isTo(nodeId) && !edge.isDeleted()) {
        incomingEdges.push(edge);
      }
    }
    return incomingEdges;
  }

  /**
   * 获取节点的出边
   * @param nodeId 节点ID
   * @returns 出边列表
   */
  public getOutgoingEdges(nodeId: ID): Edge[] {
    const outgoingEdges: Edge[] = [];
    for (const edge of this.props.edges.values()) {
      if (edge.isFrom(nodeId) && !edge.isDeleted()) {
        outgoingEdges.push(edge);
      }
    }
    return outgoingEdges;
  }

  /**
   * 获取节点的相邻节点
   * @param nodeId 节点ID
   * @returns 相邻节点列表
   */
  public getAdjacentNodes(nodeId: ID): Node[] {
    const adjacentNodes: Node[] = [];
    const visited = new Set<string>();

    // 获取出边指向的节点
    for (const edge of this.getOutgoingEdges(nodeId)) {
      const targetNode = this.getNode(edge.toNodeId);
      if (targetNode && !visited.has(targetNode.nodeId.toString())) {
        adjacentNodes.push(targetNode);
        visited.add(targetNode.nodeId.toString());
      }
    }

    // 获取入边来源的节点
    for (const edge of this.getIncomingEdges(nodeId)) {
      const sourceNode = this.getNode(edge.fromNodeId);
      if (sourceNode && !visited.has(sourceNode.nodeId.toString())) {
        adjacentNodes.push(sourceNode);
        visited.add(sourceNode.nodeId.toString());
      }
    }

    return adjacentNodes;
  }

  /**
   * 更新图名称
   * @param name 新名称
   * @param updatedBy 更新者ID
   */
  public updateName(name: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的图');
    }

    const newProps = {
      ...this.props,
      name,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新图描述
   * @param description 新描述
   * @param updatedBy 更新者ID
   */
  public updateDescription(description: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的图');
    }

    const newProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @param updatedBy 更新者ID
   */
  public updateMetadata(metadata: Record<string, unknown>, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除图的元数据');
    }

    const newProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 添加节点
   * @param node 节点
   * @param addedBy 添加者ID
   */
  public addNode(node: Node, addedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法向已删除的图添加节点');
    }

    if (!node.graphId.equals(this.props.id)) {
      throw new DomainError('节点不属于当前图');
    }

    if (this.hasNode(node.nodeId)) {
      throw new DomainError('节点已存在');
    }

    const newNodes = new Map(this.props.nodes);
    newNodes.set(node.nodeId.toString(), node);

    const newProps = {
      ...this.props,
      nodes: newNodes,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: addedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加节点添加事件
    this.addDomainEvent(new NodeAddedEvent(
      this.props.id,
      node.nodeId,
      node.type,
      node.name,
      node.position,
      node.properties,
      addedBy
    ));
  }

  /**
   * 移除节点
   * @param nodeId 节点ID
   * @param removedBy 移除者ID
   */
  public removeNode(nodeId: ID, removedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法从已删除的图移除节点');
    }

    const node = this.getNode(nodeId);
    if (!node) {
      throw new DomainError('节点不存在');
    }

    // 检查是否有边连接到此节点
    const connectedEdges = this.getIncomingEdges(nodeId).concat(this.getOutgoingEdges(nodeId));
    if (connectedEdges.length > 0) {
      throw new DomainError('无法移除有边连接的节点');
    }

    const newNodes = new Map(this.props.nodes);
    newNodes.delete(nodeId.toString());

    const newProps = {
      ...this.props,
      nodes: newNodes,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: removedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 添加边
   * @param edge 边
   * @param addedBy 添加者ID
   */
  public addEdge(edge: Edge, addedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法向已删除的图添加边');
    }

    if (!edge.graphId.equals(this.props.id)) {
      throw new DomainError('边不属于当前图');
    }

    if (this.hasEdge(edge.edgeId)) {
      throw new DomainError('边已存在');
    }

    // 检查源节点和目标节点是否存在
    if (!this.hasNode(edge.fromNodeId)) {
      throw new DomainError('源节点不存在');
    }

    if (!this.hasNode(edge.toNodeId)) {
      throw new DomainError('目标节点不存在');
    }

    const newEdges = new Map(this.props.edges);
    newEdges.set(edge.edgeId.toString(), edge);

    const newProps = {
      ...this.props,
      edges: newEdges,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: addedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();

    // 添加边添加事件
    this.addDomainEvent(new EdgeAddedEvent(
      this.props.id,
      edge.edgeId,
      edge.type,
      edge.fromNodeId,
      edge.toNodeId,
      edge.condition,
      edge.weight,
      edge.properties,
      addedBy
    ));
  }

  /**
   * 移除边
   * @param edgeId 边ID
   * @param removedBy 移除者ID
   */
  public removeEdge(edgeId: ID, removedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法从已删除的图移除边');
    }

    const edge = this.getEdge(edgeId);
    if (!edge) {
      throw new DomainError('边不存在');
    }

    const newEdges = new Map(this.props.edges);
    newEdges.delete(edgeId.toString());

    const newProps = {
      ...this.props,
      edges: newEdges,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: removedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 标记图为已删除
   */
  public markAsDeleted(): void {
    if (this.props.isDeleted) {
      return;
    }

    const newProps = {
      ...this.props,
      isDeleted: true,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 检查图是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `graph:${this.props.id.toString()}`;
  }

  /**
   * 验证图的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('图ID不能为空');
    }

    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new DomainError('图名称不能为空');
    }

    // 验证所有边都连接到存在的节点
    for (const edge of this.props.edges.values()) {
      if (!this.hasNode(edge.fromNodeId)) {
        throw new DomainError(`边 ${edge.edgeId} 的源节点不存在`);
      }

      if (!this.hasNode(edge.toNodeId)) {
        throw new DomainError(`边 ${edge.edgeId} 的目标节点不存在`);
      }
    }

    // 验证图的基本结构
    const startNodes = Array.from(this.props.nodes.values()).filter(node => node.type.isStart());
    const endNodes = Array.from(this.props.nodes.values()).filter(node => node.type.isEnd());

    if (startNodes.length === 0) {
      throw new DomainError('图必须至少有一个开始节点');
    }

    if (endNodes.length === 0) {
      throw new DomainError('图必须至少有一个结束节点');
    }

    if (startNodes.length > 1) {
      throw new DomainError('图只能有一个开始节点');
    }
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    this.validateInvariants();

    // 验证所有节点
    for (const node of this.props.nodes.values()) {
      node.validate();
    }

    // 验证所有边
    for (const edge of this.props.edges.values()) {
      edge.validate();
    }
  }
}