# Trigger、Edge、Context 模块实体与值对象分析报告

## 概述

本报告分析了 `TriggerValueObject`、`EdgeValueObject` 和 `Context` 模块是否应该从值对象（Value Object）改为实体（Entity）。

## 分析标准

根据领域驱动设计（DDD）原则，实体和值对象的区别如下：

### 实体（Entity）特征
- ✅ 有唯一标识（ID）
- ✅ 有生命周期（创建、修改、删除）
- ✅ 有状态变化
- ✅ 通过标识判断相等性
- ✅ 有业务行为和规则

### 值对象（Value Object）特征
- ✅ 没有唯一标识
- ✅ 不可变（Immutable）
- ✅ 通过属性值判断相等性
- ✅ 描述性，没有独立生命周期
- ✅ 可以有业务行为，但主要是数据容器

---

## 1. TriggerValueObject 分析

### 当前实现
```typescript
export interface TriggerValueObjectProps {
  readonly id: ID;                    // ✅ 有唯一标识
  readonly type: TriggerType;         // 触发器类型
  readonly name: string;              // 触发器名称
  readonly description?: string;      // 描述
  readonly config: TriggerConfig;     // 配置
  readonly action: TriggerAction;     // 触发动作
  readonly targetNodeId?: ID;         // 目标节点ID
  readonly status: TriggerStatus;     // ✅ 有状态
  readonly triggeredAt?: number;      // ✅ 有生命周期
}
```

### 实体特征分析

| 特征 | 是否满足 | 说明 |
|------|---------|------|
| 唯一标识 | ✅ | 有 `id: ID` |
| 生命周期 | ✅ | 有 `triggeredAt` 时间戳 |
| 状态变化 | ✅ | 状态可在 ENABLED/DISABLED/TRIGGERED 之间变化 |
| 业务行为 | ✅ | `canTrigger()`, `getInputSchema()`, `getOutputSchema()` 等 |
| 独立存在 | ✅ | 触发器可以独立于工作流存在和管理 |

### 与 Node 实体的对比

| 特征 | Node | TriggerValueObject |
|------|------|-------------------|
| 唯一标识 | ✅ nodeId | ✅ id |
| 状态 | ✅ status | ✅ status |
| 生命周期 | ✅ createdAt, updatedAt | ✅ triggeredAt |
| 业务行为 | ✅ execute(), validate() | ✅ canTrigger(), getInputSchema() |
| Schema | ✅ getInputSchema(), getOutputSchema() | ✅ getInputSchema(), getOutputSchema() |

### 结论

**TriggerValueObject 应该改为实体**

**理由：**
1. 有唯一标识和生命周期
2. 有状态变化（ENABLED → TRIGGERED）
3. 有丰富的业务行为
4. 与 Node 实体特征高度相似
5. 可以独立管理和追踪

**建议：**
- 创建 `Trigger` 实体类，继承 `Entity`
- 保留 `TriggerType`, `TriggerAction`, `TriggerStatus` 作为值对象
- 将 `TriggerValueObject` 重构为 `Trigger` 实体

---

## 2. EdgeValueObject 分析

### 当前实现
```typescript
export interface EdgeValueObjectProps {
  readonly id: EdgeId;                    // 有唯一标识
  readonly type: EdgeType;                // 边类型
  readonly fromNodeId: NodeId;            // 源节点
  readonly toNodeId: NodeId;              // 目标节点
  readonly condition?: string;            // 条件表达式
  readonly weight?: number;               // 权重
  readonly properties: Record<string, unknown>;  // 属性
  readonly contextFilter: EdgeContextFilter;     // 上下文过滤器
}
```

### 实体特征分析

| 特征 | 是否满足 | 说明 |
|------|---------|------|
| 唯一标识 | ⚠️ | 有 `id: EdgeId`，但主要用于区分不同的边 |
| 生命周期 | ❌ | 没有创建/更新时间戳 |
| 状态变化 | ❌ | 边本身没有状态变化 |
| 业务行为 | ⚠️ | 有 `filterContext()` 等方法，但主要是描述性 |
| 独立存在 | ❌ | 边必须依附于节点存在，不能独立存在 |

