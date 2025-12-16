# 第一阶段实施方案：移除Workflow状态管理并合并Graph到Workflow

## 概述

本文档详细描述了第一阶段架构重构的实施计划，主要目标是：
1. 移除Workflow中的状态管理逻辑
2. 将Graph合并到Workflow中，创建UnifiedWorkflow
3. 重新设计Thread和Session的职责分工

## 当前架构分析

### 现有问题

1. **概念重叠**：Workflow和Graph职责重叠，Graph包含状态管理逻辑
2. **状态分散**：执行状态分散在多个组件中（WorkflowState、StateManager、ExecutionContext）
3. **复杂依赖**：Workflow依赖Graph，Graph包含状态管理，形成循环依赖风险
4. **扩展困难**：新增功能需要修改多个组件

### 关键文件分析

- `src/domain/workflow/entities/workflow.ts`：Workflow实体，包含业务配置和执行统计
- `src/domain/workflow/graph/entities/graph.ts`：Graph实体，包含节点和边管理
- `src/domain/workflow/graph/entities/workflow-state.ts`：工作流状态实体，包含执行状态管理
- `src/infrastructure/workflow/engine/state-manager.ts`：状态管理器，处理执行状态
- `src/infrastructure/workflow/engine/execution-context.ts`：执行上下文，管理执行过程状态

## 实施方案

### 1. 创建UnifiedWorkflow实体

#### 1.1 设计UnifiedWorkflow接口

```typescript
// src/domain/workflow/entities/unified-workflow.ts

import { AggregateRoot } from '../../common/base/aggregate-root';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { Node } from './nodes';
import { Edge } from './edges';
import { WorkflowCreatedEvent } from '../events/workflow-created-event';
import { WorkflowStatusChangedEvent } from '../events/workflow-status-changed-event';

/**
 * UnifiedWorkflow实体接口
 */
export interface UnifiedWorkflowProps {
  id: ID;
  name: string;
  description?: string;
  status: WorkflowStatus;
  type: WorkflowType;
  config: WorkflowConfig;
  
  // 图结构相关
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  
  // 业务配置相关
  tags: string[];
  metadata: Record<string, unknown>;
  
  // 执行统计相关
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime?: number;
  lastExecutedAt?: Timestamp;
  
  // 审计相关
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
  createdBy?: ID;
  updatedBy?: ID;
}

/**
 * UnifiedWorkflow实体
 * 
 * 合并了Workflow和Graph的职责，包含：
 * - 工作流业务配置
 * - 图结构定义
 * - 执行统计信息
 * - 不包含执行状态管理
 */
export class UnifiedWorkflow extends AggregateRoot {
  private readonly props: UnifiedWorkflowProps;

  private constructor(props: UnifiedWorkflowProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新的统一工作流
   */
  public static create(
    name: string,
    description?: string,
    type?: WorkflowType,
    config?: WorkflowConfig,
    tags?: string[],
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): UnifiedWorkflow {
    const now = Timestamp.now();
    const workflowId = ID.generate();
    const workflowType = type || WorkflowType.sequential();
    const workflowStatus = WorkflowStatus.draft();
    const workflowConfig = config || WorkflowConfig.default();

    const props: UnifiedWorkflowProps = {
      id: workflowId,
      name,
      description,
      status: workflowStatus,
      type: workflowType,
      config: workflowConfig,
      nodes: new Map(),
      edges: new Map(),
      tags: tags || [],
      metadata: metadata || {},
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false,
      createdBy,
      updatedBy: createdBy
    };

    const workflow = new UnifiedWorkflow(props);
    
    // 添加工作流创建事件
    workflow.addDomainEvent(new WorkflowCreatedEvent(
      workflowId,
      name,
      description,
      workflowType.toString(),
      workflowStatus.toString(),
      workflowConfig.value,
      undefined, // 不再需要graphId
      createdBy
    ));

    return workflow;
  }

  /**
   * 从已有属性重建统一工作流
   */
  public static fromProps(props: UnifiedWorkflowProps): UnifiedWorkflow {
    return new UnifiedWorkflow(props);
  }

  // 基本属性访问器
  public get workflowId(): ID { return this.props.id; }
  public get name(): string { return this.props.name; }
  public get description(): string | undefined { return this.props.description; }
  public get status(): WorkflowStatus { return this.props.status; }
  public get type(): WorkflowType { return this.props.type; }
  public get config(): WorkflowConfig { return this.props.config; }
  public get tags(): string[] { return [...this.props.tags]; }
  public get metadata(): Record<string, unknown> { return { ...this.props.metadata }; }
  public get executionCount(): number { return this.props.executionCount; }
  public get successCount(): number { return this.props.successCount; }
  public get failureCount(): number { return this.props.failureCount; }
  public get averageExecutionTime(): number | undefined { return this.props.averageExecutionTime; }
  public get lastExecutedAt(): Timestamp | undefined { return this.props.lastExecutedAt; }

  // 图结构访问器
  public get nodes(): Map<string, Node> { return new Map(this.props.nodes); }
  public get edges(): Map<string, Edge> { return new Map(this.props.edges); }

  // 图操作方法
  public getNode(nodeId: ID): Node | null {
    return this.props.nodes.get(nodeId.toString()) || null;
  }

  public getEdge(edgeId: ID): Edge | null {
    return this.props.edges.get(edgeId.toString()) || null;
  }

  public hasNode(nodeId: ID): boolean {
    return this.props.nodes.has(nodeId.toString());
  }

  public hasEdge(edgeId: ID): boolean {
    return this.props.edges.has(edgeId.toString());
  }

  public getNodeCount(): number {
    return this.props.nodes.size;
  }

  public getEdgeCount(): number {
    return this.props.edges.size;
  }

  public getIncomingEdges(nodeId: ID): Edge[] {
    const incomingEdges: Edge[] = [];
    for (const edge of this.props.edges.values()) {
      if (edge.isTo(nodeId) && !edge.isDeleted()) {
        incomingEdges.push(edge);
      }
    }
    return incomingEdges;
  }

  public getOutgoingEdges(nodeId: ID): Edge[] {
    const outgoingEdges: Edge[] = [];
    for (const edge of this.props.edges.values()) {
      if (edge.isFrom(nodeId) && !edge.isDeleted()) {
        outgoingEdges.push(edge);
      }
    }
    return outgoingEdges;
  }

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

  // 节点和边的修改方法
  public addNode(node: Node, addedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法向已删除的工作流添加节点');
    }

    if (!node.workflowId.equals(this.props.id)) {
      throw new DomainError('节点不属于当前工作流');
    }

    if (this.hasNode(node.nodeId)) {
      throw new DomainError('节点已存在');
    }

    const newNodes = new Map(this.props.nodes);
    newNodes.set(node.nodeId.toString(), node);

    this.updateProps({
      ...this.props,
      nodes: newNodes,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: addedBy
    });

    // 添加节点添加事件
    this.addDomainEvent(new NodeAddedEvent(
      this.props.id,
      node.nodeId,
      node.type,
      node.name,
      node.position,
      node.properties,
      addedBy
    ));
  }

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

    this.updateProps({
      ...this.props,
      nodes: newNodes,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: removedBy
    });
  }

  public addEdge(edge: Edge, addedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法向已删除的工作流添加边');
    }

    if (!edge.workflowId.equals(this.props.id)) {
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

    this.updateProps({
      ...this.props,
      edges: newEdges,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: addedBy
    });

    // 添加边添加事件
    this.addDomainEvent(new EdgeAddedEvent(
      this.props.id,
      edge.edgeId,
      edge.type,
      edge.fromNodeId,
      edge.toNodeId,
      edge.condition,
      edge.weight,
      edge.properties,
      addedBy
    ));
  }

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

    this.updateProps({
      ...this.props,
      edges: newEdges,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: removedBy
    });
  }

  // 业务配置修改方法
  public updateName(name: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的工作流');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态的工作流');
    }

    this.updateProps({
      ...this.props,
      name,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    });
  }

  public updateDescription(description: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的工作流');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态的工作流');
    }

    this.updateProps({
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    });
  }

  public updateType(type: WorkflowType, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的类型');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的类型');
    }

    this.updateProps({
      ...this.props,
      type,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    });
  }

  public updateConfig(config: WorkflowConfig, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的配置');
    }

    if (!this.props.status.canEdit()) {
      throw new DomainError('只能编辑草稿状态工作流的配置');
    }

    this.updateProps({
      ...this.props,
      config,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    });
  }

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

    this.updateProps({
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy: changedBy
    });

    // 添加状态变更事件
    this.addDomainEvent(new WorkflowStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      changedBy,
      reason
    ));
  }

  public addTag(tag: string, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法为已删除的工作流添加标签');
    }

    if (this.props.tags.includes(tag)) {
      return; // 标签已存在
    }

    this.updateProps({
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    });
  }

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

    this.updateProps({
      ...this.props,
      tags: newTags,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    });
  }

  public updateMetadata(metadata: Record<string, unknown>, updatedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除工作流的元数据');
    }

    this.updateProps({
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
      updatedBy
    });
  }

  // 执行统计方法
  public recordExecution(success: boolean, executionTime: number): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法记录已删除工作流的执行结果');
    }

    const newExecutionCount = this.props.executionCount + 1;
    const newSuccessCount = success ? this.props.successCount + 1 : this.props.successCount;
    const newFailureCount = success ? this.props.failureCount : this.props.failureCount + 1;

    // 计算新的平均执行时间
    const currentTotalTime = (this.props.averageExecutionTime || 0) * this.props.executionCount;
    const newAverageExecutionTime = (currentTotalTime + executionTime) / newExecutionCount;

    this.updateProps({
      ...this.props,
      executionCount: newExecutionCount,
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      averageExecutionTime: newAverageExecutionTime,
      lastExecutedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public getSuccessRate(): number {
    if (this.props.executionCount === 0) {
      return 0;
    }
    return this.props.successCount / this.props.executionCount;
  }

  public getFailureRate(): number {
    if (this.props.executionCount === 0) {
      return 0;
    }
    return this.props.failureCount / this.props.executionCount;
  }

  // 删除和验证方法
  public markAsDeleted(): void {
    if (this.props.isDeleted) {
      return;
    }

    this.updateProps({
      ...this.props,
      isDeleted: true,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  public getBusinessIdentifier(): string {
    return `workflow:${this.props.id.toString()}`;
  }

  // 私有方法
  private updateProps(newProps: UnifiedWorkflowProps): void {
    (this as any).props = Object.freeze(newProps);
    this.update();
  }

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

    if (this.props.executionCount < 0) {
      throw new DomainError('执行次数不能为负数');
    }

    if (this.props.successCount < 0) {
      throw new DomainError('成功次数不能为负数');
    }

    if (this.props.failureCount < 0) {
      throw new DomainError('失败次数不能为负数');
    }

    if (this.props.successCount + this.props.failureCount > this.props.executionCount) {
      throw new DomainError('成功和失败次数之和不能超过总执行次数');
    }

    if (this.props.averageExecutionTime !== undefined && this.props.averageExecutionTime < 0) {
      throw new DomainError('平均执行时间不能为负数');
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
```

