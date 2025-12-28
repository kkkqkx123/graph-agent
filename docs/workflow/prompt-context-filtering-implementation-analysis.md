# 提示词上下文过滤机制实现分析

## 概述

本文档基于 `plans/prompt-context-filtering-design.md` 设计方案，分析当前代码库实现并提出具体的修改方案。

## 设计决策

根据项目架构和实际需求，确定以下设计决策：

1. **上下文类型集成**：将上下文类型作为 [`NodeType`](src/domain/workflow/value-objects/node/node-type.ts:34) 的一部分，而非独立值对象
2. **目录结构**：不创建单独的子目录，所有上下文过滤相关的值对象直接放在 `src/domain/workflow/value-objects/` 下
3. **执行策略修改**：只修改基础 [`ExecutionStrategy`](src/infrastructure/workflow/strategies/execution-strategy.ts:14)，其他策略通过继承获得新功能
4. **向后兼容性**：不考虑向后兼容，新属性为必需属性

## 当前架构分析

### 现有组件

#### 1. PromptContext
**位置**: [`src/domain/workflow/value-objects/prompt-context.ts`](src/domain/workflow/value-objects/prompt-context.ts:38)

**当前结构**:
```typescript
interface PromptContextProps {
  template: string;
  variables: Map<string, unknown>;
  history: PromptHistoryEntry[];
  metadata: Record<string, unknown>;
}
```

**需要增强**:
- 添加 `addHistoryEntry()` 方法用于更新历史记录
- 添加上下文过滤辅助方法

#### 2. NodeValueObject
**位置**: [`src/domain/workflow/value-objects/node/node-value-object.ts`](src/domain/workflow/value-objects/node/node-value-object.ts:21)

**当前结构**:
```typescript
interface NodeValueObjectProps {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name?: string;
  readonly description?: string;
  readonly position?: { x: number; y: number };
  readonly properties: Record<string, unknown>;
}
```

**需要增强**:
- 添加 `contextFilter?: ContextFilter` 属性
- 添加上下文过滤方法

#### 3. EdgeValueObject
**位置**: [`src/domain/workflow/value-objects/edge/edge-value-object.ts`](src/domain/workflow/value-objects/edge/edge-value-object.ts:23)

**当前结构**:
```typescript
interface EdgeValueObjectProps {
  readonly id: EdgeId;
  readonly type: EdgeType;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly condition?: string;
  readonly weight?: number;
  readonly properties: Record<string, unknown>;
}
```

**需要增强**:
- 添加 `contextFilter: EdgeContextFilter` 属性（必需）
- 添加上下文过滤方法

#### 4. NodeType
**位置**: [`src/domain/workflow/value-objects/node/node-type.ts`](src/domain/workflow/value-objects/node/node-type.ts:34)

**当前结构**:
```typescript
interface NodeTypeProps {
  readonly value: NodeTypeValue;
}
```

**需要增强**:
- 添加 `contextType: NodeContextTypeValue` 属性
- 集成上下文类型枚举

## 需要创建的新组件

### 1. NodeContextTypeValue 枚举
**位置**: `src/domain/workflow/value-objects/node/node-type.ts`

**定义**:
```typescript
enum NodeContextTypeValue {
  // 上下文处理类型
  PASS_THROUGH = 'pass_through',
  FILTER_IN = 'filter_in',
  FILTER_OUT = 'filter_out',
  TRANSFORM = 'transform',
  ISOLATE = 'isolate',
  MERGE = 'merge',
  
  // 特殊处理类型
  LLM_CONTEXT = 'llm_context',
  TOOL_CONTEXT = 'tool_context',
  HUMAN_CONTEXT = 'human_context',
  SYSTEM_CONTEXT = 'system_context'
}
```

### 2. ContextFilter 值对象
**位置**: `src/domain/workflow/value-objects/context-filter.ts`

**结构**:
```typescript
interface ContextFilterProps {
  readonly filterRules: ContextFilterRule[];
  readonly defaultBehavior: 'pass' | 'block';
  readonly priority: number;
}

interface ContextFilterRule {
  readonly type: 'include' | 'exclude' | 'transform';
  readonly pattern: string;
  readonly target?: string;
  readonly transform?: string;
  readonly condition?: string;
}
```

**方法**:
- `apply(context: PromptContext): PromptContext`
- `validateRules(): ValidationResult`
- `merge(other: ContextFilter): ContextFilter`

### 3. EdgeContextFilter 值对象
**位置**: `src/domain/workflow/value-objects/edge-context-filter.ts`

**结构**:
```typescript
enum EdgeContextFilterType {
  PASS_ALL = 'pass_all',
  PASS_NONE = 'pass_none',
  SELECTIVE = 'selective',
  CONDITIONAL = 'conditional',
  TRANSFORM = 'transform'
}

interface EdgeContextFilterProps {
  readonly type: EdgeContextFilterType;
  readonly includePatterns?: string[];
  readonly excludePatterns?: string[];
  readonly transformRules?: TransformRule[];
  readonly condition?: string;
}
```

