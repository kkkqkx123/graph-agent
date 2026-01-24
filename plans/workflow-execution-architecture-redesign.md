# Workflow 执行架构重新设计

## 1. 架构原则

### 1.1 核心原则
- **领域层（Domain Layer）**：只负责静态定义和状态管理，不包含任何执行逻辑
- **服务层（Services Layer）**：负责执行逻辑和业务协调
- **严格分层**：领域层不依赖服务层，服务层依赖领域层

### 1.2 职责分离
- **静态定义**：节点、Hook、边、Trigger的配置和元数据
- **执行逻辑**：如何执行这些定义，由服务层的执行处理器负责

## 2. 节点体系设计（静态定义）

### 2.1 Node 实体职责

**负责**：
- 节点状态管理（pending, running, completed, failed, cancelled）
- 节点属性管理（id, type, name, description, position, properties）
- 节点重试策略管理
- 节点类型判断（isStart, isEnd, isLLM, isTool等）
- 节点更新方法（updateStatus, updateProperties, updateRetryStrategy）
- 业务标识和持久化

**不负责**：
- 节点执行（由 NodeExecutionHandler 负责）
- 节点验证（由配置验证负责）
- 节点元数据获取（由配置负责）

### 2.2 Node 实体结构

```typescript
// src/domain/workflow/entities/node.ts

export interface NodeProps {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name?: string;
  readonly description?: string;
  readonly position?: { x: number; y: number };
  readonly properties: Record<string, any>;  // 存储节点特定配置
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

export abstract class Node extends Entity {
  // 状态管理
  public get nodeId(): NodeId;
  public get type(): NodeType;
  public get name(): string | undefined;
  public get description(): string | undefined;
  public get position(): { x: number; y: number } | undefined;
  public get properties(): Record<string, any>;
  public get status(): NodeStatus;
  public get retryStrategy(): NodeRetryStrategy;

  // 类型判断方法
  public isStart(): boolean;
  public isEnd(): boolean;
  public isLLM(): boolean;
  public isTool(): boolean;
  public isCondition(): boolean;
  public isDataTransform(): boolean;
  public isContextProcessor(): boolean;
  public isFork(): boolean;
  public isJoin(): boolean;
  public isSubWorkflow(): boolean;
  public isLoopStart(): boolean;
  public isLoopEnd(): boolean;
  public isUserInteraction(): boolean;

  // 更新方法
  public updateStatus(status: NodeStatus): Node;
  public updateProperties(properties: Record<string, any>): Node;
  public updateRetryStrategy(retryStrategy: NodeRetryStrategy): Node;

  // 业务标识和持久化
  public getBusinessIdentifier(): string;
  public toProps(): NodeProps;
  protected abstract createNodeFromProps(props: NodeProps): Node;
}
```

### 2.3 节点类型分类

**占位符节点（Marker Nodes）**：
- START：工作流开始标记
- END：工作流结束标记
- LOOP_START：循环开始标记
- LOOP_END：循环结束标记
- FORK：并行分支开始标记
- JOIN：并行分支合并标记

**执行节点（Execution Nodes）**：
- LLM：LLM调用节点
- TOOL：工具调用节点
- CONDITION：条件判断节点
- DATA_TRANSFORM：数据转换节点
- CONTEXT_PROCESSOR：上下文处理节点
- USER_INTERACTION：用户交互节点
- SUB_WORKFLOW：子工作流节点

### 2.4 节点配置存储

所有节点特定配置存储在 `properties` 字段中：

```typescript
// START 节点配置
{
  properties: {
    initialVariables: { ... },  // 初始变量
    inputSchema: { ... }        // 输入模式
  }
}

// END 节点配置
{
  properties: {
    outputSchema: { ... },      // 输出模式
    finalActions: [...]         // 最终动作
  }
}

// LLM 节点配置
{
  properties: {
    model: 'gpt-4',
    prompt: '...',
    temperature: 0.7,
    maxTokens: 1000
  }
}

// TOOL 节点配置
{
  properties: {
    toolId: 'calculator',
    parameters: { ... }
  }
}
```

