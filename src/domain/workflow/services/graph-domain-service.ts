import { Graph } from '../entities/graph';
import { Node } from '../entities/nodes';
import { Edge } from '../entities/edges';
import { GraphRepository, NodeRepository, EdgeRepository } from '../repositories/graph-repository';
import { ID } from '../../common/value-objects/id';
import { NodeType } from '../value-objects/node-type';
import { EdgeType } from '../value-objects/edge-type';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 图领域服务
 * 
 * 提供图相关的业务逻辑和规则
 */
export class GraphDomainService {
  /**
   * 构造函数
   * @param graphRepository 图仓储
   * @param nodeRepository 节点仓储
   * @param edgeRepository 边仓储
   */
  constructor(
    private readonly graphRepository: GraphRepository,
    private readonly nodeRepository: NodeRepository,
    private readonly edgeRepository: EdgeRepository
  ) { }

  /**
   * 创建新图
   * @param name 图名称
   * @param description 图描述
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns 新图
   */
  async createGraph(
    name: string,
    description?: string,
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): Promise<Graph> {
    // 验证图名称是否已存在
    const exists = await this.graphRepository.existsByName(name);
    if (exists) {
      throw new DomainError(`图名称 "${name}" 已存在`);
    }

    // 创建图
    const graph = Graph.create(name, description, metadata, createdBy);

    // 保存图
    return await this.graphRepository.save(graph);
  }

  /**
   * 添加节点到图
   * @param graphId 图ID
   * @param nodeType 节点类型
   * @param nodeName 节点名称
   * @param nodeDescription 节点描述
   * @param position 节点位置
   * @param properties 节点属性
   * @param addedBy 添加者ID
   * @returns 更新后的图
   */
  async addNodeToGraph(
    graphId: ID,
    nodeType: NodeType,
    nodeName?: string,
    nodeDescription?: string,
    position?: { x: number; y: number },
    properties?: Record<string, unknown>,
    addedBy?: ID
  ): Promise<Graph> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    if (graph.isDeleted()) {
      throw new DomainError('无法向已删除的图添加节点');
    }

    // 验证节点类型的约束
    this.validateNodeTypeConstraints(graph, nodeType);

    // 创建节点
    const node = Node.create(
      graphId,
      nodeType,
      nodeName,
      nodeDescription,
      position,
      properties
    );

    // 添加节点到图
    graph.addNode(node, addedBy);

    // 保存图和节点
    await this.graphRepository.save(graph);
    await this.nodeRepository.save(node);

