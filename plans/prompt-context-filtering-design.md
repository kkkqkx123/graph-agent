# 提示词上下文过滤机制设计方案

## 概述

本方案基于当前项目的函数式编程架构，为节点和边设计新的状态类型属性，用于控制提示词上下文的传递和过滤机制。

## 当前架构分析

### 1. 现有提示词上下文传递机制

**当前PromptContext设计：**
```typescript
interface PromptContextProps {
  template: string;
  variables: Map<string, unknown>;
  history: PromptHistoryEntry[];
  metadata: Record<string, unknown>;
}
```

**问题分析：**
- 缺乏节点级的上下文过滤机制
- 边没有上下文传递控制
- 无法根据节点类型进行差异化处理
- 上下文传递是全局性的，缺乏精细化控制

### 2. 函数式编程架构特点

**当前函数类型：**
```typescript
enum WorkflowFunctionType {
  NODE = 'node',
  CONDITION = 'condition', 
  ROUTING = 'routing',
  TRIGGER = 'trigger',
  TRANSFORM = 'transform'
}
```

**执行器设计：**
- 框架与具体逻辑解耦
- 通过执行上下文传递数据
- 支持条件执行和结果传递

## 新设计方案

### 3.1 节点状态类型设计

**新增NodeContextType值对象：**
```typescript
enum NodeContextTypeValue {
  // 上下文处理类型
  PASS_THROUGH = 'pass_through',      // 直接传递
  FILTER_IN = 'filter_in',             // 只接收特定上下文
  FILTER_OUT = 'filter_out',           // 过滤掉特定上下文
  TRANSFORM = 'transform',              // 转换上下文
  ISOLATE = 'isolate',                  // 隔离上下文
  MERGE = 'merge',                      // 合并上下文
  
  // 特殊处理类型
  LLM_CONTEXT = 'llm_context',          // LLM专用上下文
  TOOL_CONTEXT = 'tool_context',        // 工具调用上下文
  HUMAN_CONTEXT = 'human_context',      // 人工交互上下文
  SYSTEM_CONTEXT = 'system_context'     // 系统上下文
}

class NodeContextType extends ValueObject<NodeContextTypeProps> {
  readonly value: NodeContextTypeValue;
  
  // 验证方法
  validateContextTransition(fromContext: PromptContext, toContext: PromptContext): ValidationResult;
  
  // 上下文处理策略
  applyContextFilter(context: PromptContext): PromptContext;
  
  // 获取支持的上下文类型
  getSupportedContextTypes(): ContextType[];
}
```

**增强NodeValueObject：**
```typescript
interface EnhancedNodeValueObjectProps {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly contextType: NodeContextType;        // 新增：上下文处理类型
  readonly contextFilter?: ContextFilter;      // 新增：上下文过滤器
  readonly name?: string;
  readonly description?: string;
  readonly position?: { x: number; y: number };
  readonly properties: Record<string, unknown>;
}

class EnhancedNodeValueObject extends ValueObject<EnhancedNodeValueObjectProps> {
  // 上下文处理方法
  filterIncomingContext(context: PromptContext): PromptContext;
  filterOutgoingContext(context: PromptContext): PromptContext;
  
  // 验证上下文兼容性
  validateContextCompatibility(context: PromptContext): ValidationResult;
}
```

### 3.2 边上下文过滤设计

**新增EdgeContextFilter值对象：**
```typescript
enum EdgeContextFilterType {
  PASS_ALL = 'pass_all',           // 传递所有上下文
  PASS_NONE = 'pass_none',         // 不传递上下文
  SELECTIVE = 'selective',         // 选择性传递
  CONDITIONAL = 'conditional',     // 条件传递
  TRANSFORM = 'transform'          // 转换传递
}

interface EdgeContextFilterProps {
  readonly type: EdgeContextFilterType;
  readonly includePatterns?: string[];      // 包含模式
  readonly excludePatterns?: string[];      // 排除模式
  readonly transformRules?: TransformRule[]; // 转换规则
  readonly condition?: string;               // 条件表达式
}

class EdgeContextFilter extends ValueObject<EdgeContextFilterProps> {
  // 应用过滤器
  applyFilter(context: PromptContext): PromptContext;
  
  // 验证过滤器配置
  validateFilter(): ValidationResult;
  
  // 检查是否支持特定上下文类型
  supportsContextType(contextType: string): boolean;
}
```