## 3. Hook 体系设计（静态定义）

### 3.1 Hook 实体职责

**负责**：
- Hook 配置管理（id, hookPoint, name, description, config）
- Hook 状态管理（enabled, priority）
- Hook 错误处理策略（continueOnError, failFast）
- Hook 类型判断（isBeforeNodeExecute, isAfterNodeExecute等）

**不负责**：
- Hook 执行（由 HookExecutionHandler 负责）
- Hook 插件管理（由 HookExecutionHandler 负责）

### 3.2 Hook 实体结构

```typescript
// src/domain/workflow/entities/hook.ts

export interface HookProps {
  readonly id: ID;
  readonly hookPoint: HookPoint;
  readonly name: string;
  readonly description?: string;
  readonly config: Record<string, any>;  // Hook 特定配置
  readonly enabled: boolean;
  readonly priority: number;
  readonly continueOnError: boolean;
  readonly failFast: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

export abstract class Hook extends Entity {
  // 配置管理
  public get hookId(): ID;
  public get hookPoint(): HookPoint;
  public get name(): string;
  public get description(): string | undefined;
  public get config(): Record<string, any>;

  // 状态管理
  public get enabled(): boolean;
  public get priority(): number;
  public get continueOnError(): boolean;
  public get failFast(): boolean;

  // 类型判断
  public isBeforeNodeExecute(): boolean;
  public isAfterNodeExecute(): boolean;
  public isBeforeWorkflowExecute(): boolean;
  public isAfterWorkflowExecute(): boolean;
  public isOnError(): boolean;

  // 业务标识和持久化
  public getBusinessIdentifier(): string;
  public toProps(): HookProps;
  protected abstract createHookFromProps(props: HookProps): Hook;
}
```

### 3.3 Hook 配置存储

```typescript
// Hook 配置示例
{
  config: {
    pluginId: 'logging-plugin',
    logLevel: 'info',
    includeMetadata: true
  }
}
```

## 4. 边体系设计（静态定义）

### 4.1 Edge 值对象职责

**负责**：
- 边配置信息存储（id, type, fromNodeId, toNodeId）
- 边条件存储（condition）
- 边权重存储（weight）
- 边类型判断（isExceptionHandling, isNormalFlow, isAsynchronous等）

**不负责**：
- 边执行（由 EdgeExecutionHandler 负责）
- 条件评估（由 Thread 层负责）

### 4.2 Edge 值对象结构

```typescript
// src/domain/workflow/value-objects/edge/edge-value-object.ts

export interface EdgeValueObjectProps {
  readonly id: EdgeId;
  readonly type: EdgeType;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly condition?: EdgeCondition;  // 条件配置
  readonly weight?: number;
  readonly properties: Record<string, unknown>;
}

export class EdgeValueObject extends ValueObject<EdgeValueObjectProps> {
  // 配置访问
  public get id(): EdgeId;
  public get type(): EdgeType;
  public get fromNodeId(): NodeId;
  public get toNodeId(): NodeId;
  public get condition(): EdgeCondition | undefined;
  public get weight(): number | undefined;
  public get properties(): Record<string, unknown>;

  // 类型判断
  public isExceptionHandling(): boolean;
  public isNormalFlow(): boolean;
  public isAsynchronous(): boolean;
  public isSequence(): boolean;
  public isConditional(): boolean;
  public isDefault(): boolean;
  public isError(): boolean;
}
```

### 4.3 边条件配置

```typescript
// 边条件配置示例
{
  condition: {
    type: 'function',
    functionId: 'condition-function-1',
    config: {
      expression: 'data.value > 10'
    }
  }
}
```

## 5. Trigger 体系设计（静态定义）

### 5.1 Trigger 实体职责

**负责**：
- Trigger 配置管理（id, type, name, description, config）
- Trigger 状态管理（status, triggeredAt）
- Trigger 类型判断（isTimeTrigger, isEventTrigger, isStateTrigger）

**不负责**：
- Trigger 执行（由 TriggerExecutionHandler 负责）
- Trigger 状态转换（由 TriggerExecutionHandler 负责）

