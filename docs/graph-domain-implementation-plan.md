# Graph领域实现计划

## 目录结构设计

```
src/domain/graph/
├── entities/
│   ├── index.ts                    # 现有
│   ├── graph.ts                    # 现有
│   ├── node.ts                     # 现有
│   ├── edge.ts                     # 现有
│   ├── condition-node.ts           # 新增
│   ├── llm-node.ts                 # 新增
│   ├── tool-node.ts                # 新增
│   ├── wait-node.ts                # 新增
│   └── workflow-state.ts           # 新增
├── value-objects/
│   ├── index.ts                    # 现有
│   ├── node-type.ts                # 现有
│   ├── edge-type.ts                # 现有
│   ├── execution-mode.ts           # 新增
│   ├── hook-point.ts               # 新增
│   ├── trigger-type.ts             # 新增
│   ├── plugin-type.ts              # 新增
│   ├── condition-type.ts           # 新增
│   ├── node-execution-result.ts    # 新增
│   └── graph-execution-context.ts  # 新增
├── events/
│   ├── index.ts                    # 现有
│   ├── graph-created-event.ts      # 现有
│   ├── node-added-event.ts         # 现有
│   ├── edge-added-event.ts         # 现有
│   ├── graph-execution-started-event.ts      # 新增
│   ├── graph-execution-completed-event.ts    # 新增
│   ├── graph-execution-failed-event.ts       # 新增
│   ├── node-execution-started-event.ts       # 新增
│   ├── node-execution-completed-event.ts     # 新增
│   ├── node-execution-failed-event.ts        # 新增
│   ├── state-changed-event.ts                # 新增
│   ├── hook-executed-event.ts                # 新增
│   ├── plugin-executed-event.ts              # 新增
│   └── trigger-fired-event.ts                # 新增
├── services/
│   ├── index.ts                    # 现有
│   ├── graph-domain-service.ts     # 现有
│   ├── graph-building-service.ts   # 新增
│   ├── graph-execution-service.ts  # 新增
│   ├── graph-validation-service.ts # 新增
│   ├── state-management-service.ts # 新增
│   └── compilation-service.ts      # 新增
├── repositories/
│   ├── index.ts                    # 现有
│   └── graph-repository.ts         # 现有
├── interfaces/
│   ├── index.ts                    # 新增
│   ├── graph-execution-engine.ts   # 新增
│   ├── graph-compiler.ts           # 新增
│   ├── task-scheduler.ts           # 新增
│   ├── state-manager.ts            # 新增
│   ├── hook-system.ts              # 新增
│   ├── plugin-system.ts            # 新增
│   ├── trigger-system.ts           # 新增
│   ├── message-processor.ts        # 新增
│   └── resource-manager.ts         # 新增
├── extensions/
│   ├── index.ts                    # 新增
│   ├── hooks/
│   │   ├── index.ts                # 新增
│   │   ├── base-hook.ts            # 新增
│   │   ├── hook-point.ts           # 新增
│   │   ├── hook-context.ts         # 新增
│   │   └── hook-execution-result.ts # 新增
│   ├── plugins/
│   │   ├── index.ts                # 新增
│   │   ├── base-plugin.ts          # 新增
│   │   ├── plugin-context.ts       # 新增
│   │   ├── plugin-execution-result.ts # 新增
│   │   └── plugin-type.ts          # 新增
│   └── triggers/
│       ├── index.ts                # 新增
│       ├── base-trigger.ts         # 新增
│       ├── trigger-event.ts        # 新增
│       ├── trigger-type.ts         # 新增
│       └── trigger-handler.ts      # 新增
├── registries/
│   ├── index.ts                    # 新增
│   ├── node-registry.ts            # 新增
│   ├── edge-registry.ts            # 新增
│   └── function-registry.ts        # 新增
└── builders/
    ├── index.ts                    # 新增
    ├── graph-builder.ts            # 新增
    ├── element-builder-factory.ts  # 新增
    └── build-strategies.ts         # 新增
```

## 核心接口设计

### 1. 图执行引擎接口

