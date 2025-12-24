import { ID } from '../../common/value-objects/id';
import { Workflow } from '../entities/workflow';
import { Node } from '../entities/nodes/base/node';
import { Edge } from '../entities/edges/base/edge';
import { WorkflowRepository } from '../repositories/workflow-repository';
import { NodeType } from '../value-objects/node-type';
import { EdgeType } from '../value-objects/edge-type';
import { DomainError } from '../../common/errors/domain-error';
import { ValidationResult, ValidationUtils } from '../validation';

/**
 * 工作流图构建配置接口
 */
export interface WorkflowWorkflowBuildConfig {
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
 * 工作流图构建结果接口
 */
export interface WorkflowWorkflowBuildResult {
  /** 是否成功 */
  readonly success: boolean;
  /** 工作流ID */
  readonly workflowId: ID;
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
 * 工作流图构建服务接口
 */
export interface IWorkflowWorkflowBuildService {
  /**
   * 创建新工作流
   */
  createWorkflow(
    name: string,
    description?: string,
    config?: WorkflowWorkflowBuildConfig,
    metadata?: Record<string, any>,
    createdBy?: ID
  ): Promise<Workflow>;

  /**
   * 从模板创建工作流
   */
  createWorkflowFromTemplate(
    templateId: string,
    name: string,
    description?: string,
    parameters?: Record<string, any>,
    config?: WorkflowWorkflowBuildConfig,
    createdBy?: ID
  ): Promise<Workflow>;

  /**
   * 克隆工作流
   */
  cloneWorkflow(
    sourceWorkflowId: ID,
    newName: string,
    newDescription?: string,
    config?: WorkflowWorkflowBuildConfig,
    createdBy?: ID
  ): Promise<Workflow>;

  /**
   * 添加节点到图
   */
  addNode(
    workflowId: ID,
    request: NodeBuildRequest,
    addedBy?: ID
  ): Promise<Node>;

  /**
   * 批量添加节点到图
   */
  addNodes(
    workflowId: ID,
    requests: NodeBuildRequest[],
    addedBy?: ID
  ): Promise<Node[]>;

  /**
   * 更新图中的节点
   */
  updateNode(
    workflowId: ID,
    nodeId: ID,
    updates: Partial<NodeBuildRequest>,
    updatedBy?: ID
  ): Promise<Node>;

  /**
   * 从图移除节点
   */
  removeNode(
    workflowId: ID,
    nodeId: ID,
    removedBy?: ID
  ): Promise<void>;

  /**
   * 批量从图移除节点
   */
  removeNodes(
    workflowId: ID,
    nodeIds: ID[],
    removedBy?: ID
  ): Promise<void>;

  /**
   * 添加边到图
   */
  addEdge(
    workflowId: ID,
    request: EdgeBuildRequest,
    addedBy?: ID
  ): Promise<Edge>;

  /**
   * 批量添加边到图
   */
  addEdges(
    workflowId: ID,
    requests: EdgeBuildRequest[],
    addedBy?: ID
  ): Promise<Edge[]>;

  /**
   * 更新图中的边
   */
  updateEdge(
    workflowId: ID,
    edgeId: ID,
    updates: Partial<EdgeBuildRequest>,
    updatedBy?: ID
  ): Promise<Edge>;

  /**
   * 从图移除边
   */
  removeEdge(
    workflowId: ID,
    edgeId: ID,
    removedBy?: ID
  ): Promise<void>;

  /**
   * 批量从图移除边
   */
  removeEdges(
    workflowId: ID,
    edgeIds: ID[],
    removedBy?: ID
  ): Promise<void>;

  /**
   * 连接两个节点
   */
  connectNodes(
    workflowId: ID,
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
    workflowId: ID,
    fromNodeId: ID,
    toNodeId: ID,
    removedBy?: ID
  ): Promise<void>;

  /**
   * 验证工作流图结构
   */
  validateWorkflowWorkflow(workflowId: ID): Promise<ValidationResult>;

  /**
   * 自动布局工作流图
   */
  autoLayoutWorkflow(
    workflowId: ID,
    layoutType?: 'hierarchical' | 'force' | 'circular' | 'grid',
    options?: Record<string, any>
  ): Promise<void>;

  /**
   * 优化工作流图结构
   */
  optimizeWorkflowWorkflow(
    workflowId: ID,
    options?: {
      removeUnusedNodes?: boolean;
      mergeSimilarNodes?: boolean;
      simplifyPaths?: boolean;
    }
  ): Promise<void>;

