# FunctionRegistry使用模式分析

## 概述

本文档分析`src/services/workflow`目录中FunctionRegistry的使用模式，并评估是否需要统一使用依赖注入模式。

## 当前使用情况

### 1. 依赖注入模式（@inject）

#### 1.1 WorkflowExecutionEngine

**文件**: `src/services/workflow/workflow-execution.ts`

```typescript
@injectable()
export class WorkflowExecutionEngine {
  constructor(
    @inject('ExpressionEvaluator') expressionEvaluator: ExpressionEvaluator,
    @inject('FunctionRegistry') functionRegistry: FunctionRegistry,
    @inject('NodeRouter') nodeRouter: NodeRouter,
    @inject('NodeExecutor') nodeExecutor: NodeExecutor,
    @inject('Logger') logger: ILogger
  ) {
    this.functionRegistry = functionRegistry;
    // ...
  }
}
```

**使用场景**: 工作流执行引擎需要访问函数注册表来评估边的条件。

#### 1.2 TriggerExecutor

**文件**: `src/services/workflow/triggers/trigger-executor.ts`

```typescript
@injectable()
export class TriggerExecutor {
  constructor(
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry,
    @inject('Logger') private readonly logger: ILogger
  ) { }
}
```

**使用场景**: 触发器执行器需要访问函数注册表来执行触发器函数。

#### 1.3 EdgeExecutor

**文件**: `src/services/workflow/edges/edge-executor.ts`

```typescript
@injectable()
export class EdgeExecutor {
  constructor(
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry,
    @inject('Logger') private readonly logger: ILogger
  ) { }
}
```

**使用场景**: 边执行器需要访问函数注册表来执行边函数。

### 2. 从Context获取模式（context.getService）

#### 2.1 DataTransformNode

**文件**: `src/services/workflow/nodes/data-transform-node.ts`

```typescript
export class DataTransformNode extends Node {
  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    // 获取函数注册表
    const functionRegistry = context.getService<FunctionRegistry>('FunctionRegistry');

    // 构建转换函数ID
    const transformId = `transform:${this.transformType}`;

    // 获取转换函数
    const transformFunction = functionRegistry.getFunction(transformId);
    // ...
  }
}
```

**使用场景**: 数据转换节点在执行时需要访问函数注册表来获取转换函数。

#### 2.2 ContextProcessorNode

**文件**: `src/services/workflow/nodes/context-processor-node.ts`

```typescript
export class ContextProcessorNode extends Node {
  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    // 获取函数注册表
    const functionRegistry = context.getService<FunctionRegistry>('FunctionRegistry');

    // 构建处理器函数ID
    const processorId = `context:${this.processorName}`;

    // 获取处理器函数
    const processorFunction = functionRegistry.getFunction(processorId);
    // ...
  }
}
```

**使用场景**: 上下文处理器节点在执行时需要访问函数注册表来获取处理器函数。

## 两种模式的对比

| 维度 | 依赖注入模式 | Context获取模式 |
|------|-------------|----------------|
| **使用位置** | Services层类 | Domain层实体（Node） |
| **获取方式** | 构造函数注入 | 执行时从context获取 |
| **生命周期** | 类实例化时注入 | 每次执行时获取 |
| **适用场景** | 应用服务 | 领域对象 |
| **依赖关系** | 直接依赖 | 间接依赖（通过context） |
| **测试性** | 易于mock | 易于mock |
| **灵活性** | 较低 | 较高 |

## 架构分析

### 为什么使用两种模式？

#### 1. 依赖注入模式适用于Services层

**原因**：
- Services层的类是应用服务，负责协调领域对象和基础设施
- 这些类的依赖关系在编译时就确定了
- 使用依赖注入可以明确声明依赖关系
- 符合控制反转（IoC）原则

**示例**：
```typescript
@injectable()
export class WorkflowExecutionEngine {
  constructor(
    @inject('FunctionRegistry') functionRegistry: FunctionRegistry
  ) {
    this.functionRegistry = functionRegistry;
  }
}
```

#### 2. Context获取模式适用于Domain层

**原因**：
- Node是领域实体，不应该直接依赖基础设施
- Node的执行上下文（ExecutionContext）提供了访问服务的接口
- 这种设计保持了领域层的纯粹性
- 符合依赖倒置原则（DIP）

