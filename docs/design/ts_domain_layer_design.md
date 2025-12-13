# TypeScript版本领域层(Domain)设计

## 1. 领域层概述

领域层是整个架构的核心，包含纯业务逻辑和领域实体，不依赖任何技术实现细节。遵循领域驱动设计(DDD)原则，确保业务逻辑的纯净性和可测试性。

## 2. 领域层结构

```
src/domain/
├── workflow/              # 工作流领域
│   ├── entities/          # 实体
│   │   ├── workflow.ts
│   │   ├── graph.ts
│   │   ├── node.ts
│   │   └── edge.ts
│   ├── value-objects/     # 值对象
│   │   ├── workflow-state.ts
│   │   ├── node-type.ts
│   │   ├── edge-type.ts
│   │   └── execution-context.ts
│   ├── events/            # 领域事件
│   │   ├── workflow-created.ts
│   │   ├── workflow-started.ts
│   │   ├── workflow-completed.ts
│   │   └── node-executed.ts
│   ├── repositories/      # 仓储接口
│   │   ├── workflow-repository.ts
│   │   └── graph-repository.ts
│   ├── services/          # 领域服务
│   │   ├── workflow-validator.ts
│   │   ├── graph-executor.ts
│   │   └── node-coordinator.ts
│   └── index.ts
├── session/               # 会话领域
│   ├── entities/
│   │   ├── session.ts
│   │   ├── thread.ts
│   │   └── interaction.ts
│   ├── value-objects/
│   │   ├── session-state.ts
│   │   ├── thread-state.ts
│   │   └── interaction-type.ts
│   ├── events/
│   │   ├── session-created.ts
│   │   ├── thread-started.ts
│   │   └── interaction-occurred.ts
│   ├── repositories/
│   │   ├── session-repository.ts
│   │   └── thread-repository.ts
│   ├── services/
│   │   ├── session-manager.ts
│   │   └── thread-coordinator.ts
│   └── index.ts
├── tool/                  # 工具领域
│   ├── entities/
│   │   ├── tool.ts
│   │   ├── tool-execution.ts
│   │   └── tool-result.ts
│   ├── value-objects/
│   │   ├── tool-type.ts
│   │   ├── tool-config.ts
│   │   ├── parameter-definition.ts
│   │   └── execution-result.ts
│   ├── events/
│   │   ├── tool-registered.ts
│   │   ├── tool-executed.ts
│   │   └── tool-failed.ts
│   ├── repositories/
│   │   └── tool-repository.ts
│   ├── services/
│   │   ├── tool-registry.ts
│   │   ├── tool-validator.ts
│   │   └── tool-executor.ts
│   └── index.ts
├── state/                 # 状态领域
│   ├── entities/
│   │   ├── state.ts
│   │   ├── state-snapshot.ts
│   │   └── state-history.ts
│   ├── value-objects/
│   │   ├── state-type.ts
│   │   ├── state-value.ts
│   │   └── state-transition.ts
│   ├── events/
│   │   ├── state-changed.ts
│   │   ├── snapshot-created.ts
│   │   └── history-recorded.ts
│   ├── repositories/
│   │   ├── state-repository.ts
│   │   └── snapshot-repository.ts
│   ├── services/
│   │   ├── state-manager.ts
│   │   ├── snapshot-manager.ts
│   │   └── history-manager.ts
│   └── index.ts
├── llm/                   # LLM领域
│   ├── entities/
│   │   ├── llm-request.ts
│   │   ├── llm-response.ts
│   │   ├── llm-model.ts
│   │   └── prompt-template.ts
│   ├── value-objects/
│   │   ├── model-config.ts
│   │   ├── token-usage.ts
│   │   ├── message.ts
│   │   └── prompt-context.ts
│   ├── events/
│   │   ├── request-sent.ts
│   │   ├── response-received.ts
│   │   └── tokens-used.ts
│   ├── repositories/
│   │   └── llm-repository.ts
│   ├── services/
│   │   ├── llm-client.ts
│   │   ├── prompt-manager.ts
│   │   └── token-calculator.ts
│   └── index.ts
├── history/               # 历史领域
│   ├── entities/
│   │   ├── history-record.ts
│   │   ├── audit-log.ts
│   │   └── usage-statistics.ts
│   ├── value-objects/
│   │   ├── record-type.ts
│   │   ├── operation-type.ts
│   │   └── time-range.ts
│   ├── events/
│   │   ├── record-created.ts
│   │   ├── statistics-updated.ts
│   │   └── audit-logged.ts
│   ├── repositories/
│   │   └── history-repository.ts
│   ├── services/
│   │   ├── history-manager.ts
│   │   ├── audit-logger.ts
│   │   └── statistics-calculator.ts
│   └── index.ts
├── common/                # 通用领域
│   ├── value-objects/
│   │   ├── id.ts
│   │   ├── timestamp.ts
│   │   ├── version.ts
│   │   └── money.ts
│   ├── events/
│   │   ├── domain-event.ts
│   │   └── event-bus.ts
│   ├── errors/
│   │   ├── domain-error.ts
│   │   ├── validation-error.ts
│   │   └── business-rule-error.ts
│   ├── types/
│   │   ├── entity.ts
│   │   ├── value-object.ts
│   │   ├── aggregate.ts
│   │   └── repository.ts
│   └── index.ts
└── index.ts
```

