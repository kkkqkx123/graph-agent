# Workflow 领域层重构分析

## 1. 重构目标

### 1.1 核心目标

1. **删除 Node 和 Edge 的执行逻辑**：将执行逻辑从领域层移到服务层
2. **拆分 LLM 交互功能**：参考 [`llm-interaction-architecture-design-v2.md`](../architecture/interaction/llm-interaction-architecture-design-v2.md) 创建独立的 Interaction 层
3. **简化 Trigger 和 Hook**：将执行逻辑移到服务层，领域层只保留配置和状态管理
4. **重构 Functions 体系**：将函数式执行逻辑从领域层移到服务层

### 1.2 设计原则

- **领域层只负责静态定义**：不包含任何执行逻辑
- **服务层负责执行协调**：所有执行逻辑在服务层
- **值对象不可变**：所有配置都是值对象
- **实体职责单一**：实体只负责状态管理和业务规则

## 2. 当前架构分析

### 2.1 Node 实体（需要重构）

**当前实现**：[`src/domain/workflow/entities/node.ts`](../../domain/workflow/entities/node.ts)

**问题**：
- 包含 `execute()` 抽象方法（第277行）
- 包含 `validate()` 抽象方法（第283行）
- 包含 `getMetadata()` 抽象方法（第289行）
- 包含 `getInputSchema()` 和 `getOutputSchema()` 方法
- 所有子类（StartNode、EndNode、LoopStartNode等）都实现了执行逻辑

**应该保留**：
- 节点ID、类型、名称、描述等基本属性
- 节点状态管理（pending、running、completed、failed）
- 节点重试策略
- 节点位置信息
- 节点属性更新方法

**应该删除**：
- `execute()` 方法
- `validate()` 方法（移到配置验证）
- `getMetadata()` 方法（移到配置）
- `getInputSchema()` 和 `getOutputSchema()` 方法（移到配置）

### 2.2 Edge 值对象（需要重构）

**当前实现**：[`src/domain/workflow/value-objects/edge/edge-value-object.ts`](../../domain/workflow/value-objects/edge/edge-value-object.ts)

**问题**：
- 包含 `requiresConditionEvaluation()` 方法
- 包含 `getConditionExpression()` 方法
- 有 [`EdgeExecutor`](../../services/workflow/edges/edge-executor.ts) 负责执行

**应该保留**：
- 边ID、类型、源节点、目标节点
- 边权重
- 边属性
- 边条件（作为配置）

**应该删除**：
- `requiresConditionEvaluation()` 方法（移到服务层）
- `getConditionExpression()` 方法（移到服务层）

### 2.3 Trigger 实体（需要重构）

**当前实现**：[`src/domain/workflow/entities/trigger.ts`](../../domain/workflow/entities/trigger.ts)

**问题**：
- 包含 `canTrigger()` 方法（第144行）
- 包含 `enable()`、`disable()`、`markAsTriggered()` 等状态管理方法
- 有 [`TriggerExecutor`](../../services/workflow/triggers/trigger-executor.ts) 负责执行
- 执行逻辑通过 [`TriggerFunction`](../../services/workflow/functions/triggers/) 实现

**应该保留**：
- 触发器ID、类型、名称、描述
- 触发器配置（TriggerConfig）
- 触发器动作（TriggerAction）
- 触发器状态（TriggerStatus）
- 触发器验证逻辑

**应该删除**：
- `canTrigger()` 方法（移到服务层）
- `enable()`、`disable()`、`markAsTriggered()` 方法（移到服务层）

### 2.4 Hook 实体（需要重构）

**当前实现**：[`src/domain/workflow/entities/hook.ts`](../../domain/workflow/entities/hook.ts)

**问题**：
- 包含 `execute()` 抽象方法（第168行）
- 包含 `validate()` 抽象方法（第174行）
- 包含 `getMetadata()` 抽象方法（第180行）
- 有 [`HookExecutor`](../../services/workflow/hooks/hook-executor.ts) 负责执行
- 执行逻辑通过 [`HookFunction`](../../services/workflow/functions/hooks/) 实现

**应该保留**：
- Hook ID、钩子点、名称、描述
- Hook 配置
- Hook 启用状态
- Hook 优先级
- Hook 错误处理策略

**应该删除**：
- `execute()` 方法（移到服务层）
- `validate()` 方法（移到配置验证）
- `getMetadata()` 方法（移到配置）

### 2.5 Functions 体系（需要重构）

**当前实现**：[`src/services/workflow/functions/`](../../services/workflow/functions/)

