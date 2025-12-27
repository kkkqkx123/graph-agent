# 工作流评估功能分析

## 概述

本文档分析了当前工作流实现中评估功能的作用及其与工作流的集成方式。评估功能是工作流执行的核心组件之一，负责条件判断和状态过滤，为路由决策提供基础支持。

## 评估功能的作用

### 1. 核心职责

评估功能（由 [`EdgeEvaluator`](../../src/infrastructure/workflow/evaluation/edge-evaluator.ts:28) 实现）主要负责：

- **边条件评估**：评估边是否满足执行条件
- **表达式评估**：使用表达式评估边条件
- **路由函数评估**：调用路由函数进行条件评估
- **批量评估**：批量评估多条边的条件
- **状态过滤**：根据评估结果过滤满足条件的边

### 2. 评估方式

评估功能支持两种主要的评估方式：

#### 2.1 表达式评估

通过表达式语言评估边条件，支持访问执行上下文中的各种状态信息：

```typescript
// 表达式评估上下文包含：
- 执行状态：executionId, workflowId, status, startTime, endTime, duration
- 工作流状态：workflowStatus, progress, completedNodes, totalNodes
- 当前节点状态：currentNodeId, currentNodeStatus, currentNodeResult, currentNodeError
- 边属性：edgeId, edgeType, edgeWeight
- 变量：variables
- 节点状态：nodeStates
```

#### 2.2 路由函数评估

通过注册的路由函数进行条件评估，支持更复杂的业务逻辑：

```typescript
// 路由函数可以访问：
- edge: 边数据
- executionState: 执行状态
- currentNodeState: 当前节点状态
- nodeStates: 所有节点状态
- variables: 变量
```

### 3. 评估结果

评估结果通过 [`EdgeEvaluationResult`](../../src/infrastructure/workflow/evaluation/edge-evaluator.ts:12) 接口返回：

```typescript
interface EdgeEvaluationResult {
  edgeId: EdgeId;           // 边ID
  satisfied: boolean;       // 是否满足条件
  error?: string;           // 评估错误
  metadata?: Record<string, unknown>;  // 评估元数据
}
```

## 评估功能与工作流的集成

### 1. 集成架构

评估功能通过以下组件与工作流集成：

```
┌─────────────────────────────────────────────────────────────┐
│                    StateTransitionManager                     │
│  (状态转换管理器 - 协调整个状态转换流程)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 使用
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        NodeRouter                            │
│  (节点路由器 - 根据评估结果进行路由决策)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 使用
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      EdgeEvaluator                           │
│  (边评估器 - 评估边条件)                                      │
└─────────────────────────────────────────────────────────────┘
```

### 2. 集成流程

#### 2.1 节点执行后的状态转换流程

1. **节点执行完成**：节点执行器完成节点执行
2. **状态转换**：[`StateTransitionManager`](../../src/infrastructure/workflow/state/state-transition-manager.ts:50) 接收执行结果
3. **路由决策**：调用 [`NodeRouter.route()`](../../src/infrastructure/workflow/routing/node-router.ts:51) 进行路由决策
4. **边评估**：[`NodeRouter`](../../src/infrastructure/workflow/routing/node-router.ts:32) 使用 [`EdgeEvaluator.evaluateBatch()`](../../src/infrastructure/workflow/evaluation/edge-evaluator.ts:174) 评估所有出边
5. **结果过滤**：根据评估结果过滤满足条件的边
6. **路由决策生成**：生成 [`RouteDecision`](../../src/domain/workflow/entities/route-decision.ts:9)
7. **状态更新**：根据路由决策更新执行状态

#### 2.2 代码流程示例

```typescript
// StateTransitionManager.transition()
// 1. 更新节点状态
await this.updateNodeState(nodeId, result, executionState);

// 2. 创建节点执行结果
const nodeResult: NodeExecutionResult = { ... };

// 3. 使用路由器进行路由决策
const routeDecision = await this.nodeRouter.route(
  nodeId,
  nodeResult,
  executionState,
  workflow
);

// NodeRouter.routeRegularNode()
// 4. 获取出边
const outgoingEdges = workflow.getOutgoingEdges(currentNode.id);

// 5. 评估所有出边
const evaluationResults = await this.edgeEvaluator.evaluateBatch(
  outgoingEdges,
  executionState
);

// 6. 分离满足和未满足条件的边
const satisfiedEdges = [];
const unsatisfiedEdges = [];
for (const edge of outgoingEdges) {
  if (result.satisfied) {
    satisfiedEdges.push(edge);
  } else {
    unsatisfiedEdges.push(edge);
  }
}

// 7. 生成路由决策
return {
  nextNodeIds: satisfiedEdges.map(edge => edge.toNodeId),
  satisfiedEdges,
  unsatisfiedEdges,
  stateUpdates: {},
  metadata: { ... }
};
```