### 5.2 Trigger 实体结构

```typescript
// src/domain/workflow/entities/trigger.ts

export interface TriggerProps {
  readonly id: ID;
  readonly type: TriggerType;
  readonly name: string;
  readonly description?: string;
  readonly config: TriggerConfig;  // Trigger 特定配置
  readonly action: TriggerAction;
  readonly targetNodeId?: ID;
  readonly status: TriggerStatus;
  readonly triggeredAt?: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

export class Trigger extends Entity {
  // 配置管理
  public get triggerId(): ID;
  public get type(): TriggerType;
  public get name(): string;
  public get description(): string | undefined;
  public get config(): TriggerConfig;
  public get action(): TriggerAction;
  public get targetNodeId(): ID | undefined;

  // 状态管理
  public get status(): TriggerStatus;
  public get triggeredAt(): number | undefined;

  // 类型判断
  public isTimeTrigger(): boolean;
  public isEventTrigger(): boolean;
  public isStateTrigger(): boolean;

  // 业务标识和持久化
  public getBusinessIdentifier(): string;
  public toProps(): TriggerProps;
}
```

### 5.3 Trigger 配置存储

```typescript
// 时间触发器配置
{
  config: {
    delay: 1000,
    interval: 5000,
    cron: '0 0 * * *'
  }
}

// 事件触发器配置
{
  config: {
    eventType: 'user.created',
    eventDataPattern: {
      userId: 'string',
      email: 'string'
    }
  }
}

// 状态触发器配置
{
  config: {
    statePath: 'workflow.status',
    expectedValue: 'completed'
  }
}
```

## 6. 执行逻辑位置设计

### 6.1 执行处理器架构

执行逻辑由服务层的执行处理器负责，采用策略模式：

```
src/services/workflow/execution/
├── handlers/
│   ├── node-execution-handler.ts      # 节点执行处理器
│   ├── hook-execution-handler.ts      # Hook 执行处理器
│   ├── edge-execution-handler.ts      # 边执行处理器
│   └── trigger-execution-handler.ts   # Trigger 执行处理器
├── strategies/
│   ├── node/
│   │   ├── start-node-strategy.ts     # START 节点执行策略
│   │   ├── end-node-strategy.ts       # END 节点执行策略
│   │   ├── llm-node-strategy.ts       # LLM 节点执行策略
│   │   ├── tool-node-strategy.ts      # TOOL 节点执行策略
│   │   ├── condition-node-strategy.ts # CONDITION 节点执行策略
│   │   ├── data-transform-strategy.ts # DATA_TRANSFORM 节点执行策略
│   │   ├── context-processor-strategy.ts # CONTEXT_PROCESSOR 节点执行策略
│   │   ├── fork-node-strategy.ts      # FORK 节点执行策略
│   │   ├── join-node-strategy.ts      # JOIN 节点执行策略
│   │   ├── subworkflow-strategy.ts    # SUB_WORKFLOW 节点执行策略
│   │   ├── loop-start-strategy.ts     # LOOP_START 节点执行策略
│   │   ├── loop-end-strategy.ts       # LOOP_END 节点执行策略
│   │   └── user-interaction-strategy.ts # USER_INTERACTION 节点执行策略
│   ├── hook/
│   │   ├── before-node-execute-strategy.ts
│   │   ├── after-node-execute-strategy.ts
│   │   ├── before-workflow-execute-strategy.ts
│   │   ├── after-workflow-execute-strategy.ts
│   │   └── on-error-strategy.ts
│   ├── edge/
│   │   ├── condition-evaluation-strategy.ts
│   │   └── routing-strategy.ts
│   └── trigger/
│       ├── time-trigger-strategy.ts
│       ├── event-trigger-strategy.ts
│       └── state-trigger-strategy.ts
└── context/
    ├── execution-context.ts           # 执行上下文
    └── execution-result.ts            # 执行结果
```

### 6.2 节点执行处理器