**目录结构**：
```
functions/
├── function-registry.ts          # 函数注册表
├── types.ts                      # 函数类型定义
├── conditions/                   # 条件函数
│   ├── base-condition-function.ts
│   ├── has-errors.function.ts
│   ├── has-tool-calls.function.ts
│   └── ...
├── routing/                      # 路由函数
│   ├── base-routing-function.ts
│   ├── conditional-routing.function.ts
│   └── ...
├── triggers/                     # 触发器函数
│   ├── base-trigger-function.ts
│   ├── event-trigger.function.ts
│   └── ...
├── hooks/                        # 钩子函数
│   ├── base-hook-function.ts
│   ├── logging-hook-function.ts
│   └── ...
├── nodes/                        # 节点函数
│   ├── context-processors/       # 上下文处理器
│   │   ├── base-context-processor.ts
│   │   ├── llm-context.processor.ts
│   │   └── ...
│   └── data-transformer/         # 数据转换器
│       ├── base-transform-function.ts
│       ├── map-transform.function.ts
│       └── ...
```

**问题**：
1. Functions 混合了领域层和服务层的职责
2. 条件函数、路由函数、触发器函数、钩子函数都在 services 层
3. 节点函数（context-processors、data-transformers）也在 services 层
4. 函数注册表在 services 层，但被领域层使用

**应该保留**：
- 函数接口定义（IWorkflowFunction）
- 函数类型枚举（WorkflowFunctionType）
- 函数配置接口

**应该删除**：
- 所有具体的函数实现（移到服务层）
- 函数注册表（移到服务层）

## 3. 新架构设计

### 3.1 领域层重构

#### 3.1.1 简化的 Node 实体

```typescript
// src/domain/workflow/entities/node.ts

/**
 * 节点配置接口
 */
export interface NodeConfig {
  readonly type: NodeType;
  readonly name?: string;
  readonly description?: string;
  readonly properties: Record<string, any>;
}

/**
 * Node 聚合根属性接口
 */
export interface NodeProps {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name?: string;
  readonly description?: string;
  readonly position?: { x: number; y: number };
  readonly properties: Record<string, any>;
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * Node 聚合根实体（简化版）
 *
 * 职责：
 * 1. 节点状态管理
 * 2. 节点属性管理
 * 3. 节点重试策略管理
 *
 * 不负责：
 * - 节点执行（由 Thread 层负责）
 * - 节点验证（由配置验证负责）
 * - 节点元数据（由配置负责）
 */
export class Node extends Entity {
  protected readonly props: NodeProps;

  protected constructor(props: NodeProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  // Getters
  public get nodeId(): NodeId { return this.props.id; }
  public get type(): NodeType { return this.props.type; }
  public get name(): string | undefined { return this.props.name; }
  public get description(): string | undefined { return this.props.description; }
  public get position(): { x: number; y: number } | undefined { return this.props.position; }
  public get properties(): Record<string, any> { return this.props.properties; }
  public get status(): NodeStatus { return this.props.status; }
  public get retryStrategy(): NodeRetryStrategy { return this.props.retryStrategy; }

  // 状态管理方法
  public updateStatus(status: NodeStatus): Node {
    const newProps: NodeProps = {
      ...this.props,
      status,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createNodeFromProps(newProps);
  }

  public updateProperties(properties: Record<string, any>): Node {
    const newProps: NodeProps = {
      ...this.props,
      properties: { ...this.props.properties, ...properties },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createNodeFromProps(newProps);
  }

  public updatePosition(position: { x: number; y: number }): Node {
    const newProps: NodeProps = {
      ...this.props,
      position,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createNodeFromProps(newProps);
  }

  public updateRetryStrategy(retryStrategy: NodeRetryStrategy): Node {
    const newProps: NodeProps = {
      ...this.props,
      retryStrategy,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createNodeFromProps(newProps);
  }

  // 类型检查方法
  public isControlFlow(): boolean {
    return this.props.type.isControlFlow();
  }

  public isExecutable(): boolean {
    return this.props.type.isExecutable();
  }

  public canHaveMultipleInputs(): boolean {
    return this.props.type.canHaveMultipleInputs();
  }

  public canHaveMultipleOutputs(): boolean {
    return this.props.type.canHaveMultipleOutputs();
  }

  // 业务标识
  public getBusinessIdentifier(): string {
    return `node:${this.props.id.toString()}`;
  }

  // 持久化
  public toProps(): NodeProps {
    return this.props;
  }

  // 抽象方法（由子类实现）
  protected abstract createNodeFromProps(props: NodeProps): Node;

  public override toString(): string {
    return `Node(id=${this.props.id.toString()}, type=${this.props.type.toString()}, name=${this.props.name || 'unnamed'}, status=${this.props.status.toString()})`;
  }
}
```

