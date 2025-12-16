import { ID } from '@domain/common/value-objects/id';
import { Graph } from '@domain/workflow/graph/entities/graph';
import { Node } from '@domain/workflow/graph/entities/nodes/base/node';
import { Edge } from '@domain/workflow/graph/entities/edges/base/edge';
import { GraphRepository, NodeRepository, EdgeRepository } from '@/domain/workflow/repositories/graph-repository';
import { NodeType } from '@/domain/workflow/value-objects/node-type';
import { EdgeType } from '@/domain/workflow/value-objects/edge-type';
import { DomainError } from '@domain/common/errors/domain-error';
import { ValidationResult, ValidationUtils } from '@/domain/workflow/validation';

/**
 * 图构建配置接口
 */
export interface GraphBuildConfig {
  /** 是否启用验证 */
  readonly enableValidation?: boolean;
  /** 是否自动保存 */
  readonly autoSave?: boolean;
  /** 是否允许循环 */
  readonly allowCycles?: boolean;
  /** 最大节点数 */
  readonly maxNodes?: number;
  /** 最大边数 */
  readonly maxEdges?: number;
  /** 自定义验证规则 */
  readonly customValidationRules?: any[];
}

/**
 * 节点构建请求接口
 */
export interface NodeBuildRequest {
  /** 节点ID（可选，自动生成） */
  readonly nodeId?: ID;
  /** 节点类型 */
  readonly nodeType: string;
  /** 节点名称 */
  readonly nodeName?: string;
  /** 节点描述 */
  readonly nodeDescription?: string;
  /** 节点位置 */
  readonly position?: { x: number; y: number };
  /** 节点属性 */
  readonly properties?: Record<string, any>;
  /** 节点配置 */
  readonly config?: Record<string, any>;
}

/**
 * 边构建请求接口
 */
export interface EdgeBuildRequest {
  /** 边ID（可选，自动生成） */
  readonly edgeId?: ID;
  /** 边类型 */
  readonly edgeType: string;
  /** 源节点ID */
  readonly fromNodeId: ID;
  /** 目标节点ID */
  readonly toNodeId: ID;
  /** 条件表达式 */
  readonly condition?: string;
  /** 权重 */
  readonly weight?: number;
  /** 边属性 */
  readonly properties?: Record<string, any>;
  /** 边配置 */
  readonly config?: Record<string, any>;
}

/**
 * 图构建结果接口
 */
export interface GraphBuildResult {
  /** 是否成功 */
  readonly success: boolean;
  /** 图ID */
  readonly graphId: ID;
  /** 构建的节点列表 */
  readonly builtNodes: ID[];
  /** 构建的边列表 */
  readonly builtEdges: ID[];
  /** 验证结果 */
  readonly validationResult?: ValidationResult;
  /** 错误信息 */
  readonly errors: string[];
  /** 警告信息 */
  readonly warnings: string[];
  /** 构建元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 图构建服务接口
 */
export interface IGraphBuildService {
  /**
   * 创建新图
   */
  createGraph(
    name: string,
    description?: string,
    config?: GraphBuildConfig,
    metadata?: Record<string, any>,
    createdBy?: ID
  ): Promise<Graph>;

  /**
   * 从模板创建图
   */
  createGraphFromTemplate(
    templateId: string,
    name: string,
    description?: string,
    parameters?: Record<string, any>,
    config?: GraphBuildConfig,
    createdBy?: ID
  ): Promise<Graph>;

  /**
   * 克隆图
   */
  cloneGraph(
    sourceGraphId: ID,
    newName: string,
    newDescription?: string,
    config?: GraphBuildConfig,
    createdBy?: ID
  ): Promise<Graph>;

  /**
   * 添加节点到图
   */
  addNode(
    graphId: ID,
    request: NodeBuildRequest,
    addedBy?: ID
  ): Promise<Node>;

  /**
   * 批量添加节点到图
   */
  addNodes(
    graphId: ID,
    requests: NodeBuildRequest[],
    addedBy?: ID
  ): Promise<Node[]>;

  /**
   * 更新图中的节点
   */
  updateNode(
    graphId: ID,
    nodeId: ID,
    updates: Partial<NodeBuildRequest>,
    updatedBy?: ID
  ): Promise<Node>;

  /**
   * 从图移除节点
   */
  removeNode(
    graphId: ID,
    nodeId: ID,
    removedBy?: ID
  ): Promise<void>;

  /**
   * 批量从图移除节点
   */
  removeNodes(
    graphId: ID,
    nodeIds: ID[],
    removedBy?: ID
  ): Promise<void>;