```typescript
// src/services/workflow/execution/handlers/node-execution-handler.ts

export interface INodeExecutionHandler {
  /**
   * 执行节点
   * @param node 节点实体
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult>;

  /**
   * 验证节点是否可以执行
   * @param node 节点实体
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  canExecute(node: Node, context: ExecutionContext): Promise<boolean>;
}

export class NodeExecutionHandler implements INodeExecutionHandler {
  private strategies: Map<NodeTypeValue, INodeExecutionStrategy>;

  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('LLMClient') private readonly llmClient: ILLMClient,
    @inject('ToolRegistry') private readonly toolRegistry: IToolRegistry,
    @inject('FunctionRegistry') private readonly functionRegistry: IFunctionRegistry
  ) {
    this.strategies = new Map();
    this.registerStrategies();
  }

  private registerStrategies(): void {
    this.strategies.set(NodeTypeValue.START, new StartNodeStrategy());
    this.strategies.set(NodeTypeValue.END, new EndNodeStrategy());
    this.strategies.set(NodeTypeValue.LLM, new LLMNodeStrategy(this.llmClient));
    this.strategies.set(NodeTypeValue.TOOL, new ToolNodeStrategy(this.toolRegistry));
    this.strategies.set(NodeTypeValue.CONDITION, new ConditionNodeStrategy(this.functionRegistry));
    this.strategies.set(NodeTypeValue.DATA_TRANSFORM, new DataTransformStrategy(this.functionRegistry));
    this.strategies.set(NodeTypeValue.CONTEXT_PROCESSOR, new ContextProcessorStrategy());
    this.strategies.set(NodeTypeValue.FORK, new ForkNodeStrategy());
    this.strategies.set(NodeTypeValue.JOIN, new JoinNodeStrategy());
    this.strategies.set(NodeTypeValue.SUB_WORKFLOW, new SubWorkflowStrategy());
    this.strategies.set(NodeTypeValue.LOOP_START, new LoopStartStrategy());
    this.strategies.set(NodeTypeValue.LOOP_END, new LoopEndStrategy());
    this.strategies.set(NodeTypeValue.USER_INTERACTION, new UserInteractionStrategy());
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    const strategy = this.strategies.get(node.type.value);
    if (!strategy) {
      throw new Error(`不支持的节点类型: ${node.type.value}`);
    }
    return await strategy.execute(node, context);
  }

  async canExecute(node: Node, context: ExecutionContext): Promise<boolean> {
    const strategy = this.strategies.get(node.type.value);
    if (!strategy) {
      return false;
    }
    return await strategy.canExecute(node, context);
  }
}
```

### 6.3 节点执行策略接口

```typescript
// src/services/workflow/execution/strategies/node/node-execution-strategy.ts

export interface INodeExecutionStrategy {
  /**
   * 执行节点
   * @param node 节点实体
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult>;

  /**
   * 验证节点是否可以执行
   * @param node 节点实体
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  canExecute(node: Node, context: ExecutionContext): Promise<boolean>;
}
```

### 6.4 START 节点执行策略示例

```typescript
// src/services/workflow/execution/strategies/node/start-node-strategy.ts

export class StartNodeStrategy implements INodeExecutionStrategy {
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 从 properties 中获取初始变量
      const initialVariables = node.properties.initialVariables || {};

      // 初始化执行上下文
      context.initializeVariables(initialVariables);

      // START 节点不执行任何业务逻辑，只是标记工作流开始
      return NodeExecutionResult.success({
        output: initialVariables,
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: 'start',
          executionTime: Date.now() - startTime
        }
      });
    } catch (error) {
      return NodeExecutionResult.failure({
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: 'start',
          executionTime: Date.now() - startTime
        }
      });
    }
  }

  async canExecute(node: Node, context: ExecutionContext): Promise<boolean> {
    // START 节点总是可以执行
    return true;
  }
}
```

### 6.5 LLM 节点执行策略示例