#### 3.1.2 简化的 Edge 值对象

```typescript
// src/domain/workflow/value-objects/edge/edge-value-object.ts

/**
 * 边属性接口
 */
export interface EdgeProps {
  readonly id: EdgeId;
  readonly type: EdgeType;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly condition?: EdgeCondition;
  readonly weight?: number;
  readonly properties: Record<string, any>;
}

/**
 * Edge 值对象（简化版）
 *
 * 职责：
 * 1. 存储边配置信息
 * 2. 提供类型安全的配置访问
 *
 * 不负责：
 * - 边执行（由 Thread 层负责）
 * - 条件评估（由 Thread 层负责）
 */
export class EdgeValueObject {
  private readonly _id: EdgeId;
  private readonly _type: EdgeType;
  private readonly _fromNodeId: NodeId;
  private readonly _toNodeId: NodeId;
  private readonly _condition?: EdgeCondition;
  private readonly _weight: number;
  private readonly _properties: Record<string, any>;

  private constructor(props: EdgeProps) {
    this._id = props.id;
    this._type = props.type;
    this._fromNodeId = props.fromNodeId;
    this._toNodeId = props.toNodeId;
    this._condition = props.condition;
    this._weight = props.weight || 1.0;
    this._properties = { ...props.properties };
  }

  // Getters
  get id(): EdgeId { return this._id; }
  get type(): EdgeType { return this._type; }
  get fromNodeId(): NodeId { return this._fromNodeId; }
  get toNodeId(): NodeId { return this._toNodeId; }
  get condition(): EdgeCondition | undefined { return this._condition; }
  get weight(): number { return this._weight; }
  get properties(): Record<string, any> { return { ...this._properties }; }

  // 静态工厂方法
  static create(props: EdgeProps): EdgeValueObject {
    return new EdgeValueObject(props);
  }

  // 序列化
  toJSON(): Record<string, any> {
    return {
      id: this._id.toString(),
      type: this._type.toString(),
      fromNodeId: this._fromNodeId.toString(),
      toNodeId: this._toNodeId.toString(),
      condition: this._condition,
      weight: this._weight,
      properties: this._properties,
    };
  }

  static fromJSON(json: Record<string, any>): EdgeValueObject {
    return new EdgeValueObject({
      id: EdgeId.fromString(json.id),
      type: EdgeType.fromString(json.type),
      fromNodeId: NodeId.fromString(json.fromNodeId),
      toNodeId: NodeId.fromString(json.toNodeId),
      condition: json.condition,
      weight: json.weight,
      properties: json.properties || {},
    });
  }

  equals(other: EdgeValueObject): boolean {
    return this._id.equals(other._id);
  }
}
```

#### 3.1.3 简化的 Trigger 实体