#### 1.2 创建新的事件类型

```typescript
// src/domain/workflow/events/node-added-event.ts

import { ID } from '../../common/value-objects/id';
import { DomainEvent } from '../../common/events/domain-event';
import { NodeType } from '../graph/value-objects/node-type';

export class NodeAddedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: ID,
    public readonly nodeId: ID,
    public readonly nodeType: NodeType,
    public readonly nodeName: string,
    public readonly position: any,
    public readonly properties: Record<string, unknown>,
    public readonly addedBy?: ID
  ) {
    super('node.added', new Date());
  }
}

// src/domain/workflow/events/edge-added-event.ts

import { ID } from '../../common/value-objects/id';
import { DomainEvent } from '../../common/events/domain-event';
import { EdgeType } from '../graph/value-objects/edge-type';

export class EdgeAddedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: ID,
    public readonly edgeId: ID,
    public readonly edgeType: EdgeType,
    public readonly fromNodeId: ID,
    public readonly toNodeId: ID,
    public readonly condition: any,
    public readonly weight: number,
    public readonly properties: Record<string, unknown>,
    public readonly addedBy?: ID
  ) {
    super('edge.added', new Date());
  }
}
```

### 2. 创建ThreadExecutor实体

#### 2.1 设计ThreadExecutor接口

