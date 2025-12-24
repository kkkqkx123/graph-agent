import { AggregateRoot } from '../../common/base/aggregate-root';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { WorkflowDefinition } from './workflow-definition';
import { WorkflowGraph } from './workflow-graph';
import { Container } from 'inversify';
import { WorkflowExecutor } from '../services/executor';
import { Node } from './nodes/base/node';
import { Edge } from './edges/base/edge';
import { GraphValidationService } from '../interfaces/graph-validation-service.interface';
import { WorkflowCreatedEvent } from '../events/workflow-created-event';
import { WorkflowStatusChangedEvent } from '../events/workflow-status-changed-event';
import { IExecutionContext, ExecutionResult, ExecutionStatus } from '../execution';

/**
 * Workflow实体属性接口
 */
export interface WorkflowProps {
  readonly id: ID;
  readonly definition: WorkflowDefinition;
  readonly graph: WorkflowGraph;
  readonly executor: WorkflowExecutor;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly createdBy?: ID;
  readonly updatedBy?: ID;
}

/**
 * 简化的Workflow实体
 *
 * 根据最终架构设计，Workflow专注于：
 * 1. 工作流定义（结构 + 业务配置）
 * 2. 执行逻辑编排
 * 3. 参数映射和转换
 * 4. 错误处理策略
 *
 * 不再负责：
 * - 执行状态管理
 * - 生命周期协调
 * - 执行统计跟踪
 */