### 3. 评估上下文构建

评估功能通过 [`buildExecutionContext()`](../../src/infrastructure/workflow/evaluation/edge-evaluator.ts:208) 方法构建执行上下文：

```typescript
private buildExecutionContext(
  edge: EdgeValueObject,
  executionState: ExecutionState
): FunctionExecutionContext {
  const currentNodeId = edge.fromNodeId;
  const currentNodeState = executionState.getNodeState(currentNodeId);

  return {
    workflowId: executionState.workflowId.toString(),
    executionId: executionState.executionId.toString(),
    variables: new Map([
      ['executionState', executionState],
      ['currentNodeId', currentNodeId],
      ['currentNodeState', currentNodeState],
      ['edge', edge],
      ['nodeStates', executionState.nodeStates],
      ['variables', executionState.variables]
    ]),
    getVariable: (key: string) => executionState.variables.get(key),
    setVariable: (key: string, value: any) => executionState.variables.set(key, value),
    getNodeResult: (nodeId: string) => { ... },
    setNodeResult: (nodeId: string, result: any) => { ... }
  };
}
```

### 4. 与路由决策的关系

评估结果是路由决策的基础：

```typescript
// RouteDecision 接口
interface RouteDecision {
  nextNodeIds: NodeId[];           // 来自满足条件的边的 toNodeId
  satisfiedEdges: EdgeValueObject[];  // 评估结果为 true 的边
  unsatisfiedEdges: EdgeValueObject[]; // 评估结果为 false 的边
  stateUpdates: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

## 评估功能的关键特性

### 1. 灵活性

- 支持表达式和函数两种评估方式
- 可以访问完整的执行上下文
- 支持自定义路由函数

### 2. 可扩展性

- 通过 [`FunctionRegistry`](../../src/infrastructure/workflow/functions/registry/function-registry.ts) 注册自定义路由函数
- 支持复杂的业务逻辑评估

### 3. 容错性

- 评估失败时返回 `satisfied: false`
- 提供详细的错误信息
- 无条件的边默认满足

### 4. 批量处理

- 支持批量评估多条边
- 提供过滤满足条件边的便捷方法

## 评估功能的应用场景

### 1. 条件分支

根据节点执行结果选择不同的执行路径：

```typescript
// 边条件示例
edge1.condition = "currentNodeResult.status === 'success'"
edge2.condition = "currentNodeResult.status === 'failure'"
```

### 2. 状态过滤

根据工作流状态过滤可执行的边：

```typescript
// 边条件示例
edge.condition = "workflowStatus === 'running' && progress < 100"
```

### 3. 变量检查

根据变量值决定是否执行：

```typescript
// 边条件示例
edge.condition = "variables.retryCount < 3"
```

### 4. 复杂业务逻辑

通过路由函数实现复杂的业务逻辑：

```typescript
// 路由函数示例
function customRouting(context, params) {
  const { currentNodeState, variables } = params;
  // 复杂的业务逻辑
  return currentNodeState.result.score > 80;
}
```

## 总结

评估功能是工作流执行的核心组件，通过条件判断和状态过滤为路由决策提供基础支持。它与工作流紧密集成，通过 [`StateTransitionManager`](../../src/infrastructure/workflow/state/state-transition-manager.ts:50) → [`NodeRouter`](../../src/infrastructure/workflow/routing/node-router.ts:32) → [`EdgeEvaluator`](../../src/infrastructure/workflow/evaluation/edge-evaluator.ts:28) 的调用链实现评估功能的应用。

评估功能的设计体现了以下原则：

1. **单一职责**：专注于条件评估和状态过滤
2. **依赖倒置**：通过接口与路由器解耦
3. **开闭原则**：支持扩展新的评估方式
4. **接口隔离**：提供清晰的评估结果接口

通过将评估功能独立到 `evaluation` 目录，实现了更好的模块化和可维护性。