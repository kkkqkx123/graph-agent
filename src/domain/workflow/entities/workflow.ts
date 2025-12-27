import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { WorkflowDefinition } from '../value-objects/workflow-definition';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { NodeId } from '../value-objects/node-id';
import { NodeType } from '../value-objects/node-type';
import { EdgeId } from '../value-objects/edge-id';
import { EdgeType } from '../value-objects/edge-type';
import { ErrorHandlingStrategy } from '../value-objects/error-handling-strategy';
import { ExecutionStrategy } from '../value-objects/execution-strategy';
import { NodeValueObject } from '../value-objects/node-value-object';
import { EdgeValueObject } from '../value-objects/edge-value-object';

/**
 * 工作流图数据接口
 */
export interface WorkflowGraphData {
  readonly nodes: Map<string, NodeValueObject>;
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
 * 验证结果接口
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Workflow聚合根实体
 *
 * 根据DDD原则，Workflow是唯一的聚合根，负责：
 * 1. 纯粹的图结构定义
 * 2. 业务验证逻辑
 * 3. 节点和边的管理
 *
 * 不负责：
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
      updatedBy: createdBy
    });

    // 创建空的工作流图
    const workflowGraph: WorkflowGraphData = {
      nodes: new Map(),
      edges: new Map()
    };

    const props: WorkflowProps = {
      id: workflowId,
      definition: workflowDefinition,
      graph: workflowGraph,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      createdBy,
      updatedBy: createdBy
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
  public getNodes(): Map<string, NodeValueObject> {
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
  public getGraph(): WorkflowGraphData & {
    getIncomingEdges(nodeId: NodeId): EdgeValueObject[];
    getOutgoingEdges(nodeId: NodeId): EdgeValueObject[];
  } {
    return {
      nodes: new Map(this.props.graph.nodes),
      edges: new Map(this.props.graph.edges),
      getIncomingEdges: (nodeId: NodeId) => this.getIncomingEdges(nodeId),
      getOutgoingEdges: (nodeId: NodeId) => this.getOutgoingEdges(nodeId)
    };
  }

  /**
   * 根据ID获取节点
   * @param nodeId 节点ID
   * @returns 节点或null
   */
  public getNode(nodeId: NodeId): NodeValueObject | null {
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
   * 验证工作流
   * @returns 验证结果
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证节点
    if (this.props.graph.nodes.size === 0) {
      warnings.push('工作流没有节点');
    }

    // 验证边的引用
    for (const edge of this.props.graph.edges.values()) {
      if (!this.hasNode(edge.fromNodeId)) {
        errors.push(`边 ${edge.id.toString()} 引用了不存在的源节点 ${edge.fromNodeId.toString()}`);
      }
      if (!this.hasNode(edge.toNodeId)) {
        errors.push(`边 ${edge.id.toString()} 引用了不存在的目标节点 ${edge.toNodeId.toString()}`);
      }
    }

    // 验证起始节点
    const startNodes = this.getStartNodes();
    if (startNodes.length === 0 && this.props.graph.nodes.size > 0) {
      errors.push('工作流没有起始节点（没有入边的节点）');
    }

    // 验证结束节点
    const endNodes = this.getEndNodes();
    if (endNodes.length === 0 && this.props.graph.nodes.size > 0) {
      errors.push('工作流没有结束节点（没有出边的节点）');
    }

    // 验证循环引用
    const hasCycle = this.detectCycle();
    if (hasCycle) {
      errors.push('工作流存在循环引用');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 更新工作流名称
   * @param name 新名称
   * @param updatedBy 更新者ID
   */
  public updateName(name: string, updatedBy?: ID): void {
    const newDefinition = this.props.definition.updateName(name, updatedBy);
    this.updateDefinition(newDefinition);
  }

  /**
   * 更新工作流描述
   * @param description 新描述
   * @param updatedBy 更新者ID
   */
  public updateDescription(description: string, updatedBy?: ID): void {
    const newDefinition = this.props.definition.updateDescription(description, updatedBy);
    this.updateDefinition(newDefinition);
  }

  /**
   * 更新工作流类型
   * @param type 新类型
   * @param updatedBy 更新者ID
   */
  public updateType(type: WorkflowType, updatedBy?: ID): void {
    const newDefinition = this.props.definition.updateType(type, updatedBy);
    this.updateDefinition(newDefinition);
  }

  /**
   * 更新工作流配置
   * @param config 新配置
   * @param updatedBy 更新者ID
   */
  public updateConfig(config: WorkflowConfig, updatedBy?: ID): void {
    const newDefinition = this.props.definition.updateConfig(config, updatedBy);
    this.updateDefinition(newDefinition);
  }

  /**
   * 更改工作流状态
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   */
  public changeStatus(
    newStatus: WorkflowStatus,
    changedBy?: ID,
    reason?: string
  ): void {
    const newDefinition = this.props.definition.changeStatus(newStatus, changedBy);
    
    (this.props as any).definition = newDefinition;
    this.update();
  }

  /**
   * 添加标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   */
  public addTag(tag: string, updatedBy?: ID): void {
    const newDefinition = this.props.definition.addTag(tag, updatedBy);
    this.updateDefinition(newDefinition);
  }

  /**
   * 移除标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   */
  public removeTag(tag: string, updatedBy?: ID): void {
    const newDefinition = this.props.definition.removeTag(tag, updatedBy);
    this.updateDefinition(newDefinition);
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @param updatedBy 更新者ID
   */
  public updateMetadata(metadata: Record<string, unknown>, updatedBy?: ID): void {
    const newDefinition = this.props.definition.updateMetadata(metadata, updatedBy);
    this.updateDefinition(newDefinition);
  }

  /**
   * 标记工作流为已删除
   */
  public markAsDeleted(): void {
    const newDefinition = this.props.definition.markAsDeleted();
    this.updateDefinition(newDefinition);
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
   * 检查工作流是否可以执行
   * @returns 是否可以执行
   */
  public canExecute(): boolean {
    const validationResult = this.validate();
    return this.props.definition.status.isActive() &&
           !this.props.definition.isDeleted() &&
           this.getNodeCount() > 0 &&
           validationResult.valid;
  }

  /**
   * 检查工作流是否为空
   * @returns 是否为空工作流
   */
  public isEmpty(): boolean {
    return this.getNodeCount() === 0;
  }

  /**
   * 获取工作流的复杂度指标
   * @returns 复杂度指标
   */
  public getComplexityMetrics(): {
    nodeCount: number;
    edgeCount: number;
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    const nodeCount = this.getNodeCount();
    const edgeCount = this.getEdgeCount();
    
    let complexity: 'simple' | 'moderate' | 'complex';
    if (nodeCount <= 5 && edgeCount <= 8) {
      complexity = 'simple';
    } else if (nodeCount <= 20 && edgeCount <= 30) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }
    
    return { nodeCount, edgeCount, complexity };
  }

  /**
   * 添加节点
   * @param nodeId 节点ID
   * @param type 节点类型
   * @param name 节点名称
   * @param description 节点描述
   * @param position 节点位置
   * @param properties 节点属性
   * @param updatedBy 更新者ID
   */
  public addNode(
    nodeId: NodeId,
    type: NodeType,
    name?: string,
    description?: string,
    position?: { x: number; y: number },
    properties?: Record<string, unknown>,
    updatedBy?: ID
  ): void {
    if (this.hasNode(nodeId)) {
      throw new Error('节点已存在');
    }

    if (!this.status.canEdit()) {
      throw new Error('只能编辑草稿状态工作流的节点');
    }

    // 创建节点值对象
    const node = NodeValueObject.create({
      id: nodeId,
      type,
      name,
      description,
      position,
      properties: properties || {}
    });

    const newNodes = new Map(this.props.graph.nodes);
    newNodes.set(nodeId.toString(), node);

    const newGraph = {
      ...this.props.graph,
      nodes: newNodes
    };

    (this.props as any).graph = newGraph;
    this.update(updatedBy);
  }

  /**
   * 移除节点
   * @param nodeId 节点ID
   * @param updatedBy 更新者ID
   */
  public removeNode(nodeId: NodeId, updatedBy?: ID): void {
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
      nodes: newNodes
    };

    (this.props as any).graph = newGraph;
    this.update(updatedBy);
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
   * @param updatedBy 更新者ID
   */
  public addEdge(
    edgeId: EdgeId,
    type: EdgeType,
    fromNodeId: NodeId,
    toNodeId: NodeId,
    condition?: string,
    weight?: number,
    properties?: Record<string, unknown>,
    updatedBy?: ID
  ): void {
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

    // 创建边值对象
    const edge = EdgeValueObject.create({
      id: edgeId,
      type,
      fromNodeId,
      toNodeId,
      condition,
      weight,
      properties: properties || {}
    });

    const newEdges = new Map(this.props.graph.edges);
    newEdges.set(edgeId.toString(), edge);

    const newGraph = {
      ...this.props.graph,
      edges: newEdges
    };

    (this.props as any).graph = newGraph;
    this.update(updatedBy);
  }

  /**
   * 移除边
   * @param edgeId 边ID
   * @param updatedBy 更新者ID
   */
  public removeEdge(edgeId: EdgeId, updatedBy?: ID): void {
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
      edges: newEdges
    };

    (this.props as any).graph = newGraph;
    this.update(updatedBy);
  }

  /**
   * 获取起始节点
   * @returns 起始节点列表
   */
  public getStartNodes(): NodeId[] {
    const nodeIdsWithIncomingEdges = new Set<string>();

    for (const edge of this.props.graph.edges.values()) {
      nodeIdsWithIncomingEdges.add(edge.toNodeId.toString());
    }

    const startNodes: NodeId[] = [];
    for (const node of this.props.graph.nodes.values()) {
      if (!nodeIdsWithIncomingEdges.has(node.id.toString())) {
        startNodes.push(node.id);
      }
    }

    return startNodes;
  }

  /**
   * 获取结束节点
   * @returns 结束节点列表
   */
  public getEndNodes(): NodeId[] {
    const nodeIdsWithOutgoingEdges = new Set<string>();

    for (const edge of this.props.graph.edges.values()) {
      nodeIdsWithOutgoingEdges.add(edge.fromNodeId.toString());
    }

    const endNodes: NodeId[] = [];
    for (const node of this.props.graph.nodes.values()) {
      if (!nodeIdsWithOutgoingEdges.has(node.id.toString())) {
        endNodes.push(node.id);
      }
    }

    return endNodes;
  }

  /**
   * 检查是否为结束节点
   * @param nodeId 节点ID
   * @returns 是否为结束节点
   */
  public isEndNode(nodeId: NodeId): boolean {
    return this.getOutgoingEdges(nodeId).length === 0;
  }

  /**
   * 检查是否为起始节点
   * @param nodeId 节点ID
   * @returns 是否为起始节点
   */
  public isStartNode(nodeId: NodeId): boolean {
    return this.getIncomingEdges(nodeId).length === 0;
  }

  /**
   * 检测循环引用
   * @returns 是否存在循环
   */
  private detectCycle(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = this.getOutgoingEdges({ toString: () => nodeId } as NodeId);
      for (const edge of outgoingEdges) {
        const neighborId = edge.toNodeId.toString();
        
        if (!visited.has(neighborId)) {
          if (hasCycleDFS(neighborId)) {
            return true;
          }
        } else if (recursionStack.has(neighborId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of this.props.graph.nodes.values()) {
      if (!visited.has(node.id.toString())) {
        if (hasCycleDFS(node.id.toString())) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 更新定义
   * @param newDefinition 新定义
   */
  private updateDefinition(newDefinition: WorkflowDefinition): void {
    (this.props as any).definition = newDefinition;
    this.update();
  }

  /**
   * 更新实体
   * @param updatedBy 更新者ID
   */
  protected override update(updatedBy?: ID): void {
    (this.props as any).updatedAt = Timestamp.now();
    (this.props as any).version = this.props.version.nextPatch();
    if (updatedBy) {
      (this.props as any).updatedBy = updatedBy;
    }
    super.update();
  }
}