```typescript
// src/services/workflow/execution/strategies/node/llm-node-strategy.ts

export class LLMNodeStrategy implements INodeExecutionStrategy {
  constructor(private readonly llmClient: ILLMClient) {}

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 从 properties 中获取 LLM 配置
      const config = node.properties;
      const model = config.model || 'gpt-4';
      const prompt = config.prompt;
      const temperature = config.temperature || 0.7;
      const maxTokens = config.maxTokens || 1000;

      // 调用 LLM
      const response = await this.llmClient.chat({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        maxTokens
      });

      // 更新上下文
      context.setVariable('llm_response', response);

      return NodeExecutionResult.success({
        output: response,
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: 'llm',
          model,
          executionTime: Date.now() - startTime
        }
      });
    } catch (error) {
      return NodeExecutionResult.failure({
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: 'llm',
          executionTime: Date.now() - startTime
        }
      });
    }
  }

  async canExecute(node: Node, context: ExecutionContext): Promise<boolean> {
    // 检查 LLM 配置是否完整
    const config = node.properties;
    return !!(config.model && config.prompt);
  }
}
```

### 6.6 Hook 执行处理器

```typescript
// src/services/workflow/execution/handlers/hook-execution-handler.ts

export interface IHookExecutionHandler {
  /**
   * 执行单个 Hook
   * @param hook Hook 实体
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(hook: Hook, context: ExecutionContext): Promise<HookExecutionResult>;

  /**
   * 批量执行 Hook
   * @param hooks Hook 实体列表
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  executeBatch(hooks: Hook[], context: ExecutionContext): Promise<HookExecutionResult[]>;
}

export class HookExecutionHandler implements IHookExecutionHandler {
  private strategies: Map<HookPointValue, IHookExecutionStrategy>;

  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('PluginRegistry') private readonly pluginRegistry: IPluginRegistry
  ) {
    this.strategies = new Map();
    this.registerStrategies();
  }

  private registerStrategies(): void {
    this.strategies.set(HookPointValue.BEFORE_NODE_EXECUTE, new BeforeNodeExecuteStrategy(this.pluginRegistry));
    this.strategies.set(HookPointValue.AFTER_NODE_EXECUTE, new AfterNodeExecuteStrategy(this.pluginRegistry));
    this.strategies.set(HookPointValue.BEFORE_WORKFLOW_EXECUTE, new BeforeWorkflowExecuteStrategy(this.pluginRegistry));
    this.strategies.set(HookPointValue.AFTER_WORKFLOW_EXECUTE, new AfterWorkflowExecuteStrategy(this.pluginRegistry));
    this.strategies.set(HookPointValue.ON_ERROR, new OnErrorStrategy(this.pluginRegistry));
  }

  async execute(hook: Hook, context: ExecutionContext): Promise<HookExecutionResult> {
    // 检查 Hook 是否启用
    if (!hook.enabled) {
      return HookExecutionResult.skipped({
        hookId: hook.hookId.toString(),
        reason: 'hook is disabled'
      });
    }

    const strategy = this.strategies.get(hook.hookPoint.value);
    if (!strategy) {
      throw new Error(`不支持的 Hook 点: ${hook.hookPoint.value}`);
    }

    return await strategy.execute(hook, context);
  }

  async executeBatch(hooks: Hook[], context: ExecutionContext): Promise<HookExecutionResult[]> {
    // 按优先级排序
    const sortedHooks = [...hooks].sort((a, b) => b.priority - a.priority);

    const results: HookExecutionResult[] = [];
    for (const hook of sortedHooks) {
      const result = await this.execute(hook, context);
      results.push(result);

      // 如果 Hook 要求停止执行，则中断后续 Hook
      if (!result.shouldContinue()) {
        break;
      }
    }

    return results;
  }
}
```

### 6.7 边执行处理器