```typescript
// src/domain/graph/interfaces/graph-execution-engine.ts
export interface IGraphExecutionEngine {
  /**
   * 编译图
   */
  compile(config?: GraphCompilationConfig): Promise<CompiledGraph>;

  /**
   * 执行图
   */
  execute(input: GraphExecutionInput): Promise<GraphExecutionResult>;

  /**
   * 流式执行图
   */
  stream(input: GraphExecutionInput): AsyncIterable<GraphExecutionEvent>;

  /**
   * 设置钩子系统
   */
  setHookSystem(hookSystem: IHookSystem): void;

  /**
   * 获取引擎信息
   */
  getEngineInfo(): EngineInfo;
}
```

### 2. 图编译器接口

```typescript
// src/domain/graph/interfaces/graph-compiler.ts
export interface IGraphCompiler {
  /**
   * 编译图结构
   */
  compile(graph: Graph, config?: CompilationConfig): Promise<CompiledGraph>;

  /**
   * 验证图结构
   */
  validate(graph: Graph): ValidationResult;

  /**
   * 优化图结构
   */
  optimize(graph: Graph): Graph;
}
```

### 3. 状态管理器接口

```typescript
// src/domain/graph/interfaces/state-manager.ts
export interface IStateManager<TState = any> {
  /**
   * 初始化状态
   */
  initializeState(input: any): Promise<TState>;

  /**
   * 更新状态
   */
  updateState(currentState: TState, updates: any): Promise<TState>;

  /**
   * 创建检查点
   */
  createCheckpoint(state: TState): Promise<string>;

  /**
   * 恢复检查点
   */
  restoreCheckpoint(checkpointId: string): Promise<TState>;
}
```

### 4. 钩子系统接口

```typescript
// src/domain/graph/interfaces/hook-system.ts
export interface IHookSystem {
  /**
   * 注册钩子
   */
  registerHook(hookPoint: HookPoint, hook: IHook): void;

  /**
   * 执行钩子
   */
  executeHooks(hookPoint: HookPoint, context: HookContext): Promise<HookExecutionResult[]>;

  /**
   * 移除钩子
   */
  removeHook(hookPoint: HookPoint, hookId: string): boolean;
}
```

### 5. 插件系统接口

```typescript
// src/domain/graph/interfaces/plugin-system.ts
export interface IPluginSystem {
  /**
   * 注册插件
   */
  registerPlugin(plugin: IPlugin): void;

  /**
   * 执行插件
   */
  executePlugins(pluginType: PluginType, context: PluginContext): Promise<PluginExecutionResult[]>;

  /**
   * 获取插件列表
   */
  getPlugins(pluginType?: PluginType): IPlugin[];
}
```

### 6. 触发器系统接口

```typescript
// src/domain/graph/interfaces/trigger-system.ts
export interface ITriggerSystem {
  /**
   * 注册触发器
   */
  registerTrigger(trigger: ITrigger): void;

  /**
   * 评估触发器
   */
  evaluateTriggers(state: WorkflowState, context: any): Promise<TriggerEvent[]>;

  /**
   * 执行触发器
   */
  executeTrigger(triggerEvent: TriggerEvent): Promise<TriggerExecutionResult>;
}
```

## 值对象设计

### 1. 执行模式

```typescript
// src/domain/graph/value-objects/execution-mode.ts
export enum ExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  STREAM = 'stream'
}

export class ExecutionModeValue {
  private readonly value: ExecutionMode;

  constructor(value: ExecutionMode) {
    this.value = value;
    this.validate();
  }

  private validate(): void {
    if (!Object.values(ExecutionMode).includes(this.value)) {
      throw new DomainError(`无效的执行模式: ${this.value}`);
    }
  }

  public getValue(): ExecutionMode {
    return this.value;
  }

  public isSync(): boolean {
    return this.value === ExecutionMode.SYNC;
  }

  public isAsync(): boolean {
    return this.value === ExecutionMode.ASYNC;
  }

  public isStream(): boolean {
    return this.value === ExecutionMode.STREAM;
  }
}
```

### 2. 钩子点

