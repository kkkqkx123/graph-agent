import { ID } from '../../common/value-objects/id';
import { DomainError } from '../../common/errors/domain-error';
import { Node } from './nodes/base/node';
import { Edge } from './edges/base/edge';

/**
 * Workflow图属性接口
 */
export interface WorkflowGraphProps {
  readonly workflowId: ID;
  readonly nodes: Map<string, Node>;
  readonly edges: Map<string, Edge>;
  readonly definition?: Record<string, unknown>;
  readonly layout?: Record<string, unknown>;
}

/**
 * Workflow图实体
 * 
 * 专门负责纯粹的图结构管理：
 * 1. 节点和边的增删改查
 * 2. 图结构查询（获取节点、边、入边、出边等）
 * 3. 图结构验证（基本完整性检查）
 * 
 * 不包含图算法和复杂验证逻辑，这些功能已迁移到专门的GraphAlgorithmService和GraphValidationService。
 */
export class WorkflowGraph {
  private readonly props: WorkflowGraphProps;

  /**
   * 构造函数
   * @param props 工作流图属性
   */
  constructor(props: WorkflowGraphProps) {
    this.props = Object.freeze(props);
  }

  /**
   * 创建新工作流图
   * @param workflowId 工作流ID
   * @param nodes 节点列表
   * @param edges 边列表
   * @param definition 图定义
   * @param layout 布局信息
   * @returns 新工作流图实例
   */
  public static create(
    workflowId: ID,
    nodes?: Node[],
    edges?: Edge[],
    definition?: Record<string, unknown>,
    layout?: Record<string, unknown>
  ): WorkflowGraph {
    // 创建节点和边的映射
    const nodeMap = new Map<string, Node>();
    const edgeMap = new Map<string, Edge>();

    if (nodes) {
      for (const node of nodes) {
        nodeMap.set(node.nodeId.toString(), node);
      }
    }

    if (edges) {
      for (const edge of edges) {
        edgeMap.set(edge.edgeId.toString(), edge);
      }
    }

    const props: WorkflowGraphProps = {
      workflowId,
      nodes: nodeMap,
      edges: edgeMap,
      definition,
      layout
    };

    return new WorkflowGraph(props);
  }

  /**
   * 从已有属性重建工作流图
   * @param props 工作流图属性
   * @returns 工作流图实例
   */
  public static fromProps(props: WorkflowGraphProps): WorkflowGraph {
    return new WorkflowGraph(props);
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
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
   * 获取图定义
   * @returns 图定义
   */
  public get definition(): Record<string, unknown> | undefined {
    return this.props.definition;
  }

  /**
   * 获取布局信息
   * @returns 布局信息
   */
  public get layout(): Record<string, unknown> | undefined {
    return this.props.layout;
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
   * 添加节点
   * @param node 节点
   * @returns 新的工作流图实例
   */
  public addNode(node: Node): WorkflowGraph {
    if (!node.workflowId.equals(this.props.workflowId)) {
      throw new DomainError('节点不属于当前工作流');
    }

    if (this.hasNode(node.nodeId)) {
      throw new DomainError('节点已存在');
    }

    const newNodes = new Map(this.props.nodes);
    newNodes.set(node.nodeId.toString(), node);

    const newProps = {
      ...this.props,
      nodes: newNodes
    };

    return new WorkflowGraph(newProps);
  }

  /**
   * 移除节点
   * @param nodeId 节点ID
   * @returns 新的工作流图实例
   */
  public removeNode(nodeId: ID): WorkflowGraph {
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
      nodes: newNodes
    };

    return new WorkflowGraph(newProps);
  }

  /**
   * 添加边
   * @param edge 边
   * @returns 新的工作流图实例
   */
  public addEdge(edge: Edge): WorkflowGraph {
    if (!edge.workflowId.equals(this.props.workflowId)) {
      throw new DomainError('边不属于当前工作流');
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
      edges: newEdges
    };

    return new WorkflowGraph(newProps);
  }

  /**
   * 移除边
   * @param edgeId 边ID
   * @returns 新的工作流图实例
   */
  public removeEdge(edgeId: ID): WorkflowGraph {
    const edge = this.getEdge(edgeId);
    if (!edge) {
      throw new DomainError('边不存在');
    }

    const newEdges = new Map(this.props.edges);
    newEdges.delete(edgeId.toString());

    const newProps = {
      ...this.props,
      edges: newEdges
    };

    return new WorkflowGraph(newProps);
  }

  /**
   * 更新图定义
   * @param definition 新定义
   * @returns 新的工作流图实例
   */
  public updateDefinition(definition: Record<string, unknown>): WorkflowGraph {
    const newProps = {
      ...this.props,
      definition
    };

    return new WorkflowGraph(newProps);
  }

  /**
   * 更新布局信息
   * @param layout 新布局
   * @returns 新的工作流图实例
   */
  public updateLayout(layout: Record<string, unknown>): WorkflowGraph {
    const newProps = {
      ...this.props,
      layout
    };

    return new WorkflowGraph(newProps);
  }

  /**
   * 验证图的基本结构完整性
   * 只检查最基本的完整性，复杂验证由GraphValidationService处理
   */
  public validateBasicIntegrity(): void {
    // 验证所有边都连接到存在的节点
    for (const edge of this.props.edges.values()) {
      if (!this.hasNode(edge.fromNodeId)) {
        throw new DomainError(`边 ${edge.edgeId} 的源节点不存在`);
      }

      if (!this.hasNode(edge.toNodeId)) {
        throw new DomainError(`边 ${edge.edgeId} 的目标节点不存在`);
      }
    }
  }

  /**
   * 获取图的序列化表示
   * @returns 序列化图数据
   */
  public toJSON(): Record<string, unknown> {
    return {
      workflowId: this.props.workflowId.toString(),
      nodeCount: this.props.nodes.size,
      edgeCount: this.props.edges.size,
      definition: this.props.definition,
      layout: this.props.layout
    };
  }

  /**
   * 比较两个图是否相等（基于ID）
   * @param other 另一个图
   * @returns 是否相等
   */
  public equals(other: WorkflowGraph): boolean {
    return this.props.workflowId.equals(other.workflowId);
  }

  /**
   * 克隆图
   * @returns 克隆的图实例
   */
  public clone(): WorkflowGraph {
    return new WorkflowGraph({
      ...this.props,
      nodes: new Map(this.props.nodes),
      edges: new Map(this.props.edges)
    });
  }
}