```typescript
// src/domain/workflow/entities/trigger.ts

/**
 * 触发器配置接口
 */
export interface TriggerConfig {
  delay?: number;
  interval?: number;
  cron?: string;
  eventType?: string;
  eventDataPattern?: Record<string, unknown>;
  statePath?: string;
  expectedValue?: unknown;
}

/**
 * Trigger 实体（简化版）
 *
 * 职责：
 * 1. 触发器配置管理
 * 2. 触发器状态管理
 * 3. 触发器验证
 *
 * 不负责：
 * - 触发器执行（由 TriggerExecutor 负责）
 * - 触发器状态转换（由 TriggerExecutor 负责）
 */
export class Trigger extends Entity {
  protected readonly props: TriggerProps;

  protected constructor(props: TriggerProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  // Getters
  public get triggerId(): ID { return this.props.id; }
  public get type(): TriggerType { return this.props.type; }
  public get name(): string { return this.props.name; }
  public get description(): string | undefined { return this.props.description; }
  public get config(): TriggerConfig { return { ...this.props.config }; }
  public get action(): TriggerAction { return this.props.action; }
  public get targetNodeId(): ID | undefined { return this.props.targetNodeId; }
  public get status(): TriggerStatus { return this.props.status; }
  public get triggeredAt(): number | undefined { return this.props.triggeredAt; }

  // 类型检查方法
  public isTimeTrigger(): boolean {
    return this.props.type.isTime();
  }

  public isEventTrigger(): boolean {
    return this.props.type.isEvent();
  }

  public isStateTrigger(): boolean {
    return this.props.type.isState();
  }

  public requiresTargetNode(): boolean {
    return this.props.action.isSkipNode();
  }

  // 配置更新方法
  public updateConfig(config: TriggerConfig): Trigger {
    const newProps: TriggerProps = {
      ...this.props,
      config: { ...config },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return Trigger.fromProps(newProps);
  }

  public updateName(name: string): Trigger {
    const newProps: TriggerProps = {
      ...this.props,
      name,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return Trigger.fromProps(newProps);
  }

  public updateDescription(description: string): Trigger {
    const newProps: TriggerProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return Trigger.fromProps(newProps);
  }

  // 验证方法
  public validate(): TriggerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证基本属性
    if (!this.props.name || this.props.name.trim().length === 0) {
      errors.push('触发器名称不能为空');
    }

    // 验证配置
    if (this.props.type.isTime()) {
      const hasTimeConfig =
        this.props.config.delay !== undefined ||
        this.props.config.interval !== undefined ||
        this.props.config.cron !== undefined;
      if (!hasTimeConfig) {
        errors.push('时间触发器必须配置 delay、interval 或 cron');
      }
    }

    if (this.props.type.isEvent()) {
      if (!this.props.config.eventType) {
        errors.push('事件触发器必须配置 eventType');
      }
    }

    if (this.props.type.isState()) {
      if (!this.props.config.statePath) {
        errors.push('状态触发器必须配置 statePath');
      }
      if (this.props.config.expectedValue === undefined) {
        errors.push('状态触发器必须配置 expectedValue');
      }
    }

    // 验证动作和目标节点
    if (this.props.action.isSkipNode() && !this.props.targetNodeId) {
      errors.push('SKIP_NODE 动作必须指定目标节点');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // 业务标识
  public getBusinessIdentifier(): string {
    return `trigger:${this.props.id.toString()}`;
  }

  // 持久化
  public toProps(): TriggerProps {
    return this.props;
  }

  public override toString(): string {
    return `Trigger(id=${this.props.id.toString()}, type=${this.props.type.toString()}, name=${this.props.name}, action=${this.props.action.toString()}, status=${this.props.status.toString()})`;
  }
}
```

#### 3.1.4 简化的 Hook 实体

```typescript
// src/domain/workflow/entities/hook.ts

/**
 * Hook 实体（简化版）
 *
 * 职责：
 * 1. Hook 配置管理
 * 2. Hook 状态管理
 * 3. Hook 验证
 *
 * 不负责：
 * - Hook 执行（由 HookExecutor 负责）
 * - Hook 插件管理（由 HookExecutor 负责）
 */
export abstract class Hook extends Entity {
  protected readonly props: HookProps;

  protected constructor(props: HookProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  // Getters
  public get hookId(): ID { return this.props.id; }
  public get hookPoint(): HookPoint { return this.props.hookPoint; }
  public get name(): string { return this.props.name; }
  public get description(): string | undefined { return this.props.description; }
  public get config(): Record<string, any> { return this.props.config; }
  public get enabled(): boolean { return this.props.enabled; }
  public get priority(): number { return this.props.priority; }
  public get continueOnError(): boolean { return this.props.continueOnError; }
  public get failFast(): boolean { return this.props.failFast; }

  // 类型检查方法
  public isBeforeExecute(): boolean {
    return this.props.hookPoint.isBeforeExecute();
  }

  public isAfterExecute(): boolean {
    return this.props.hookPoint.isAfterExecute();
  }

  public isError(): boolean {
    return this.props.hookPoint.isError();
  }

  public isBeforeNodeExecute(): boolean {
    return this.props.hookPoint.isBeforeNodeExecute();
  }

  public isAfterNodeExecute(): boolean {
    return this.props.hookPoint.isAfterNodeExecute();
  }

  public isWorkflowStart(): boolean {
    return this.props.hookPoint.isWorkflowStart();
  }

  public isWorkflowEnd(): boolean {
    return this.props.hookPoint.isWorkflowEnd();
  }

  // 配置更新方法
  public updateConfig(config: Record<string, any>): Hook {
    const newProps: HookProps = {
      ...this.props,
      config: { ...this.props.config, ...config },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createHookFromProps(newProps);
  }

  public updatePriority(priority: number): Hook {
    const newProps: HookProps = {
      ...this.props,
      priority,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createHookFromProps(newProps);
  }

  public updateErrorHandling(continueOnError: boolean, failFast: boolean): Hook {
    const newProps: HookProps = {
      ...this.props,
      continueOnError,
      failFast,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createHookFromProps(newProps);
  }

  // 验证方法
  public abstract validate(): HookValidationResult;

  // 抽象方法（由子类实现）
  protected abstract createHookFromProps(props: HookProps): Hook;

  // 业务标识
  public getBusinessIdentifier(): string {
    return `hook:${this.props.id.toString()}`;
  }

  // 持久化
  public toProps(): HookProps {
    return this.props;
  }

  public override toString(): string {
    return `Hook(id=${this.props.id.toString()}, hookPoint=${this.props.hookPoint.toString()}, name=${this.props.name}, enabled=${this.props.enabled}, priority=${this.props.priority})`;
  }
}
```