```typescript
// src/domain/threads/entities/thread-executor.ts

import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { UnifiedWorkflow } from '../../workflow/entities/unified-workflow';

/**
 * 线程执行状态枚举
 */
export enum ThreadExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * ThreadExecutor实体接口
 */
export interface ThreadExecutorProps {
  id: ID;
  sessionId: ID;
  workflowId: ID;
  status: ThreadExecutionStatus;
  
  // 执行上下文
  input: any;
  output?: any;
  variables: Map<string, any>;
  
  // 执行状态
  currentNodeId?: string;
  executedNodes: Set<string>;
  nodeResults: Map<string, any>;
  edgeResults: Map<string, boolean>;
  
  // 错误处理
  error?: Error;
  errorCount: number;
  
  // 执行统计
  startTime?: Timestamp;
  endTime?: Timestamp;
  executionTime?: number;
  
  // 元数据
  metadata: Record<string, unknown>;
  
  // 审计
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  createdBy?: ID;
  updatedBy?: ID;
}

/**
 * ThreadExecutor实体
 * 
 * 专注于单线程串行执行，负责：
 * - 管理单线程的执行状态
 * - 跟踪节点执行结果
 * - 处理执行上下文
 * - 不负责多线程协调
 */
export class ThreadExecutor extends Entity {
  private readonly props: ThreadExecutorProps;

  private constructor(props: ThreadExecutorProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新的线程执行器
   */
  public static create(
    sessionId: ID,
    workflowId: ID,
    input: any,
    createdBy?: ID
  ): ThreadExecutor {
    const now = Timestamp.now();
    const threadId = ID.generate();

    const props: ThreadExecutorProps = {
      id: threadId,
      sessionId,
      workflowId,
      status: ThreadExecutionStatus.PENDING,
      input,
      variables: new Map(),
      executedNodes: new Set(),
      nodeResults: new Map(),
      edgeResults: new Map(),
      errorCount: 0,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      createdBy
    };

    return new ThreadExecutor(props);
  }

  /**
   * 从已有属性重建线程执行器
   */
  public static fromProps(props: ThreadExecutorProps): ThreadExecutor {
    return new ThreadExecutor(props);
  }

  // 基本属性访问器
  public get threadId(): ID { return this.props.id; }
  public get sessionId(): ID { return this.props.sessionId; }
  public get workflowId(): ID { return this.props.workflowId; }
  public get status(): ThreadExecutionStatus { return this.props.status; }
  public get input(): any { return this.props.input; }
  public get output(): any | undefined { return this.props.output; }
  public get variables(): Map<string, any> { return new Map(this.props.variables); }
  public get currentNodeId(): string | undefined { return this.props.currentNodeId; }
  public get executedNodes(): Set<string> { return new Set(this.props.executedNodes); }
  public get nodeResults(): Map<string, any> { return new Map(this.props.nodeResults); }
  public get edgeResults(): Map<string, boolean> { return new Map(this.props.edgeResults); }
  public get error(): Error | undefined { return this.props.error; }
  public get errorCount(): number { return this.props.errorCount; }
  public get startTime(): Timestamp | undefined { return this.props.startTime; }
  public get endTime(): Timestamp | undefined { return this.props.endTime; }
  public get executionTime(): number | undefined { return this.props.executionTime; }
  public get metadata(): Record<string, unknown> { return { ...this.props.metadata }; }

  // 状态检查方法
  public isPending(): boolean { return this.props.status === ThreadExecutionStatus.PENDING; }
  public isRunning(): boolean { return this.props.status === ThreadExecutionStatus.RUNNING; }
  public isPaused(): boolean { return this.props.status === ThreadExecutionStatus.PAUSED; }
  public isCompleted(): boolean { return this.props.status === ThreadExecutionStatus.COMPLETED; }
  public isFailed(): boolean { return this.props.status === ThreadExecutionStatus.FAILED; }
  public isCancelled(): boolean { return this.props.status === ThreadExecutionStatus.CANCELLED; }
  public isTerminal(): boolean {
    return [
      ThreadExecutionStatus.COMPLETED,
      ThreadExecutionStatus.FAILED,
      ThreadExecutionStatus.CANCELLED
    ].includes(this.props.status);
  }
  public isActive(): boolean {
    return [
      ThreadExecutionStatus.PENDING,
      ThreadExecutionStatus.RUNNING,
      ThreadExecutionStatus.PAUSED
    ].includes(this.props.status);
  }

  // 执行控制方法
  public start(): void {
    if (!this.isPending()) {
      throw new DomainError('只有待处理状态可以开始执行');
    }

    this.updateProps({
      ...this.props,
      status: ThreadExecutionStatus.RUNNING,
      startTime: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public pause(): void {
    if (!this.isRunning()) {
      throw new DomainError('只有运行中状态可以暂停');
    }

    this.updateProps({
      ...this.props,
      status: ThreadExecutionStatus.PAUSED,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public resume(): void {
    if (!this.isPaused()) {
      throw new DomainError('只有暂停状态可以恢复');
    }

    this.updateProps({
      ...this.props,
      status: ThreadExecutionStatus.RUNNING,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public complete(output?: any): void {
    if (!this.isActive()) {
      throw new DomainError('只有活跃状态可以完成');
    }

    const now = Timestamp.now();
    const executionTime = this.props.startTime 
      ? now.getTime() - this.props.startTime.getTime()
      : 0;

    this.updateProps({
      ...this.props,
      status: ThreadExecutionStatus.COMPLETED,
      output,
      endTime: now,
      executionTime,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  public fail(error: Error): void {
    if (!this.isActive()) {
      throw new DomainError('只有活跃状态可以标记为失败');
    }

    const now = Timestamp.now();
    const executionTime = this.props.startTime 
      ? now.getTime() - this.props.startTime.getTime()
      : 0;

    this.updateProps({
      ...this.props,
      status: ThreadExecutionStatus.FAILED,
      error,
      errorCount: this.props.errorCount + 1,
      endTime: now,
      executionTime,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  public cancel(): void {
    if (this.isTerminal()) {
      throw new DomainError('终止状态无法取消');
    }

    const now = Timestamp.now();
    const executionTime = this.props.startTime 
      ? now.getTime() - this.props.startTime.getTime()
      : 0;

    this.updateProps({
      ...this.props,
      status: ThreadExecutionStatus.CANCELLED,
      endTime: now,
      executionTime,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  // 执行状态管理方法
  public setCurrentNode(nodeId: string): void {
    if (!this.isRunning()) {
      throw new DomainError('只有运行中状态可以设置当前节点');
    }

    this.updateProps({
      ...this.props,
      currentNodeId: nodeId,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public markNodeExecuted(nodeId: string, result: any): void {
    if (!this.isRunning()) {
      throw new DomainError('只有运行中状态可以标记节点执行');
    }

    const newExecutedNodes = new Set(this.props.executedNodes);
    newExecutedNodes.add(nodeId);

    const newNodeResults = new Map(this.props.nodeResults);
    newNodeResults.set(nodeId, result);

    this.updateProps({
      ...this.props,
      executedNodes: newExecutedNodes,
      nodeResults: newNodeResults,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public setEdgeResult(edgeId: string, result: boolean): void {
    if (!this.isRunning()) {
      throw new DomainError('只有运行中状态可以设置边结果');
    }

    const newEdgeResults = new Map(this.props.edgeResults);
    newEdgeResults.set(edgeId, result);

    this.updateProps({
      ...this.props,
      edgeResults: newEdgeResults,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  // 变量管理方法
  public setVariable(name: string, value: any): void {
    const newVariables = new Map(this.props.variables);
    newVariables.set(name, value);

    this.updateProps({
      ...this.props,
      variables: newVariables,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public getVariable(name: string): any {
    return this.props.variables.get(name);
  }

  public hasVariable(name: string): boolean {
    return this.props.variables.has(name);
  }

  public deleteVariable(name: string): boolean {
    const newVariables = new Map(this.props.variables);
    const deleted = newVariables.delete(name);

    if (deleted) {
      this.updateProps({
        ...this.props,
        variables: newVariables,
        updatedAt: Timestamp.now(),
        version: this.props.version.nextPatch()
      });
    }

    return deleted;
  }

  public updateVariables(variables: Record<string, any>): void {
    const newVariables = new Map(this.props.variables);
    for (const [name, value] of Object.entries(variables)) {
      newVariables.set(name, value);
    }

    this.updateProps({
      ...this.props,
      variables: newVariables,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  // 元数据管理方法
  public setMetadata(key: string, value: any): void {
    const newMetadata = { ...this.props.metadata };
    newMetadata[key] = value;

    this.updateProps({
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public getMetadata(key: string): any {
    return this.props.metadata[key];
  }

  public hasMetadata(key: string): boolean {
    return key in this.props.metadata;
  }

  public updateMetadata(metadata: Record<string, any>): void {
    this.updateProps({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  // 检查点方法
  public createCheckpoint(): void {
    this.setMetadata('checkpoint', {
      timestamp: Timestamp.now(),
      variables: Object.fromEntries(this.props.variables),
      executedNodes: Array.from(this.props.executedNodes),
      nodeResults: Object.fromEntries(this.props.nodeResults),
      edgeResults: Object.fromEntries(this.props.edgeResults),
      currentNodeId: this.props.currentNodeId,
      status: this.props.status
    });
  }

  public restoreFromCheckpoint(): void {
    const checkpoint = this.props.metadata['checkpoint'] as any;
    if (!checkpoint) {
      throw new DomainError('没有可用的检查点');
    }

    this.updateProps({
      ...this.props,
      variables: new Map(Object.entries(checkpoint.variables)),
      executedNodes: new Set(checkpoint.executedNodes),
      nodeResults: new Map(Object.entries(checkpoint.nodeResults)),
      edgeResults: new Map(Object.entries(checkpoint.edgeResults)),
      currentNodeId: checkpoint.currentNodeId,
      status: checkpoint.status,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  // 工具方法
  public getExecutionSummary(): any {
    return {
      threadId: this.props.id.toString(),
      sessionId: this.props.sessionId.toString(),
      workflowId: this.props.workflowId.toString(),
      status: this.props.status,
      currentNodeId: this.props.currentNodeId,
      executedNodesCount: this.props.executedNodes.size,
      nodeResultsCount: this.props.nodeResults.size,
      edgeResultsCount: this.props.edgeResults.size,
      variablesCount: this.props.variables.size,
      errorCount: this.props.errorCount,
      startTime: this.props.startTime?.toISOString(),
      endTime: this.props.endTime?.toISOString(),
      executionTime: this.props.executionTime,
      hasError: !!this.props.error
    };
  }

  public clone(): ThreadExecutor {
    const clonedProps = {
      ...this.props,
      id: ID.generate(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: Version.initial()
    };

    return new ThreadExecutor(clonedProps);
  }

  // 私有方法
  private updateProps(newProps: ThreadExecutorProps): void {
    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('线程ID不能为空');
    }

    if (!this.props.sessionId) {
      throw new DomainError('会话ID不能为空');
    }

    if (!this.props.workflowId) {
      throw new DomainError('工作流ID不能为空');
    }

    if (!Object.values(ThreadExecutionStatus).includes(this.props.status)) {
      throw new DomainError('无效的线程执行状态');
    }

    if (this.props.errorCount < 0) {
      throw new DomainError('错误次数不能为负数');
    }

    if (this.props.executionTime !== undefined && this.props.executionTime < 0) {
      throw new DomainError('执行时间不能为负数');
    }
  }

  public override validate(): void {
    this.validateInvariants();
  }
}
```