  /**
   * 添加边到图
   */
  addEdge(
    graphId: ID,
    request: EdgeBuildRequest,
    addedBy?: ID
  ): Promise<Edge>;

  /**
   * 批量添加边到图
   */
  addEdges(
    graphId: ID,
    requests: EdgeBuildRequest[],
    addedBy?: ID
  ): Promise<Edge[]>;

  /**
   * 更新图中的边
   */
  updateEdge(
    graphId: ID,
    edgeId: ID,
    updates: Partial<EdgeBuildRequest>,
    updatedBy?: ID
  ): Promise<Edge>;

  /**
   * 从图移除边
   */
  removeEdge(
    graphId: ID,
    edgeId: ID,
    removedBy?: ID
  ): Promise<void>;

  /**
   * 批量从图移除边
   */
  removeEdges(
    graphId: ID,
    edgeIds: ID[],
    removedBy?: ID
  ): Promise<void>;

  /**
   * 连接两个节点
   */
  connectNodes(
    graphId: ID,
    fromNodeId: ID,
    toNodeId: ID,
    edgeType?: string,
    condition?: string,
    weight?: number,
    addedBy?: ID
  ): Promise<Edge>;

  /**
   * 断开两个节点
   */
  disconnectNodes(
    graphId: ID,
    fromNodeId: ID,
    toNodeId: ID,
    removedBy?: ID
  ): Promise<void>;

  /**
   * 验证图结构
   */
  validateGraph(graphId: ID): Promise<ValidationResult>;

  /**
   * 自动布局图
   */
  autoLayout(
    graphId: ID,
    layoutType?: 'hierarchical' | 'force' | 'circular' | 'grid',
    options?: Record<string, any>
  ): Promise<void>;

  /**
   * 优化图结构
   */
  optimizeGraph(
    graphId: ID,
    options?: {
      removeUnusedNodes?: boolean;
      mergeSimilarNodes?: boolean;
      simplifyPaths?: boolean;
    }
  ): Promise<void>;

  /**
   * 导入图数据
   */
  importGraph(
    data: string,
    format?: 'json' | 'yaml' | 'xml' | 'graphml',
    name?: string,
    description?: string,
    config?: GraphBuildConfig,
    createdBy?: ID
  ): Promise<Graph>;

  /**
   * 导出图数据
   */
  exportGraph(
    graphId: ID,
    format?: 'json' | 'yaml' | 'xml' | 'graphml' | 'dot',
    options?: Record<string, any>
  ): Promise<string>;

  /**
   * 获取图构建统计信息
   */
  getBuildStatistics(graphId: ID): Promise<{
    nodeCount: number;
    edgeCount: number;
    nodeTypeDistribution: Record<string, number>;
    edgeTypeDistribution: Record<string, number>;
    connectivityMetrics: {
      averageDegree: number;
      density: number;
      components: number;
    };
  }>;
}

/**
 * 默认图构建服务实现
 */
export class DefaultGraphBuildService implements IGraphBuildService {
  constructor(
    private readonly graphRepository: GraphRepository,
    private readonly nodeRepository: NodeRepository,
    private readonly edgeRepository: EdgeRepository
  ) { }

  /**
   * 创建新图
   */
  async createGraph(
    name: string,
    description?: string,
    config: GraphBuildConfig = {},
    metadata?: Record<string, any>,
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
   * 从模板创建图
   */
  async createGraphFromTemplate(
    templateId: string,
    name: string,
    description?: string,
    parameters: Record<string, any> = {},
    config: GraphBuildConfig = {},
    createdBy?: ID
  ): Promise<Graph> {
    // 这里应该实现从模板创建图的逻辑
    // 简化实现，直接创建空图
    return await this.createGraph(name, description, config, { templateId, parameters }, createdBy);
  }

  /**
   * 克隆图
   */
  async cloneGraph(
    sourceGraphId: ID,
    newName: string,
    newDescription?: string,
    config: GraphBuildConfig = {},
    createdBy?: ID
  ): Promise<Graph> {
    const sourceGraph = await this.graphRepository.findByIdOrFail(sourceGraphId);

    // 创建新图
    const newGraph = await this.createGraph(newName, newDescription, config, { clonedFrom: sourceGraphId }, createdBy);

    // 克隆节点
    const nodeIdMapping = new Map<string, ID>();
    for (const [oldNodeId, node] of sourceGraph.nodes) {
      const newNode = Node.create(
        newGraph.graphId,
        node.type,
        node.name,
        node.description,
        node.position,
        { ...node.properties }
      );

      await this.nodeRepository.save(newNode);
      nodeIdMapping.set(oldNodeId, newNode.id);
    }

    // 克隆边
    for (const [oldEdgeId, edge] of sourceGraph.edges) {
      const newFromNodeId = nodeIdMapping.get(edge.fromNodeId.value);
      const newToNodeId = nodeIdMapping.get(edge.toNodeId.value);

      if (newFromNodeId && newToNodeId) {
        const newEdge = Edge.create(
          newGraph.graphId,
          edge.type,
          newFromNodeId,
          newToNodeId,
          edge.condition,
          edge.weight,
          { ...edge.properties }
        );

        await this.edgeRepository.save(newEdge);
      }
    }

    // 重新加载图以包含所有节点和边
    return await this.graphRepository.findByIdOrFail(newGraph.graphId);
  }

  /**
   * 添加节点到图
   */
  async addNode(
    graphId: ID,
    request: NodeBuildRequest,
    addedBy?: ID
  ): Promise<Node> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    if (graph.isDeleted()) {
      throw new DomainError('无法向已删除的图添加节点');
    }

    // 创建节点
    const nodeId = request.nodeId || ID.generate();
    const nodeType = NodeType.fromString(request.nodeType);
    const node = Node.create(
      graphId,
      nodeType,
      request.nodeName,
      request.nodeDescription,
      request.position,
      request.properties
    );

    // 添加节点到图
    graph.addNode(node, addedBy);

    // 保存图和节点
    await this.graphRepository.save(graph);
    await this.nodeRepository.save(node);

    return node;
  }

