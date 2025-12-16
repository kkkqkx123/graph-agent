import { AggregateRoot } from '../../common/base/aggregate-root';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { WorkflowCreatedEvent } from '../events/workflow-created-event';
import { WorkflowStatusChangedEvent } from '../events/workflow-status-changed-event';
import { Node } from '../entities/nodes/base/node';
import { Edge } from '../entities/edges/base/edge';

/**
 * Workflow实体接口
 */
export interface WorkflowProps {
  id: ID;
  name: string;
  description?: string;
  status: WorkflowStatus;
  type: WorkflowType;
  config: WorkflowConfig;
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  definition?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  tags: string[];
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  createdBy?: ID;
  updatedBy?: ID;
}

/**
 * Workflow实体
 * 
 * 表示工作流的聚合根
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
   * @param type 工作流类型
   * @param config 工作流配置
   * @param graphId 图ID
   * @param tags 标签
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns 新工作流实例
   */
  public static create(
    name: string,
    description?: string,
    nodes?: Node[],
    edges?: Edge[],
    type?: WorkflowType,
    config?: WorkflowConfig,
    tags?: string[],
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): Workflow {
    const now = Timestamp.now();
    const workflowId = ID.generate();
    const workflowType = type || WorkflowType.sequential();
    const workflowStatus = WorkflowStatus.draft();
    const workflowConfig = config || WorkflowConfig.default();

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

    const props: WorkflowProps = {
      id: workflowId,
      name,
      description,
      status: workflowStatus,
      type: workflowType,
      config: workflowConfig,
      nodes: nodeMap,
      edges: edgeMap,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      tags: tags || [],
      metadata: metadata || {},
      isDeleted: false,
      createdBy,
      updatedBy: createdBy
    };

    const workflow = new Workflow(props);

    // 添加工作流创建事件
    workflow.addDomainEvent(new WorkflowCreatedEvent(
      workflowId,
      name,
      description,
      workflowType.toString(),
      workflowStatus.toString(),
      workflowConfig.value,
      undefined,
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
    return this.props.name;
  }

  /**
   * 获取工作流描述
   * @returns 工作流描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取工作流状态
   * @returns 工作流状态
   */
  public get status(): WorkflowStatus {
    return this.props.status;
  }

  /**
   * 获取工作流类型
   * @returns 工作流类型
   */
  public get type(): WorkflowType {
    return this.props.type;
  }

  /**
   * 获取工作流配置
   * @returns 工作流配置
   */
  public get config(): WorkflowConfig {
    return this.props.config;
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
   * 获取标签
   * @returns 标签列表
   */
  public get tags(): string[] {
    return [...this.props.tags];
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
   * 更新工作流名称
   * @param name 新名称
   * @param updatedBy 更新者ID
   */
  public updateName(name: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的工作流');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态的工作流');
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
   * 更新工作流描述
   * @param description 新描述
   * @param updatedBy 更新者ID
   */
  public updateDescription(description: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的工作流');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态的工作流');
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
   * 更新工作流类型
   * @param type 新类型
   * @param updatedBy 更新者ID
   */
  public updateType(type: WorkflowType, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的类型');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的类型');
    }

    const newProps = {
      ...this.props,
      type,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新工作流配置
   * @param config 新配置
   * @param updatedBy 更新者ID
   */
  public updateConfig(config: WorkflowConfig, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的配置');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的配置');
    }

    const newProps = {
      ...this.props,
      config,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
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
   * @param addedBy 添加者ID
   */
  public addNode(node: Node, addedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法向已删除的工作流添加节点');
    }

    if (!node.graphId.equals(this.props.id)) {
      throw new DomainError('节点不属于当前工作流');
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
  }

  /**
   * 移除节点
   * @param nodeId 节点ID
   * @param removedBy 移除者ID
   */
  public removeNode(nodeId: ID, removedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法从已删除的工作流移除节点');
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
      throw new DomainError('无法向已删除的工作流添加边');
    }

    if (!edge.graphId.equals(this.props.id)) {
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
      edges: newEdges,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: addedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除边
   * @param edgeId 边ID
   * @param removedBy 移除者ID
   */
  public removeEdge(edgeId: ID, removedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法从已删除的工作流移除边');
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
   * 更新图定义
   * @param definition 新定义
   * @param updatedBy 更新者ID
   */
  public updateDefinition(definition: Record<string, unknown>, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的图定义');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的图定义');
    }

    const newProps = {
      ...this.props,
      definition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新布局信息
   * @param layout 新布局
   * @param updatedBy 更新者ID
   */
  public updateLayout(layout: Record<string, unknown>, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的布局信息');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的布局信息');
    }

    const newProps = {
      ...this.props,
      layout,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
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
    if (this.props.isDeleted) {
      throw new DomainError('无法更改已删除工作流的状态');
    }

    const oldStatus = this.props.status;
    if (oldStatus.equals(newStatus)) {
      return; // 状态未变更
    }

    // 验证状态转换的有效性
    this.validateStatusTransition(oldStatus, newStatus);

    const newProps = {
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: changedBy
    };

    (this as any).props = Object.freeze(newProps);
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
    if (this.props.isDeleted) {
      throw new DomainError('无法为已删除的工作流添加标签');
    }

    if (this.props.tags.includes(tag)) {
      return; // 标签已存在
    }

    const newProps = {
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 移除标签
   * @param tag 标签
   * @param updatedBy 更新者ID
   */
  public removeTag(tag: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法为已删除的工作流移除标签');
    }

    const index = this.props.tags.indexOf(tag);
    if (index === -1) {
      return; // 标签不存在
    }

    const newTags = [...this.props.tags];
    newTags.splice(index, 1);

    const newProps = {
      ...this.props,
      tags: newTags,
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
      throw new DomainError('无法更新已删除工作流的元数据');
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
   * 标记工作流为已删除
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
   * 检查工作流是否已删除
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
    return `workflow:${this.props.id.toString()}`;
  }

  /**
   * 验证状态转换的有效性
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   */
  private validateStatusTransition(
    oldStatus: WorkflowStatus,
    newStatus: WorkflowStatus
  ): void {
    // 已归档的工作流不能变更到其他状态
    if (oldStatus.isArchived() && !newStatus.isArchived()) {
      throw new DomainError('已归档的工作流不能变更到其他状态');
    }

    // 草稿状态只能激活或归档
    if (oldStatus.isDraft() &&
      !newStatus.isActive() &&
      !newStatus.isArchived()) {
      throw new DomainError('草稿状态的工作流只能激活或归档');
    }

    // 活跃状态只能变为非活跃或归档
    if (oldStatus.isActive() &&
      !newStatus.isInactive() &&
      !newStatus.isArchived()) {
      throw new DomainError('活跃状态的工作流只能变为非活跃或归档');
    }

    // 非活跃状态只能变为活跃或归档
    if (oldStatus.isInactive() &&
      !newStatus.isActive() &&
      !newStatus.isArchived()) {
      throw new DomainError('非活跃状态的工作流只能变为活跃或归档');
    }
  }

  /**
   * 验证聚合的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('工作流ID不能为空');
    }

    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new DomainError('工作流名称不能为空');
    }

    if (!this.props.status) {
      throw new DomainError('工作流状态不能为空');
    }

    if (!this.props.type) {
      throw new DomainError('工作流类型不能为空');
    }

    if (!this.props.config) {
      throw new DomainError('工作流配置不能为空');
    }

    // 验证图的基本结构
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
   * 验证实体的有效性
   */
  public override validate(): void {
    this.validateInvariants();
    this.props.status.validate();
    this.props.type.validate();
    this.props.config.validate();

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