  /**
   * 导入工作流图数据
   */
  importWorkflowWorkflow(
    data: string,
    format?: 'json' | 'yaml' | 'xml' | 'workflowml',
    name?: string,
    description?: string,
    config?: WorkflowWorkflowBuildConfig,
    createdBy?: ID
  ): Promise<Workflow>;

  /**
   * 导出工作流图数据
   */
  exportWorkflowWorkflow(
    workflowId: ID,
    format?: 'json' | 'yaml' | 'xml' | 'workflowml' | 'dot',
    options?: Record<string, any>
  ): Promise<string>;

  /**
   * 获取工作流图构建统计信息
   */
  getWorkflowBuildStatistics(workflowId: ID): Promise<{
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
 * 默认工作流图构建服务实现
 */
export class DefaultWorkflowWorkflowBuildService implements IWorkflowWorkflowBuildService {
  constructor(
    private readonly workflowRepository: WorkflowRepository
  ) { }

  /**
   * 创建新工作流
   */
  async createWorkflow(
    name: string,
    description?: string,
    config: WorkflowWorkflowBuildConfig = {},
    metadata?: Record<string, any>,
    createdBy?: ID
  ): Promise<Workflow> {
    // 验证工作流名称是否已存在
    const exists = await this.workflowRepository.existsByName(name);
    if (exists) {
      throw new DomainError(`工作流名称 "${name}" 已存在`);
    }

    // 创建工作流
    const workflow = Workflow.create(
      name,
      description,
      undefined, // nodes
      undefined, // edges
      undefined, // type
      undefined, // config
      undefined, // errorHandlingStrategy
      undefined, // executionStrategy
      undefined, // tags
      metadata,
      createdBy
    );

    // 保存工作流
    return await this.workflowRepository.save(workflow);
  }

  /**
   * 从模板创建工作流
   */
  async createWorkflowFromTemplate(
    templateId: string,
    name: string,
    description?: string,
    parameters: Record<string, any> = {},
    config: WorkflowWorkflowBuildConfig = {},
    createdBy?: ID
  ): Promise<Workflow> {
    // 这里应该实现从模板创建工作流的逻辑
    // 简化实现，直接创建空工作流
    return await this.createWorkflow(name, description, config, { templateId, parameters }, createdBy);
  }

  /**
   * 克隆工作流
   */
  async cloneWorkflow(
    sourceWorkflowId: ID,
    newName: string,
    newDescription?: string,
    config: WorkflowWorkflowBuildConfig = {},
    createdBy?: ID
  ): Promise<Workflow> {
    const sourceWorkflow = await this.workflowRepository.findByIdOrFail(sourceWorkflowId);

    // 创建新工作流
    const newWorkflow = await this.createWorkflow(newName, newDescription, config, { clonedFrom: sourceWorkflowId }, createdBy);

    // 克隆节点
    const nodeIdMapping = new Map<string, ID>();
    for (const [oldNodeId, node] of sourceWorkflow.nodes) {
      const newNode = Node.create(
        newWorkflow.workflowId,
        node.type,
        node.name,
        node.description,
        node.position,
        { ...node.properties }
      );

      newWorkflow.addNode(newNode, createdBy);
      nodeIdMapping.set(oldNodeId, newNode.nodeId);
    }

    // 克隆边
    for (const [oldEdgeId, edge] of sourceWorkflow.edges) {
      const newFromNodeId = nodeIdMapping.get(edge.fromNodeId.toString());
      const newToNodeId = nodeIdMapping.get(edge.toNodeId.toString());

      if (newFromNodeId && newToNodeId) {
        const newEdge = Edge.create(
          newWorkflow.workflowId,
          edge.type,
          newFromNodeId,
          newToNodeId,
          edge.condition,
          edge.weight,
          { ...edge.properties }
        );

        newWorkflow.addEdge(newEdge, createdBy);
      }
    }

    // 保存工作流
    return await this.workflowRepository.save(newWorkflow);
  }

  /**
   * 添加节点到工作流
   */
  async addNode(
    workflowId: ID,
    request: NodeBuildRequest,
    addedBy?: ID
  ): Promise<Node> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.isDeleted()) {
      throw new DomainError('无法向已删除的工作流添加节点');
    }

    // 创建节点
    const nodeType = NodeType.fromString(request.nodeType);
    const node = Node.create(
      workflowId,
      nodeType,
      request.nodeName,
      request.nodeDescription,
      request.position,
      request.properties
    );

    // 添加节点到工作流
    workflow.addNode(node, addedBy);

    // 保存工作流
    await this.workflowRepository.save(workflow);

    return node;
  }

