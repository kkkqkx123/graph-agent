# workflow-example 与当前项目 workflow 模块对比分析

## 概述

本文档对比分析 `workflow-example` 示例与当前项目中 workflow 模块的设计差异，并提出改进建议。

## 架构风格对比

### workflow-example：函数式编程风格

```
workflow-example/
├── types/           # 类型定义
├── entities/        # 实体（数据容器）
├── functions/       # 函数（行为实现）
├── engine/          # 执行引擎
└── examples/        # 示例
```

**特点**：
- 实体与行为完全分离
- 纯函数实现业务逻辑
- 注册表模式管理函数
- 简单直接的执行流程

### 当前项目：DDD 架构风格

```
src/
├── domain/workflow/           # 领域层
│   ├── entities/              # 实体（聚合根）
│   ├── value-objects/         # 值对象
│   ├── repositories/          # 仓储接口
│   └── services/              # 领域服务
├── infrastructure/workflow/   # 基础设施层
│   ├── functions/             # 函数注册表
│   ├── nodes/                 # 节点执行器
│   ├── edges/                 # 边评估器
│   ├── extensions/            # 扩展机制
│   ├── strategies/            # 执行策略
│   └── state/                 # 状态管理
└── application/               # 应用层
```

**特点**：
- 领域驱动设计（DDD）
- 聚合根模式
- 值对象封装业务概念
- 仓储模式持久化
- 依赖注入

## 核心组件对比

### 1. 节点设计

| 维度 | workflow-example | 当前项目 |
|------|------------------|----------|
| **节点类型** | 枚举 `NodeType` | 值对象 `NodeType` |
| **节点数据** | `NodeData` 接口 | `NodeData` 接口 |
| **节点行为** | `NodeFunction` 函数 | `NodeExecutor` 类 |
| **扩展方式** | 注册表注册函数 | 工厂模式创建执行器 |
| **类型数量** | 6种（START, END, LLM, TOOL, CONDITION, TRANSFORM） | 15种（包括FORK, JOIN, MERGE, HUMAN_RELAY等） |

**差异分析**：

workflow-example 的节点类型更简单，适合演示用途。当前项目的节点类型更丰富，支持更复杂的控制流。

**建议**：
- 保留当前项目的丰富节点类型
- 参考 workflow-example 的函数式风格，简化节点执行器的实现

### 2. 边设计

| 维度 | workflow-example | 当前项目 |
|------|------------------|----------|
| **边类型** | 枚举 `EdgeType` | 值对象 `EdgeType` |
| **边数据** | `EdgeData` 接口 | `EdgeData` 接口 |
| **边行为** | `EdgeFunction` 函数 | `EdgeEvaluator` 类 |
| **条件评估** | 内置在边函数中 | 独立的 `ConditionEvaluator` |
| **类型数量** | 2种（DIRECT, CONDITIONAL） | 10种（包括ERROR, TIMEOUT, ASYNC等） |

**差异分析**：

workflow-example 的边类型简单直接。当前项目的边类型更丰富，支持异常处理和异步执行。

**建议**：
- 保留当前项目的丰富边类型
- 参考 workflow-example 的函数式风格，简化边评估器的实现

### 3. 触发器设计

| 维度 | workflow-example | 当前项目 |
|------|------------------|----------|
| **触发器类型** | 枚举 `TriggerType` | 枚举 `TriggerType` |
| **触发器数据** | `TriggerConfig` 接口 | `TriggerConfig` 接口 |
| **触发器行为** | `TriggerFunction` 函数 | `BaseTrigger` 类 |
| **管理方式** | 存储在 `WorkflowGraph` 中 | 独立的 `TriggerManager` |
| **类型数量** | 3种（TIME, EVENT, STATE） | 4种（TIME, EVENT, CONDITION, MANUAL） |

**差异分析**：

workflow-example 的触发器是工作流图的一部分。当前项目有独立的触发器管理器，支持更复杂的触发器生命周期管理。

**建议**：
- 保留独立的 `TriggerManager`
- 参考 workflow-example 的函数式风格，简化触发器的实现

### 4. 执行上下文

| 维度 | workflow-example | 当前项目 |
|------|------------------|----------|
| **实现方式** | `ExecutionContextImpl` 类 | `IExecutionContext` 接口 |
| **数据存储** | `Map<string, any>` | `Record<string, any>` |
| **变量访问** | 支持嵌套路径 | 支持嵌套路径 |
| **节点结果** | `setNodeResult/getNodeResult` | 类似方法 |
| **事件管理** | `setRecentEvent/getRecentEvent` | 无明确事件管理 |

**差异分析**：

两者的执行上下文设计相似，都支持变量存储和节点结果缓存。

**建议**：
- 保留当前项目的接口设计
- 参考 workflow-example 添加事件管理功能

