import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { WorkflowDefinition } from '../value-objects/workflow-definition';
import { WorkflowGraph } from './workflow-graph';
import { Node } from './nodes/base/node';
import { Edge } from './edges/base/edge';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { WorkflowCreatedEvent } from '../events/workflow-created-event';
import { WorkflowStatusChangedEvent } from '../events/workflow-status-changed-event';

/**
 * Workflow实体属性接口
 */
export interface WorkflowProps {
  readonly id: ID;
  readonly definition: WorkflowDefinition;
  readonly graph: WorkflowGraph;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly createdBy?: ID;
  readonly updatedBy?: ID;
}

/**
 * Workflow聚合根实体
 *
 * 根据DDD原则，Workflow专注于：
 * 1. 工作流业务规则和不变性
 * 2. 工作流定义管理
 * 3. 业务状态变更
 * 4. 领域事件发布
 *
 * 不负责：
 * - 图结构的直接操作（委托给领域服务）
 * - 执行状态管理
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
   * @param definition 工作流定义
   * @param graph 工作流图
   * @param createdBy 创建者ID
   * @returns 新工作流实例
   */
  public static create(
    name: string,
    description?: string,
    definition?: WorkflowDefinition,
    graph?: WorkflowGraph,
    createdBy?: ID
  ): Workflow {
    const now = Timestamp.now();
    const workflowId = ID.generate();

    // 创建工作流定义
    const workflowDefinition = definition || WorkflowDefinition.create(
      name,
      description,
      undefined, // type
      undefined, // config
      undefined, // errorHandlingStrategy
      undefined, // executionStrategy
      undefined, // tags
      undefined, // metadata
      createdBy
    );

    // 创建工作流图
    const workflowGraph = graph || WorkflowGraph.create(workflowId);

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

    // 添加工作流创建事件
    workflow.addDomainEvent(new WorkflowCreatedEvent(
      workflowId,
      name,
      description,
      workflowDefinition.type.toString(),
      workflowDefinition.status.toString(),
      workflowDefinition.config.value,
      [], // nodes
      [], // edges
      undefined, // definition - 移除UI相关概念
      undefined, // layout - 移除UI相关概念
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
    const oldStatus = this.props.definition.status;
    const newDefinition = this.props.definition.changeStatus(newStatus, changedBy, reason);
    
    (this.props as any).definition = newDefinition;
    this.update();

    // 添加状态变更事件
    this.addDomainEvent(new WorkflowStatusChangedEvent(
      this.props.id,
      oldStatus,
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
   * 获取工作流图
   * @returns 工作流图
   */
  public getGraph(): WorkflowGraph {
    return this.props.graph;
  }

  /**
   * 检查工作流是否可以执行
   * @returns 是否可以执行
   */
  public canExecute(): boolean {
    return this.props.definition.status.isActive() &&
           !this.props.definition.isDeleted() &&
           this.getNodeCount() > 0;
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
   * 更新定义
   * @param newDefinition 新定义
   */
  private updateDefinition(newDefinition: WorkflowDefinition): void {
    (this.props as any).definition = newDefinition;
    this.update();
  }

  /**
   * 更新图
   * @param newGraph 新图
   */
  private updateGraph(newGraph: WorkflowGraph): void {
    (this.props as any).graph = newGraph;
    this.update();
  }
}