**示例**：
```typescript
export class DataTransformNode extends Node {
  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const functionRegistry = context.getService<FunctionRegistry>('FunctionRegistry');
    // ...
  }
}
```

### DDD原则的体现

#### 1. 分层架构

```
Application Layer (Services)
├── WorkflowExecutionEngine (依赖注入)
├── TriggerExecutor (依赖注入)
└── EdgeExecutor (依赖注入)

Domain Layer (Entities)
├── Node (抽象基类)
├── DataTransformNode (Context获取)
└── ContextProcessorNode (Context获取)
```

#### 2. 依赖方向

```
Services → Domain (单向依赖)
Domain → Context (通过接口访问服务)
```

#### 3. 职责分离

- **Services层**: 协调、编排、技术实现
- **Domain层**: 业务逻辑、领域规则、实体行为

## 是否需要统一？

### ❌ 不建议统一使用依赖注入模式

**理由**：

#### 1. 违反DDD原则

如果让Node实体直接依赖FunctionRegistry：
- ❌ 领域层会依赖基础设施层
- ❌ 破坏了分层架构
- ❌ 违反了依赖倒置原则

#### 2. 降低灵活性

如果使用依赖注入：
- ❌ Node的依赖关系在编译时就确定了
- ❌ 难以在运行时动态替换服务
- ❌ 降低了Node的可测试性

#### 3. 增加复杂性

如果统一使用依赖注入：
- ❌ 需要为每个Node类型创建工厂类
- ❌ 增加了依赖注入容器的配置复杂度
- ❌ 违反了Node作为实体的设计原则

### ✅ 保持当前的双模式设计

**理由**：

#### 1. 符合DDD最佳实践

- ✅ Services层使用依赖注入：明确依赖关系
- ✅ Domain层使用Context获取：保持领域纯粹性
- ✅ 依赖方向正确：单向依赖

#### 2. 职责清晰

- ✅ Services层：技术协调，依赖注入
- ✅ Domain层：业务逻辑，Context访问

#### 3. 易于测试

- ✅ Services层：可以mock依赖
- ✅ Domain层：可以mock context

#### 4. 灵活性高

- ✅ Node可以在运行时获取不同的服务
- ✅ 便于实现AOP（面向切面编程）
- ✅ 支持动态服务替换

## 最佳实践建议

### 1. Services层：使用依赖注入

```typescript
@injectable()
export class SomeService {
  constructor(
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry
  ) {}
}
```

**适用场景**：
- 应用服务类
- 执行器类
- 协调器类

### 2. Domain层：使用Context获取

```typescript
export class SomeNode extends Node {
  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const functionRegistry = context.getService<FunctionRegistry>('FunctionRegistry');
    // ...
  }
}
```

**适用场景**：
- 领域实体
- Node子类
- 需要访问服务的领域对象

### 3. Context接口设计

确保ExecutionContext提供足够的服务访问接口：

```typescript
export interface WorkflowExecutionContext {
  // 变量管理
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;

  // 服务访问
  getService<T>(serviceName: string): T;

  // 执行信息
  getExecutionId(): string;
  getWorkflowId(): string;

  // 节点结果
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
}
```

## 总结

### 当前设计评估

| 评估项 | 评分 | 说明 |
|--------|------|------|
| **符合DDD原则** | ⭐⭐⭐⭐⭐ | 完全符合分层架构和依赖倒置原则 |
| **职责清晰** | ⭐⭐⭐⭐⭐ | Services层和Domain层职责明确 |
| **易于测试** | ⭐⭐⭐⭐⭐ | 两种模式都易于mock和测试 |
| **灵活性** | ⭐⭐⭐⭐⭐ | Context获取模式提供了高灵活性 |
| **可维护性** | ⭐⭐⭐⭐⭐ | 设计清晰，易于理解和维护 |

### 最终建议

**保持当前的双模式设计，不要统一使用依赖注入模式。**

**理由**：
1. ✅ 符合DDD最佳实践
2. ✅ 职责分离清晰
3. ✅ 易于测试和维护
4. ✅ 提供了足够的灵活性
5. ✅ 保持了领域层的纯粹性

**使用指南**：
- **Services层类**：使用`@inject`依赖注入
- **Domain层实体**：使用`context.getService()`获取服务
- **不要混用**：保持模式的清晰性

这种设计体现了对DDD原则的深刻理解，是正确的架构选择。