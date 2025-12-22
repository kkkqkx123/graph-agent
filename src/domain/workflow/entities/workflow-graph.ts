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
 * 专门负责图结构管理：
 * 1. 节点和边的增删改查
 * 2. 图算法（获取相邻节点、入边出边等）
 * 3. 图结构验证
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
   * 验证图的基本结构
   */
  public validateGraphStructure(): void {
    const startNodes = Array.from(this.props.nodes.values()).filter(node => node.type.isStart());
    const endNodes = Array.from(this.props.nodes.values()).filter(node => node.type.isEnd());

    if (startNodes.length === 0) {
      throw new DomainError('工作流必须至少有一个开始节点');
    }

    if (endNodes.length === 0) {
      throw new DomainError('工作流必须至少有一个结束节点');
    }

    if (startNodes.length > 1) {
      throw new DomainError('工作流只能有一个开始节点');
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
  }

  /**
   * 验证图的有效性
   */
  public validate(): void {
    this.validateGraphStructure();

    // 验证所有节点
    for (const node of this.props.nodes.values()) {
      node.validate();
    }

    // 验证所有边
    for (const edge of this.props.edges.values()) {
      edge.validate();
    }
  }

  /**
   * 获取图的拓扑排序
   * @returns 拓扑排序的节点列表
   */
  public getTopologicalOrder(): Node[] {
    const visited = new Set<string>();
    const result: Node[] = [];

    const visit = (nodeId: ID) => {
      const nodeIdStr = nodeId.toString();
      if (visited.has(nodeIdStr)) return;
      visited.add(nodeIdStr);

      // 先访问所有依赖节点
      const incomingEdges = this.getIncomingEdges(nodeId);
      for (const edge of incomingEdges) {
        visit(edge.fromNodeId);
      }

      // 然后访问当前节点
      const node = this.getNode(nodeId);
      if (node) {
        result.push(node);
      }
    };

    // 从所有节点开始（简化实现）
    for (const node of this.props.nodes.values()) {
      visit(node.nodeId);
    }

    return result;
  }

  /**
   * 检查图是否包含循环
   * @returns 是否包含循环
   */
  public hasCycle(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: ID): boolean => {
      const nodeIdStr = nodeId.toString();
      
      if (recursionStack.has(nodeIdStr)) {
        return true; // 发现循环
      }
      
      if (visited.has(nodeIdStr)) {
        return false;
      }
      
      visited.add(nodeIdStr);
      recursionStack.add(nodeIdStr);
      
      const outgoingEdges = this.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycleDFS(edge.toNodeId)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeIdStr);
      return false;
    };

    for (const node of this.props.nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        if (hasCycleDFS(node.nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 获取图的连通分量
   * @returns 连通分量列表
   */
  public getConnectedComponents(): Node[][] {
    const visited = new Set<string>();
    const components: Node[][] = [];

    const dfs = (nodeId: ID, component: Node[]): void => {
      const nodeIdStr = nodeId.toString();
      if (visited.has(nodeIdStr)) return;
      
      visited.add(nodeIdStr);
      const node = this.getNode(nodeId);
      if (node) {
        component.push(node);
      }
      
      // 访问相邻节点
      const adjacentNodes = this.getAdjacentNodes(nodeId);
      for (const adjacentNode of adjacentNodes) {
        dfs(adjacentNode.nodeId, component);
      }
    };

    for (const node of this.props.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      if (!visited.has(nodeIdStr)) {
        const component: Node[] = [];
        dfs(node.nodeId, component);
        components.push(component);
      }
    }

    return components;
  }
}