```typescript
// src/domain/graph/value-objects/hook-point.ts
export enum HookPoint {
  BEFORE_EXECUTE = 'before_execute',
  AFTER_EXECUTE = 'after_execute',
  ON_ERROR = 'on_error',
  BEFORE_COMPILE = 'before_compile',
  AFTER_COMPILE = 'after_compile',
  BEFORE_NODE_EXECUTE = 'before_node_execute',
  AFTER_NODE_EXECUTE = 'after_node_execute'
}

export class HookPointValue {
  private readonly value: HookPoint;

  constructor(value: HookPoint) {
    this.value = value;
    this.validate();
  }

  private validate(): void {
    if (!Object.values(HookPoint).includes(this.value)) {
      throw new DomainError(`无效的钩子点: ${this.value}`);
    }
  }

  public getValue(): HookPoint {
    return this.value;
  }
}
```

### 3. 节点执行结果

```typescript
// src/domain/graph/value-objects/node-execution-result.ts
export interface NodeExecutionResultProps {
  nodeId: ID;
  state: WorkflowState;
  nextNodeId?: ID;
  metadata: Record<string, any>;
  executionTime: number;
  success: boolean;
  error?: Error;
}

export class NodeExecutionResult extends ValueObject {
  private readonly props: NodeExecutionResultProps;

  constructor(props: NodeExecutionResultProps) {
    super();
    this.props = Object.freeze(props);
    this.validate();
  }

  private validate(): void {
    if (!this.props.nodeId) {
      throw new DomainError('节点ID不能为空');
    }
    if (!this.props.state) {
      throw new DomainError('状态不能为空');
    }
    if (this.props.executionTime < 0) {
      throw new DomainError('执行时间不能为负数');
    }
  }

  public get nodeId(): ID {
    return this.props.nodeId;
  }

  public get state(): WorkflowState {
    return this.props.state;
  }

  public get nextNodeId(): ID | undefined {
    return this.props.nextNodeId;
  }

  public get metadata(): Record<string, any> {
    return { ...this.props.metadata };
  }

  public get executionTime(): number {
    return this.props.executionTime;
  }

  public get success(): boolean {
    return this.props.success;
  }

  public get error(): Error | undefined {
    return this.props.error;
  }
}
```

## 实体设计

### 1. 条件节点

```typescript
// src/domain/graph/entities/condition-node.ts
export interface ConditionNodeProps extends NodeProps {
  conditions: Condition[];
  defaultNextNodeId?: ID;
}

export class ConditionNode extends Node {
  private readonly conditionProps: ConditionNodeProps;

  constructor(props: ConditionNodeProps) {
    super(props);
    this.conditionProps = Object.freeze(props);
  }

  public get conditions(): Condition[] {
    return [...this.conditionProps.conditions];
  }

  public get defaultNextNodeId(): ID | undefined {
    return this.conditionProps.defaultNextNodeId;
  }

  public evaluateConditions(state: WorkflowState): ConditionEvaluationResult {
    for (const condition of this.conditions) {
      if (condition.evaluate(state)) {
        return {
          conditionMet: true,
          condition,
          nextNodeId: condition.nextNodeId
        };
      }
    }

    return {
      conditionMet: false,
      nextNodeId: this.defaultNextNodeId
    };
  }
}
```

### 2. LLM节点

```typescript
// src/domain/graph/entities/llm-node.ts
export interface LLMNodeProps extends NodeProps {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolConfig[];
  promptTemplate?: string;
}

export class LLMNode extends Node {
  private readonly llmProps: LLMNodeProps;

  constructor(props: LLMNodeProps) {
    super(props);
    this.llmProps = Object.freeze(props);
  }

  public get systemPrompt(): string | undefined {
    return this.llmProps.systemPrompt;
  }

  public get temperature(): number {
    return this.llmProps.temperature ?? 0.7;
  }

  public get maxTokens(): number {
    return this.llmProps.maxTokens ?? 1000;
  }

  public get tools(): ToolConfig[] {
    return this.llmProps.tools ?? [];
  }

  public get promptTemplate(): string | undefined {
    return this.llmProps.promptTemplate;
  }

  public prepareMessages(state: WorkflowState): Message[] {
    // 实现消息准备逻辑
    return [];
  }

  public shouldEnableTools(): boolean {
    return this.tools.length > 0;
  }
}
```

### 3. 工具节点

