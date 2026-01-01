# 节点复杂度分析和优化设计


## 问题2：节点逻辑复杂度分析

### 当前节点复杂度评估

#### 1. LLMNode - 高复杂度

**当前实现**：[`LLMNode`](src/infrastructure/workflow/nodes/llm-node.ts:17)

**复杂度来源**：
- 服务依赖过多（`WrapperService`、`PromptBuilder`）
- 上下文处理器注册逻辑
- 提示词构建逻辑
- LLM请求构建逻辑
- 响应处理和上下文更新逻辑

**代码行数**：277行

**问题**：
- 职责过多，违反单一职责原则
- 难以测试（需要mock多个服务）
- 难以扩展（修改一个功能可能影响其他功能）

#### 2. ToolCallNode - 中等复杂度

**当前实现**：[`ToolCallNode`](src/infrastructure/workflow/nodes/tool-call-node.ts:9)

**复杂度来源**：
- 工具调用逻辑
- 错误处理和重试
- 上下文更新

**代码行数**：200行

**问题**：
- 相对简单，但仍有改进空间

#### 3. ConditionNode - 中等复杂度

**当前实现**：[`ConditionNode`](src/infrastructure/workflow/nodes/condition-node.ts:9)

**复杂度来源**：
- 条件表达式评估
- 变量替换逻辑

**代码行数**：183行

**问题**：
- 表达式评估逻辑可以抽象

### 抽象优化方案

#### 方案1：引入执行策略模式

为复杂节点引入执行策略，将执行逻辑抽象为独立的策略类。

**LLMNode优化示例**：

```typescript
// 执行策略接口
interface NodeExecutionStrategy {
  execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult>;
}

// LLM执行策略
class LLMExecutionStrategy implements NodeExecutionStrategy {
  constructor(
    private wrapperService: WrapperService,
    private promptBuilder: PromptBuilder,
    private config: LLMNodeConfig
  ) {}

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    // 专注于LLM调用逻辑
  }
}

// 简化后的LLMNode
class LLMNode extends Node {
  private strategy: NodeExecutionStrategy;

  constructor(
    id: NodeId,
    config: LLMNodeConfig,
    strategyFactory: StrategyFactory
  ) {
    super(id, NodeType.llm());
    this.strategy = strategyFactory.createLLMStrategy(config);
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    return this.strategy.execute(context);
  }
}
```

**优势**：
- 职责分离：节点负责配置，策略负责执行
- 易于测试：可以独立测试策略
- 易于扩展：可以添加新的执行策略

#### 方案2：引入执行器模式

将节点的执行逻辑委托给专门的执行器。

```typescript
// 节点执行器接口
interface NodeExecutor<T extends Node> {
  execute(node: T, context: WorkflowExecutionContext): Promise<NodeExecutionResult>;
}

// LLM节点执行器
class LLMNodeExecutor implements NodeExecutor<LLMNode> {
  constructor(
    private wrapperService: WrapperService,
    private promptBuilder: PromptBuilder
  ) {}

  async execute(node: LLMNode, context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    // 执行逻辑
  }
}

// 简化后的LLMNode
class LLMNode extends Node {
  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const executor = context.getService<LLMNodeExecutor>('LLMNodeExecutor');
    return executor.execute(this, context);
  }
}
```

**优势**：
- 节点类保持简洁
- 执行逻辑可复用
- 支持不同的执行策略

#### 方案3：引入构建器模式

将复杂的构建逻辑抽象为构建器。

```typescript
// LLM请求构建器
class LLMRequestBuilder {
  private config: Partial<LLMRequestConfig> = {};

  withWrapper(wrapperName: string): this {
    this.config.wrapperName = wrapperName;
    return this;
  }

  withPrompt(prompt: PromptSource): this {
    this.config.prompt = prompt;
    return this;
  }

  withTemperature(temperature: number): this {
    this.config.temperature = temperature;
    return this;
  }

  build(context: WorkflowExecutionContext): LLMRequest {
    // 构建逻辑
  }
}

// 简化后的LLMNode
class LLMNode extends Node {
  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const builder = new LLMRequestBuilder()
      .withWrapper(this.wrapperName)
      .withPrompt(this.prompt)
      .withTemperature(this.temperature);

    const request = builder.build(context);
    const response = await this.wrapperService.generateResponse(this.wrapperName, request);

    return this.processResponse(response);
  }
}
```

**优势**：
- 构建逻辑清晰
- 易于扩展新的配置选项
- 支持链式调用

### 推荐方案

**综合采用方案1和方案2**：

1. **引入执行器模式**：为每种节点类型创建专门的执行器
2. **引入策略模式**：在执行器内部使用策略模式处理不同的执行场景

**架构设计**：

```
Node (领域层)
  ↓
NodeExecutor (基础设施层)
  ↓
ExecutionStrategy (基础设施层)
  ↓
具体实现 (WrapperService, PromptBuilder等)
```

### 实施步骤

1. **创建执行器接口**：定义统一的节点执行器接口
2. **实现具体执行器**：为每种节点类型创建执行器
3. **重构节点类**：将执行逻辑委托给执行器
4. **引入策略模式**：为复杂执行器添加策略支持
5. **更新依赖注入**：注册执行器和策略
6. **编写测试**：确保重构后功能正常

### 预期收益

1. **代码复杂度降低**：节点类代码行数减少50%以上
2. **可测试性提升**：可以独立测试执行器和策略
3. **可扩展性增强**：添加新功能不需要修改节点类
4. **可维护性改善**：职责清晰，易于理解和修改

---

## 总结

### 命名优化

- 将 `NodeTypeValue.HUMAN_RELAY` 重命名为 `USER_INTERACTION`
- 将 `HumanRelayClient` 重命名为 `HumanRelayLLMClient`
- 提供向后兼容的别名

### 复杂度优化

- 引入执行器模式，将执行逻辑从节点类中分离
- 引入策略模式，处理不同的执行场景
- 引入构建器模式，简化复杂的构建逻辑

### 实施优先级

1. **高优先级**：命名优化（影响范围小，收益明显）
2. **中优先级**：LLMNode重构（复杂度最高，收益最大）
3. **低优先级**：其他节点重构（相对简单，可以逐步进行）