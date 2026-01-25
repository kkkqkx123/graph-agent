# Edge类型需求分析与设计

## 需求分析

### 核心需求
1. 定义工作流中节点之间的连接关系
2. 支持条件路由和分支
3. 定义边的类型和属性
4. 支持边的元数据

### 功能需求
1. 边定义源节点ID和目标节点ID
2. 边支持条件表达式
3. 边支持权重和优先级（用于排序）
4. 边支持标签和描述

### 非功能需求
1. 类型安全的边定义
2. 支持边验证
3. 易于扩展新的边类型
4. 避免与Node类型循环依赖

## 设计说明

### 核心类型

#### EdgeType
边类型枚举。

**类型值**：
- DEFAULT: 默认边
- CONDITIONAL: 条件边
- PARALLEL: 并行边
- MERGE: 合并边
- LOOP: 循环边
- ERROR: 错误处理边

#### Edge
边定义类型。

**属性**：
- id: 边唯一标识符
- sourceNodeId: 源节点ID
- targetNodeId: 目标节点ID
- type: 边类型
- condition: 可选的条件表达式
- label: 可选的边标签
- description: 可选的边描述
- weight: 边权重，用于路由决策和排序
- priority: 边优先级，用于路由决策和排序
- metadata: 可选的元数据

#### EdgeCondition
边条件类型。

**属性**：
- expression: 条件表达式
- operator: 条件操作符
- value: 比较值
- logicalOperator: 逻辑操作符（AND/OR）

#### EdgeMetadata
边元数据类型。

**属性**：
- tags: 标签数组
- customFields: 自定义字段对象

### 设计原则

1. **简洁性**：只包含核心属性
2. **灵活性**：支持多种路由策略
3. **可扩展**：通过metadata支持自定义扩展
4. **验证友好**：结构清晰，易于验证
5. **避免循环依赖**：只存储nodeId，不持有Node对象引用

### Edge-Node关联设计

#### 关联原则
- Edge只存储sourceNodeId和targetNodeId
- Node只存储outgoingEdgeIds和incomingEdgeIds
- 通过Workflow对象进行关联查询
- 避免Edge和Node之间的直接引用

#### 查询示例
```typescript
// 通过Edge查询源节点
function getSourceNode(edge: Edge, workflow: Workflow): Node | undefined {
  return workflow.nodes.find(n => n.id === edge.sourceNodeId);
}

// 通过Edge查询目标节点
function getTargetNode(edge: Edge, workflow: Workflow): Node | undefined {
  return workflow.nodes.find(n => n.id === edge.targetNodeId);
}
```

### 依赖关系

- 依赖common类型定义ID
- 不直接依赖Node类型，避免循环依赖
- 被workflow类型引用
- 被execution类型引用用于路由决策