#### 3.1.5 Functions 类型定义（保留在领域层）

```typescript
// src/domain/workflow/value-objects/function-type.ts

/**
 * 工作流函数类型枚举
 */
export enum WorkflowFunctionType {
  CONDITION = 'condition',
  ROUTING = 'routing',
  TRIGGER = 'trigger',
  HOOK = 'hook',
  CONTEXT_PROCESSOR = 'context_processor',
  DATA_TRANSFORMER = 'data_transformer',
}

/**
 * 函数参数接口
 */
export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 函数元数据接口
 */
export interface FunctionMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  isAsync: boolean;
  category: string;
  parameters: FunctionParameter[];
  returnType: string;
}

/**
 * 工作流函数接口（领域层定义）
 */
export interface IWorkflowFunction {
  id: string;
  name: string;
  description?: string;
  version: string;
  getParameters(): FunctionParameter[];
  getReturnType(): string;
  validateConfig(config: any): ValidationResult;
  getMetadata(): FunctionMetadata;
}
```

### 3.2 服务层重构

#### 3.2.1 Node 执行处理器

```typescript
// src/services/workflow/nodes/execution-handlers/

/**
 * 节点执行处理器接口
 */
export interface INodeExecutionHandler {
  canHandle(node: Node): boolean;
  execute(
    node: Node,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult>;
}

/**
 * LLM 节点执行处理器
 */
export class LLMNodeExecutionHandler implements INodeExecutionHandler {
  constructor(
    private readonly interactionEngine: InteractionEngine,
    private readonly promptBuilder: PromptBuilder
  ) {}

  canHandle(node: Node): boolean {
    return node.type.isLLM();
  }

  async execute(
    node: Node,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.properties as LLMNodeConfig;
    // 调用 InteractionEngine 执行 LLM
  }
}

/**
 * 工具节点执行处理器
 */
export class ToolNodeExecutionHandler implements INodeExecutionHandler {
  constructor(
    private readonly toolExecutor: ToolExecutor
  ) {}

  canHandle(node: Node): boolean {
    return node.type.isTool();
  }

  async execute(
    node: Node,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.properties as ToolNodeConfig;
    // 调用 ToolExecutor 执行工具
  }
}

/**
 * 控制流节点执行处理器
 */
export class ControlFlowNodeExecutionHandler implements INodeExecutionHandler {
  canHandle(node: Node): boolean {
    return node.type.isControlFlow();
  }

  async execute(
    node: Node,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    switch (node.type.value) {
      case NodeTypeValue.START:
        return this.handleStart(node, context);
      case NodeTypeValue.END:
        return this.handleEnd(node, context);
      case NodeTypeValue.FORK:
        return this.handleFork(node, context);
      case NodeTypeValue.JOIN:
        return this.handleJoin(node, context);
      case NodeTypeValue.LOOP_START:
        return this.handleLoopStart(node, context);
      case NodeTypeValue.LOOP_END:
        return this.handleLoopEnd(node, context);
      case NodeTypeValue.SUBWORKFLOW:
        return this.handleSubworkflow(node, context);
    }
  }

  private async handleStart(
    node: Node,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    // 初始化上下文变量
    // 记录开始时间
    // 初始化执行统计
    return { success: true, output: {} };
  }

  private async handleEnd(
    node: Node,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    // 记录结束时间
    // 更新执行统计
    // 收集结果
    // 清理临时资源
    return { success: true, output: {} };
  }

  // ... 其他控制流处理方法
}
```

#### 3.2.2 Edge 执行处理器