```typescript
// src/services/workflow/execution/handlers/edge-execution-handler.ts

export interface IEdgeExecutionHandler {
  /**
   * 评估边条件
   * @param edge 边值对象
   * @param context 执行上下文
   * @returns 是否满足条件
   */
  evaluateCondition(edge: EdgeValueObject, context: ExecutionContext): Promise<boolean>;

  /**
   * 获取下一个节点
   * @param edges 边列表
   * @param context 执行上下文
   * @returns 下一个节点 ID
   */
  getNextNode(edges: EdgeValueObject[], context: ExecutionContext): Promise<NodeId | null>;
}

export class EdgeExecutionHandler implements IEdgeExecutionHandler {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('FunctionRegistry') private readonly functionRegistry: IFunctionRegistry
  ) {}

  async evaluateCondition(edge: EdgeValueObject, context: ExecutionContext): Promise<boolean> {
    // 如果没有条件，默认为 true
    if (!edge.condition) {
      return true;
    }

    // 使用函数注册表评估条件
    const conditionFunction = this.functionRegistry.getFunction(edge.condition.functionId);
    if (!conditionFunction) {
      throw new Error(`条件函数不存在: ${edge.condition.functionId}`);
    }

    const result = await conditionFunction.execute(context, edge.condition.config);
    return Boolean(result);
  }

  async getNextNode(edges: EdgeValueObject[], context: ExecutionContext): Promise<NodeId | null> {
    // 过滤出所有满足条件的边
    const validEdges: EdgeValueObject[] = [];
    for (const edge of edges) {
      const isValid = await this.evaluateCondition(edge, context);
      if (isValid) {
        validEdges.push(edge);
      }
    }

    // 如果没有满足条件的边，返回 null
    if (validEdges.length === 0) {
      return null;
    }

    // 如果只有一个满足条件的边，返回该边
    if (validEdges.length === 1) {
      return validEdges[0].toNodeId;
    }

    // 如果有多个满足条件的边，根据权重选择
    const totalWeight = validEdges.reduce((sum, edge) => sum + (edge.weight || 1), 0);
    let random = Math.random() * totalWeight;
    for (const edge of validEdges) {
      random -= (edge.weight || 1);
      if (random <= 0) {
        return edge.toNodeId;
      }
    }

    return validEdges[0].toNodeId;
  }
}
```

### 6.8 Trigger 执行处理器

```typescript
// src/services/workflow/execution/handlers/trigger-execution-handler.ts

export interface ITriggerExecutionHandler {
  /**
   * 检查 Trigger 是否应该触发
   * @param trigger Trigger 实体
   * @param context 执行上下文
   * @returns 是否应该触发
   */
  shouldTrigger(trigger: Trigger, context: ExecutionContext): Promise<boolean>;

  /**
   * 执行 Trigger
   * @param trigger Trigger 实体
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(trigger: Trigger, context: ExecutionContext): Promise<TriggerExecutionResult>;
}

export class TriggerExecutionHandler implements ITriggerExecutionHandler {
  private strategies: Map<TriggerTypeValue, ITriggerExecutionStrategy>;

  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('EventBus') private readonly eventBus: IEventBus
  ) {
    this.strategies = new Map();
    this.registerStrategies();
  }

  private registerStrategies(): void {
    this.strategies.set(TriggerTypeValue.TIME, new TimeTriggerStrategy());
    this.strategies.set(TriggerTypeValue.EVENT, new EventTriggerStrategy(this.eventBus));
    this.strategies.set(TriggerTypeValue.STATE, new StateTriggerStrategy());
  }

  async shouldTrigger(trigger: Trigger, context: ExecutionContext): Promise<boolean> {
    const strategy = this.strategies.get(trigger.type.value);
    if (!strategy) {
      return false;
    }
    return await strategy.shouldTrigger(trigger, context);
  }

  async execute(trigger: Trigger, context: ExecutionContext): Promise<TriggerExecutionResult> {
    const strategy = this.strategies.get(trigger.type.value);
    if (!strategy) {
      throw new Error(`不支持的 Trigger 类型: ${trigger.type.value}`);
    }
    return await strategy.execute(trigger, context);
  }
}
```

## 7. 执行上下文设计

### 7.1 ExecutionContext 接口