**增强EdgeValueObject：**
```typescript
interface EnhancedEdgeValueObjectProps {
  readonly id: EdgeId;
  readonly type: EdgeType;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly contextFilter: EdgeContextFilter;    // 新增：上下文过滤器
  readonly condition?: string;
  readonly weight?: number;
  readonly properties: Record<string, unknown>;
}

class EnhancedEdgeValueObject extends ValueObject<EnhancedEdgeValueObjectProps> {
  // 上下文过滤方法
  filterContext(context: PromptContext): PromptContext;
  
  // 验证上下文传递
  validateContextPassing(context: PromptContext): ValidationResult;
}
```

### 3.3 上下文过滤器设计

**ContextFilter值对象：**
```typescript
interface ContextFilterProps {
  readonly filterRules: ContextFilterRule[];
  readonly defaultBehavior: 'pass' | 'block';
  readonly priority: number;
}

interface ContextFilterRule {
  readonly type: 'include' | 'exclude' | 'transform';
  readonly pattern: string;           // 匹配模式
  readonly target?: string;         // 目标字段
  readonly transform?: string;        // 转换函数
  readonly condition?: string;      // 条件表达式
}

class ContextFilter extends ValueObject<ContextFilterProps> {
  // 应用过滤规则
  apply(context: PromptContext): PromptContext;
  
  // 验证过滤规则
  validateRules(): ValidationResult;
  
  // 合并过滤器
  merge(other: ContextFilter): ContextFilter;
}
```

### 3.4 函数式编程集成设计

**增强执行上下文：**
```typescript
interface EnhancedExecutionContext {
  // 基础上下文
  readonly variables: Map<string, unknown>;
  readonly promptContext: PromptContext;
  
  // 新增：上下文过滤状态
  readonly contextFilters: Map<NodeId, ContextFilter>;
  readonly edgeFilters: Map<EdgeId, EdgeContextFilter>;
  
  // 新增：上下文处理函数
  readonly contextProcessors: Map<string, ContextProcessor>;
}

// 上下文处理器函数类型
type ContextProcessor = (context: PromptContext, config: any) => PromptContext;
```

**节点执行器增强：**
```typescript
interface EnhancedNodeExecutor {
  // 执行节点逻辑
  executeNode(
    nodeId: string, 
    context: EnhancedExecutionContext,
    nodeContextType: NodeContextType
  ): Promise<any>;
  
  // 处理上下文过滤
  processContextFiltering(
    incomingContext: PromptContext,
    nodeContextType: NodeContextType,
    contextFilter: ContextFilter
  ): PromptContext;
}
```

## 具体实现策略

### 4.1 节点上下文类型配置

**不同节点类型的默认配置：**
```typescript
// LLM节点：隔离上下文，只保留相关历史
const llmNodeContextType = NodeContextType.llm_context();
const llmNodeContextFilter = ContextFilter.create({
  filterRules: [
    { type: 'include', pattern: 'llm.*' },
    { type: 'include', pattern: 'prompt.*' },
    { type: 'exclude', pattern: 'tool.*' }
  ],
  defaultBehavior: 'block'
});

// 工具节点：传递工具相关上下文
const toolNodeContextType = NodeContextType.tool_context();
const toolNodeContextFilter = ContextFilter.create({
  filterRules: [
    { type: 'include', pattern: 'tool.*' },
    { type: 'include', pattern: 'function.*' }
  ],
  defaultBehavior: 'block'
});

// 决策节点：传递所有上下文用于决策
const decisionNodeContextType = NodeContextType.pass_through();
const decisionNodeContextFilter = ContextFilter.create({
  filterRules: [],
  defaultBehavior: 'pass'
});
```

### 4.2 边上下文过滤配置