```typescript
// src/services/workflow/edges/edge-execution-handler.ts

/**
 * Edge 执行处理器
 */
export class EdgeExecutionHandler {
  constructor(
    private readonly functionRegistry: FunctionRegistry,
    private readonly expressionEvaluator: ExpressionEvaluator
  ) {}

  async canExecute(
    edge: EdgeValueObject,
    context: WorkflowContext
  ): Promise<boolean> {
    // 1. 检查边函数是否存在
    const edgeFunction = this.functionRegistry.getRoutingFunction(edge.type.toString());
    if (!edgeFunction) {
      return false;
    }

    // 2. 如果边需要条件评估，则评估条件
    if (edge.condition) {
      const variableContext = this.convertToVariableContext(context);
      const evaluationResult = await this.expressionEvaluator.evaluate(
        edge.condition.functionId,
        variableContext
      );

      if (!evaluationResult.success || !evaluationResult.value) {
        return false;
      }
    }

    // 3. 验证边配置
    const config = this.buildEdgeConfig(edge);
    const validationResult = edgeFunction.validateConfig(config);
    if (!validationResult.valid) {
      return false;
    }

    return true;
  }

  async execute(
    edge: EdgeValueObject,
    context: WorkflowContext
  ): Promise<any> {
    const edgeFunction = this.functionRegistry.getRoutingFunction(edge.type.toString());
    if (!edgeFunction) {
      throw new Error(`未找到边函数: ${edge.type.toString()}`);
    }

    const config = this.buildEdgeConfig(edge);
    return await edgeFunction.execute(context, config);
  }

  private buildEdgeConfig(edge: EdgeValueObject): Record<string, any> {
    return {
      edgeId: edge.id.toString(),
      fromNodeId: edge.fromNodeId.toString(),
      toNodeId: edge.toNodeId.toString(),
      condition: edge.condition,
      weight: edge.weight,
      ...edge.properties,
    };
  }

  private convertToVariableContext(workflowContext: WorkflowContext): Record<string, any> {
    // 转换逻辑
  }
}
```

#### 3.2.3 Trigger 执行处理器

```typescript
// src/services/workflow/triggers/trigger-execution-handler.ts

/**
 * Trigger 执行处理器
 */
export class TriggerExecutionHandler {
  constructor(
    private readonly functionRegistry: FunctionRegistry
  ) {}

  async canTrigger(
    trigger: Trigger,
    context: TriggerExecutionContext
  ): Promise<boolean> {
    // 检查触发器状态
    if (trigger.status.getValue() !== 'enabled') {
      return false;
    }

    // 检查触发器是否已触发
    if (trigger.status.getValue() === 'triggered') {
      return false;
    }

    // 调用触发器函数检查条件
    const triggerFunction = this.functionRegistry.getTriggerFunction(trigger.type.toString());
    if (!triggerFunction) {
      throw new Error(`未找到触发器函数: ${trigger.type.toString()}`);
    }

    const functionContext = this.buildFunctionContext(context);
    const config = this.buildTriggerConfig(trigger);

    const shouldTrigger = await triggerFunction.execute(functionContext, config);
    return shouldTrigger;
  }

  async execute(
    trigger: Trigger,
    context: TriggerExecutionContext
  ): Promise<TriggerExecutorResult> {
    const shouldTrigger = await this.canTrigger(trigger, context);

    if (shouldTrigger) {
      return TriggerExecutorResultUtils.success('触发器条件满足')
        .setData({
          triggerId: trigger.triggerId.toString(),
          triggerType: trigger.type.toString(),
          action: trigger.action.toString(),
          targetNodeId: trigger.targetNodeId?.toString(),
        })
        .build();
    } else {
      return TriggerExecutorResultUtils.failure('触发器条件不满足').build();
    }
  }

  private buildFunctionContext(context: TriggerExecutionContext): WorkflowExecutionContext {
    // 构建函数执行上下文
  }

  private buildTriggerConfig(trigger: Trigger): Record<string, any> {
    return {
      triggerId: trigger.triggerId.toString(),
      triggerType: trigger.type.toString(),
      action: trigger.action.toString(),
      targetNodeId: trigger.targetNodeId?.toString(),
      ...trigger.config,
    };
  }
}
```

#### 3.2.4 Hook 执行处理器

```typescript
// src/services/workflow/hooks/hook-execution-handler.ts

/**
 * Hook 执行处理器
 */
export class HookExecutionHandler {
  constructor(
    private readonly functionRegistry: FunctionRegistry
  ) {}

  async execute(
    hook: Hook,
    context: HookContextValue
  ): Promise<HookExecutionResultValue> {
    // 检查钩子是否应该执行
    if (!hook.enabled) {
      return HookExecutionResultValue.skipped(
        hook.hookId.toString(),
        { skipped: true, reason: 'hook is disabled' }
      );
    }

    // 获取钩子函数
    const hookFunction = this.functionRegistry.getHookFunction(hook.name);
    if (!hookFunction) {
      throw new Error(`未找到钩子函数: ${hook.name}`);
    }

    // 执行钩子函数
    const config = hook.config;
    const result = await hookFunction.execute(context, config);

    return HookExecutionResultValue.success(
      hook.hookId.toString(),
      result
    );
  }

  async executeBatch(
    hooks: Hook[],
    context: HookContextValue
  ): Promise<HookExecutionResultValue[]> {
    const results: HookExecutionResultValue[] = [];

    // 按优先级排序
    const sortedHooks = [...hooks].sort((a, b) => b.priority - a.priority);

    for (const hook of sortedHooks) {
      try {
        const result = await this.execute(hook, context);
        results.push(result);

        // 如果钩子要求停止执行，则中断后续钩子
        if (!result.shouldContinue()) {
          break;
        }
      } catch (error) {
        results.push(
          HookExecutionResultValue.failure(
            hook.hookId.toString(),
            error instanceof Error ? error.message : String(error),
            0,
            hook.continueOnError
          )
        );

        // 如果错误处理策略是 fail-fast，则中断后续钩子
        if (hook.failFast) {
          break;
        }
      }
    }

    return results;
  }
}
```