```typescript
// src/services/workflow/execution/context/execution-context.ts

export interface ExecutionContext {
  // 工作流信息
  readonly workflowId: string;
  readonly executionId: string;
  readonly threadId: string;

  // 变量管理
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getAllVariables(): Record<string, any>;
  initializeVariables(variables: Record<string, any>): void;

  // 节点结果管理
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
  getAllNodeResults(): Record<string, any>;

  // 服务访问
  getService<T>(serviceName: string): T;

  // 元数据
  getMetadata(key: string): any;
  setMetadata(key: string, value: any): void;
}
```

### 7.2 ExecutionContext 实现

```typescript
export class WorkflowExecutionContext implements ExecutionContext {
  private variables: Map<string, any>;
  private nodeResults: Map<string, any>;
  private metadata: Map<string, any>;
  private services: Map<string, any>;

  constructor(
    public readonly workflowId: string,
    public readonly executionId: string,
    public readonly threadId: string,
    services: Map<string, any>
  ) {
    this.variables = new Map();
    this.nodeResults = new Map();
    this.metadata = new Map();
    this.services = services;
  }

  getVariable(key: string): any {
    return this.variables.get(key);
  }

  setVariable(key: string, value: any): void {
    this.variables.set(key, value);
  }

  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables);
  }

  initializeVariables(variables: Record<string, any>): void {
    for (const [key, value] of Object.entries(variables)) {
      this.variables.set(key, value);
    }
  }

  getNodeResult(nodeId: string): any {
    return this.nodeResults.get(nodeId);
  }

  setNodeResult(nodeId: string, result: any): void {
    this.nodeResults.set(nodeId, result);
  }

  getAllNodeResults(): Record<string, any> {
    return Object.fromEntries(this.nodeResults);
  }

  getService<T>(serviceName: string): T {
    return this.services.get(serviceName) as T;
  }

  getMetadata(key: string): any {
    return this.metadata.get(key);
  }

  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }
}
```

## 8. 架构层次关系

### 8.1 依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                  (HTTP/gRPC Controllers)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Services Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Execution Handlers (执行处理器)              │  │
│  │  - NodeExecutionHandler                               │  │
│  │  - HookExecutionHandler                               │  │
│  │  - EdgeExecutionHandler                               │  │
│  │  - TriggerExecutionHandler                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Execution Strategies (执行策略)              │  │
│  │  - StartNodeStrategy, EndNodeStrategy                 │  │
│  │  - LLMNodeStrategy, ToolNodeStrategy                 │  │
│  │  - ConditionNodeStrategy, DataTransformStrategy      │  │
│  │  - ForkNodeStrategy, JoinNodeStrategy                │  │
│  │  - LoopStartStrategy, LoopEndStrategy                │  │
│  │  - BeforeNodeExecuteStrategy, AfterNodeExecuteStrategy│  │
│  │  - ConditionEvaluationStrategy                       │  │
│  │  - TimeTriggerStrategy, EventTriggerStrategy         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Thread Layer (线程层)                        │  │
│  │  - ThreadWorkflowExecutor                             │  │
│  │  - ThreadStateManager                                 │  │
│  │  - ThreadHistoryManager                               │  │
│  │  - ThreadConditionalRouter                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Entities (实体)                              │  │
│  │  - Node (节点)                                         │  │
│  │  - Hook (钩子)                                         │  │
│  │  - Trigger (触发器)                                    │  │
│  │  - Workflow (工作流)                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Value Objects (值对象)                       │  │
│  │  - EdgeValueObject (边)                               │  │
│  │  - NodeType, NodeStatus, NodeId                       │  │
│  │  - HookPoint, HookContextValue                        │  │
│  │  - TriggerType, TriggerStatus                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│              (Database, Logging, Config)                     │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 执行流程

```
1. WorkflowExecutionEngine 接收执行请求
   ↓
2. 创建 ExecutionContext
   ↓
3. 执行 BEFORE_WORKFLOW_EXECUTE Hooks
   ↓
4. 获取 START 节点
   ↓
5. 循环执行节点：
   a. 执行 BEFORE_NODE_EXECUTE Hooks
   b. NodeExecutionHandler.execute(node, context)
      - 根据 node.type 选择对应的 Strategy
      - Strategy.execute(node, context)
   c. 执行 AFTER_NODE_EXECUTE Hooks
   d. 更新节点状态
   e. EdgeExecutionHandler.getNextNode(edges, context)
      - 评估边条件
      - 选择下一个节点
   f. 如果有错误，执行 ON_ERROR Hooks
   ↓
6. 到达 END 节点或没有下一个节点
   ↓
7. 执行 AFTER_WORKFLOW_EXECUTE Hooks
   ↓
8. 返回执行结果
```