### 边的本质

边描述的是**节点之间的连接关系**，具有以下特点：
1. **描述性**：描述两个节点如何连接
2. **结构性**：是工作流图结构的一部分
3. **不可变性**：一旦创建，边的基本属性不会变化
4. **依附性**：必须依附于节点存在

### 与 Node/Trigger 的对比

| 特征 | Node | Trigger | Edge |
|------|------|---------|------|
| 唯一标识 | ✅ | ✅ | ⚠️ |
| 生命周期 | ✅ | ✅ | ❌ |
| 状态变化 | ✅ | ✅ | ❌ |
| 独立存在 | ✅ | ✅ | ❌ |
| 本质 | 执行单元 | 触发单元 | 连接关系 |

### 结论

**EdgeValueObject 应该保持为值对象**

**理由：**
1. 边描述的是连接关系，不是独立的业务实体
2. 没有生命周期和状态变化
3. 必须依附于节点存在
4. 边的 ID 主要用于区分不同的连接，不是业务标识
5. 符合值对象的不可变性原则

**建议：**
- 保持 `EdgeValueObject` 作为值对象
- 可以考虑重命名为 `EdgeConnection` 或 `Edge`（去掉 ValueObject 后缀）
- 保留 `EdgeId`, `EdgeType` 作为值对象

---

## 3. Context 模块分析

Context 模块包含三个值对象：

### 3.1 EdgeContextFilter

```typescript
export interface EdgeContextFilterProps {
  readonly type: EdgeContextFilterType;      // 过滤器类型
  readonly includePatterns?: string[];       // 包含模式
  readonly excludePatterns?: string[];       // 排除模式
  readonly transformRules?: TransformRule[]; // 转换规则
  readonly condition?: string;               // 条件表达式
}
```

**特征：**
- ❌ 没有唯一标识
- ❌ 没有生命周期
- ❌ 没有状态变化
- ✅ 不可变（所有修改返回新实例）
- ✅ 描述性（描述如何过滤上下文）

**结论：** 保持为值对象

### 3.2 PromptContext

```typescript
export interface PromptContextProps {
  template: string;                          // 提示词模板
  variables: Map<string, unknown>;           // 变量
  history: PromptHistoryEntry[];             // 历史记录
  metadata: Record<string, unknown>;         // 元数据
}
```

**特征：**
- ❌ 没有唯一标识
- ❌ 没有生命周期
- ❌ 没有状态变化（所有修改返回新实例）
- ✅ 不可变
- ✅ 数据容器（存储提示词上下文数据）

**结论：** 保持为值对象

### 3.3 ContextFilter

```typescript
export interface ContextFilterProps {
  readonly filterRules: ContextFilterRule[];  // 过滤规则
  readonly defaultBehavior: 'pass' | 'block'; // 默认行为
  readonly priority: number;                  // 优先级
}
```

**特征：**
- ❌ 没有唯一标识
- ❌ 没有生命周期
- ❌ 没有状态变化
- ✅ 不可变
- ✅ 描述性（描述过滤规则）

**结论：** 保持为值对象

### Context 模块总结

| 模块 | 唯一标识 | 生命周期 | 状态变化 | 不可变 | 结论 |
|------|---------|---------|---------|--------|------|
| EdgeContextFilter | ❌ | ❌ | ❌ | ✅ | 值对象 |
| PromptContext | ❌ | ❌ | ❌ | ✅ | 值对象 |
| ContextFilter | ❌ | ❌ | ❌ | ✅ | 值对象 |

### 结论

**Context 模块的所有组件都应该保持为值对象**

**理由：**
1. 都没有唯一标识
2. 都没有生命周期
3. 都没有状态变化
4. 都是不可变的
5. 都是数据容器或描述性对象
6. 符合值对象的所有特征