## 3. 核心实体设计

### 3.1 工作流实体

```typescript
// src/domain/workflow/entities/workflow.ts
import { Entity } from '../../common/types/entity';
import { WorkflowId } from '../value-objects/workflow-id';
import { GraphId } from '../value-objects/graph-id';
import { WorkflowState } from '../value-objects/workflow-state';
import { WorkflowMetadata } from '../value-objects/workflow-metadata';
import { Version } from '../../common/value-objects/version';
import { Timestamp } from '../../common/value-objects/timestamp';

export class Workflow extends Entity<WorkflowId> {
  private _name: string;
  private _description: string;
  private _graphId: GraphId;
  private _state: WorkflowState;
  private _metadata: WorkflowMetadata;
  private _version: Version;
  private _createdAt: Timestamp;
  private _updatedAt: Timestamp;

  constructor(
    id: WorkflowId,
    name: string,
    description: string,
    graphId: GraphId,
    metadata: WorkflowMetadata
  ) {
    super(id);
    this._name = name;
    this._description = description;
    this._graphId = graphId;
    this._state = WorkflowState.DRAFT;
    this._metadata = metadata;
    this._version = Version.create();
    this._createdAt = Timestamp.now();
    this._updatedAt = Timestamp.now();
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get graphId(): GraphId {
    return this._graphId;
  }

  get state(): WorkflowState {
    return this._state;
  }

  get metadata(): WorkflowMetadata {
    return this._metadata;
  }

  get version(): Version {
    return this._version;
  }

  get createdAt(): Timestamp {
    return this._createdAt;
  }

  get updatedAt(): Timestamp {
    return this._updatedAt;
  }

  // Business methods
  public activate(): void {
    if (this._state !== WorkflowState.DRAFT) {
      throw new Error('Only draft workflows can be activated');
    }
    this._state = WorkflowState.ACTIVE;
    this._updatedAt = Timestamp.now();
  }

  public deactivate(): void {
    if (this._state !== WorkflowState.ACTIVE) {
      throw new Error('Only active workflows can be deactivated');
    }
    this._state = WorkflowState.INACTIVE;
    this._updatedAt = Timestamp.now();
  }

  public updateMetadata(metadata: WorkflowMetadata): void {
    this._metadata = metadata;
    this._version = this._version.increment();
    this._updatedAt = Timestamp.now();
  }
}
```

### 3.2 图实体

