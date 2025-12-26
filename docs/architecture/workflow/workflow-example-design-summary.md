# workflow-example 设计思想总结

## 概述

`workflow-example` 是一个基于图工作流和函数式编程的示例实现，展示了如何构建灵活、可扩展的工作流框架。该设计强调**实体与行为分离**、**函数式编程风格**和**可组合性**。

## 核心设计原则

### 1. 实体与行为分离

设计将工作流的核心组件分为两类：

- **实体层（Entities）**：负责数据结构和状态管理
  - [`Node`](../../src/workflow-example/entities/node.ts:18)：节点实体，包含节点的基本属性和状态
  - [`Edge`](../../src/workflow-example/entities/edge.ts:23)：边实体，定义节点间的连接关系
  - [`Trigger`](../../src/workflow-example/entities/trigger.ts:24)：触发器实体，定义工作流触发条件

- **函数层（Functions）**：负责业务逻辑和行为实现
  - [`NodeFunction`](../../src/workflow-example/functions/nodes/node-functions.ts:28)：节点执行函数
  - [`EdgeFunction`](../../src/workflow-example/functions/edges/edge-functions.ts:28)：边评估函数
  - [`TriggerFunction`](../../src/workflow-example/functions/triggers/trigger-functions.ts:57)：触发器评估函数

**优势**：
- 实体保持纯粹的数据容器，易于序列化和持久化
- 行为逻辑独立，便于测试和替换
- 符合单一职责原则

### 2. 函数式编程风格

所有行为逻辑都采用纯函数或副作用可控的函数实现：

```typescript
// 节点函数类型定义
export type NodeFunction = (
  input: NodeInput,
  config: NodeConfig,
  context: ExecutionContext
) => Promise<NodeOutput>;
```

**特点**：
- 输入输出明确，易于理解
- 无状态或状态隔离在上下文中
- 便于组合和复用

### 3. 注册表模式

使用注册表管理函数映射，实现动态扩展：

```typescript
// 节点函数注册表
export const nodeFunctionRegistry: Record<string, NodeFunction> = {
  llm: llmNodeFunction,
  tool: toolNodeFunction,
  condition: conditionNodeFunction,
  // ...
};

// 注册新节点类型
export function registerNodeFunction(nodeType: string, func: NodeFunction): void {
  nodeFunctionRegistry[nodeType] = func;
}
```

**优势**：
- 支持运行时扩展
- 插件化架构
- 解耦实体与具体实现

### 4. 执行上下文集中管理

[`ExecutionContext`](../../src/workflow-example/engine/execution-context.ts:16) 作为执行过程中的数据管理中心：

- 变量存储和检索（支持嵌套路径）
- 节点执行结果缓存
- 事件管理
- 执行元数据（开始时间、执行时长等）

**设计亮点**：
- 统一的数据访问接口
- 支持变量占位符替换（`{{variable.path}}`）
- 隔离不同执行实例的数据

### 5. 工作流图抽象

[`WorkflowGraph`](../../src/workflow-example/engine/workflow-engine.ts:32) 提供图结构的抽象：

- 节点和边的管理
- 拓扑排序和循环检测
- 就绪节点计算

**核心算法**：
- 拓扑排序：确定节点执行顺序
- 循环检测：防止无限循环
- 就绪节点计算：支持并行执行

### 6. 执行引擎策略模式

[`WorkflowEngine`](../../src/workflow-example/engine/workflow-engine.ts:235) 支持多种执行策略：

- **SEQUENTIAL**：串行执行，节点按顺序执行
- **PARALLEL**：并行执行，无依赖节点并行执行

**扩展性**：
- 策略可配置
- 易于添加新的执行策略

## 架构层次

```
┌─────────────────────────────────────────────────────────┐
│                    应用层 (Examples)                     │
│  - 文本分析工作流示例                                      │
│  - 工作流构建和执行                                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    引擎层 (Engine)                       │
│  - WorkflowEngine: 执行引擎                               │
│  - ExecutionContext: 执行上下文                           │
│  - WorkflowGraph: 工作流图                                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    实体层 (Entities)                     │
│  - Node: 节点实体                                         │
│  - Edge: 边实体                                           │
│  - Trigger: 触发器实体                                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    函数层 (Functions)                    │
│  - NodeFunction: 节点执行函数                             │
│  - EdgeFunction: 边评估函数                               │
│  - TriggerFunction: 触发器评估函数                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    类型层 (Types)                        │
│  - 所有接口和类型定义                                      │
└─────────────────────────────────────────────────────────┘
```