**不同边类型的默认配置：**
```typescript
// 序列边：传递所有上下文
const sequenceEdgeFilter = EdgeContextFilter.create({
  type: EdgeContextFilterType.PASS_ALL
});

// 条件边：根据条件选择性传递
const conditionalEdgeFilter = EdgeContextFilter.create({
  type: EdgeContextFilterType.CONDITIONAL,
  condition: 'context.relevant === true',
  includePatterns: ['relevant.*'],
  excludePatterns: ['irrelevant.*']
});

// 错误边：只传递错误相关上下文
const errorEdgeFilter = EdgeContextFilter.create({
  type: EdgeContextFilterType.SELECTIVE,
  includePatterns: ['error.*', 'exception.*'],
  excludePatterns: ['success.*', 'result.*']
});
```

### 4.3 函数式编程集成

**上下文处理器函数：**
```typescript
// LLM上下文处理器
const llmContextProcessor: ContextProcessor = (context, config) => {
  // 过滤掉工具调用历史
  const filteredHistory = context.history.filter(entry => 
    !entry.metadata?.toolCall
  );
  
  return PromptContext.create(
    context.template,
    context.variables,
    filteredHistory,
    context.metadata
  );
};

// 工具上下文处理器
const toolContextProcessor: ContextProcessor = (context, config) => {
  // 提取工具相关变量
  const toolVariables = new Map();
  for (const [key, value] of context.variables) {
    if (key.startsWith('tool.')) {
      toolVariables.set(key, value);
    }
  }
  
  return PromptContext.create(
    context.template,
    toolVariables,
    context.history,
    context.metadata
  );
};
```

## 执行流程设计

### 5.1 节点执行时的上下文处理

```typescript
async function executeNodeWithContextFiltering(
  nodeId: string,
  incomingContext: PromptContext,
  nodeValueObject: EnhancedNodeValueObject,
  edgeFilters: EdgeContextFilter[]
): Promise<any> {
  
  // 步骤1：应用边的上下文过滤器
  let filteredContext = incomingContext;
  for (const edgeFilter of edgeFilters) {
    filteredContext = edgeFilter.applyFilter(filteredContext);
  }
  
  // 步骤2：应用节点的入站上下文过滤
  const nodeContextType = nodeValueObject.contextType;
  const nodeContextFilter = nodeValueObject.contextFilter;
  
  if (nodeContextFilter) {
    filteredContext = nodeContextFilter.apply(filteredContext);
  }
  
  // 步骤3：验证上下文兼容性
  const validationResult = nodeValueObject.validateContextCompatibility(filteredContext);
  if (!validationResult.isValid) {
    throw new Error(`上下文不兼容: ${validationResult.message}`);
  }
  
  // 步骤4：执行节点逻辑
  const result = await executeNode(nodeId, filteredContext);
  
  // 步骤5：应用节点的出站上下文过滤
  let outgoingContext = filteredContext;
  if (nodeContextFilter) {
    outgoingContext = nodeContextFilter.apply(outgoingContext);
  }
  
  // 步骤6：更新上下文历史
  const updatedContext = outgoingContext.addHistoryEntry({
    nodeId,
    prompt: result.prompt || '',
    response: result.response || '',
    timestamp: new Date(),
    metadata: { nodeType: nodeValueObject.type.getValue() }
  });
  
  return { result, context: updatedContext };
}
```

### 5.2 边评估时的上下文过滤

```typescript
function evaluateEdgeWithContextFiltering(
  edgeValueObject: EnhancedEdgeValueObject,
  fromContext: PromptContext,
  toNodeContextType: NodeContextType
): { shouldPass: boolean; filteredContext: PromptContext } {
  
  const edgeFilter = edgeValueObject.contextFilter;
  
  // 应用边的上下文过滤器
  const filteredContext = edgeFilter.applyFilter(fromContext);
  
  // 验证目标节点的上下文兼容性
  const validationResult = toNodeContextType.validateContextTransition(
    fromContext,
    filteredContext
  );
  
  return {
    shouldPass: validationResult.isValid,
    filteredContext
  };
}
```

## 配置和扩展性

### 6.1 配置文件设计