#### 3.2.5 Functions 注册表（移到服务层）

```typescript
// src/services/workflow/functions/function-registry.ts

/**
 * 函数注册表（服务层）
 */
@injectable()
export class FunctionRegistry {
  private singletonFunctions: Map<string, IWorkflowFunction> = new Map();
  private functionFactories: Map<string, FunctionFactory> = new Map();

  constructor() {}

  registerSingleton(func: IWorkflowFunction): void {
    if (this.singletonFunctions.has(func.id)) {
      throw new Error(`单例函数ID ${func.id} 已存在`);
    }
    this.singletonFunctions.set(func.id, func);
  }

  registerFactory(type: string, factory: FunctionFactory): void {
    if (this.functionFactories.has(type)) {
      throw new Error(`函数工厂 ${type} 已存在`);
    }
    this.functionFactories.set(type, factory);
  }

  getFunction(id: string, config?: Record<string, any>): IWorkflowFunction | null {
    // 1. 先查找单例函数
    if (this.singletonFunctions.has(id)) {
      return this.singletonFunctions.get(id)!;
    }

    // 2. 通过工厂创建动态函数
    const factory = this.functionFactories.get(id);
    if (factory) {
      const func = factory.create(config);
      return func;
    }

    return null;
  }

  getFunctionByName(name: string): IWorkflowFunction | null {
    for (const func of this.singletonFunctions.values()) {
      if (func.name === name) {
        return func;
      }
    }
    return null;
  }

  // 类型安全的便捷方法
  getConditionFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }

  getRoutingFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }

  getTriggerFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }

  getHookFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }

  getContextProcessorFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }

  getDataTransformerFunction(name: string): IWorkflowFunction | null {
    return this.getFunctionByName(name);
  }
}
```

### 3.3 Interaction 层（新增）

参考 [`llm-interaction-architecture-design-v2.md`](../architecture/interaction/llm-interaction-architecture-design-v2.md) 创建独立的 Interaction 层。

## 4. 重构步骤

### 阶段 1：创建新的领域层定义（2天）

- [ ] 简化 Node 实体，删除 execute() 等方法
- [ ] 简化 Edge 值对象，删除执行相关方法
- [ ] 简化 Trigger 实体，删除状态转换方法
- [ ] 简化 Hook 实体，删除 execute() 方法
- [ ] 保留 Functions 类型定义在领域层

### 阶段 2：创建服务层执行处理器（3天）

- [ ] 创建 Node 执行处理器接口和实现
- [ ] 创建 Edge 执行处理器
- [ ] 创建 Trigger 执行处理器
- [ ] 创建 Hook 执行处理器
- [ ] 移动 Functions 注册表到服务层

### 阶段 3：创建 Interaction 层（3天）

- [ ] 创建 InteractionContext 接口
- [ ] 创建 InteractionEngine 接口
- [ ] 实现 InteractionEngine 类
- [ ] 实现 LLM 调用逻辑
- [ ] 实现工具调用协调
- [ ] 实现上下文摘要逻辑

### 阶段 4：重构 Thread 层（2天）

- [ ] 在 Thread 中集成 InteractionEngine
- [ ] 更新 ThreadWorkflowExecutor 使用新的执行处理器
- [ ] 更新 ThreadLifecycle 集成 Hook 执行
- [ ] 更新路由逻辑使用新的 Edge 执行处理器

### 阶段 5：删除旧的实现（1天）

- [ ] 删除旧的 Node 实现类（StartNode、EndNode等）
- [ ] 删除旧的 EdgeExecutor
- [ ] 删除旧的 TriggerExecutor
- [ ] 删除旧的 HookExecutor
- [ ] 删除旧的 Functions 实现