### 3. 创建SessionManager实体

#### 3.1 设计SessionManager接口

```typescript
// src/domain/sessions/entities/session-manager.ts

import { AggregateRoot } from '../../common/base/aggregate-root';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { ThreadExecutor } from '../../threads/entities/thread-executor';
import { UnifiedWorkflow } from '../../workflow/entities/unified-workflow';

/**
 * 会话状态枚举
 */
export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 执行策略枚举
 */
export enum ExecutionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional'
}

/**
 * SessionManager实体接口
 */
export interface SessionManagerProps {
  id: ID;
  workflowId: ID;
  status: SessionStatus;
  strategy: ExecutionStrategy;
  
  // 线程管理
  threads: Map<string, ThreadExecutor>;
  mainThreadId?: string;
  
  // 执行状态
  input: any;
  output?: any;
  globalVariables: Map<string, any>;
  
  // 错误处理
  errors: Error[];
  errorCount: number;
  
  // 执行统计
  startTime?: Timestamp;
  endTime?: Timestamp;
  executionTime?: number;
  
  // 资源管理
  maxThreads: number;
  resourceUsage: Record<string, any>;
  
  // 元数据
  metadata: Record<string, unknown>;
  
  // 审计
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  createdBy?: ID;
  updatedBy?: ID;
}

/**
 * SessionManager实体
 * 
 * 负责多线程协调和资源管理，包含：
 * - 线程生命周期管理
 * - 多线程并行协调
 * - 资源调度和分配
 * - 全局状态管理
 */
export class SessionManager extends AggregateRoot {
  private readonly props: SessionManagerProps;

  private constructor(props: SessionManagerProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新的会话管理器
   */
  public static create(
    workflowId: ID,
    input: any,
    strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL,
    maxThreads: number = 10,
    createdBy?: ID
  ): SessionManager {
    const now = Timestamp.now();
    const sessionId = ID.generate();

    const props: SessionManagerProps = {
      id: sessionId,
      workflowId,
      status: SessionStatus.ACTIVE,
      strategy,
      threads: new Map(),
      input,
      globalVariables: new Map(),
      errors: [],
      errorCount: 0,
      maxThreads,
      resourceUsage: {},
      metadata: {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      createdBy
    };

    return new SessionManager(props);
  }

  /**
   * 从已有属性重建会话管理器
   */
  public static fromProps(props: SessionManagerProps): SessionManager {
    return new SessionManager(props);
  }

  // 基本属性访问器
  public get sessionId(): ID { return this.props.id; }
  public get workflowId(): ID { return this.props.workflowId; }
  public get status(): SessionStatus { return this.props.status; }
  public get strategy(): ExecutionStrategy { return this.props.strategy; }
  public get threads(): Map<string, ThreadExecutor> { return new Map(this.props.threads); }
  public get mainThreadId(): string | undefined { return this.props.mainThreadId; }
  public get input(): any { return this.props.input; }
  public get output(): any | undefined { return this.props.output; }
  public get globalVariables(): Map<string, any> { return new Map(this.props.globalVariables); }
  public get errors(): Error[] { return [...this.props.errors]; }
  public get errorCount(): number { return this.props.errorCount; }
  public get startTime(): Timestamp | undefined { return this.props.startTime; }
  public get endTime(): Timestamp | undefined { return this.props.endTime; }
  public get executionTime(): number | undefined { return this.props.executionTime; }
  public get maxThreads(): number { return this.props.maxThreads; }
  public get resourceUsage(): Record<string, any> { return { ...this.props.resourceUsage }; }
  public get metadata(): Record<string, unknown> { return { ...this.props.metadata }; }

  // 状态检查方法
  public isActive(): boolean { return this.props.status === SessionStatus.ACTIVE; }
  public isPaused(): boolean { return this.props.status === SessionStatus.PAUSED; }
  public isCompleted(): boolean { return this.props.status === SessionStatus.COMPLETED; }
  public isFailed(): boolean { return this.props.status === SessionStatus.FAILED; }
  public isCancelled(): boolean { return this.props.status === SessionStatus.CANCELLED; }
  public isTerminal(): boolean {
    return [
      SessionStatus.COMPLETED,
      SessionStatus.FAILED,
      SessionStatus.CANCELLED
    ].includes(this.props.status);
  }

  // 线程管理方法
  public createThread(input?: any): ThreadExecutor {
    if (this.isTerminal()) {
      throw new DomainError('终止状态的会话无法创建线程');
    }

    if (this.props.threads.size >= this.props.maxThreads) {
      throw new DomainError('已达到最大线程数限制');
    }

    const thread = ThreadExecutor.create(
      this.props.id,
      this.props.workflowId,
      input || this.props.input
    );

    const newThreads = new Map(this.props.threads);
    newThreads.set(thread.threadId.toString(), thread);

    // 如果是第一个线程，设为主线程
    const mainThreadId = this.props.mainThreadId || thread.threadId.toString();

    this.updateProps({
      ...this.props,
      threads: newThreads,
      mainThreadId,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });

    return thread;
  }

  public getThread(threadId: string): ThreadExecutor | null {
    return this.props.threads.get(threadId) || null;
  }

  public removeThread(threadId: string): void {
    if (this.isTerminal()) {
      throw new DomainError('终止状态的会话无法移除线程');
    }

    const thread = this.getThread(threadId);
    if (!thread) {
      throw new DomainError('线程不存在');
    }

    // 不能移除运行中的线程
    if (thread.isRunning()) {
      throw new DomainError('无法移除运行中的线程');
    }

    const newThreads = new Map(this.props.threads);
    newThreads.delete(threadId);

    // 如果移除的是主线程，需要重新指定主线程
    let mainThreadId = this.props.mainThreadId;
    if (mainThreadId === threadId) {
      const remainingThreads = Array.from(newThreads.keys());
      mainThreadId = remainingThreads.length > 0 ? remainingThreads[0] : undefined;
    }

    this.updateProps({
      ...this.props,
      threads: newThreads,
      mainThreadId,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public getActiveThreads(): ThreadExecutor[] {
    return Array.from(this.props.threads.values()).filter(thread => thread.isActive());
  }

  public getCompletedThreads(): ThreadExecutor[] {
    return Array.from(this.props.threads.values()).filter(thread => thread.isCompleted());
  }

  public getFailedThreads(): ThreadExecutor[] {
    return Array.from(this.props.threads.values()).filter(thread => thread.isFailed());
  }

  // 执行控制方法
  public pause(): void {
    if (!this.isActive()) {
      throw new DomainError('只有活跃状态的会话可以暂停');
    }

    // 暂停所有运行中的线程
    const newThreads = new Map(this.props.threads);
    for (const [threadId, thread] of newThreads) {
      if (thread.isRunning()) {
        thread.pause();
        newThreads.set(threadId, thread);
      }
    }

    this.updateProps({
      ...this.props,
      threads: newThreads,
      status: SessionStatus.PAUSED,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public resume(): void {
    if (!this.isPaused()) {
      throw new DomainError('只有暂停状态的会话可以恢复');
    }

    // 恢复所有暂停的线程
    const newThreads = new Map(this.props.threads);
    for (const [threadId, thread] of newThreads) {
      if (thread.isPaused()) {
        thread.resume();
        newThreads.set(threadId, thread);
      }
    }

    this.updateProps({
      ...this.props,
      threads: newThreads,
      status: SessionStatus.ACTIVE,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public complete(output?: any): void {
    if (!this.isActive() && !this.isPaused()) {
      throw new DomainError('只有活跃或暂停状态的会话可以完成');
    }

    // 完成所有活跃的线程
    const newThreads = new Map(this.props.threads);
    for (const [threadId, thread] of newThreads) {
      if (thread.isActive()) {
        thread.complete();
        newThreads.set(threadId, thread);
      }
    }

    const now = Timestamp.now();
    const executionTime = this.props.startTime 
      ? now.getTime() - this.props.startTime.getTime()
      : 0;

    this.updateProps({
      ...this.props,
      threads: newThreads,
      status: SessionStatus.COMPLETED,
      output,
      endTime: now,
      executionTime,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  public fail(error: Error): void {
    if (this.isTerminal()) {
      throw new DomainError('终止状态的会话无法标记为失败');
    }

    // 取消所有活跃的线程
    const newThreads = new Map(this.props.threads);
    for (const [threadId, thread] of newThreads) {
      if (thread.isActive()) {
        thread.cancel();
        newThreads.set(threadId, thread);
      }
    }

    const newErrors = [...this.props.errors, error];
    const now = Timestamp.now();
    const executionTime = this.props.startTime 
      ? now.getTime() - this.props.startTime.getTime()
      : 0;

    this.updateProps({
      ...this.props,
      threads: newThreads,
      status: SessionStatus.FAILED,
      errors: newErrors,
      errorCount: this.props.errorCount + 1,
      endTime: now,
      executionTime,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  public cancel(): void {
    if (this.isTerminal()) {
      throw new DomainError('终止状态的会话无法取消');
    }

    // 取消所有活跃的线程
    const newThreads = new Map(this.props.threads);
    for (const [threadId, thread] of newThreads) {
      if (thread.isActive()) {
        thread.cancel();
        newThreads.set(threadId, thread);
      }
    }

    const now = Timestamp.now();
    const executionTime = this.props.startTime 
      ? now.getTime() - this.props.startTime.getTime()
      : 0;

    this.updateProps({
      ...this.props,
      threads: newThreads,
      status: SessionStatus.CANCELLED,
      endTime: now,
      executionTime,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  // 全局变量管理
  public setGlobalVariable(name: string, value: any): void {
    const newGlobalVariables = new Map(this.props.globalVariables);
    newGlobalVariables.set(name, value);

    this.updateProps({
      ...this.props,
      globalVariables: newGlobalVariables,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public getGlobalVariable(name: string): any {
    return this.props.globalVariables.get(name);
  }

  public hasGlobalVariable(name: string): boolean {
    return this.props.globalVariables.has(name);
  }

  public deleteGlobalVariable(name: string): boolean {
    const newGlobalVariables = new Map(this.props.globalVariables);
    const deleted = newGlobalVariables.delete(name);

    if (deleted) {
      this.updateProps({
        ...this.props,
        globalVariables: newGlobalVariables,
        updatedAt: Timestamp.now(),
        version: this.props.version.nextPatch()
      });
    }

    return deleted;
  }

  // 错误处理
  public addError(error: Error): void {
    const newErrors = [...this.props.errors, error];

    this.updateProps({
      ...this.props,
      errors: newErrors,
      errorCount: this.props.errorCount + 1,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public clearErrors(): void {
    this.updateProps({
      ...this.props,
      errors: [],
      errorCount: 0,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  // 资源管理
  public updateResourceUsage(resourceType: string, usage: any): void {
    const newResourceUsage = { ...this.props.resourceUsage };
    newResourceUsage[resourceType] = usage;

    this.updateProps({
      ...this.props,
      resourceUsage: newResourceUsage,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public getResourceUsage(resourceType: string): any {
    return this.props.resourceUsage[resourceType];
  }

  // 元数据管理
  public setMetadata(key: string, value: any): void {
    const newMetadata = { ...this.props.metadata };
    newMetadata[key] = value;

    this.updateProps({
      ...this.props,
      metadata: newMetadata,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  public getMetadata(key: string): any {
    return this.props.metadata[key];
  }

  // 工具方法
  public getExecutionSummary(): any {
    const activeThreads = this.getActiveThreads();
    const completedThreads = this.getCompletedThreads();
    const failedThreads = this.getFailedThreads();

    return {
      sessionId: this.props.id.toString(),
      workflowId: this.props.workflowId.toString(),
      status: this.props.status,
      strategy: this.props.strategy,
      mainThreadId: this.props.mainThreadId,
      totalThreads: this.props.threads.size,
      activeThreads: activeThreads.length,
      completedThreads: completedThreads.length,
      failedThreads: failedThreads.length,
      globalVariablesCount: this.props.globalVariables.size,
      errorCount: this.props.errorCount,
      maxThreads: this.props.maxThreads,
      resourceUsage: this.props.resourceUsage,
      startTime: this.props.startTime?.toISOString(),
      endTime: this.props.endTime?.toISOString(),
      executionTime: this.props.executionTime,
      hasOutput: !!this.props.output
    };
  }

  public canCreateThread(): boolean {
    return this.isActive() && this.props.threads.size < this.props.maxThreads;
  }

  public isExecutionComplete(): boolean {
    if (this.isTerminal()) {
      return true;
    }

    // 检查是否所有线程都已完成
    const activeThreads = this.getActiveThreads();
    return activeThreads.length === 0 && this.props.threads.size > 0;
  }

  // 私有方法
  private updateProps(newProps: SessionManagerProps): void {
    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('会话ID不能为空');
    }

    if (!this.props.workflowId) {
      throw new DomainError('工作流ID不能为空');
    }

    if (!Object.values(SessionStatus).includes(this.props.status)) {
      throw new DomainError('无效的会话状态');
    }

    if (!Object.values(ExecutionStrategy).includes(this.props.strategy)) {
      throw new DomainError('无效的执行策略');
    }

    if (this.props.maxThreads <= 0) {
      throw new DomainError('最大线程数必须大于0');
    }

    if (this.props.errorCount < 0) {
      throw new DomainError('错误次数不能为负数');
    }

    if (this.props.executionTime !== undefined && this.props.executionTime < 0) {
      throw new DomainError('执行时间不能为负数');
    }

    // 验证主线程是否存在
    if (this.props.mainThreadId && !this.props.threads.has(this.props.mainThreadId)) {
      throw new DomainError('主线程不存在');
    }
  }

  public override validate(): void {
    this.validateInvariants();

    // 验证所有线程
    for (const thread of this.props.threads.values()) {
      thread.validate();
    }
  }
}
```