### 5. 执行引擎

| 维度 | workflow-example | 当前项目 |
|------|------------------|----------|
| **实现方式** | `WorkflowEngineImpl` 类 | `ExecutionStrategy` 抽象类 |
| **执行策略** | 枚举 `ExecutionStrategy` | 抽象类 `ExecutionStrategy` |
| **策略类型** | 2种（SEQUENTIAL, PARALLEL） | 3种（SEQUENTIAL, PARALLEL, CONDITIONAL） |
| **状态管理** | 内部状态 | 独立的 `WorkflowState` 实体 |
| **循环检测** | 拓扑排序 | 委托给领域服务 |

**差异分析**：

workflow-example 的执行引擎是单一类，当前项目使用策略模式支持多种执行策略。

**建议**：
- 保留策略模式设计
- 参考 workflow-example 的拓扑排序实现

### 6. 函数注册表

| 维度 | workflow-example | 当前项目 |
|------|------------------|----------|
| **实现方式** | 简单对象 `Record<string, Function>` | `FunctionRegistry` 类 |
| **函数类型** | `NodeFunction`, `EdgeFunction`, `TriggerFunction` | `BaseWorkflowFunction` 抽象类 |
| **注册方式** | `registerNodeFunction` 等函数 | `registerFunction` 统一方法 |
| **函数分类** | 按类型分开注册 | 按 `WorkflowFunctionType` 分类 |

**差异分析**：

workflow-example 的注册表更简单直接。当前项目的注册表更完善，支持函数元数据和验证。

**建议**：
- 保留当前项目的 `FunctionRegistry`
- 参考 workflow-example 的简洁API设计

## 设计模式对比

### workflow-example 使用的设计模式

1. **工厂模式**：`createNode`, `createEdge`, `createTrigger` 等工厂函数
2. **注册表模式**：`nodeFunctionRegistry`, `edgeFunctionRegistry`, `triggerFunctionRegistry`
3. **策略模式**：`ExecutionStrategy` 枚举
4. **模板方法模式**：`WorkflowEngine.executeWorkflow`

### 当前项目使用的设计模式

1. **聚合根模式**：`Workflow` 聚合根
2. **值对象模式**：`NodeType`, `EdgeType`, `WorkflowDefinition` 等
3. **仓储模式**：`WorkflowRepository` 接口
4. **工厂模式**：`NodeExecutorFactory`, `TriggerFactory`
5. **注册表模式**：`FunctionRegistry`
6. **策略模式**：`ExecutionStrategy` 抽象类
7. **依赖注入**：使用 `inversify`
8. **扩展模式**：`HookChain`, `Plugin`

## 优势对比

### workflow-example 的优势

1. **简单直观**：代码结构清晰，易于理解
2. **函数式编程**：纯函数易于测试和复用
3. **快速原型**：适合快速构建工作流示例
4. **低耦合**：实体与行为完全分离

### 当前项目的优势

1. **企业级架构**：DDD架构适合大型项目
2. **类型安全**：值对象提供更强的类型保证
3. **持久化支持**：仓储模式支持数据持久化
4. **版本管理**：支持工作流版本控制
5. **扩展性强**：Hooks和Plugins机制支持扩展
6. **状态管理**：独立的 `WorkflowState` 实体
7. **依赖注入**：便于测试和替换实现

## 劣势对比

### workflow-example 的劣势

1. **无持久化**：工作流定义和执行状态不持久化
2. **无版本管理**：不支持工作流版本控制
3. **模拟实现**：LLM和工具调用是模拟的
4. **简单表达式**：表达式求值功能有限
5. **无扩展机制**：不支持Hooks和Plugins

### 当前项目的劣势

1. **复杂度高**：DDD架构增加了学习成本
2. **代码量大**：需要更多的样板代码
3. **过度设计**：对于简单工作流可能过于复杂
4. **依赖注入**：增加了配置复杂度

## 改进建议

### 1. 引入函数式编程风格

**现状**：当前项目的节点执行器、边评估器都是类。

**建议**：参考 workflow-example，引入函数式风格：

```typescript
// 定义函数类型
export type NodeExecutorFunction = (
  input: NodeInput,
  config: NodeConfig,
  context: IExecutionContext
) => Promise<NodeOutput>;

// 函数注册表支持函数类型
registerFunction(
  'llm',
  new FunctionNodeExecutor('llm', llmNodeFunction)
);
```

### 2. 简化执行上下文

**现状**：当前项目的执行上下文是接口，实现分散。

**建议**：参考 workflow-example，提供统一的执行上下文实现：

