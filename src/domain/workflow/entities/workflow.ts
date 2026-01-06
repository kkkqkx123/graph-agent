import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import {
  WorkflowDefinition,
  WorkflowStatus,
  WorkflowType,
  WorkflowConfig,
  NodeId,
  NodeType,
} from '../value-objects';
import { EdgeId, EdgeType, EdgeValueObject } from '../value-objects/edge';
import { EdgeContextFilter } from '../value-objects/context';
import { ErrorHandlingStrategy } from '../value-objects/error-handling-strategy';
import { ExecutionStrategy } from '../value-objects/execution/execution-strategy';
import { Node } from './node';

/**
 * 工作流图数据接口
 */
export interface WorkflowGraphData {
  readonly nodes: Map<string, Node>;
  readonly edges: Map<string, EdgeValueObject>;
}

/**
 * Workflow聚合根属性接口
 */
export interface WorkflowProps {
  readonly id: ID;
  readonly definition: WorkflowDefinition;
  readonly graph: WorkflowGraphData;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly createdBy?: ID;
  readonly updatedBy?: ID;
}

/**
 * 工作流验证结果接口
 */
export interface WorkflowValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Workflow聚合根实体
 *
 * 根据DDD原则，Workflow是唯一的聚合根，负责：
 * 1. 节点和边的基本管理（增删改）
 * 2. 简单的存在性检查
 * 3. 自身状态管理（版本、时间戳）
 * 4. 属性访问
 * 5. 简单的查询方法（如 getIncomingEdges, getOutgoingEdges）
 *
 * 不负责：
 * - 复杂的验证逻辑（由GraphValidationService负责）
 * - 图遍历和算法（由GraphAlgorithmService负责）
 * - 复杂度计算（由GraphAlgorithmService负责）
 * - 执行状态管理（由Thread负责）
 * - 进度跟踪（由Thread负责）
 * - UI相关的布局和可视化
 * - 持久化细节
 */
export class Workflow extends Entity {
  private readonly props: WorkflowProps;