```typescript
// src/domain/workflow/entities/graph.ts
import { Entity } from '../../common/types/entity';
import { GraphId } from '../value-objects/graph-id';
import { Node } from './node';
import { Edge } from './edge';
import { GraphState } from '../value-objects/graph-state';
import { GraphMetadata } from '../value-objects/graph-metadata';
import { Timestamp } from '../../common/value-objects/timestamp';

export class Graph extends Entity<GraphId> {
  private _nodes: Map<string, Node>;
  private _edges: Map<string, Edge>;
  private _entryPoint: string | null;
  private _state: GraphState;
  private _metadata: GraphMetadata;
  private _createdAt: Timestamp;
  private _updatedAt: Timestamp;

  constructor(
    id: GraphId,
    metadata: GraphMetadata
  ) {
    super(id);
    this._nodes = new Map();
    this._edges = new Map();
    this._entryPoint = null;
    this._state = GraphState.INITIAL;
    this._metadata = metadata;
    this._createdAt = Timestamp.now();
    this._updatedAt = Timestamp.now();
  }

  // Getters
  get nodes(): ReadonlyMap<string, Node> {
    return this._nodes;
  }

  get edges(): ReadonlyMap<string, Edge> {
    return this._edges;
  }

  get entryPoint(): string | null {
    return this._entryPoint;
  }

  get state(): GraphState {
    return this._state;
  }

  get metadata(): GraphMetadata {
    return this._metadata;
  }

  // Business methods
  public addNode(node: Node): void {
    if (this._nodes.has(node.id)) {
      throw new Error(`Node with id ${node.id} already exists`);
    }
    this._nodes.set(node.id, node);
    this._updatedAt = Timestamp.now();
  }

  public removeNode(nodeId: string): void {
    if (!this._nodes.has(nodeId)) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    // Remove connected edges
    const connectedEdges = this.getConnectedEdges(nodeId);
    connectedEdges.forEach(edgeId => this._edges.delete(edgeId));
    
    this._nodes.delete(nodeId);
    this._updatedAt = Timestamp.now();
  }

  public addEdge(edge: Edge): void {
    if (this._edges.has(edge.id)) {
      throw new Error(`Edge with id ${edge.id} already exists`);
    }
    
    // Validate nodes exist
    if (!this._nodes.has(edge.source) || !this._nodes.has(edge.target)) {
      throw new Error('Source or target node does not exist');
    }
    
    this._edges.set(edge.id, edge);
    this._updatedAt = Timestamp.now();
  }

  public setEntryPoint(nodeId: string): void {
    if (!this._nodes.has(nodeId)) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    this._entryPoint = nodeId;
    this._updatedAt = Timestamp.now();
  }

  public validate(): string[] {
    const errors: string[] = [];
    
    if (!this._entryPoint) {
      errors.push('Graph must have an entry point');
    }
    
    if (this._nodes.size === 0) {
      errors.push('Graph must have at least one node');
    }
    
    // Check for disconnected nodes
    const reachableNodes = this.getReachableNodes();
    const disconnectedNodes = Array.from(this._nodes.keys())
      .filter(nodeId => !reachableNodes.includes(nodeId));
    
    if (disconnectedNodes.length > 0) {
      errors.push(`Disconnected nodes found: ${disconnectedNodes.join(', ')}`);
    }
    
    return errors;
  }

  private getConnectedEdges(nodeId: string): string[] {
    const connectedEdges: string[] = [];
    for (const [edgeId, edge] of this._edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        connectedEdges.push(edgeId);
      }
    }
    return connectedEdges;
  }

  private getReachableNodes(): string[] {
    if (!this._entryPoint) {
      return [];
    }
    
    const visited = new Set<string>();
    const queue = [this._entryPoint];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      
      // Find outgoing edges
      for (const edge of this._edges.values()) {
        if (edge.source === current && !visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }
    
    return Array.from(visited);
  }
}
```

### 3.3 会话实体

```typescript
// src/domain/session/entities/session.ts
import { Entity } from '../../common/types/entity';
import { SessionId } from '../value-objects/session-id';
import { UserId } from '../value-objects/user-id';
import { SessionState } from '../value-objects/session-state';
import { SessionContext } from '../value-objects/session-context';
import { ThreadId } from '../value-objects/thread-id';
import { Timestamp } from '../../common/value-objects/timestamp';

export class Session extends Entity<SessionId> {
  private _userId: UserId | null;
  private _threadIds: ThreadId[];
  private _state: SessionState;
  private _context: SessionContext;
  private _createdAt: Timestamp;
  private _updatedAt: Timestamp;

  constructor(
    id: SessionId,
    userId: UserId | null,
    context: SessionContext
  ) {
    super(id);
    this._userId = userId;
    this._threadIds = [];
    this._state = SessionState.ACTIVE;
    this._context = context;
    this._createdAt = Timestamp.now();
    this._updatedAt = Timestamp.now();
  }

  // Getters
  get userId(): UserId | null {
    return this._userId;
  }

  get threadIds(): readonly ThreadId[] {
    return this._threadIds;
  }

  get state(): SessionState {
    return this._state;
  }

  get context(): SessionContext {
    return this._context;
  }

  get createdAt(): Timestamp {
    return this._createdAt;
  }

  get updatedAt(): Timestamp {
    return this._updatedAt;
  }

  // Business methods
  public addThread(threadId: ThreadId): void {
    if (this._threadIds.includes(threadId)) {
      throw new Error(`Thread ${threadId} already exists in session`);
    }
    
    if (this._state !== SessionState.ACTIVE) {
      throw new Error('Cannot add thread to inactive session');
    }
    
    this._threadIds.push(threadId);
    this._updatedAt = Timestamp.now();
  }

  public removeThread(threadId: ThreadId): void {
    const index = this._threadIds.indexOf(threadId);
    if (index === -1) {
      throw new Error(`Thread ${threadId} not found in session`);
    }
    
    this._threadIds.splice(index, 1);
    this._updatedAt = Timestamp.now();
  }

  public pause(): void {
    if (this._state !== SessionState.ACTIVE) {
      throw new Error('Only active sessions can be paused');
    }
    this._state = SessionState.PAUSED;
    this._updatedAt = Timestamp.now();
  }

  public resume(): void {
    if (this._state !== SessionState.PAUSED) {
      throw new Error('Only paused sessions can be resumed');
    }
    this._state = SessionState.ACTIVE;
    this._updatedAt = Timestamp.now();
  }

  public close(): void {
    if (this._state === SessionState.CLOSED) {
      throw new Error('Session is already closed');
    }
    this._state = SessionState.CLOSED;
    this._updatedAt = Timestamp.now();
  }

  public updateContext(context: SessionContext): void {
    this._context = context;
    this._updatedAt = Timestamp.now();
  }
}
```