```typescript
export class WorkflowExecutionContext implements IExecutionContext {
  private _data: Map<string, any>;
  private _nodeResults: Map<string, NodeOutput>;
  private _recentEvents: Map<string, any>;

  // 统一的数据访问接口
  setVariable(path: string, value: any): void { /* ... */ }
  getVariable(path: string): any { /* ... */ }
  setNodeResult(nodeId: string, result: NodeOutput): void { /* ... */ }
  getNodeResult(nodeId: string): NodeOutput | undefined { /* ... */ }
  setRecentEvent(eventType: string, event: any): void { /* ... */ }
  getRecentEvent(eventType: string): any { /* ... */ }
}
```

### 3. 添加表达式求值功能

**现状**：当前项目的表达式求值功能分散在多个组件中。

**建议**：参考 workflow-example，提供统一的表达式求值器：

```typescript
export class ExpressionEvaluator {
  evaluate(expression: string, context: IExecutionContext): any {
    // 替换变量占位符
    const processedExpr = this.replacePlaceholders(expression, context.getAllData());
    // 安全求值
    return this.safeEvaluate(processedExpr);
  }

  private replacePlaceholders(expression: string, data: Record<string, any>): string {
    // 实现 {{variable.path}} 替换
  }

  private safeEvaluate(expression: string): any {
    // 实现安全的表达式求值
  }
}
```

### 4. 简化函数注册表API

**现状**：当前项目的函数注册表API相对复杂。

**建议**：参考 workflow-example，提供简洁的API：

```typescript
// 简化的API
export const nodeFunctionRegistry: Record<string, NodeExecutorFunction> = {
  llm: llmNodeFunction,
  tool: toolNodeFunction,
  condition: conditionNodeFunction,
  // ...
};

export function registerNodeFunction(nodeType: string, func: NodeExecutorFunction): void {
  nodeFunctionRegistry[nodeType] = func;
}

export function getNodeFunction(nodeType: string): NodeExecutorFunction | undefined {
  return nodeFunctionRegistry[nodeType];
}
```

### 5. 添加工作流图算法

**现状**：当前项目的图算法委托给领域服务。

**建议**：参考 workflow-example，在 `WorkflowGraph` 中添加图算法：

```typescript
export class WorkflowGraph {
  // 拓扑排序
  getTopologicalOrder(): string[] {
    // 实现拓扑排序
  }

  // 循环检测
  hasCycle(): boolean {
    try {
      this.getTopologicalOrder();
      return false;
    } catch {
      return true;
    }
  }

  // 获取就绪节点
  getReadyNodes(executedNodes: Set<string>): Node[] {
    // 实现就绪节点计算
  }
}
```

### 6. 添加示例和文档

**现状**：当前项目缺少工作流使用示例。

**建议**：参考 workflow-example，添加完整的使用示例：

```typescript
// examples/text-analysis-workflow.ts
export function createTextAnalysisWorkflow() {
  const workflow = Workflow.create('text-analysis-workflow', '文本分析工作流');

  // 创建节点
  const inputNode = workflow.addNode(/* ... */);
  const classifyNode = workflow.addNode(/* ... */);
  // ...

  // 创建边
  workflow.addEdge(/* ... */);

  return workflow;
}

export async function runTextAnalysisWorkflow(inputText: string) {
  const workflow = createTextAnalysisWorkflow();
  const engine = new WorkflowEngine(ExecutionStrategy.SEQUENTIAL);
  const result = await engine.execute(workflow, { text: inputText });
  return result;
}
```

## 迁移路径

### 阶段1：引入函数式风格（不影响现有功能）

1. 定义函数类型接口
2. 创建函数包装器
3. 在现有执行器中支持函数调用

### 阶段2：简化执行上下文

1. 实现 `WorkflowExecutionContext` 类
2. 替换现有的执行上下文实现
3. 添加事件管理功能

### 阶段3：添加表达式求值器

1. 实现 `ExpressionEvaluator` 类
2. 集成到边评估器和条件节点中
3. 添加单元测试

### 阶段4：添加图算法

1. 在 `WorkflowGraph` 中添加图算法
2. 替换现有的领域服务调用
3. 添加循环检测

### 阶段5：添加示例和文档

1. 创建示例工作流
2. 编写使用文档
3. 添加教程

## 总结

workflow-example 提供了一个简洁、直观的函数式工作流框架设计，适合快速原型和演示。当前项目的 workflow 模块采用 DDD 架构，适合企业级应用。

通过引入 workflow-example 的函数式编程风格、简化执行上下文、添加表达式求值器、添加图算法和示例文档，可以在保持当前项目企业级架构优势的同时，提升代码的简洁性和易用性。

**关键改进点**：
1. 引入函数式编程风格，简化节点、边、触发器的实现
2. 统一执行上下文实现，添加事件管理
3. 提供表达式求值器，支持更灵活的条件判断
4. 在 `WorkflowGraph` 中添加图算法，提升性能
5. 添加完整的使用示例和文档，降低学习成本