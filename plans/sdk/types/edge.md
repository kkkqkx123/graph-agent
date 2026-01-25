# Edge类型需求分析与设计

## 需求分析

### 核心需求
1. 定义工作流中节点之间的连接关系
2. 支持条件路由和分支
3. 提供常见条件选择模式，避免重复编写条件逻辑
4. 支持边的元数据

### 功能需求
1. 边定义源节点ID和目标节点ID
2. 边支持条件表达式（条件边）
3. 边支持权重（用于多条条件边同时满足时的排序）
4. 边支持标签和描述

### 非功能需求
1. 类型安全的边定义
2. 支持边验证
3. 易于扩展新的条件类型
4. 避免与Node类型循环依赖

## 设计说明

### 核心类型

#### EdgeType
边类型枚举。

**类型值**：
- DEFAULT: 默认边，无条件连接，总是可以通过
- CONDITIONAL: 条件边，需要条件评估，满足条件才能通过

**设计原则**：
- 边只负责连接关系，不承担执行逻辑
- 执行逻辑由节点负责（FORK/JOIN/LOOP 等）
- 条件边提供常见条件选择，简化配置

#### Edge
边定义类型。

**属性**：
- id: 边唯一标识符
- sourceNodeId: 源节点ID
- targetNodeId: 目标节点ID
- type: 边类型（DEFAULT | CONDITIONAL）
- condition: 可选的条件表达式（仅 CONDITIONAL 类型需要）
- label: 可选的边标签
- description: 可选的边描述
- weight: 边权重，用于多条条件边同时满足时的排序（数值越大优先级越高）
- metadata: 可选的元数据

#### ConditionType
条件类型枚举，提供常见条件模式。

**类型值**：
- EQUALS: 等于
- NOT_EQUALS: 不等于
- GREATER_THAN: 大于
- LESS_THAN: 小于
- GREATER_EQUAL: 大于等于
- LESS_EQUAL: 小于等于
- CONTAINS: 包含（字符串）
- NOT_CONTAINS: 不包含（字符串）
- IN: 在列表中
- NOT_IN: 不在列表中
- IS_NULL: 为空
- IS_NOT_NULL: 不为空
- IS_TRUE: 为真
- IS_FALSE: 为假
- CUSTOM: 自定义表达式

#### EdgeCondition
边条件类型。

**属性**：
- type: 条件类型（ConditionType枚举）
- variablePath: 变量路径，支持嵌套访问，如 "user.age" 或 "output.status"
- value: 比较值（某些条件类型不需要，如 IS_NULL）
- customExpression: 自定义表达式（仅 CUSTOM 类型使用）

#### EdgeMetadata
边元数据类型。

**属性**：
- tags: 标签数组
- customFields: 自定义字段对象

### 设计原则

1. **简洁性**：只包含核心属性，从 6 种边类型简化为 2 种
2. **职责清晰**：边只负责连接，节点负责执行逻辑
3. **灵活性**：支持常见条件类型和自定义表达式
4. **可扩展**：通过 metadata 支持自定义扩展
5. **验证友好**：结构清晰，易于验证
6. **避免循环依赖**：只存储 nodeId，不持有 Node 对象引用

### Edge-Node关联设计

#### 关联原则
- Edge 只存储 sourceNodeId 和 targetNodeId
- Node 只存储 outgoingEdgeIds 和 incomingEdgeIds
- 通过 Workflow 对象进行关联查询
- 避免 Edge 和 Node 之间的直接引用

#### 查询示例
```typescript
// 通过 Edge 查询源节点
function getSourceNode(edge: Edge, workflow: Workflow): Node | undefined {
  return workflow.nodes.find(n => n.id === edge.sourceNodeId);
}

// 通过 Edge 查询目标节点
function getTargetNode(edge: Edge, workflow: Workflow): Node | undefined {
  return workflow.nodes.find(n => n.id === edge.targetNodeId);
}

// 通过 Node 查询出边
function getOutgoingEdges(node: Node, workflow: Workflow): Edge[] {
  return node.outgoingEdgeIds
    .map(edgeId => workflow.edges.find(e => e.id === edgeId))
    .filter((edge): edge is Edge => edge !== undefined)
    .sort((a, b) => (b.weight || 0) - (a.weight || 0));
}
```

### 条件评估逻辑

#### EdgeConditionEvaluator
条件评估器，负责评估边条件是否满足。

**核心方法**：
```typescript
class EdgeConditionEvaluator {
  evaluate(condition: EdgeCondition, context: ExecutionContext): boolean {
    const variableValue = this.getVariableValue(condition.variablePath, context);

    switch (condition.type) {
      case ConditionType.EQUALS:
        return variableValue === condition.value;
      case ConditionType.NOT_EQUALS:
        return variableValue !== condition.value;
      case ConditionType.GREATER_THAN:
        return variableValue > condition.value;
      case ConditionType.LESS_THAN:
        return variableValue < condition.value;
      case ConditionType.GREATER_EQUAL:
        return variableValue >= condition.value;
      case ConditionType.LESS_EQUAL:
        return variableValue <= condition.value;
      case ConditionType.CONTAINS:
        return String(variableValue).includes(String(condition.value));
      case ConditionType.NOT_CONTAINS:
        return !String(variableValue).includes(String(condition.value));
      case ConditionType.IN:
        return Array.isArray(condition.value) && condition.value.includes(variableValue);
      case ConditionType.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(variableValue);
      case ConditionType.IS_NULL:
        return variableValue === null || variableValue === undefined;
      case ConditionType.IS_NOT_NULL:
        return variableValue !== null && variableValue !== undefined;
      case ConditionType.IS_TRUE:
        return variableValue === true;
      case ConditionType.IS_FALSE:
        return variableValue === false;
      case ConditionType.CUSTOM:
        return this.evaluateCustomExpression(condition.customExpression, context);
      default:
        return false;
    }
  }

  private getVariableValue(path: string, context: ExecutionContext): any {
    // 支持嵌套路径访问，如 "output.data.items[0].name"
    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  private evaluateCustomExpression(expression: string, context: ExecutionContext): boolean {
    // 使用安全的表达式评估器
    // 支持变量引用，如 {{output.score}} > 0.8
    // 返回布尔值
  }
}
```