**节点上下文配置：**
```yaml
nodes:
  - id: "llm_node_1"
    type: "llm"
    context_type: "llm_context"
    context_filter:
      rules:
        - type: "include"
          pattern: "llm.*"
        - type: "exclude" 
          pattern: "tool.*"
      default_behavior: "block"
    
  - id: "tool_node_1"
    type: "tool"
    context_type: "tool_context"
    context_filter:
      rules:
        - type: "include"
          pattern: "tool.*"
      default_behavior: "block"
```

**边上下文配置：**
```yaml
edges:
  - id: "edge_1"
    from: "node_1"
    to: "node_2"
    type: "sequence"
    context_filter:
      type: "selective"
      include_patterns: ["relevant.*"]
      exclude_patterns: ["internal.*"]
      
  - id: "edge_2"
    from: "node_2"
    to: "node_3"
    type: "conditional"
    context_filter:
      type: "conditional"
      condition: "context.priority === 'high'"
```

### 6.2 扩展机制

**自定义上下文处理器：**
```typescript
// 注册自定义上下文处理器
ContextProcessorRegistry.register('custom_llm', customLLMContextProcessor);
ContextProcessorRegistry.register('custom_tool', customToolContextProcessor);

// 在节点配置中使用
const nodeWithCustomProcessor = EnhancedNodeValueObject.create({
  id: nodeId,
  type: NodeType.llm(),
  contextType: NodeContextType.custom('custom_llm'),
  contextFilter: ContextFilter.create({
    filterRules: [],
    defaultBehavior: 'pass'
  })
});
```

## 性能优化

### 7.1 上下文缓存机制

```typescript
interface ContextCache {
  // 缓存已过滤的上下文
  getFilteredContext(key: string): PromptContext | null;
  setFilteredContext(key: string, context: PromptContext): void;
  
  // 缓存上下文处理结果
  getProcessedContext(key: string): PromptContext | null;
  setProcessedContext(key: string, context: PromptContext): void;
  
  // 清理过期缓存
  cleanup(): void;
}
```

### 7.2 异步处理

```typescript
// 异步上下文过滤
async function filterContextAsync(
  context: PromptContext,
  filters: ContextFilter[]
): Promise<PromptContext> {
  
  // 并行应用多个过滤器
  const filterPromises = filters.map(filter => 
    Promise.resolve(filter.apply(context))
  );
  
  const results = await Promise.all(filterPromises);
  
  // 合并过滤结果
  return mergeFilteredContexts(results);
}
```

## 测试策略

### 8.1 单元测试

```typescript
describe('NodeContextType', () => {
  test('should filter LLM context correctly', () => {
    const llmContextType = NodeContextType.llm_context();
    const inputContext = PromptContext.create('template', new Map([
      ['llm.model', 'gpt-4'],
      ['tool.name', 'calculator'],
      ['system.version', '1.0']
    ]));
    
    const filteredContext = llmContextType.applyContextFilter(inputContext);
    
    expect(filteredContext.variables.has('llm.model')).toBe(true);
    expect(filteredContext.variables.has('tool.name')).toBe(false);
    expect(filteredContext.variables.has('system.version')).toBe(false);
  });
});
```

### 8.2 集成测试

```typescript
describe('Context Filtering Integration', () => {
  test('should filter context through node and edge filters', async () => {
    const workflow = createTestWorkflow();
    const context = createTestContext();
    
    // 执行工作流并验证上下文过滤
    const result = await executeWorkflow(workflow, context);
    
    expect(result.context.history).toHaveLength(2);
    expect(result.context.variables.get('filtered')).toBe(true);
  });
});
```

## 结论

本设计方案通过为节点和边添加新的状态类型属性，实现了精细化的提示词上下文过滤机制：

**核心优势：**
1. **职责分离**：节点负责上下文处理，边负责上下文传递
2. **灵活配置**：支持多种过滤策略和自定义处理器
3. **性能优化**：缓存机制和异步处理提升性能
4. **易于扩展**：插件式架构支持自定义过滤器

**实现价值：**
- 解决了全局上下文传递的粗粒度问题
- 支持不同节点类型的差异化上下文处理
- 提供了可配置的上下文过滤机制
- 保持了与现有函数式编程架构的兼容性

通过实施本方案，将实现更智能、更高效的提示词上下文管理系统。