---

## 4. 综合建议

### 需要改为实体的模块

| 模块 | 当前名称 | 建议名称 | 优先级 |
|------|---------|---------|--------|
| 触发器 | TriggerValueObject | Trigger | 高 |

### 保持为值对象的模块

| 模块 | 当前名称 | 建议名称 | 说明 |
|------|---------|---------|------|
| 边 | EdgeValueObject | Edge | 描述连接关系 |
| 边ID | EdgeId | EdgeId | 值对象 |
| 边类型 | EdgeType | EdgeType | 值对象 |
| 边上下文过滤器 | EdgeContextFilter | EdgeContextFilter | 值对象 |
| 提示词上下文 | PromptContext | PromptContext | 值对象 |
| 上下文过滤器 | ContextFilter | ContextFilter | 值对象 |

### 架构一致性

重构后的架构：

```
Domain Layer (src/domain/workflow/)
├── entities/
│   ├── workflow.ts          # Workflow 聚合根
│   ├── node.ts              # Node 实体
│   ├── hook.ts              # Hook 实体
│   └── trigger.ts           # Trigger 实体（新增）
├── value-objects/
│   ├── edge/
│   │   ├── edge-id.ts       # EdgeId 值对象
│   │   ├── edge-type.ts     # EdgeType 值对象
│   │   └── edge.ts          # Edge 值对象（重命名）
│   ├── context/
│   │   ├── edge-context-filter.ts
│   │   ├── prompt-context.ts
│   │   └── context-filter.ts
│   └── trigger/
│       ├── trigger-type.ts  # TriggerType 值对象
│       ├── trigger-action.ts # TriggerAction 值对象
│       └── trigger-status.ts # TriggerStatus 值对象
```

---

## 5. 实施建议

### 阶段 1：创建 Trigger 实体（高优先级）

1. 创建 `src/domain/workflow/entities/trigger.ts`
2. 定义 `Trigger` 实体类，继承 `Entity`
3. 保留 `TriggerType`, `TriggerAction`, `TriggerStatus` 作为值对象
4. 更新所有引用 `TriggerValueObject` 的代码

### 阶段 2：重命名 EdgeValueObject（中优先级）

1. 将 `EdgeValueObject` 重命名为 `Edge`
2. 更新所有引用
3. 保持值对象特性不变

### 阶段 3：验证和测试（高优先级）

1. 更新所有测试用例
2. 验证类型检查通过
3. 确保功能正常

---

## 6. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 大量代码需要更新 | 高 | 分阶段实施，保持向后兼容 |
| 测试用例需要更新 | 中 | 优先更新测试，确保覆盖率 |
| 可能引入 bug | 中 | 充分的类型检查和测试 |
| 架构理解成本 | 低 | 提供清晰的文档和示例 |

---

## 7. 总结

### 核心结论

1. **TriggerValueObject 应该改为实体**：因为它有唯一标识、生命周期和状态变化，与 Node 实体特征高度相似。

2. **EdgeValueObject 应该保持为值对象**：因为它描述的是连接关系，没有独立生命周期和状态变化。

3. **Context 模块应该保持为值对象**：因为它们都是数据容器或描述性对象，没有唯一标识和生命周期。

### 设计原则

遵循以下原则进行架构设计：

1. **实体**：有唯一标识、生命周期、状态变化的业务对象
2. **值对象**：不可变、描述性、没有独立标识的数据容器
3. **聚合根**：管理一组相关实体和值对象的根实体

### 一致性保证

通过这次重构，我们将实现：
- ✅ Node、Hook、Trigger 都是实体，有统一的生命周期管理
- ✅ Edge、Context 都是值对象，保持不可变性
- ✅ 清晰的职责划分和架构一致性
- ✅ 符合 DDD 最佳实践

---

**文档版本：** 1.0  
**创建日期：** 2025-01-15  
**作者：** AI Architect