  /**
   * 批量添加节点到图
   */
  async addNodes(
    graphId: ID,
    requests: NodeBuildRequest[],
    addedBy?: ID
  ): Promise<Node[]> {
    const nodes: Node[] = [];

    for (const request of requests) {
      const node = await this.addNode(graphId, request, addedBy);
      nodes.push(node);
    }

    return nodes;
  }

  /**
   * 更新图中的节点
   */
  async updateNode(
    graphId: ID,
    nodeId: ID,
    updates: Partial<NodeBuildRequest>,
    updatedBy?: ID
  ): Promise<Node> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);
    const node = graph.getNode(nodeId);

    if (!node) {
      throw new DomainError(`节点不存在: ${nodeId}`);
    }

    // 更新节点属性
    if (updates.nodeName) {
      node.updateName(updates.nodeName);
    }

    if (updates.nodeDescription) {
      node.updateDescription(updates.nodeDescription);
    }

    if (updates.position) {
      node.updatePosition(updates.position);
    }

    if (updates.properties) {
      node.updateProperties(updates.properties);
    }

    if (updates.config) {
      // updateConfig 方法不存在，需要使用 updateProperties
      node.updateProperties(updates.config || {});
    }

    // 保存节点
    return await this.nodeRepository.save(node);
  }

  /**
   * 从图移除节点
   */
  async removeNode(
    graphId: ID,
    nodeId: ID,
    removedBy?: ID
  ): Promise<void> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    if (graph.isDeleted()) {
      throw new DomainError('无法从已删除的图移除节点');
    }

    // 移除节点
    graph.removeNode(nodeId, removedBy);

    // 保存图
    await this.graphRepository.save(graph);
  }

  /**
   * 批量从图移除节点
   */
  async removeNodes(
    graphId: ID,
    nodeIds: ID[],
    removedBy?: ID
  ): Promise<void> {
    for (const nodeId of nodeIds) {
      await this.removeNode(graphId, nodeId, removedBy);
    }
  }

  /**
   * 添加边到图
   */
  async addEdge(
    graphId: ID,
    request: EdgeBuildRequest,
    addedBy?: ID
  ): Promise<Edge> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    if (graph.isDeleted()) {
      throw new DomainError('无法向已删除的图添加边');
    }

    // 验证节点存在
    const fromNode = graph.getNode(request.fromNodeId);
    const toNode = graph.getNode(request.toNodeId);

    if (!fromNode) {
      throw new DomainError(`源节点不存在: ${request.fromNodeId}`);
    }

    if (!toNode) {
      throw new DomainError(`目标节点不存在: ${request.toNodeId}`);
    }

    // 创建边
    const edgeId = request.edgeId || ID.generate();
    const edgeType = EdgeType.fromString(request.edgeType);
    const edge = Edge.create(
      graphId,
      edgeType,
      request.fromNodeId,
      request.toNodeId,
      request.condition,
      request.weight,
      request.properties
    );

    // 添加边到图
    graph.addEdge(edge, addedBy);

    // 保存图和边
    await this.graphRepository.save(graph);
    await this.edgeRepository.save(edge);

    return edge;
  }

  /**
   * 批量添加边到图
   */
  async addEdges(
    graphId: ID,
    requests: EdgeBuildRequest[],
    addedBy?: ID
  ): Promise<Edge[]> {
    const edges: Edge[] = [];

    for (const request of requests) {
      const edge = await this.addEdge(graphId, request, addedBy);
      edges.push(edge);
    }

    return edges;
  }

  /**
   * 更新图中的边
   */
  async updateEdge(
    graphId: ID,
    edgeId: ID,
    updates: Partial<EdgeBuildRequest>,
    updatedBy?: ID
  ): Promise<Edge> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);
    const edge = graph.getEdge(edgeId);

    if (!edge) {
      throw new DomainError(`边不存在: ${edgeId}`);
    }

    // 更新边属性
    if (updates.condition !== undefined) {
      edge.updateCondition(updates.condition);
    }

    if (updates.weight !== undefined) {
      edge.updateWeight(updates.weight);
    }

    if (updates.properties) {
      edge.updateProperties(updates.properties);
    }

    if (updates.config) {
      // updateConfig 方法不存在，需要使用 updateProperties
      edge.updateProperties(updates.config || {});
    }

    // 保存边
    return await this.edgeRepository.save(edge);
  }

  /**
   * 从图移除边
   */
  async removeEdge(
    graphId: ID,
    edgeId: ID,
    removedBy?: ID
  ): Promise<void> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    if (graph.isDeleted()) {
      throw new DomainError('无法从已删除的图移除边');
    }

    // 移除边
    graph.removeEdge(edgeId, removedBy);

    // 保存图
    await this.graphRepository.save(graph);
  }

  /**
   * 批量从图移除边
   */
  async removeEdges(
    graphId: ID,
    edgeIds: ID[],
    removedBy?: ID
  ): Promise<void> {
    for (const edgeId of edgeIds) {
      await this.removeEdge(graphId, edgeId, removedBy);
    }
  }

  /**
   * 连接两个节点
   */
  async connectNodes(
    graphId: ID,
    fromNodeId: ID,
    toNodeId: ID,
    edgeType: string = 'default',
    condition?: string,
    weight?: number,
    addedBy?: ID
  ): Promise<Edge> {
    const request: EdgeBuildRequest = {
      edgeType,
      fromNodeId,
      toNodeId,
      condition,
      weight
    };

    return await this.addEdge(graphId, request, addedBy);
  }

  /**
   * 断开两个节点
   */
  async disconnectNodes(
    graphId: ID,
    fromNodeId: ID,
    toNodeId: ID,
    removedBy?: ID
  ): Promise<void> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    // 查找连接两个节点的边
    const edgesToRemove = Array.from(graph.edges.values()).filter(
      edge => edge.fromNodeId.equals(fromNodeId) && edge.toNodeId.equals(toNodeId)
    );

    // 移除所有连接边
    for (const edge of edgesToRemove) {
      await this.removeEdge(graphId, edge.edgeId, removedBy);
    }
  }

  /**
   * 验证图结构
   */
  async validateGraph(graphId: ID): Promise<ValidationResult> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    // 简化实现，实际中应该使用完整的验证逻辑
    const errors: any[] = [];
    const warnings: any[] = [];

    // 基本验证
    if (graph.getNodeCount() === 0) {
      errors.push(
        ValidationUtils.createStructureError('图必须包含至少一个节点')
          .withGraphId(graphId)
          .build()
      );
    }

    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 自动布局图
   */
  async autoLayout(
    graphId: ID,
    layoutType: 'hierarchical' | 'force' | 'circular' | 'grid' = 'hierarchical',
    options: Record<string, any> = {}
  ): Promise<void> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    // 简化实现，实际中应该实现真正的布局算法
    const nodes = Array.from(graph.nodes.values());
    const nodeCount = nodes.length;

    for (let i = 0; i < nodeCount; i++) {
      const node = nodes[i];
      let x = 0, y = 0;

      switch (layoutType) {
        case 'grid':
          const cols = Math.ceil(Math.sqrt(nodeCount));
          x = (i % cols) * 200;
          y = Math.floor(i / cols) * 150;
          break;
        case 'circular':
          const angle = (i / nodeCount) * 2 * Math.PI;
          const radius = 200;
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius;
          break;
        case 'hierarchical':
          x = (i % 3) * 200;
          y = Math.floor(i / 3) * 150;
          break;
        default:
          x = Math.random() * 400;
          y = Math.random() * 300;
      }

      // updatePosition 方法存在，但需要确保 node 不为 undefined
      if (node) {
        node.updatePosition({ x, y });
        await this.nodeRepository.save(node);
      }
    }
  }

  /**
   * 优化图结构
   */
  async optimizeGraph(
    graphId: ID,
    options: {
      removeUnusedNodes?: boolean;
      mergeSimilarNodes?: boolean;
      simplifyPaths?: boolean;
    } = {}
  ): Promise<void> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    // 简化实现，实际中应该实现真正的优化算法
    if (options.removeUnusedNodes) {
      // 移除未使用的节点
      const unusedNodes = Array.from(graph.nodes.values()).filter(node => {
        const incomingEdges = graph.getIncomingEdges(node.nodeId);
        const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
        return incomingEdges.length === 0 && outgoingEdges.length === 0;
      });

      for (const node of unusedNodes) {
        await this.removeNode(graphId, node.nodeId);
      }
    }
  }

  /**
   * 导入图数据
   */
  async importGraph(
    data: string,
    format: 'json' | 'yaml' | 'xml' | 'graphml' = 'json',
    name?: string,
    description?: string,
    config: GraphBuildConfig = {},
    createdBy?: ID
  ): Promise<Graph> {
    // 简化实现，实际中应该支持多种格式
    const graphData = JSON.parse(data);

    const graph = await this.createGraph(
      name || graphData.name || 'Imported Graph',
      description || graphData.description,
      config,
      { imported: true, originalFormat: format },
      createdBy
    );

    // 导入节点
    if (graphData.nodes) {
      for (const nodeData of graphData.nodes) {
        await this.addNode(graph.graphId, {
          nodeType: nodeData.type,
          nodeName: nodeData.name,
          nodeDescription: nodeData.description,
          position: nodeData.position,
          properties: nodeData.properties,
          config: nodeData.config
        });
      }
    }

    // 导入边
    if (graphData.edges) {
      for (const edgeData of graphData.edges) {
        await this.addEdge(graph.graphId, {
          edgeType: edgeData.type,
          fromNodeId: ID.fromString(edgeData.fromNodeId),
          toNodeId: ID.fromString(edgeData.toNodeId),
          condition: edgeData.condition,
          weight: edgeData.weight,
          properties: edgeData.properties,
          config: edgeData.config
        });
      }
    }

    return graph;
  }

  /**
   * 导出图数据
   */
  async exportGraph(
    graphId: ID,
    format: 'json' | 'yaml' | 'xml' | 'graphml' | 'dot' = 'json',
    options: Record<string, any> = {}
  ): Promise<string> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    // 简化实现，只支持JSON格式
    const exportData = {
      id: graph.graphId.toString(),
      name: graph.name,
      description: graph.description,
      metadata: graph.metadata,
      nodes: Array.from(graph.nodes.values()).map(node => ({
        id: node.nodeId.toString(),
        type: node.type.toString(),
        name: node.name,
        description: node.description,
        position: node.position,
        properties: node.properties,
        config: node.properties
      })),
      edges: Array.from(graph.edges.values()).map(edge => ({
        id: edge.edgeId.toString(),
        type: edge.type.toString(),
        fromNodeId: edge.fromNodeId.toString(),
        toNodeId: edge.toNodeId.toString(),
        condition: edge.condition,
        weight: edge.weight,
        properties: edge.properties,
        config: edge.properties
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 获取图构建统计信息
   */
  async getBuildStatistics(graphId: ID): Promise<{
    nodeCount: number;
    edgeCount: number;
    nodeTypeDistribution: Record<string, number>;
    edgeTypeDistribution: Record<string, number>;
    connectivityMetrics: {
      averageDegree: number;
      density: number;
      components: number;
    };
  }> {
    const graph = await this.graphRepository.findByIdOrFail(graphId);

    // 统计节点类型分布
    const nodeTypeDistribution: Record<string, number> = {};
    for (const node of graph.nodes.values()) {
      const type = node.type.toString();
      nodeTypeDistribution[type] = (nodeTypeDistribution[type] || 0) + 1;
    }

    // 统计边类型分布
    const edgeTypeDistribution: Record<string, number> = {};
    for (const edge of graph.edges.values()) {
      const type = edge.type.toString();
      edgeTypeDistribution[type] = (edgeTypeDistribution[type] || 0) + 1;
    }

    // 计算连通性指标
    const nodeCount = graph.getNodeCount();
    const edgeCount = graph.getEdgeCount();
    const averageDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    const components = 1; // 简化实现，实际中应该计算连通分量数

    return {
      nodeCount,
      edgeCount,
      nodeTypeDistribution,
      edgeTypeDistribution,
      connectivityMetrics: {
        averageDegree,
        density,
        components
      }
    };
  }
}