  /**
   * 批量添加节点到工作流
   */
  async addNodes(
    workflowId: ID,
    requests: NodeBuildRequest[],
    addedBy?: ID
  ): Promise<Node[]> {
    const nodes: Node[] = [];

    for (const request of requests) {
      const node = await this.addNode(workflowId, request, addedBy);
      nodes.push(node);
    }

    return nodes;
  }

  /**
   * 更新工作流中的节点
   */
  async updateNode(
    workflowId: ID,
    nodeId: ID,
    updates: Partial<NodeBuildRequest>,
    updatedBy?: ID
  ): Promise<Node> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);
    const node = workflow.getNode(nodeId);

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

    // 保存工作流
    await this.workflowRepository.save(workflow);
    return node;
  }

  /**
   * 从工作流移除节点
   */
  async removeNode(
    workflowId: ID,
    nodeId: ID,
    removedBy?: ID
  ): Promise<void> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.isDeleted()) {
      throw new DomainError('无法从已删除的工作流移除节点');
    }

    // 移除节点
    workflow.removeNode(nodeId, removedBy);

    // 保存工作流
    await this.workflowRepository.save(workflow);
  }

  /**
   * 批量从工作流移除节点
   */
  async removeNodes(
    workflowId: ID,
    nodeIds: ID[],
    removedBy?: ID
  ): Promise<void> {
    for (const nodeId of nodeIds) {
      await this.removeNode(workflowId, nodeId, removedBy);
    }
  }

  /**
   * 添加边到工作流
   */
  async addEdge(
    workflowId: ID,
    request: EdgeBuildRequest,
    addedBy?: ID
  ): Promise<Edge> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.isDeleted()) {
      throw new DomainError('无法向已删除的工作流添加边');
    }

    // 验证节点存在
    const fromNode = workflow.getNode(request.fromNodeId);
    const toNode = workflow.getNode(request.toNodeId);

    if (!fromNode) {
      throw new DomainError(`源节点不存在: ${request.fromNodeId}`);
    }

    if (!toNode) {
      throw new DomainError(`目标节点不存在: ${request.toNodeId}`);
    }

    // 创建边
    const edgeType = EdgeType.fromString(request.edgeType);
    const edge = Edge.create(
      workflowId,
      edgeType,
      request.fromNodeId,
      request.toNodeId,
      request.condition,
      request.weight,
      request.properties
    );

    // 添加边到工作流
    workflow.addEdge(edge, addedBy);

    // 保存工作流
    await this.workflowRepository.save(workflow);

    return edge;
  }

  /**
   * 批量添加边到工作流
   */
  async addEdges(
    workflowId: ID,
    requests: EdgeBuildRequest[],
    addedBy?: ID
  ): Promise<Edge[]> {
    const edges: Edge[] = [];

    for (const request of requests) {
      const edge = await this.addEdge(workflowId, request, addedBy);
      edges.push(edge);
    }

    return edges;
  }

  /**
   * 更新工作流中的边
   */
  async updateEdge(
    workflowId: ID,
    edgeId: ID,
    updates: Partial<EdgeBuildRequest>,
    updatedBy?: ID
  ): Promise<Edge> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);
    const edge = workflow.getEdge(edgeId);

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

    // 保存工作流
    await this.workflowRepository.save(workflow);
    return edge;
  }

  /**
   * 从工作流移除边
   */
  async removeEdge(
    workflowId: ID,
    edgeId: ID,
    removedBy?: ID
  ): Promise<void> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    if (workflow.isDeleted()) {
      throw new DomainError('无法从已删除的工作流移除边');
    }

    // 移除边
    workflow.removeEdge(edgeId, removedBy);

    // 保存工作流
    await this.workflowRepository.save(workflow);
  }

  /**
   * 批量从工作流移除边
   */
  async removeEdges(
    workflowId: ID,
    edgeIds: ID[],
    removedBy?: ID
  ): Promise<void> {
    for (const edgeId of edgeIds) {
      await this.removeEdge(workflowId, edgeId, removedBy);
    }
  }

  /**
   * 连接两个节点
   */
  async connectNodes(
    workflowId: ID,
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

    return await this.addEdge(workflowId, request, addedBy);
  }

  /**
   * 断开两个节点
   */
  async disconnectNodes(
    workflowId: ID,
    fromNodeId: ID,
    toNodeId: ID,
    removedBy?: ID
  ): Promise<void> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    // 查找连接两个节点的边
    const edgesToRemove = Array.from(workflow.edges.values()).filter(
      edge => edge.fromNodeId.equals(fromNodeId) && edge.toNodeId.equals(toNodeId)
    );

    // 移除所有连接边
    for (const edge of edgesToRemove) {
      await this.removeEdge(workflowId, edge.edgeId, removedBy);
    }
  }

  /**
   * 验证工作流图结构
   */
  async validateWorkflowWorkflow(workflowId: ID): Promise<ValidationResult> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    // 简化实现，实际中应该使用完整的验证逻辑
    const errors: any[] = [];
    const warnings: any[] = [];

    // 基本验证
    if (workflow.getNodeCount() === 0) {
      errors.push(
        ValidationUtils.createStructureError('工作流必须包含至少一个节点')
          .withWorkflowId(workflowId)
          .build()
      );
    }

    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 自动布局工作流图
   */
  async autoLayoutWorkflow(
    workflowId: ID,
    layoutType: 'hierarchical' | 'force' | 'circular' | 'grid' = 'hierarchical',
    options: Record<string, any> = {}
  ): Promise<void> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    // 简化实现，实际中应该实现真正的布局算法
    const nodes = Array.from(workflow.nodes.values());
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
      }
    }

    // 保存工作流
    await this.workflowRepository.save(workflow);
  }

  /**
   * 优化工作流图结构
   */
  async optimizeWorkflowWorkflow(
    workflowId: ID,
    options: {
      removeUnusedNodes?: boolean;
      mergeSimilarNodes?: boolean;
      simplifyPaths?: boolean;
    } = {}
  ): Promise<void> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    // 简化实现，实际中应该实现真正的优化算法
    if (options.removeUnusedNodes) {
      // 移除未使用的节点
      const unusedNodes = Array.from(workflow.nodes.values()).filter(node => {
        const incomingEdges = workflow.getIncomingEdges(node.nodeId);
        const outgoingEdges = workflow.getOutgoingEdges(node.nodeId);
        return incomingEdges.length === 0 && outgoingEdges.length === 0;
      });

      for (const node of unusedNodes) {
        await this.removeNode(workflowId, node.nodeId);
      }
    }
  }

  /**
   * 导入工作流图数据
   */
  async importWorkflowWorkflow(
    data: string,
    format: 'json' | 'yaml' | 'xml' | 'workflowml' = 'json',
    name?: string,
    description?: string,
    config: WorkflowWorkflowBuildConfig = {},
    createdBy?: ID
  ): Promise<Workflow> {
    // 简化实现，实际中应该支持多种格式
    const workflowData = JSON.parse(data);

    const workflow = await this.createWorkflow(
      name || workflowData.name || 'Imported Workflow',
      description || workflowData.description,
      config,
      { imported: true, originalFormat: format },
      createdBy
    );

    // 导入节点
    if (workflowData.nodes) {
      for (const nodeData of workflowData.nodes) {
        await this.addNode(workflow.workflowId, {
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
    if (workflowData.edges) {
      for (const edgeData of workflowData.edges) {
        await this.addEdge(workflow.workflowId, {
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

    return workflow;
  }

  /**
   * 导出工作流图数据
   */
  async exportWorkflowWorkflow(
    workflowId: ID,
    format: 'json' | 'yaml' | 'xml' | 'workflowml' | 'dot' = 'json',
    options: Record<string, any> = {}
  ): Promise<string> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    // 简化实现，只支持JSON格式
    const exportData = {
      id: workflow.workflowId.toString(),
      name: workflow.name,
      description: workflow.description,
      metadata: workflow.metadata,
      nodes: Array.from(workflow.nodes.values()).map(node => ({
        id: node.nodeId.toString(),
        type: node.type.toString(),
        name: node.name,
        description: node.description,
        position: node.position,
        properties: node.properties,
        config: node.properties
      })),
      edges: Array.from(workflow.edges.values()).map(edge => ({
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
   * 获取工作流图构建统计信息
   */
  async getWorkflowBuildStatistics(workflowId: ID): Promise<{
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
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

    // 统计节点类型分布
    const nodeTypeDistribution: Record<string, number> = {};
    for (const node of workflow.nodes.values()) {
      const type = node.type.toString();
      nodeTypeDistribution[type] = (nodeTypeDistribution[type] || 0) + 1;
    }

    // 统计边类型分布
    const edgeTypeDistribution: Record<string, number> = {};
    for (const edge of workflow.edges.values()) {
      const type = edge.type.toString();
      edgeTypeDistribution[type] = (edgeTypeDistribution[type] || 0) + 1;
    }

    // 计算连通性指标
    const nodeCount = workflow.getNodeCount();
    const edgeCount = workflow.getEdgeCount();
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