### 路由决策逻辑

#### 基于边评估的路由
当节点类型不是 ROUTE 时，使用基于边评估的路由逻辑：

1. **评估所有条件边**：使用 EdgeConditionEvaluator 评估每条条件边
2. **过滤满足条件的边**：只保留条件评估为 true 的边
3. **按权重排序**：weight 数值越大优先级越高
4. **选择最高权重的边**：选择权重最高的边作为下一个节点
5. **默认边作为后备**：如果没有条件边满足，选择 DEFAULT 类型的边

#### 路由决策示例
```typescript
function selectNextEdge(edges: Edge[], context: ExecutionContext): Edge | null {
  const evaluator = new EdgeConditionEvaluator();

  // 评估所有条件边
  const conditionalEdges = edges.filter(e => e.type === EdgeType.CONDITIONAL);
  const satisfiedEdges = conditionalEdges.filter(e => {
    if (!e.condition) return false;
    return evaluator.evaluate(e.condition, context);
  });

  // 如果有满足条件的边，选择权重最高的
  if (satisfiedEdges.length > 0) {
    return satisfiedEdges.sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
  }

  // 否则选择默认边
  const defaultEdge = edges.find(e => e.type === EdgeType.DEFAULT);
  return defaultEdge || null;
}
```

#### ROUTE 节点的特殊处理
当节点类型为 ROUTE 时，跳过基于边评估的路由逻辑，直接使用 ROUTE 节点的配置决定下一个节点：

```typescript
function selectNextNode(node: Node, edges: Edge[], context: ExecutionContext): Node | null {
  // ROUTE 节点使用自己的路由逻辑，跳过边评估
  if (node.type === NodeType.ROUTE) {
    return selectNextNodeByRouteConfig(node, context);
  }

  // 其他节点使用基于边评估的路由逻辑
  const nextEdge = selectNextEdge(edges, context);
  if (!nextEdge) return null;

  return getTargetNode(nextEdge, workflow);
}
```

### 使用示例

#### 示例 1：默认边
无条件连接，总是可以通过。

```json
{
  "id": "edge-1",
  "sourceNodeId": "node-a",
  "targetNodeId": "node-b",
  "type": "DEFAULT"
}
```

#### 示例 2：条件边 - 简单条件
当输出状态等于 "success" 时通过。

```json
{
  "id": "edge-2",
  "sourceNodeId": "node-a",
  "targetNodeId": "node-c",
  "type": "CONDITIONAL",
  "condition": {
    "type": "equals",
    "variablePath": "output.status",
    "value": "success"
  },
  "weight": 1
}
```

#### 示例 3：条件边 - 数值比较
当分数大于 80 时通过。

```json
{
  "id": "edge-3",
  "sourceNodeId": "node-a",
  "targetNodeId": "node-d",
  "type": "CONDITIONAL",
  "condition": {
    "type": "greater_than",
    "variablePath": "output.score",
    "value": 80
  },
  "weight": 2
}
```

#### 示例 4：条件边 - 列表包含
当用户角色在允许列表中时通过。

```json
{
  "id": "edge-4",
  "sourceNodeId": "node-a",
  "targetNodeId": "node-e",
  "type": "CONDITIONAL",
  "condition": {
    "type": "in",
    "variablePath": "user.role",
    "value": ["admin", "manager", "editor"]
  },
  "weight": 3
}
```

#### 示例 5：条件边 - 自定义表达式
复杂条件，分数大于 0.8 且置信度大于 0.9。

```json
{
  "id": "edge-5",
  "sourceNodeId": "node-a",
  "targetNodeId": "node-f",
  "type": "CONDITIONAL",
  "condition": {
    "type": "custom",
    "variablePath": "output",
    "customExpression": "score > 0.8 && confidence > 0.9"
  },
  "weight": 4
}
```

### 与节点类型的协作

#### 边类型与节点类型的职责划分

| 功能 | 边类型 | 节点类型 |
|------|--------|----------|
| 简单连接 | DEFAULT | - |
| 条件路由 | CONDITIONAL | ROUTE（可选，用于复杂路由逻辑） |
| 并行执行 | - | FORK/JOIN |
| 循环执行 | - | LOOP_START/LOOP_END |
| 错误处理 | - | 执行引擎统一处理 |

**设计说明**：
- 边提供基础的条件路由能力
- ROUTE 节点用于更复杂的路由逻辑（如多条件组合、动态路由等），此时跳过边评估
- FORK/JOIN/LOOP 节点负责执行层面的控制流

### 依赖关系

- 依赖 common 类型定义 ID
- 不直接依赖 Node 类型，避免循环依赖
- 被 workflow 类型引用
- 被 execution 类型引用用于路由决策
- 被 validation 类型引用用于边验证

### 参考设计

#### n8n 的边设计
- 边只是简单的连接关系
- 条件逻辑通过 IF 节点实现
- connections 对象定义节点连接，没有边类型枚举

#### LangGraph 的边设计
- 只有两种边：普通边（add_edge）和条件边（add_conditional_edges）
- 条件边通过路由函数返回目标节点映射
- 非常简洁，易于理解和使用

**本设计借鉴了 LangGraph 的简洁理念**，同时提供了更丰富的条件类型支持。