### 4. 数据库模型更新

#### 4.1 更新Workflow模型

```typescript
// src/infrastructure/database/models/unified-workflow.model.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('unified_workflows')
export class UnifiedWorkflowModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  })
  status!: string;

  @Column({
    type: 'enum',
    enum: ['sequential', 'parallel', 'conditional'],
    default: 'sequential'
  })
  type!: string;

  @Column('jsonb')
  config!: any;

  @Column('jsonb')
  nodes!: any; // 存储节点数据

  @Column('jsonb')
  edges!: any; // 存储边数据

  @Column('jsonb')
  tags!: string[];

  @Column('jsonb')
  metadata!: any;

  @Column({ default: 0 })
  executionCount!: number;

  @Column({ default: 0 })
  successCount!: number;

  @Column({ default: 0 })
  failureCount!: number;

  @Column({ nullable: true, type: 'float' })
  averageExecutionTime?: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastExecutedAt?: Date;

  @Column()
  version!: string;

  @Column({ default: 1 })
  revision!: number;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ nullable: true })
  updatedBy?: string;

  @Column({ default: false })
  isDeleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

#### 4.2 创建ThreadExecutor模型

```typescript
// src/infrastructure/database/models/thread-executor.model.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SessionManagerModel } from './session-manager.model';

@Entity('thread_executors')
export class ThreadExecutorModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sessionId!: string;

  @Column()
  workflowId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  })
  status!: string;

  @Column('jsonb')
  input!: any;

  @Column('jsonb', { nullable: true })
  output?: any;

  @Column('jsonb')
  variables!: any; // 存储变量映射

  @Column({ nullable: true })
  currentNodeId?: string;

  @Column('jsonb')
  executedNodes!: string[]; // 存储已执行节点ID数组

  @Column('jsonb')
  nodeResults!: any; // 存储节点执行结果

  @Column('jsonb')
  edgeResults!: any; // 存储边评估结果

  @Column('text', { nullable: true })
  error?: string;

  @Column({ default: 0 })
  errorCount!: number;

  @Column({ nullable: true, type: 'timestamp' })
  startTime?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  endTime?: Date;

  @Column({ nullable: true, type: 'float' })
  executionTime?: number;

  @Column('jsonb')
  metadata!: any;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => SessionManagerModel, session => session.threads)
  @JoinColumn({ name: 'sessionId' })
  session?: SessionManagerModel;
}
```

#### 4.3 创建SessionManager模型

```typescript
// src/infrastructure/database/models/session-manager.model.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ThreadExecutorModel } from './thread-executor.model';