    return graph;
  }

  /**
   * 从图移除节点
   * @param graphId 图ID
   * @param nodeId 节点ID
   * @param removedBy 移除者ID
   * @returns 更新后的图
   */
  async removeNodeFromGraph(
    graphId: ID,
    nodeId: ID,
    removedBy?: ID
  ): Promise<Graph> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    if (graph.isDeleted()) {
      throw new DomainError('无法从已删除的图移除节点');
    }

    // 移除节点
    graph.removeNode(nodeId, removedBy);

    // 保存图
    return await this.graphRepository.save(graph);
  }

  /**
   * 添加边到图
   * @param graphId 图ID
   * @param edgeType 边类型
   * @param fromNodeId 源节点ID
   * @param toNodeId 目标节点ID
   * @param condition 条件表达式
   * @param weight 权重
   * @param properties 边属性
   * @param addedBy 添加者ID
   * @returns 更新后的图
   */
  async addEdgeToGraph(
    graphId: ID,
    edgeType: EdgeType,
    fromNodeId: ID,
    toNodeId: ID,
    condition?: string,
    weight?: number,
    properties?: Record<string, unknown>,
    addedBy?: ID
  ): Promise<Graph> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    if (graph.isDeleted()) {
      throw new DomainError('无法向已删除的图添加边');
    }

    // 验证边的约束
    this.validateEdgeConstraints(graph, edgeType, fromNodeId, toNodeId);

    // 创建边
    const edge = Edge.create(
      graphId,
      edgeType,
      fromNodeId,
      toNodeId,
      condition,
      weight,
      properties
    );

    // 添加边到图
    graph.addEdge(edge, addedBy);

    // 保存图和边
    await this.graphRepository.save(graph);
    await this.edgeRepository.save(edge);

    return graph;
  }

  /**
   * 从图移除边
   * @param graphId 图ID
   * @param edgeId 边ID
   * @param removedBy 移除者ID
   * @returns 更新后的图
   */
  async removeEdgeFromGraph(
    graphId: ID,
    edgeId: ID,
    removedBy?: ID
  ): Promise<Graph> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    if (graph.isDeleted()) {
      throw new DomainError('无法从已删除的图移除边');
    }

    // 移除边
    graph.removeEdge(edgeId, removedBy);

    // 保存图
    return await this.graphRepository.save(graph);
  }

  /**
   * 验证图的结构完整性
   * @param graphId 图ID
   * @returns 验证结果
   */
  async validateGraphStructure(graphId: ID): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证图的基本结构
      graph.validate();

      // 检查是否有孤立节点
      const isolatedNodes = this.findIsolatedNodes(graph);
      if (isolatedNodes.length > 0) {
        warnings.push(`发现 ${isolatedNodes.length} 个孤立节点`);
      }

      // 检查是否有不可达的结束节点
      const unreachableEndNodes = this.findUnreachableEndNodes(graph);
      if (unreachableEndNodes.length > 0) {
        errors.push(`发现 ${unreachableEndNodes.length} 个不可达的结束节点`);
      }

      // 检查决策节点是否有默认路径
      const decisionNodesWithoutDefault = this.findDecisionNodesWithoutDefault(graph);
      if (decisionNodesWithoutDefault.length > 0) {
        warnings.push(`发现 ${decisionNodesWithoutDefault.length} 个没有默认路径的决策节点`);
      }

      // 检查是否有循环
      const cycles = this.findCycles(graph);
      if (cycles.length > 0) {
        warnings.push(`发现 ${cycles.length} 个循环`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : '未知错误'],
        warnings
      };
    }
  }

  /**
   * 获取图的执行路径
   * @param graphId 图ID
   * @returns 执行路径列表
   */
  async getExecutionPaths(graphId: ID): Promise<string[][]> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);
    const startNodes = Array.from(graph.nodes.values()).filter(node => node.type.isStart());
    const endNodes = Array.from(graph.nodes.values()).filter(node => node.type.isEnd());

    if (startNodes.length === 0) {
      throw new DomainError('图没有开始节点');
    }

    if (endNodes.length === 0) {
      throw new DomainError('图没有结束节点');
    }

    const paths: string[][] = [];

    for (const startNode of startNodes) {
      const nodePaths = this.findAllPathsFromNode(graph, startNode.nodeId, endNodes.map(n => n.nodeId));
      paths.push(...nodePaths);
    }

    return paths;
  }

  /**
   * 获取图的统计信息
   * @param graphId 图ID
   * @returns 统计信息
   */
  async getGraphStatistics(graphId: ID): Promise<{
    nodeCount: number;
    edgeCount: number;
    nodeTypeStats: Record<string, number>;
    edgeTypeStats: Record<string, number>;
    pathCount: number;
    cycleCount: number;
  }> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    // 统计节点类型
    const nodeTypeStats: Record<string, number> = {};
    for (const node of graph.nodes.values()) {
      const type = node.type.toString();
      nodeTypeStats[type] = (nodeTypeStats[type] || 0) + 1;
    }

    // 统计边类型
    const edgeTypeStats: Record<string, number> = {};
    for (const edge of graph.edges.values()) {
      const type = edge.type.toString();
      edgeTypeStats[type] = (edgeTypeStats[type] || 0) + 1;
    }

    // 计算路径数量
    const paths = await this.getExecutionPaths(graphId);

    // 计算循环数量
    const cycles = this.findCycles(graph);

    return {
      nodeCount: graph.getNodeCount(),
      edgeCount: graph.getEdgeCount(),
      nodeTypeStats,
      edgeTypeStats,
      pathCount: paths.length,
      cycleCount: cycles.length
    };
  }

  /**
   * 验证节点类型的约束
   * @param graph 图
   * @param nodeType 节点类型
   */
  private validateNodeTypeConstraints(graph: Graph, nodeType: NodeType): void {
    // 检查开始节点的约束
    if (nodeType.isStart()) {
      const existingStartNodes = Array.from(graph.nodes.values()).filter(node => node.type.isStart());
      if (existingStartNodes.length > 0) {
        throw new DomainError('图只能有一个开始节点');
      }
    }

    // 检查结束节点的约束
    if (nodeType.isEnd()) {
      const existingEndNodes = Array.from(graph.nodes.values()).filter(node => node.type.isEnd());
      if (existingEndNodes.length === 0 && graph.getNodeCount() > 0) {
        // 第一个结束节点是允许的
      }
    }
  }

  /**
   * 验证边的约束
   * @param graph 图
   * @param edgeType 边类型
   * @param fromNodeId 源节点ID
   * @param toNodeId 目标节点ID
   */
  private validateEdgeConstraints(
    graph: Graph,
    edgeType: EdgeType,
    fromNodeId: ID,
    toNodeId: ID
  ): void {
    const fromNode = graph.getNode(fromNodeId);
    const toNode = graph.getNode(toNodeId);

    if (!fromNode) {
      throw new DomainError('源节点不存在');
    }

    if (!toNode) {
      throw new DomainError('目标节点不存在');
    }

    // 检查自环边
    if (fromNodeId.equals(toNodeId)) {
      throw new DomainError('不允许创建自环边');
    }

    // 检查开始节点的入边
    if (toNode.type.isStart()) {
      throw new DomainError('开始节点不能有入边');
    }

    // 检查结束节点的出边
    if (fromNode.type.isEnd()) {
      throw new DomainError('结束节点不能有出边');
    }

    // 检查条件边的约束
    if (edgeType.isConditional() && !fromNode.type.isDecision()) {
      throw new DomainError('条件边只能从决策节点出发');
    }
  }

  /**
   * 查找孤立节点
   * @param graph 图
   * @returns 孤立节点列表
   */
  private findIsolatedNodes(graph: Graph): Node[] {
    const isolatedNodes: Node[] = [];

    for (const node of graph.nodes.values()) {
      const incomingEdges = graph.getIncomingEdges(node.nodeId);
      const outgoingEdges = graph.getOutgoingEdges(node.nodeId);

      if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
        isolatedNodes.push(node);
      }
    }

    return isolatedNodes;
  }

  /**
   * 查找不可达的结束节点
   * @param graph 图
   * @returns 不可达的结束节点列表
   */
  private findUnreachableEndNodes(graph: Graph): Node[] {
    const startNodes = Array.from(graph.nodes.values()).filter(node => node.type.isStart());
    const endNodes = Array.from(graph.nodes.values()).filter(node => node.type.isEnd());
    const unreachableEndNodes: Node[] = [];

    if (startNodes.length === 0) {
      return endNodes; // 没有开始节点，所有结束节点都不可达
    }

    for (const startNode of startNodes) {
      const visited = new Set<string>();
      const queue = [startNode.nodeId.toString()];

      while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        if (visited.has(currentNodeId)) {
          continue;
        }
        visited.add(currentNodeId);

        const currentNode = graph.getNode(ID.fromString(currentNodeId));
        if (!currentNode) {
          continue;
        }

        const outgoingEdges = graph.getOutgoingEdges(currentNode.nodeId);
        for (const edge of outgoingEdges) {
          if (!visited.has(edge.toNodeId.toString())) {
            queue.push(edge.toNodeId.toString());
          }
        }
      }

      // 检查哪些结束节点没有被访问
      for (const endNode of endNodes) {
        if (!visited.has(endNode.nodeId.toString())) {
          unreachableEndNodes.push(endNode);
        }
      }
    }

    return unreachableEndNodes;
  }

  /**
   * 查找没有默认路径的决策节点
   * @param graph 图
   * @returns 没有默认路径的决策节点列表
   */
  private findDecisionNodesWithoutDefault(graph: Graph): Node[] {
    const decisionNodesWithoutDefault: Node[] = [];

    for (const node of graph.nodes.values()) {
      if (node.type.isDecision()) {
        const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
        const hasDefaultEdge = outgoingEdges.some(edge => edge.type.isDefault());

        if (!hasDefaultEdge) {
          decisionNodesWithoutDefault.push(node);
        }
      }
    }

    return decisionNodesWithoutDefault;
  }

  /**
   * 查找图中的循环
   * @param graph 图
   * @returns 循环列表
   */
  private findCycles(graph: Graph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const node of graph.nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        const cycle = this.detectCycleFromNode(
          graph,
          node.nodeId,
          visited,
          recursionStack,
          []
        );

        if (cycle.length > 0) {
          cycles.push(cycle);
        }
      }
    }

    return cycles;
  }

  /**
   * 从指定节点检测循环
   * @param graph 图
   * @param nodeId 节点ID
   * @param visited 已访问节点
   * @param recursionStack 递归栈
   * @param path 当前路径
   * @returns 循环路径
   */
  private detectCycleFromNode(
    graph: Graph,
    nodeId: ID,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): string[] {
    const nodeIdStr = nodeId.toString();

    visited.add(nodeIdStr);
    recursionStack.add(nodeIdStr);
    path.push(nodeIdStr);

    const outgoingEdges = graph.getOutgoingEdges(nodeId);
    for (const edge of outgoingEdges) {
      const toNodeIdStr = edge.toNodeId.toString();

      if (!visited.has(toNodeIdStr)) {
        const cycle = this.detectCycleFromNode(
          graph,
          edge.toNodeId,
          visited,
          recursionStack,
          [...path]
        );

        if (cycle.length > 0) {
          return cycle;
        }
      } else if (recursionStack.has(toNodeIdStr)) {
        // 找到循环
        const cycleStart = path.indexOf(toNodeIdStr);
        return path.slice(cycleStart);
      }
    }

    recursionStack.delete(nodeIdStr);
    return [];
  }

  /**
   * 查找从指定节点到目标节点的所有路径
   * @param graph 图
   * @param startNodeId 起始节点ID
   * @param targetNodeIds 目标节点ID列表
   * @returns 路径列表
   */
  private findAllPathsFromNode(
    graph: Graph,
    startNodeId: ID,
    targetNodeIds: ID[]
  ): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currentNodeId: ID, currentPath: string[]) => {
      const currentNodeIdStr = currentNodeId.toString();

      // 检查是否到达目标节点
      if (targetNodeIds.some(id => id.equals(currentNodeId))) {
        paths.push([...currentPath, currentNodeIdStr]);
        return;
      }

      // 避免循环
      if (visited.has(currentNodeIdStr)) {
        return;
      }

      visited.add(currentNodeIdStr);
      const outgoingEdges = graph.getOutgoingEdges(currentNodeId);

      for (const edge of outgoingEdges) {
        dfs(edge.toNodeId, [...currentPath, currentNodeIdStr]);
      }

      visited.delete(currentNodeIdStr);
    };

    dfs(startNodeId, []);
    return paths;
  }
}