## 4. 值对象设计

### 4.1 工作流状态

```typescript
// src/domain/workflow/value-objects/workflow-state.ts
export enum WorkflowState {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export class WorkflowStateValue {
  private readonly value: WorkflowState;

  constructor(value: WorkflowState) {
    this.value = value;
  }

  static draft(): WorkflowStateValue {
    return new WorkflowStateValue(WorkflowState.DRAFT);
  }

  static active(): WorkflowStateValue {
    return new WorkflowStateValue(WorkflowState.ACTIVE);
  }

  static inactive(): WorkflowStateValue {
    return new WorkflowStateValue(WorkflowState.INACTIVE);
  }

  static archived(): WorkflowStateValue {
    return new WorkflowStateValue(WorkflowState.ARCHIVED);
  }

  equals(other: WorkflowStateValue): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  canTransitionTo(newState: WorkflowStateValue): boolean {
    const transitions: Record<WorkflowState, WorkflowState[]> = {
      [WorkflowState.DRAFT]: [WorkflowState.ACTIVE, WorkflowState.ARCHIVED],
      [WorkflowState.ACTIVE]: [WorkflowState.INACTIVE, WorkflowState.ARCHIVED],
      [WorkflowState.INACTIVE]: [WorkflowState.ACTIVE, WorkflowState.ARCHIVED],
      [WorkflowState.ARCHIVED]: []
    };
    
    return transitions[this.value].includes(newState.value);
  }
}
```

### 4.2 节点类型

```typescript
// src/domain/workflow/value-objects/node-type.ts
export enum NodeType {
  LLM = 'llm',
  TOOL = 'tool',
  CONDITION = 'condition',
  WAIT = 'wait',
  START = 'start',
  END = 'end'
}

export class NodeTypeValue {
  private readonly value: NodeType;

  constructor(value: NodeType) {
    this.value = value;
  }

  static llm(): NodeTypeValue {
    return new NodeTypeValue(NodeType.LLM);
  }

  static tool(): NodeTypeValue {
    return new NodeTypeValue(NodeType.TOOL);
  }

  static condition(): NodeTypeValue {
    return new NodeTypeValue(NodeType.CONDITION);
  }

  static wait(): NodeTypeValue {
    return new NodeTypeValue(NodeType.WAIT);
  }

  static start(): NodeTypeValue {
    return new NodeTypeValue(NodeType.START);
  }

  static end(): NodeTypeValue {
    return new NodeTypeValue(NodeType.END);
  }

  equals(other: NodeTypeValue): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  isExecutable(): boolean {
    return [NodeType.LLM, NodeType.TOOL].includes(this.value);
  }

  isControlFlow(): boolean {
    return [NodeType.CONDITION, NodeType.START, NodeType.END].includes(this.value);
  }
}
```

## 5. 领域事件设计

### 5.1 工作流事件

```typescript
// src/domain/workflow/events/workflow-created.ts
import { DomainEvent } from '../../common/events/domain-event';
import { WorkflowId } from '../value-objects/workflow-id';
import { Timestamp } from '../../common/value-objects/timestamp';

export class WorkflowCreatedEvent extends DomainEvent {
  private readonly workflowId: WorkflowId;
  private readonly name: string;

  constructor(workflowId: WorkflowId, name: string) {
    super('workflow.created', Timestamp.now());
    this.workflowId = workflowId;
    this.name = name;
  }

  get workflowIdValue(): WorkflowId {
    return this.workflowId;
  }

  get workflowName(): string {
    return this.name;
  }
}

// src/domain/workflow/events/workflow-started.ts
import { DomainEvent } from '../../common/events/domain-event';
import { WorkflowId } from '../value-objects/workflow-id';
import { Timestamp } from '../../common/value-objects/timestamp';

export class WorkflowStartedEvent extends DomainEvent {
  private readonly workflowId: WorkflowId;
  private readonly executionId: string;

  constructor(workflowId: WorkflowId, executionId: string) {
    super('workflow.started', Timestamp.now());
    this.workflowId = workflowId;
    this.executionId = executionId;
  }

  get workflowIdValue(): WorkflowId {
    return this.workflowId;
  }

  get executionIdValue(): string {
    return this.executionId;
  }
}
```