```typescript
// src/domain/graph/entities/tool-node.ts
export interface ToolNodeProps extends NodeProps {
  toolConfigs: ToolConfig[];
  timeout?: number;
  maxParallelCalls?: number;
  continueOnError?: boolean;
}

export class ToolNode extends Node {
  private readonly toolProps: ToolNodeProps;

  constructor(props: ToolNodeProps) {
    super(props);
    this.toolProps = Object.freeze(props);
  }

  public get toolConfigs(): ToolConfig[] {
    return [...this.toolProps.toolConfigs];
  }

  public get timeout(): number {
    return this.toolProps.timeout ?? 30;
  }

  public get maxParallelCalls(): number {
    return this.toolProps.maxParallelCalls ?? 1;
  }

  public get continueOnError(): boolean {
    return this.toolProps.continueOnError ?? true;
  }

  public extractToolCalls(state: WorkflowState): ToolCall[] {
    // 实现工具调用提取逻辑
    return [];
  }
}
```

## 领域服务设计

### 1. 图构建服务

```typescript
// src/domain/graph/services/graph-building-service.ts
export interface GraphBuildingServiceProps {
  nodeRegistry: INodeRegistry;
  edgeRegistry: IEdgeRegistry;
  functionRegistry: IFunctionRegistry;
}

export class GraphBuildingService extends DomainService {
  private readonly props: GraphBuildingServiceProps;

  constructor(props: GraphBuildingServiceProps) {
    super();
    this.props = Object.freeze(props);
  }

  public async buildFromConfig(config: GraphConfig): Promise<Graph> {
    // 实现从配置构建图的逻辑
    throw new Error('方法未实现');
  }

  public async buildFromTemplate(template: GraphTemplate, variables: Record<string, any>): Promise<Graph> {
    // 实现从模板构建图的逻辑
    throw new Error('方法未实现');
  }

  public validateGraphConfig(config: GraphConfig): ValidationResult {
    // 实现配置验证逻辑
    throw new Error('方法未实现');
  }
}
```

### 2. 图执行服务

```typescript
// src/domain/graph/services/graph-execution-service.ts
export interface GraphExecutionServiceProps {
  executionEngine: IGraphExecutionEngine;
  stateManager: IStateManager;
  hookSystem: IHookSystem;
}

export class GraphExecutionService extends DomainService {
  private readonly props: GraphExecutionServiceProps;

  constructor(props: GraphExecutionServiceProps) {
    super();
    this.props = Object.freeze(props);
  }

  public async executeGraph(graph: Graph, input: GraphExecutionInput): Promise<GraphExecutionResult> {
    // 实现图执行逻辑
    throw new Error('方法未实现');
  }

  public async streamGraph(graph: Graph, input: GraphExecutionInput): Promise<AsyncIterable<GraphExecutionEvent>> {
    // 实现流式图执行逻辑
    throw new Error('方法未实现');
  }

  public async resumeExecution(executionId: string): Promise<GraphExecutionResult> {
    // 实现执行恢复逻辑
    throw new Error('方法未实现');
  }
}
```

## 实现步骤

### 第一阶段：核心接口和值对象
1. 创建基础接口文件
2. 实现核心值对象
3. 定义基础事件类型

### 第二阶段：实体扩展
1. 实现条件节点
2. 实现LLM节点
3. 实现工具节点
4. 实现工作流状态实体

### 第三阶段：扩展系统
1. 实现钩子系统
2. 实现插件系统
3. 实现触发器系统

### 第四阶段：服务层
1. 实现图构建服务
2. 实现图执行服务
3. 实现状态管理服务

### 第五阶段：注册表和构建器
1. 实现各种注册表
2. 实现构建器和工厂
3. 完善验证和优化

## 注意事项

1. **保持领域纯净性**：避免在领域层引入基础设施细节
2. **使用依赖注入**：通过接口定义依赖关系
3. **遵循DDD原则**：确保聚合根、实体、值对象的职责清晰
4. **考虑性能**：避免不必要的对象创建和复制
5. **支持扩展**：设计时考虑未来的扩展需求

这个实现计划提供了详细的文件结构和接口设计，可以作为TypeScript实现的参考指南。