@Entity('session_managers')
export class SessionManagerModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  workflowId!: string;

  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'active'
  })
  status!: string;

  @Column({
    type: 'enum',
    enum: ['sequential', 'parallel', 'conditional'],
    default: 'sequential'
  })
  strategy!: string;

  @Column('jsonb')
  input!: any;

  @Column('jsonb', { nullable: true })
  output?: any;

  @Column('jsonb')
  globalVariables!: any; // 存储全局变量映射

  @Column('jsonb')
  errors!: any; // 存储错误数组

  @Column({ default: 0 })
  errorCount!: number;

  @Column({ nullable: true, type: 'timestamp' })
  startTime?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  endTime?: Date;

  @Column({ nullable: true, type: 'float' })
  executionTime?: number;

  @Column({ default: 10 })
  maxThreads!: number;

  @Column('jsonb')
  resourceUsage!: any; // 存储资源使用情况

  @Column({ nullable: true })
  mainThreadId?: string;

  @Column('jsonb')
  metadata!: any;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ThreadExecutorModel, thread => thread.session)
  threads!: ThreadExecutorModel[];
}
```

### 5. 仓储和服务更新

#### 5.1 创建UnifiedWorkflow仓储

```typescript
// src/infrastructure/database/repositories/unified-workflow-repository.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UnifiedWorkflow } from '../../../domain/workflow/entities/unified-workflow';
import { IUnifiedWorkflowRepository } from '../../../domain/workflow/repositories/unified-workflow-repository';
import { UnifiedWorkflowModel } from '../models/unified-workflow.model';
import { UnifiedWorkflowMapper } from '../mappers/unified-workflow.mapper';

@Injectable()
export class UnifiedWorkflowRepository implements IUnifiedWorkflowRepository {
  constructor(
    @InjectRepository(UnifiedWorkflowModel)
    private readonly repository: Repository<UnifiedWorkflowModel>,
    private readonly dataSource: DataSource,
    private readonly mapper: UnifiedWorkflowMapper
  ) {}

  async save(workflow: UnifiedWorkflow): Promise<UnifiedWorkflow> {
    const model = this.mapper.toModel(workflow);
    const savedModel = await this.repository.save(model);
    return this.mapper.toEntity(savedModel);
  }

  async findById(id: string): Promise<UnifiedWorkflow | null> {
    const model = await this.repository.findOne({
      where: { id, isDeleted: false }
    });
    return model ? this.mapper.toEntity(model) : null;
  }