## 6. 领域服务设计

### 6.1 工作流验证器

```typescript
// src/domain/workflow/services/workflow-validator.ts
import { Workflow } from '../entities/workflow';
import { Graph } from '../entities/graph';
import { ValidationResult } from '../value-objects/validation-result';

export class WorkflowValidator {
  public validateWorkflow(workflow: Workflow): ValidationResult {
    const errors: string[] = [];
    
    // Validate workflow name
    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }
    
    if (workflow.name.length > 100) {
      errors.push('Workflow name cannot exceed 100 characters');
    }
    
    // Validate workflow description
    if (workflow.description && workflow.description.length > 500) {
      errors.push('Workflow description cannot exceed 500 characters');
    }
    
    return new ValidationResult(errors.length === 0, errors);
  }

  public validateGraph(graph: Graph): ValidationResult {
    const errors: string[] = [];
    
    // Validate graph structure
    const graphErrors = graph.validate();
    errors.push(...graphErrors);
    
    // Validate node connections
    for (const [nodeId, node] of graph.nodes) {
      const nodeErrors = this.validateNodeConnections(nodeId, graph);
      errors.push(...nodeErrors);
    }
    
    return new ValidationResult(errors.length === 0, errors);
  }

  private validateNodeConnections(nodeId: string, graph: Graph): string[] {
    const errors: string[] = [];
    const node = graph.nodes.get(nodeId);
    
    if (!node) {
      return [`Node ${nodeId} not found`];
    }
    
    // Check for required connections based on node type
    if (node.type.isControlFlow() && !this.hasOutgoingEdges(nodeId, graph)) {
      errors.push(`Control flow node ${nodeId} must have outgoing edges`);
    }
    
    return errors;
  }

  private hasOutgoingEdges(nodeId: string, graph: Graph): boolean {
    for (const edge of graph.edges.values()) {
      if (edge.source === nodeId) {
        return true;
      }
    }
    return false;
  }
}
```

## 7. 仓储接口设计

### 7.1 工作流仓储

```typescript
// src/domain/workflow/repositories/workflow-repository.ts
import { Repository } from '../../common/types/repository';
import { Workflow } from '../entities/workflow';
import { WorkflowId } from '../value-objects/workflow-id';
import { UserId } from '../../session/value-objects/user-id';

export interface WorkflowRepository extends Repository<Workflow, WorkflowId> {
  findByUserId(userId: UserId): Promise<Workflow[]>;
  findByName(name: string): Promise<Workflow[]>;
  findActive(): Promise<Workflow[]>;
  findByGraphId(graphId: string): Promise<Workflow[]>;
}
```

## 8. 通用类型设计

### 8.1 实体基类

```typescript
// src/domain/common/types/entity.ts
import { Id } from '../value-objects/id';

export abstract class Entity<T extends Id> {
  protected readonly _id: T;

  constructor(id: T) {
    this._id = id;
  }

  get id(): T {
    return this._id;
  }

  public equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    
    if (this === other) {
      return true;
    }
    
    return this._id.equals(other._id);
  }
}
```

### 8.2 值对象基类

```typescript
// src/domain/common/types/value-object.ts
export abstract class ValueObject {
  public equals(other: ValueObject): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    
    if (this === other) {
      return true;
    }
    
    return this.propsEqual(other);
  }

  protected abstract propsEqual(other: ValueObject): boolean;
}
```

### 8.3 仓储接口

```typescript
// src/domain/common/types/repository.ts
import { Id } from '../value-objects/id';

export interface Repository<T, K extends Id> {
  save(entity: T): Promise<void>;
  findById(id: K): Promise<T | null>;
  findAll(): Promise<T[]>;
  delete(id: K): Promise<void>;
  exists(id: K): Promise<boolean>;
}
```

## 9. 错误处理

### 9.1 领域错误

```typescript
// src/domain/common/errors/domain-error.ts
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

// src/domain/common/errors/validation-error.ts
export class ValidationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

// src/domain/common/errors/business-rule-error.ts
export class BusinessRuleError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_RULE_ERROR', details);
  }
}
```

这个领域层设计遵循了DDD原则，提供了清晰的业务逻辑封装，确保了类型安全和可测试性。每个领域模块都有明确的职责边界，通过实体、值对象、领域事件和领域服务来封装业务逻辑。