### 阶段 6：集成测试（3天）

- [ ] 编写集成测试
- [ ] 测试节点执行
- [ ] 测试边执行
- [ ] 测试触发器执行
- [ ] 测试钩子执行
- [ ] 测试 LLM 交互
- [ ] 性能测试

**总计：14天**

## 5. 风险和挑战

### 5.1 技术风险

1. **向后兼容性**：需要确保现有工作流可以正常运行
2. **性能影响**：需要评估新架构的性能
3. **测试覆盖**：需要充分的测试覆盖

### 5.2 实施风险

1. **时间成本**：重构需要大量时间
2. **团队协作**：需要团队理解和接受新架构
3. **文档更新**：需要更新所有相关文档

### 5.3 缓解措施

1. **渐进式迁移**：分阶段实施，降低风险
2. **充分测试**：每个阶段都有充分的测试
3. **回滚计划**：准备回滚方案
4. **文档先行**：先更新文档，再实施代码

## 6. 优势分析

### 6.1 架构优势

1. **职责清晰**：
   - 领域层：只负责静态定义和状态管理
   - 服务层：负责执行协调
   - Interaction 层：负责 LLM 交互

2. **易于扩展**：
   - 添加新节点类型：只需添加新的执行处理器
   - 添加新函数类型：只需注册新的函数
   - 不需要修改核心架构

3. **易于测试**：
   - 领域层：纯值对象和实体，易于测试
   - 服务层：独立的执行逻辑，易于单元测试
   - Interaction 层：独立的交互逻辑，易于测试

4. **符合DDD原则**：
   - 值对象不可变
   - 实体职责单一
   - 依赖关系清晰

### 6.2 性能优势

1. **内存占用**：值对象比实体更轻量
2. **序列化**：值对象更容易序列化和反序列化
3. **缓存**：配置可以缓存，不需要重复创建

### 6.3 维护优势

1. **代码组织**：相关逻辑集中在一起
2. **依赖管理**：清晰的依赖关系
3. **文档化**：每个组件都有明确的职责

## 7. 下一步行动

1. **团队讨论**：与团队讨论这个重构方案
2. **技术评审**：进行技术评审，确认可行性
3. **制定详细计划**：制定详细的实施计划
4. **开始实施**：从阶段1开始实施
5. **持续验证**：每个阶段都进行充分验证

## 8. 附录

### 8.1 相关文件清单

需要修改的文件：
- `src/domain/workflow/entities/node.ts` - 简化 Node 实体
- `src/domain/workflow/entities/trigger.ts` - 简化 Trigger 实体
- `src/domain/workflow/entities/hook.ts` - 简化 Hook 实体
- `src/domain/workflow/value-objects/edge/edge-value-object.ts` - 简化 Edge 值对象
- `src/services/workflow/nodes/*.ts` - 所有节点实现文件
- `src/services/workflow/edges/edge-executor.ts` - 重构 Edge 执行器
- `src/services/workflow/triggers/trigger-executor.ts` - 重构 Trigger 执行器
- `src/services/workflow/hooks/hook-executor.ts` - 重构 Hook 执行器
- `src/services/workflow/functions/function-registry.ts` - 移到服务层
- `src/services/threads/thread-workflow-executor.ts` - 更新执行器

需要创建的文件：
- `src/services/workflow/nodes/execution-handlers/` - 执行处理器目录
- `src/services/workflow/nodes/execution-handlers/node-execution-handler.ts` - 处理器接口
- `src/services/workflow/nodes/execution-handlers/llm-execution-handler.ts` - LLM处理器
- `src/services/workflow/nodes/execution-handlers/tool-execution-handler.ts` - 工具处理器
- `src/services/workflow/nodes/execution-handlers/control-flow-handler.ts` - 控制流处理器
- `src/services/workflow/edges/edge-execution-handler.ts` - Edge 执行处理器
- `src/services/workflow/triggers/trigger-execution-handler.ts` - Trigger 执行处理器
- `src/services/workflow/hooks/hook-execution-handler.ts` - Hook 执行处理器
- `src/services/interaction/` - Interaction 层目录
- `src/services/interaction/interaction-engine.ts` - InteractionEngine
- `src/services/interaction/interaction-context.ts` - InteractionContext

### 8.2 测试策略

1. **单元测试**：每个执行处理器都有单元测试
2. **集成测试**：测试整个执行流程
3. **回归测试**：确保现有功能不受影响
4. **性能测试**：评估新架构的性能

### 8.3 文档更新

需要更新的文档：
- 架构文档
- API文档
- 开发指南
- 迁移指南