  async findByIdOrFail(id: string): Promise<UnifiedWorkflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error(`Workflow with id ${id} not found`);
    }
    return workflow;
  }

  async findByName(name: string): Promise<UnifiedWorkflow | null> {
    const model = await this.repository.findOne({
      where: { name, isDeleted: false }
    });
    return model ? this.mapper.toEntity(model) : null;
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { name, isDeleted: false }
    });
    return count > 0;
  }

  async findAll(options?: any): Promise<UnifiedWorkflow[]> {
    const models = await this.repository.find({
      where: { isDeleted: false },
      ...options
    });
    return models.map(model => this.mapper.toEntity(model));
  }

  async delete(id: string): Promise<void> {
    await this.repository.update(id, { isDeleted: true });
  }

  async getWorkflowExecutionStats(options?: any): Promise<any> {
    // 实现统计查询
    const result = await this.repository
      .createQueryBuilder('workflow')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN workflow.status = :draft THEN 1 ELSE 0 END)', 'draft')
      .addSelect('SUM(CASE WHEN workflow.status = :active THEN 1 ELSE 0 END)', 'active')
      .addSelect('SUM(CASE WHEN workflow.status = :inactive THEN 1 ELSE 0 END)', 'inactive')
      .addSelect('SUM(CASE WHEN workflow.status = :archived THEN 1 ELSE 0 END)', 'archived')
      .addSelect('SUM(workflow.executionCount)', 'totalExecutions')
      .addSelect('SUM(workflow.successCount)', 'totalSuccesses')
      .addSelect('SUM(workflow.failureCount)', 'totalFailures')
      .where('workflow.isDeleted = :isDeleted', { isDeleted: false })
      .setParameters({
        draft: 'draft',
        active: 'active',
        inactive: 'inactive',
        archived: 'archived'
      })
      .getRawOne();

    return {
      total: parseInt(result.total) || 0,
      draft: parseInt(result.draft) || 0,
      active: parseInt(result.active) || 0,
      inactive: parseInt(result.inactive) || 0,
      archived: parseInt(result.archived) || 0,
      totalExecutions: parseInt(result.totalExecutions) || 0,
      totalSuccesses: parseInt(result.totalSuccesses) || 0,
      totalFailures: parseInt(result.totalFailures) || 0,
      averageSuccessRate: result.totalExecutions > 0 
        ? (parseInt(result.totalSuccesses) || 0) / parseInt(result.totalExecutions) 
        : 0
    };
  }

  // 其他必要的方法...
}
```

#### 5.2 创建映射器

```typescript
// src/infrastructure/database/mappers/unified-workflow.mapper.ts

import { Injectable } from '@nestjs/common';
import { UnifiedWorkflow } from '../../../domain/workflow/entities/unified-workflow';
import { UnifiedWorkflowModel } from '../models/unified-workflow.model';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { WorkflowStatus } from '../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../domain/workflow/value-objects/workflow-type';
import { WorkflowConfig } from '../../../domain/workflow/value-objects/workflow-config';

@Injectable()
export class UnifiedWorkflowMapper {
  toEntity(model: UnifiedWorkflowModel): UnifiedWorkflow {
    const props = {
      id: ID.fromString(model.id),
      name: model.name,
      description: model.description,
      status: WorkflowStatus.fromString(model.status),
      type: WorkflowType.fromString(model.type),
      config: WorkflowConfig.create(model.config),
      nodes: new Map(Object.entries(model.nodes || {})),
      edges: new Map(Object.entries(model.edges || {})),
      tags: model.tags || [],
      metadata: model.metadata || {},
      executionCount: model.executionCount,
      successCount: model.successCount,
      failureCount: model.failureCount,
      averageExecutionTime: model.averageExecutionTime,
      lastExecutedAt: model.lastExecutedAt 
        ? Timestamp.fromDate(model.lastExecutedAt) 
        : undefined,
      createdAt: Timestamp.fromDate(model.createdAt),
      updatedAt: Timestamp.fromDate(model.updatedAt),
      version: Version.fromString(model.version),
      isDeleted: model.isDeleted,
      createdBy: model.createdBy ? ID.fromString(model.createdBy) : undefined,
      updatedBy: model.updatedBy ? ID.fromString(model.updatedBy) : undefined
    };

    return UnifiedWorkflow.fromProps(props);
  }

  toModel(entity: UnifiedWorkflow): UnifiedWorkflowModel {
    const model = new UnifiedWorkflowModel();
    model.id = entity.workflowId.toString();
    model.name = entity.name;
    model.description = entity.description;
    model.status = entity.status.toString();
    model.type = entity.type.toString();
    model.config = entity.config.value;
    model.nodes = Object.fromEntries(entity.nodes);
    model.edges = Object.fromEntries(entity.edges);
    model.tags = entity.tags;
    model.metadata = entity.metadata;
    model.executionCount = entity.executionCount;
    model.successCount = entity.successCount;
    model.failureCount = entity.failureCount;
    model.averageExecutionTime = entity.averageExecutionTime;
    model.lastExecutedAt = entity.lastExecutedAt?.toDate();
    model.version = entity.version.toString();
    model.isDeleted = entity.isDeleted();
    model.createdBy = entity.createdBy?.toString();
    model.updatedBy = entity.updatedBy?.toString();
    model.createdAt = entity.createdAt.toDate();
    model.updatedAt = entity.updatedAt.toDate();

    return model;
  }
}
```

### 6. 迁移策略

#### 6.1 数据迁移脚本

```sql
-- 1. 创建新的表结构
CREATE TABLE unified_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    type VARCHAR(50) NOT NULL DEFAULT 'sequential',
    config JSONB NOT NULL DEFAULT '{}',
    nodes JSONB NOT NULL DEFAULT '{}',
    edges JSONB NOT NULL DEFAULT '{}',
    tags JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    execution_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    average_execution_time FLOAT,
    last_executed_at TIMESTAMP,
    version VARCHAR(50) NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    created_by UUID,
    updated_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE session_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    strategy VARCHAR(50) NOT NULL DEFAULT 'sequential',
    input JSONB NOT NULL,
    output JSONB,
    global_variables JSONB NOT NULL DEFAULT '{}',
    errors JSONB NOT NULL DEFAULT '[]',
    error_count INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    execution_time FLOAT,
    max_threads INTEGER NOT NULL DEFAULT 10,
    resource_usage JSONB NOT NULL DEFAULT '{}',
    main_thread_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE thread_executors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    input JSONB NOT NULL,
    output JSONB,
    variables JSONB NOT NULL DEFAULT '{}',
    current_node_id VARCHAR(255),
    executed_nodes JSONB NOT NULL DEFAULT '[]',
    node_results JSONB NOT NULL DEFAULT '{}',
    edge_results JSONB NOT NULL DEFAULT '{}',
    error TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    execution_time FLOAT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES session_managers(id)
);

-- 2. 数据迁移
INSERT INTO unified_workflows (
    id, name, description, status, type, config, nodes, edges, tags, metadata,
    execution_count, success_count, failure_count, average_execution_time,
    last_executed_at, version, revision, created_by, updated_by, is_deleted,
    created_at, updated_at
)
SELECT 
    w.id,
    w.name,
    w.description,
    w.state,
    w.execution_mode,
    w.configuration,
    COALESCE(g.definition, '{}'),
    COALESCE(
        JSON_BUILD_OBJECT(
            'nodes', COALESCE(g.nodes, '[]'),
            'edges', COALESCE(g.edges, '[]')
        ),
        '{}'
    ),
    COALESCE(w.tags, '[]'),
    COALESCE(w.metadata, '{}'),
    COALESCE(w.execution_count, 0),
    COALESCE(w.success_count, 0),
    COALESCE(w.failure_count, 0),
    w.average_execution_time,
    w.last_executed_at,
    w.version,
    w.revision,
    w.created_by,
    w.updated_by,
    FALSE,
    w.created_at,
    w.updated_at