export class Workflow extends AggregateRoot {
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
   * @param nodes 节点列表
   * @param edges 边列表
   * @param type 工作流类型
   * @param config 工作流配置
   * @param errorHandlingStrategy 错误处理策略
   * @param executionStrategy 执行策略
   * @param tags 标签
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @param graphValidationService 图验证服务
   * @returns 新工作流实例
   */
  public static create(
    name: string,
    description?: string,
    nodes?: Node[],
    edges?: Edge[],
    type?: any,
    config?: any,
    errorHandlingStrategy?: any,
    executionStrategy?: any,
    tags?: string[],
    metadata?: Record<string, unknown>,
    createdBy?: ID,
    graphValidationService?: GraphValidationService
  ): Workflow {
    const now = Timestamp.now();
    const workflowId = ID.generate();

    // 创建工作流定义
    const definition = WorkflowDefinition.create(
      name,
      description,
      type,
      config,
      errorHandlingStrategy,
      executionStrategy,
      tags,
      metadata,
      createdBy
    );

    // 创建工作流图
    const graph = WorkflowGraph.create(workflowId, nodes, edges);

    // 创建工作流执行器
    const executor = new WorkflowExecutor(definition, graph, graphValidationService!);

    const props: WorkflowProps = {
      id: workflowId,
      definition,
      graph,
      executor,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      createdBy,
      updatedBy: createdBy
    };

    const workflow = new Workflow(props);

    // 添加工作流创建事件
    workflow.addDomainEvent(new WorkflowCreatedEvent(
      workflowId,
      name,
      description,
      definition.type.toString(),
      definition.status.toString(),
      definition.config.value,
      nodes ? nodes.map(node => node.toJSON()) : [],
      edges ? edges.map(edge => edge.toJSON()) : [],
      undefined, // definition
      undefined, // layout
      createdBy
    ));

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
  public get status(): any {
    return this.props.definition.status;
  }

  /**
   * 获取工作流类型
   * @returns 工作流类型
   */
  public get type(): any {
    return this.props.definition.type;
  }

  /**
   * 获取工作流配置
   * @returns 工作流配置
   */
  public get config(): any {
    return this.props.definition.config;
  }

  /**
   * 获取所有节点
   * @returns 节点映射
   */
  public get nodes(): Map<string, Node> {
    return this.props.graph.nodes;
  }

  /**
   * 获取所有边
   * @returns 边映射
   */
  public get edges(): Map<string, Edge> {
    return this.props.graph.edges;
  }

  /**
   * 获取节点数量
   * @returns 节点数量
   */
  public getNodeCount(): number {
    return this.props.graph.getNodeCount();
  }

  /**
   * 获取边数量
   * @returns 边数量
   */
  public getEdgeCount(): number {
    return this.props.graph.getEdgeCount();
  }

  /**
   * 获取图定义
   * @returns 图定义
   */
  public get definition(): Record<string, unknown> | undefined {
    return this.props.graph.definition;
  }

  /**
   * 获取布局信息
   * @returns 布局信息
   */
  public get layout(): Record<string, unknown> | undefined {
    return this.props.graph.layout;
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
   * 更新工作流名称
   * @param name 新名称
   * @param updatedBy 更新者ID
   */
  public updateName(name: string, updatedBy?: ID): void {
    this.props.definition.updateName(name, updatedBy);
    this.update();
  }

  /**
   * 更新工作流描述
   * @param description 新描述
   * @param updatedBy 更新者ID
   */
  public updateDescription(description: string, updatedBy?: ID): void {
    this.props.definition.updateDescription(description, updatedBy);
    this.update();
  }

  /**
   * 更新工作流类型
   * @param type 新类型
   * @param updatedBy 更新者ID
   */
  public updateType(type: any, updatedBy?: ID): void {
    this.props.definition.updateType(type, updatedBy);
    this.update();
  }

  /**
   * 更新工作流配置
   * @param config 新配置
   * @param updatedBy 更新者ID
   */
  public updateConfig(config: any, updatedBy?: ID): void {
    this.props.definition.updateConfig(config, updatedBy);
    this.update();
  }

  /**
   * 根据ID获取节点
   * @param nodeId 节点ID
   * @returns 节点或null
   */
  public getNode(nodeId: ID): Node | null {
    return this.props.graph.getNode(nodeId);
  }

  /**
   * 根据ID获取边
   * @param edgeId 边ID
   * @returns 边或null
   */
  public getEdge(edgeId: ID): Edge | null {
    return this.props.graph.getEdge(edgeId);
  }

  /**
   * 检查节点是否存在
   * @param nodeId 节点ID
   * @returns 是否存在
   */
  public hasNode(nodeId: ID): boolean {
    return this.props.graph.hasNode(nodeId);
  }

  /**
   * 检查边是否存在
   * @param edgeId 边ID
   * @returns 是否存在
   */
  public hasEdge(edgeId: ID): boolean {
    return this.props.graph.hasEdge(edgeId);
  }

  /**
   * 获取节点的入边
   * @param nodeId 节点ID
   * @returns 入边列表
   */
  public getIncomingEdges(nodeId: ID): Edge[] {
    return this.props.graph.getIncomingEdges(nodeId);
  }

  /**
   * 获取节点的出边
   * @param nodeId 节点ID
   * @returns 出边列表
   */
  public getOutgoingEdges(nodeId: ID): Edge[] {
    return this.props.graph.getOutgoingEdges(nodeId);
  }

  /**
   * 获取节点的相邻节点
   * @param nodeId 节点ID
   * @returns 相邻节点列表
   */
  public getAdjacentNodes(nodeId: ID): Node[] {
    return this.props.graph.getAdjacentNodes(nodeId);
  }

  /**
   * 添加节点
   * @param node 节点
   * @param addedBy 添加者ID
   */
  public addNode(node: Node, addedBy?: ID): void {
    const newGraph = this.props.graph.addNode(node);
    (this.props as any).graph = newGraph;
    this.update();
  }

  /**
   * 移除节点
   * @param nodeId 节点ID
   * @param removedBy 移除者ID
   */
  public removeNode(nodeId: ID, removedBy?: ID): void {
    const newGraph = this.props.graph.removeNode(nodeId);
    (this.props as any).graph = newGraph;
    this.update();
  }

  /**
   * 添加边
   * @param edge 边
   * @param addedBy 添加者ID
   */
  public addEdge(edge: Edge, addedBy?: ID): void {
    const newGraph = this.props.graph.addEdge(edge);
    (this.props as any).graph = newGraph;
    this.update();
  }

  /**
   * 移除边
   * @param edgeId 边ID
   * @param removedBy 移除者ID
   */
  public removeEdge(edgeId: ID, removedBy?: ID): void {
    const newGraph = this.props.graph.removeEdge(edgeId);
    (this.props as any).graph = newGraph;
    this.update();
  }

  /**
   * 更新图定义
   * @param definition 新定义
   * @param updatedBy 更新者ID
   */
  public updateDefinition(definition: Record<string, unknown>, updatedBy?: ID): void {
    const newGraph = this.props.graph.updateDefinition(definition);
    (this.props as any).graph = newGraph;
    this.update();
  }

  /**
   * 更新布局信息
   * @param layout 新布局
   * @param updatedBy 更新者ID
   */
  public updateLayout(layout: Record<string, unknown>, updatedBy?: ID): void {
    const newGraph = this.props.graph.updateLayout(layout);
    (this.props as any).graph = newGraph;
    this.update();
  }

  /**
   * 更改工作流状态
   * @param newStatus 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   */
  public changeStatus(
    newStatus: any,
    changedBy?: ID,
    reason?: string
  ): void {
    this.props.definition.changeStatus(newStatus, changedBy, reason);
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new WorkflowStatusChangedEvent(
      this.props.id,
      this.props.definition.status,
      newStatus,
      changedBy,
      reason
    ));
  }

  /**
   * 添加标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   */
  public addTag(tag: string, updatedBy?: ID): void {
    this.props.definition.addTag(tag, updatedBy);
    this.update();
  }

  /**
   * 移除标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   */
  public removeTag(tag: string, updatedBy?: ID): void {
    this.props.definition.removeTag(tag, updatedBy);
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @param updatedBy 更新者ID
   */
  public updateMetadata(metadata: Record<string, unknown>, updatedBy?: ID): void {
    this.props.definition.updateMetadata(metadata, updatedBy);
    this.update();
  }

  /**
   * 标记工作流为已删除
   */
  public markAsDeleted(): void {
    this.props.definition.markAsDeleted();
    this.update();
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
   * 执行工作流（由ThreadExecutor调用）
   *
   * 这是Workflow的核心职责：专注于业务逻辑执行
   * 不再管理执行状态和生命周期，这些由ThreadExecutor负责
   */
  public async execute(context: IExecutionContext): Promise<ExecutionResult> {
    return await this.props.executor.execute(context);
  }

  /**
   * 获取执行定义（供执行器使用）
   *
   * 提供工作流的完整定义信息，包括结构和业务配置
   */
  public getExecutionDefinition(): any {
    return this.props.executor.getExecutionDefinition();
  }

  /**
   * 处理执行动作（由ThreadExecutor调用）
   *
   * 响应执行器的生命周期管理指令
   */
  public handleExecutionAction(action: any): void {
    this.props.executor.handleExecutionAction(action);
  }

  /**
   * 获取执行步骤（供执行器使用）
   */
  public getExecutionSteps(): any[] {
    return this.props.executor.getExecutionSteps();
  }


  /**
   * 获取错误处理策略
   */
  public get errorHandlingStrategy(): any {
    return this.props.definition.errorHandlingStrategy;
  }

  /**
   * 获取执行策略
   */
  public get executionStrategy(): any {
    return this.props.definition.executionStrategy;
  }

  /**
   * 验证聚合的不变性
   */
  public validateInvariants(): void {
    this.props.definition.validateInvariants();
    // 图结构验证现在由GraphValidationService处理
    // this.props.graph.validateGraphStructure();
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    this.props.definition.validate();
    // 图验证现在由GraphValidationService处理
    // this.props.graph.validate();
  }

  /**
   * 获取工作流定义
   * @returns 工作流定义
   */
  public getDefinition(): WorkflowDefinition {
    return this.props.definition;
  }

  /**
   * 获取工作流图
   * @returns 工作流图
   */
  public getGraph(): WorkflowGraph {
    return this.props.graph;
  }

  /**
   * 获取工作流执行器
   * @returns 工作流执行器
   */
  public getExecutor(): WorkflowExecutor {
    return this.props.executor;
  }
}