  /**
   * 构造函数
   * @param props 工作流属性
   */
  private constructor(props: WorkflowProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新工作流
   * @param name 工作流名称
   * @param description 工作流描述
   * @param type 工作流类型
   * @param config 工作流配置
   * @param createdBy 创建者ID
   * @returns 新工作流实例
   */
  public static create(
    name: string,
    description?: string,
    type?: WorkflowType,
    config?: WorkflowConfig,
    createdBy?: ID
  ): Workflow {
    const now = Timestamp.now();
    const workflowId = ID.generate();

    // 创建工作流定义
    const workflowDefinition = WorkflowDefinition.create({
      id: workflowId,
      name,
      description,
      status: WorkflowStatus.draft(),
      type: type || WorkflowType.sequential(),
      config: config || WorkflowConfig.default(),
      errorHandlingStrategy: ErrorHandlingStrategy.stopOnError(),
      executionStrategy: ExecutionStrategy.sequential(),
      tags: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false,
      createdBy,
      updatedBy: createdBy,
    });

    // 创建空的工作流图
    const workflowGraph: WorkflowGraphData = {
      nodes: new Map(),
      edges: new Map(),
    };

    const props: WorkflowProps = {
      id: workflowId,
      definition: workflowDefinition,
      graph: workflowGraph,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      createdBy,
      updatedBy: createdBy,
    };

    const workflow = new Workflow(props);

    return workflow;
  }

  /**
   * 从已有属性重建工作流
   * @param props 工作流属性
   * @returns 工作流实例
   */
  public static fromProps(props: WorkflowProps): Workflow {
    return new Workflow(props);
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID {
    return this.props.id;
  }

  /**
   * 获取工作流名称
   * @returns 工作流名称
   */
  public get name(): string {
    return this.props.definition.name;
  }

  /**
   * 获取工作流描述
   * @returns 工作流描述
   */
  public get description(): string | undefined {
    return this.props.definition.description;
  }

  /**
   * 获取工作流状态
   * @returns 工作流状态
   */
  public get status(): WorkflowStatus {
    return this.props.definition.status;
  }

  /**
   * 获取工作流类型
   * @returns 工作流类型
   */
  public get type(): WorkflowType {
    return this.props.definition.type;
  }

  /**
   * 获取工作流配置
   * @returns 工作流配置
   */
  public get config(): WorkflowConfig {
    return this.props.definition.config;
  }

  /**
   * 获取节点数量
   * @returns 节点数量
   */
  public getNodeCount(): number {
    return this.props.graph.nodes.size;
  }

  /**
   * 获取边数量
   * @returns 边数量
   */
  public getEdgeCount(): number {
    return this.props.graph.edges.size;
  }

  /**
   * 获取标签
   * @returns 标签列表
   */
  public get tags(): string[] {
    return this.props.definition.tags;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return this.props.definition.metadata;
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
   * 获取所有节点
   * @returns 节点映射
   */
  public getNodes(): Map<string, Node> {
    return new Map(this.props.graph.nodes);
  }

  /**
   * 获取所有边
   * @returns 边映射
   */
  public getEdges(): Map<string, EdgeValueObject> {
    return new Map(this.props.graph.edges);
  }

  /**
   * 获取工作流图
   * @returns 工作流图数据
   */
  public getGraph(): WorkflowGraphData {
    return {
      nodes: new Map(this.props.graph.nodes),
      edges: new Map(this.props.graph.edges),
    };
  }

  /**
   * 根据ID获取节点
   * @param nodeId 节点ID
   * @returns 节点或null
   */
  public getNode(nodeId: NodeId): Node | null {
    return this.props.graph.nodes.get(nodeId.toString()) || null;
  }

  /**
   * 根据ID获取边
   * @param edgeId 边ID
   * @returns 边或null
   */
  public getEdge(edgeId: EdgeId): EdgeValueObject | null {
    return this.props.graph.edges.get(edgeId.toString()) || null;
  }

  /**
   * 检查节点是否存在
   * @param nodeId 节点ID
   * @returns 是否存在
   */
  public hasNode(nodeId: NodeId): boolean {
    return this.props.graph.nodes.has(nodeId.toString());
  }

  /**
   * 检查边是否存在
   * @param edgeId 边ID
   * @returns 是否存在
   */
  public hasEdge(edgeId: EdgeId): boolean {
    return this.props.graph.edges.has(edgeId.toString());
  }

  /**
   * 获取节点的入边
   * @param nodeId 节点ID
   * @returns 入边列表
   */
  public getIncomingEdges(nodeId: NodeId): EdgeValueObject[] {
    const incomingEdges: EdgeValueObject[] = [];
    for (const edge of this.props.graph.edges.values()) {
      if (edge.toNodeId.equals(nodeId)) {
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
  public getOutgoingEdges(nodeId: NodeId): EdgeValueObject[] {
    const outgoingEdges: EdgeValueObject[] = [];
    for (const edge of this.props.graph.edges.values()) {
      if (edge.fromNodeId.equals(nodeId)) {
        outgoingEdges.push(edge);
      }
    }
    return outgoingEdges;
  }

  /**
   * 更新工作流名称
   * @param name 新名称
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public updateName(name: string, updatedBy?: ID): Workflow {
    const newDefinition = this.props.definition.updateName(name, updatedBy);
    return this.updateDefinition(newDefinition, updatedBy);
  }

  /**
   * 更新工作流描述
   * @param description 新描述
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public updateDescription(description: string, updatedBy?: ID): Workflow {
    const newDefinition = this.props.definition.updateDescription(description, updatedBy);
    return this.updateDefinition(newDefinition, updatedBy);
  }

  /**
   * 更新工作流类型
   * @param type 新类型
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public updateType(type: WorkflowType, updatedBy?: ID): Workflow {
    const newDefinition = this.props.definition.updateType(type, updatedBy);
    return this.updateDefinition(newDefinition, updatedBy);
  }

  /**
   * 更新工作流配置
   * @param config 新配置
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public updateConfig(config: WorkflowConfig, updatedBy?: ID): Workflow {
    const newDefinition = this.props.definition.updateConfig(config, updatedBy);
    return this.updateDefinition(newDefinition, updatedBy);
  }

  /**
   * 更改工作流状态
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   * @returns 新工作流实例
   */
  public changeStatus(newStatus: WorkflowStatus, changedBy?: ID, reason?: string): Workflow {
    const newDefinition = this.props.definition.changeStatus(newStatus, changedBy);

    return new Workflow({
      ...this.props,
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: changedBy,
    });
  }

  /**
   * 添加标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public addTag(tag: string, updatedBy?: ID): Workflow {
    const newDefinition = this.props.definition.addTag(tag, updatedBy);
    return this.updateDefinition(newDefinition, updatedBy);
  }

  /**
   * 移除标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public removeTag(tag: string, updatedBy?: ID): Workflow {
    const newDefinition = this.props.definition.removeTag(tag, updatedBy);
    return this.updateDefinition(newDefinition, updatedBy);
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public updateMetadata(metadata: Record<string, unknown>, updatedBy?: ID): Workflow {
    const newDefinition = this.props.definition.updateMetadata(metadata, updatedBy);
    return this.updateDefinition(newDefinition, updatedBy);
  }

  /**
   * 标记工作流为已删除
   * @returns 新工作流实例
   */
  public markAsDeleted(): Workflow {
    const newDefinition = this.props.definition.markAsDeleted();
    return this.updateDefinition(newDefinition);
  }

  /**
   * 检查工作流是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.definition.isDeleted();
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return this.props.definition.getBusinessIdentifier();
  }

  /**
   * 获取工作流定义
   * @returns 工作流定义
   */
  public getDefinition(): WorkflowDefinition {
    return this.props.definition;
  }

  /**
   * 检查工作流是否可以执行（基本检查）
   * 注意：完整的验证逻辑应该使用 WorkflowValidationService
   * @returns 是否可以执行
   */
  public canExecute(): boolean {
    return (
      this.props.definition.status.isActive() &&
      !this.props.definition.isDeleted() &&
      this.getNodeCount() > 0
    );
  }

  /**
   * 检查工作流是否为空
   * @returns 是否为空工作流
   */
  public isEmpty(): boolean {
    return this.getNodeCount() === 0;
  }

  /**
   * 添加节点
   * @param node 节点实例
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public addNode(node: Node, updatedBy?: ID): Workflow {
    if (this.hasNode(node.nodeId)) {
      throw new Error('节点已存在');
    }

    if (!this.status.canEdit()) {
      throw new Error('只能编辑草稿状态工作流的节点');
    }

    const newNodes = new Map(this.props.graph.nodes);
    newNodes.set(node.nodeId.toString(), node);

    const newGraph = {
      ...this.props.graph,
      nodes: newNodes,
    };

    return new Workflow({
      ...this.props,
      graph: newGraph,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy,
    });
  }

  /**
   * 移除节点
   * @param nodeId 节点ID
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public removeNode(nodeId: NodeId, updatedBy?: ID): Workflow {
    if (!this.hasNode(nodeId)) {
      throw new Error('节点不存在');
    }

    if (!this.status.canEdit()) {
      throw new Error('只能编辑草稿状态工作流的节点');
    }

    // 检查是否有边连接到此节点
    const connectedEdges = this.getIncomingEdges(nodeId).concat(this.getOutgoingEdges(nodeId));
    if (connectedEdges.length > 0) {
      throw new Error('无法移除有边连接的节点');
    }

    const newNodes = new Map(this.props.graph.nodes);
    newNodes.delete(nodeId.toString());

    const newGraph = {
      ...this.props.graph,
      nodes: newNodes,
    };

    return new Workflow({
      ...this.props,
      graph: newGraph,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy,
    });
  }

  /**
   * 添加边
   * @param edgeId 边ID
   * @param type 边类型
   * @param fromNodeId 源节点ID
   * @param toNodeId 目标节点ID
   * @param condition 条件表达式
   * @param weight 权重
   * @param properties 边属性
   * @param contextFilter 上下文过滤器（可选，默认为传递所有）
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public addEdge(
    edgeId: EdgeId,
    type: EdgeType,
    fromNodeId: NodeId,
    toNodeId: NodeId,
    condition?: string,
    weight?: number,
    properties?: Record<string, unknown>,
    contextFilter?: EdgeContextFilter,
    updatedBy?: ID
  ): Workflow {
    if (this.hasEdge(edgeId)) {
      throw new Error('边已存在');
    }

    if (!this.status.canEdit()) {
      throw new Error('只能编辑草稿状态工作流的边');
    }

    // 检查源节点和目标节点是否存在
    if (!this.hasNode(fromNodeId)) {
      throw new Error('源节点不存在');
    }

    if (!this.hasNode(toNodeId)) {
      throw new Error('目标节点不存在');
    }

    // 创建边值对象，使用默认的上下文过滤器
    const edge = EdgeValueObject.create({
      id: edgeId,
      type,
      fromNodeId,
      toNodeId,
      condition,
      weight,
      properties: properties || {},
      contextFilter: contextFilter || EdgeContextFilter.passAll(),
    });

    const newEdges = new Map(this.props.graph.edges);
    newEdges.set(edgeId.toString(), edge);

    const newGraph = {
      ...this.props.graph,
      edges: newEdges,
    };

    return new Workflow({
      ...this.props,
      graph: newGraph,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy,
    });
  }

  /**
   * 移除边
   * @param edgeId 边ID
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  public removeEdge(edgeId: EdgeId, updatedBy?: ID): Workflow {
    if (!this.hasEdge(edgeId)) {
      throw new Error('边不存在');
    }

    if (!this.status.canEdit()) {
      throw new Error('只能编辑草稿状态工作流的边');
    }

    const newEdges = new Map(this.props.graph.edges);
    newEdges.delete(edgeId.toString());

    const newGraph = {
      ...this.props.graph,
      edges: newEdges,
    };

    return new Workflow({
      ...this.props,
      graph: newGraph,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy,
    });
  }

  /**
   * 更新定义
   * @param newDefinition 新定义
   * @param updatedBy 更新者ID
   * @returns 新工作流实例
   */
  private updateDefinition(newDefinition: WorkflowDefinition, updatedBy?: ID): Workflow {
    return new Workflow({
      ...this.props,
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy,
    });
  }
}