## 核心组件详解

### 节点类型

| 类型 | 说明 | 配置示例 |
|------|------|----------|
| START | 开始节点，接收工作流输入 | `{}` |
| LLM | LLM调用节点 | `{ prompt, model, temperature }` |
| TOOL | 工具调用节点 | `{ toolName, parameters }` |
| CONDITION | 条件判断节点 | `{ condition, data }` |
| TRANSFORM | 数据转换节点 | `{ transformRules }` |
| END | 结束节点，返回结果 | `{ result }` |

### 边类型

| 类型 | 说明 | 配置示例 |
|------|------|----------|
| DIRECT | 直接边，无条件执行 | `{}` |
| CONDITIONAL | 条件边，基于条件表达式 | `{ expression, operator, expectedValue }` |
| WEIGHTED | 权重边，基于权重优先级 | `{ weight }` |

### 触发器类型

| 类型 | 说明 | 配置示例 |
|------|------|----------|
| TIME | 时间触发器 | `{ delay, interval, cron }` |
| EVENT | 事件触发器 | `{ eventType, eventDataPattern }` |
| STATE | 状态触发器 | `{ statePath, expectedValue }` |

## 表达式求值

支持安全的表达式求值，用于条件边和条件节点：

- 变量占位符：`{{variable.path}}`
- 比较运算符：`==`, `!=`, `>`, `<`, `>=`, `<=`
- 布尔值：`true`, `false`
- 数字和字符串字面量

**安全特性**：
- 不支持任意代码执行
- 只支持预定义的运算符
- 类型安全的值解析

## 执行流程

```
1. 创建工作流图
   ↓
2. 添加节点、边、触发器
   ↓
3. 创建执行引擎
   ↓
4. 执行工作流
   ├─ 检查循环依赖
   ├─ 创建执行上下文
   ├─ 循环执行就绪节点
   │  ├─ 检查触发器
   │  ├─ 获取节点函数
   │  ├─ 执行节点函数
   │  ├─ 保存结果到上下文
   │  └─ 评估出边条件
   └─ 返回执行结果
```

## 扩展性设计

### 添加自定义节点类型

```typescript
// 1. 定义节点函数
const customNodeFunction: NodeFunction = async (input, config, context) => {
  // 实现节点逻辑
  return { success: true, data: { result: 'custom result' } };
};

// 2. 注册节点函数
registerNodeFunction('custom', customNodeFunction);

// 3. 使用自定义节点
const customNode = createNode('custom-node', 'custom', '自定义节点', {});
```

### 添加自定义边类型

```typescript
// 1. 定义边函数
const customEdgeFunction: EdgeFunction = async (input, config, context) => {
  return { canTraverse: true, reason: '自定义边逻辑' };
};

// 2. 注册边函数
registerEdgeFunction('custom', customEdgeFunction);
```

## 设计优势

1. **清晰的职责分离**：实体、函数、引擎各司其职
2. **高度可扩展**：通过注册表模式支持动态扩展
3. **易于测试**：纯函数设计便于单元测试
4. **类型安全**：TypeScript类型系统保证类型安全
5. **灵活的执行策略**：支持串行和并行执行
6. **丰富的触发机制**：支持时间、事件、状态触发

## 设计局限

1. **模拟实现**：LLM和工具调用是模拟的，需要替换为真实实现
2. **简单的表达式求值**：不支持复杂的表达式语法
3. **有限的错误处理**：错误处理策略相对简单
4. **无持久化支持**：工作流定义和执行状态不持久化
5. **无版本管理**：工作流定义不支持版本控制

## 适用场景

- 需要灵活定义和执行工作流的场景
- 需要支持多种节点类型和执行策略的场景
- 需要动态扩展工作流能力的场景
- 需要条件分支和循环控制的场景

## 总结

`workflow-example` 展示了一个基于图工作流和函数式编程的优雅设计。通过实体与行为分离、注册表模式、执行上下文集中管理等设计，实现了高度可扩展和可维护的工作流框架。该设计为实际项目中的工作流模块提供了有价值的参考。