**方法**:
- `applyFilter(context: PromptContext): PromptContext`
- `validateFilter(): ValidationResult`
- `supportsContextType(contextType: string): boolean`

### 4. ContextProcessor 类型
**位置**: `src/domain/workflow/types/context-processor.ts`

**定义**:
```typescript
type ContextProcessor = (context: PromptContext, config: any) => PromptContext;
```

### 5. ContextProcessorRegistry
**位置**: `src/domain/workflow/services/context-processor-registry.ts`

**功能**:
- 注册自定义上下文处理器
- 获取上下文处理器
- 验证处理器有效性

## 执行引擎修改

### 基础 ExecutionStrategy
**位置**: [`src/infrastructure/workflow/strategies/execution-strategy.ts`](src/infrastructure/workflow/strategies/execution-strategy.ts:14)

**需要修改的方法**:

#### 1. executeNode 方法增强
```typescript
protected async executeNode(
  nodeId: string, 
  context: ExecutionContext, 
  workflowExecutor: WorkflowExecutor
): Promise<any> {
  // 1. 获取节点信息
  const node = workflowExecutor.getWorkflow().getNode(nodeId);
  
  // 2. 应用边的上下文过滤器
  const incomingEdges = workflowExecutor.getWorkflow().getIncomingEdges(nodeId);
  let filteredContext = this.applyEdgeFilters(context, incomingEdges);
  
  // 3. 应用节点的上下文过滤器
  if (node.contextFilter) {
    filteredContext = node.contextFilter.apply(filteredContext.promptContext);
  }
  
  // 4. 验证上下文兼容性
  this.validateContextCompatibility(node, filteredContext.promptContext);
  
  // 5. 执行节点逻辑
  const result = await workflowExecutor.executeNode(nodeId, filteredContext);
  
  // 6. 应用节点的出站上下文过滤
  let outgoingContext = filteredContext.promptContext;
  if (node.contextFilter) {
    outgoingContext = node.contextFilter.apply(outgoingContext);
  }
  
  // 7. 更新上下文历史
  const updatedContext = outgoingContext.addHistoryEntry({
    nodeId,
    prompt: result.prompt || '',
    response: result.response || '',
    timestamp: new Date(),
    metadata: { nodeType: node.type.getValue() }
  });
  
  return { result, context: updatedContext };
}
```

#### 2. evaluateEdge 方法增强
```typescript
async evaluateEdge(
  edgeId: string, 
  context: ExecutionContext
): Promise<boolean> {
  const edge = this.workflow.getEdge(edgeId);
  const edgeFilter = edge.contextFilter;
  
  // 应用边的上下文过滤器
  const filteredContext = edgeFilter.applyFilter(context.promptContext);
  
  // 验证目标节点的上下文兼容性
  const toNode = this.workflow.getNode(edge.toNodeId);
  const validationResult = this.validateContextTransition(
    context.promptContext,
    filteredContext,
    toNode.type.contextType
  );
  
  return validationResult.isValid;
}
```

## 实施步骤

### 阶段1：创建核心值对象
1. 创建 `ContextFilter` 值对象
2. 创建 `EdgeContextFilter` 值对象
3. 增强 `NodeType` 添加 `contextType` 属性
4. 创建 `ContextProcessor` 类型定义
5. 创建 `ContextProcessorRegistry` 服务

### 阶段2：增强现有值对象
1. 增强 `NodeValueObject` 添加 `contextFilter` 属性
2. 增强 `EdgeValueObject` 添加 `contextFilter` 属性
3. 增强 `PromptContext` 添加 `addHistoryEntry` 方法

### 阶段3：集成到执行引擎
1. 修改基础 `ExecutionStrategy` 的 `executeNode` 方法
2. 修改基础 `ExecutionStrategy` 的 `evaluateEdge` 方法
3. 更新 `ExecutionContext` 接口

### 阶段4：测试
1. 编写 `ContextFilter` 单元测试
2. 编写 `EdgeContextFilter` 单元测试
3. 编写上下文过滤集成测试

## 配置示例

### 节点配置
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
      priority: 1
```

### 边配置
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
```

## 预期效果

1. **精细化控制**：每个节点和边都可以独立配置上下文过滤规则
2. **类型安全**：通过值对象确保类型安全
3. **可扩展性**：支持自定义上下文处理器
4. **性能优化**：通过缓存和异步处理提升性能

## 注意事项

1. 所有新属性为必需属性，不考虑向后兼容
2. 上下文过滤在节点执行前和执行后都会应用
3. 边的上下文过滤在边评估时应用
4. 上下文历史记录在节点执行后自动更新