## 9. 关键设计决策

### 9.1 为什么使用策略模式？

- **灵活性**：可以轻松添加新的节点类型和执行策略
- **可测试性**：每个策略可以独立测试
- **可维护性**：每个策略只关注一种节点类型的执行逻辑

### 9.2 为什么将执行逻辑放在服务层？

- **符合 DDD 原则**：领域层只负责静态定义和状态管理
- **职责分离**：执行逻辑是技术实现，不是业务规则
- **可替换性**：可以轻松替换执行策略而不影响领域模型

### 9.3 为什么使用 properties 字段存储配置？

- **统一性**：所有节点类型使用相同的结构
- **灵活性**：可以存储任意类型的配置
- **可扩展性**：添加新节点类型不需要修改 Node 实体

### 9.4 为什么需要 ExecutionContext？

- **上下文传递**：在执行过程中传递变量、节点结果等
- **服务访问**：提供对 LLMClient、ToolRegistry 等服务的访问
- **状态管理**：管理执行过程中的临时状态

## 10. 实施步骤

### 阶段 1：完善领域层（已完成）
- [x] 简化 Node 实体
- [x] 简化 Hook 实体
- [x] 简化 Edge 值对象
- [x] 简化 Trigger 实体

### 阶段 2：创建执行处理器
- [ ] 创建 INodeExecutionHandler 接口
- [ ] 创建 NodeExecutionHandler 实现
- [ ] 创建 INodeExecutionStrategy 接口
- [ ] 创建所有节点执行策略
- [ ] 创建 IHookExecutionHandler 接口
- [ ] 创建 HookExecutionHandler 实现
- [ ] 创建所有 Hook 执行策略
- [ ] 创建 IEdgeExecutionHandler 接口
- [ ] 创建 EdgeExecutionHandler 实现
- [ ] 创建 ITriggerExecutionHandler 接口
- [ ] 创建 TriggerExecutionHandler 实现
- [ ] 创建所有 Trigger 执行策略

### 阶段 3：创建执行上下文
- [ ] 创建 ExecutionContext 接口
- [ ] 创建 WorkflowExecutionContext 实现
- [ ] 创建执行结果值对象

### 阶段 4：重构 Thread 层
- [ ] 重构 ThreadWorkflowExecutor 使用新的执行处理器
- [ ] 重构 ThreadStateManager 使用新的执行上下文
- [ ] 重构 ThreadConditionalRouter 使用新的边执行处理器

### 阶段 5：删除旧的实现
- [ ] 删除旧的 NodeExecutor
- [ ] 删除旧的 HookExecutor
- [ ] 删除所有具体节点实现类（StartNode, EndNode 等）

### 阶段 6：集成测试
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 运行测试套件

## 11. 总结

### 11.1 核心设计原则

1. **领域层只负责静态定义**：Node、Hook、Edge、Trigger 只存储配置和状态
2. **服务层负责执行逻辑**：执行处理器和策略模式实现具体的执行逻辑
3. **严格分层**：领域层不依赖服务层，服务层依赖领域层
4. **策略模式**：使用策略模式实现不同类型节点的执行逻辑
5. **统一配置存储**：使用 properties 字段统一存储节点特定配置

### 11.2 优势

- **清晰的职责分离**：领域层和服务层各司其职
- **高可扩展性**：添加新节点类型只需添加新的执行策略
- **高可测试性**：每个组件可以独立测试
- **高可维护性**：代码结构清晰，易于理解和修改

### 11.3 下一步行动

1. 与用户确认此设计方案
2. 开始实施阶段 2：创建执行处理器
3. 逐步完成所有阶段
4. 进行集成测试