FROM workflows w
LEFT JOIN graphs g ON w.graph_id = g.id
WHERE w.is_deleted = FALSE;

-- 3. 创建索引
CREATE INDEX idx_unified_workflows_status ON unified_workflows(status);
CREATE INDEX idx_unified_workflows_type ON unified_workflows(type);
CREATE INDEX idx_unified_workflows_created_at ON unified_workflows(created_at);
CREATE INDEX idx_unified_workflows_is_deleted ON unified_workflows(is_deleted);

CREATE INDEX idx_session_managers_workflow_id ON session_managers(workflow_id);
CREATE INDEX idx_session_managers_status ON session_managers(status);
CREATE INDEX idx_session_managers_created_at ON session_managers(created_at);

CREATE INDEX idx_thread_executors_session_id ON thread_executors(session_id);
CREATE INDEX idx_thread_executors_workflow_id ON thread_executors(workflow_id);
CREATE INDEX idx_thread_executors_status ON thread_executors(status);
CREATE INDEX idx_thread_executors_created_at ON thread_executors(created_at);
```

#### 6.2 应用层迁移

```typescript
// src/application/services/migration.service.ts

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UnifiedWorkflowRepository } from '../../infrastructure/database/repositories/unified-workflow-repository';
import { WorkflowRepository } from '../../infrastructure/database/repositories/workflow-repository';
import { GraphRepository } from '../../infrastructure/database/repositories/graph-repository';

@Injectable()
export class MigrationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly unifiedWorkflowRepository: UnifiedWorkflowRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly graphRepository: GraphRepository
  ) {}

  async migrateWorkflowToUnified(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 获取所有工作流
      const workflows = await this.workflowRepository.findAll();
      
      for (const workflow of workflows) {
        // 2. 获取关联的图
        const graph = workflow.graphId 
          ? await this.graphRepository.findById(workflow.graphId.toString())
          : null;

        // 3. 创建统一工作流
        const unifiedWorkflow = UnifiedWorkflow.create(
          workflow.name,
          workflow.description,
          workflow.type,
          workflow.config,
          workflow.tags,
          workflow.metadata,
          workflow.createdBy
        );

        // 4. 如果有图，迁移节点和边
        if (graph) {
          for (const node of graph.nodes.values()) {
            unifiedWorkflow.addNode(node, workflow.createdBy);
          }

          for (const edge of graph.edges.values()) {
            unifiedWorkflow.addEdge(edge, workflow.createdBy);
          }
        }

        // 5. 迁移执行统计
        if (workflow.executionCount > 0) {
          // 通过反射设置私有属性（仅用于迁移）
          (unifiedWorkflow as any).props.executionCount = workflow.executionCount;
          (unifiedWorkflow as any).props.successCount = workflow.successCount;
          (unifiedWorkflow as any).props.failureCount = workflow.failureCount;
          (unifiedWorkflow as any).props.averageExecutionTime = workflow.averageExecutionTime;
          (unifiedWorkflow as any).props.lastExecutedAt = workflow.lastExecutedAt;
        }

        // 6. 保存统一工作流
        await this.unifiedWorkflowRepository.save(unifiedWorkflow);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async rollbackMigration(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 删除新表的数据
      await queryRunner.query('DELETE FROM unified_workflows');
      await queryRunner.query('DELETE FROM session_managers');
      await queryRunner.query('DELETE FROM thread_executors');

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### 7. 实施步骤

#### 7.1 第一阶段：基础重构（1-2周）

1. **创建新的实体类**
   - 创建UnifiedWorkflow实体
   - 创建ThreadExecutor实体
   - 创建SessionManager实体
   - 创建相关值对象和事件

2. **更新数据库模型**
   - 创建新的数据库表
   - 创建映射器
   - 创建仓储接口和实现

3. **创建迁移脚本**
   - 数据迁移SQL脚本
   - 应用层迁移服务

#### 7.2 第二阶段：功能迁移（2-3周）

1. **迁移业务逻辑**
   - 更新领域服务
   - 迁移工作流执行逻辑
   - 更新应用服务

2. **更新API层**
   - 更新控制器
   - 更新DTO
   - 更新验证逻辑

3. **测试和验证**
   - 单元测试
   - 集成测试
   - 端到端测试

#### 7.3 第三阶段：清理和优化（1周）

1. **清理旧代码**
   - 删除旧的Workflow和Graph实体
   - 删除旧的数据库表
   - 清理不再使用的代码

2. **性能优化**
   - 优化数据库查询
   - 优化内存使用
   - 优化执行性能

3. **文档更新**
   - 更新API文档
   - 更新架构文档
   - 更新开发指南

### 8. 风险评估和缓解措施

#### 8.1 主要风险

1. **数据丢失风险**
   - 风险：迁移过程中可能丢失数据
   - 缓解：完整备份、分步迁移、验证脚本

2. **性能影响风险**
   - 风险：新架构可能影响性能
   - 缓解：性能基准测试、渐进式部署

3. **兼容性风险**
   - 风险：现有API可能不兼容
   - 缓解：版本控制、向后兼容、渐进式迁移

4. **业务中断风险**
   - 风险：迁移过程可能导致业务中断
   - 缓解：蓝绿部署、回滚计划、监控告警

#### 8.2 缓解措施

1. **数据安全**
   - 迁移前完整备份
   - 迁移过程数据验证
   - 回滚机制

2. **性能保障**
   - 性能基准测试
   - 负载测试
   - 监控和告警

3. **平滑过渡**
   - 功能开关
   - 渐进式发布
   - 用户通知

4. **质量保证**
   - 代码审查
   - 自动化测试
   - 手动测试

### 9. 成功指标

#### 9.1 技术指标

- 代码复杂度降低20%
- 单元测试覆盖率达到90%
- API响应时间保持不变或改善
- 内存使用量降低15%

#### 9.2 业务指标

- 零数据丢失
- 零业务中断
- 用户满意度不降低
- 开发效率提升25%

#### 9.3 质量指标

- 代码审查通过率100%
- 自动化测试通过率100%
- 安全扫描无高危漏洞
- 文档完整性100%

## 总结

本实施方案详细描述了第一阶段架构重构的具体步骤，包括：

1. **架构简化**：将Workflow和Graph合并为UnifiedWorkflow，移除状态管理逻辑
2. **职责明确**：ThreadExecutor专注单线程执行，SessionManager负责多线程协调
3. **数据迁移**：完整的数据迁移策略和脚本
4. **风险控制**：全面的风险评估和缓解措施

通过这个实施方案，我们将实现：
- 概念简化（从4个概念减少到3个）
- 职责清晰（每个组件有明确的单一职责）
- 执行高效（优化执行路径，减少不必要开销）
- 扩展友好（支持未来功能扩展和性能优化）

这个方案为项目的长期发展奠定了坚实的基础，提高了代码的可维护性和可扩展性。