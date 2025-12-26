# Workflow 函数式编程集成设计分析

## 概述

本文档分析当前工作流组件与函数模块的集成设计，评估其是否能正确实现函数式编程风格，通过预定义函数执行内部逻辑。

## 当前架构分析

### 1. 值对象层（Domain Layer）

已创建的值对象：

| 值对象 | 职责 | 函数式集成点 |
|--------|------|-------------|
| [`NodeValueObject`](src/domain/workflow/value-objects/node-value-object.ts) | 封装节点数据 | 通过 `type` 关联节点函数 |
| [`EdgeValueObject`](src/domain/workflow/value-objects/edge-value-object.ts) | 封装边数据 | 通过 `type` 关联边函数 |
| [`TriggerValueObject`](src/domain/workflow/value-objects/trigger-value-object.ts) | 封装触发器数据 | 通过 `type` 关联触发器函数 |
| [`HookValueObject`](src/domain/workflow/value-objects/hook-value-object.ts) | 封装钩子数据 | 通过 `hookPoint` 关联钩子函数 |

### 2. 函数模块（Infrastructure Layer）

现有函数模块结构：

```
src/infrastructure/workflow/functions/
├── base/
│   └── base-workflow-function.ts      # 函数基类
├── builtin/
│   ├── conditions/                    # 条件函数
│   ├── nodes/                         # 节点函数
│   ├── routing/                       # 路由函数
│   └── triggers/                      # 触发器函数
├── registry/
│   └── function-registry.ts           # 函数注册表
└── executors/
    └── function-executor.ts           # 函数执行器
```

### 3. 函数类型定义

```typescript
// 基础函数接口
interface IWorkflowFunction {
  id: string;
  name: string;
  type: WorkflowFunctionType;  // CONDITION | ROUTING | NODE | TRIGGER
  execute(context: any, config: any): Promise<any>;
  validateConfig(config: any): ValidationResult;
}

// 函数类型枚举
enum WorkflowFunctionType {
  CONDITION = 'condition',
  ROUTING = 'routing',
  NODE = 'node',
  TRIGGER = 'trigger'
}
```

## 函数式编程集成设计

### 设计原则

1. **值对象与函数分离** - 值对象负责数据封装，函数负责行为逻辑
2. **通过类型关联** - 值对象的 `type` 属性映射到对应的函数
3. **注册表管理** - 函数通过注册表统一管理，支持动态注册和查找
4. **执行器协调** - 执行器负责协调值对象和函数的交互

### 集成架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Workflow 聚合根                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ NodeValueObj │  │ EdgeValueObj │  │ TriggerValue │      │
│  │   (数据)     │  │   (数据)     │  │   (数据)     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         │ type             │ type             │ type        │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FunctionRegistry (注册表)                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │  │
│  │  │ NodeFunc │ │ EdgeFunc │ │TriggerFn │ │HookFn │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FunctionExecutor (执行器)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 集成流程

#### 1. 节点执行流程

```typescript
// 1. 从 Workflow 获取节点值对象
const node = workflow.getNode(nodeId); // NodeValueObject

// 2. 根据节点类型获取对应的函数
const nodeFunction = functionRegistry.getNodeFunction(node.type.toString());

// 3. 执行函数
const result = await functionExecutor.execute({
  functions: [{ function: nodeFunction, config: node.properties }],
  context: executionContext,
  executionConfig: { strategy: 'sequential' }
});
```

#### 2. 边评估流程

```typescript
// 1. 从 Workflow 获取边值对象
const edge = workflow.getEdge(edgeId); // EdgeValueObject

// 2. 根据边类型获取对应的函数
const edgeFunction = functionRegistry.getRoutingFunction(edge.type.toString());

// 3. 执行函数
const result = await functionExecutor.execute({
  functions: [{ function: edgeFunction, config: edge.properties }],
  context: executionContext,
  executionConfig: { strategy: 'sequential' }
});
```

#### 3. 触发器评估流程

```typescript
// 1. 获取触发器值对象
const trigger = TriggerValueObject.create({ ... });

// 2. 根据触发器类型获取对应的函数
const triggerFunction = functionRegistry.getTriggerFunction(trigger.type.toString());

// 3. 执行函数
const result = await functionExecutor.execute({
  functions: [{ function: triggerFunction, config: trigger.config }],
  context: executionContext,
  executionConfig: { strategy: 'sequential' }
});
```

## 当前实现评估

### ✅ 已实现的功能

1. **值对象封装** - NodeValueObject、EdgeValueObject、TriggerValueObject、HookValueObject
2. **函数基类** - BaseWorkflowFunction 提供统一的函数接口
3. **函数注册表** - FunctionRegistry 支持函数注册和查找
4. **函数执行器** - FunctionExecutor 支持函数执行
5. **内置函数** - 提供了条件、节点、路由、触发器等内置函数

### ⚠️ 需要改进的地方

1. **值对象与函数的映射关系不够明确**
   - 当前值对象的 `type` 属性是字符串，需要与函数注册表中的函数名称对应
   - 缺少明确的映射配置

2. **函数注册表需要扩展**
   - 需要支持钩子函数的注册
   - 需要支持按值对象类型查找函数

3. **执行器需要增强**
   - 需要支持值对象作为输入
   - 需要支持更灵活的执行策略

4. **缺少统一的执行接口**
   - 当前各组件（节点执行器、边评估器等）各自实现
   - 需要统一的函数式执行接口

## 改进建议

### 1. 扩展函数注册表

```typescript
// 在 FunctionRegistry 中添加
export class FunctionRegistry {
  // 现有方法...

  /**
   * 根据节点值对象获取函数
   */
  getNodeFunctionByValueObject(node: NodeValueObject): BaseWorkflowFunction | null {
    return this.getNodeFunction(node.type.toString());
  }

  /**
   * 根据边值对象获取函数
   */
  getEdgeFunctionByValueObject(edge: EdgeValueObject): BaseWorkflowFunction | null {
    return this.getRoutingFunction(edge.type.toString());
  }

  /**
   * 根据触发器值对象获取函数
   */
  getTriggerFunctionByValueObject(trigger: TriggerValueObject): BaseWorkflowFunction | null {
    return this.getTriggerFunction(trigger.type.toString());
  }

  /**
   * 根据钩子值对象获取函数
   */
  getHookFunctionByValueObject(hook: HookValueObject): BaseWorkflowFunction | null {
    return this.getFunctionByName(`hook_${hook.hookPoint.toString()}`);
  }
}
```

### 2. 创建统一的执行接口

```typescript
// src/infrastructure/workflow/functions/interfaces/value-object-executor.interface.ts

import { NodeValueObject } from '../../../../domain/workflow/value-objects/node-value-object';
import { EdgeValueObject } from '../../../../domain/workflow/value-objects/edge-value-object';
import { TriggerValueObject } from '../../../../domain/workflow/value-objects/trigger-value-object';
import { HookValueObject } from '../../../../domain/workflow/value-objects/hook-value-object';

/**
 * 值对象执行接口
 */
export interface IValueObjectExecutor {
  /**
   * 执行节点值对象
   */
  executeNode(node: NodeValueObject, context: any): Promise<any>;

  /**
   * 执行边值对象
   */
  executeEdge(edge: EdgeValueObject, context: any): Promise<any>;

  /**
   * 执行触发器值对象
   */
  executeTrigger(trigger: TriggerValueObject, context: any): Promise<any>;

  /**
   * 执行钩子值对象
   */
  executeHook(hook: HookValueObject, context: any): Promise<any>;
}
```

### 3. 实现统一的执行器

```typescript
// src/infrastructure/workflow/functions/executors/value-object-executor.ts

import { injectable, inject } from 'inversify';
import { FunctionRegistry } from '../registry/function-registry';
import { NodeValueObject } from '../../../../domain/workflow/value-objects/node-value-object';
import { EdgeValueObject } from '../../../../domain/workflow/value-objects/edge-value-object';
import { TriggerValueObject } from '../../../../domain/workflow/value-objects/trigger-value-object';
import { HookValueObject } from '../../../../domain/workflow/value-objects/hook-value-object';
import { IValueObjectExecutor } from '../interfaces/value-object-executor.interface';

@injectable()
export class ValueObjectExecutor implements IValueObjectExecutor {
  constructor(
    @inject('FunctionRegistry') private readonly registry: FunctionRegistry
  ) {}

  async executeNode(node: NodeValueObject, context: any): Promise<any> {
    const func = this.registry.getNodeFunctionByValueObject(node);
    if (!func) {
      throw new Error(`未找到节点类型 ${node.type.toString()} 的函数`);
    }
    return await func.execute(context, node.properties);
  }

  async executeEdge(edge: EdgeValueObject, context: any): Promise<any> {
    const func = this.registry.getEdgeFunctionByValueObject(edge);
    if (!func) {
      throw new Error(`未找到边类型 ${edge.type.toString()} 的函数`);
    }
    return await func.execute(context, edge.properties);
  }

  async executeTrigger(trigger: TriggerValueObject, context: any): Promise<any> {
    const func = this.registry.getTriggerFunctionByValueObject(trigger);
    if (!func) {
      throw new Error(`未找到触发器类型 ${trigger.type.toString()} 的函数`);
    }
    return await func.execute(context, trigger.config);
  }

  async executeHook(hook: HookValueObject, context: any): Promise<any> {
    const func = this.registry.getHookFunctionByValueObject(hook);
    if (!func) {
      throw new Error(`未找到钩子点 ${hook.hookPoint.toString()} 的函数`);
    }
    return await func.execute(context, hook.config);
  }
}
```

### 4. 更新现有执行器使用统一接口

```typescript
// 更新节点执行器
export class ToolNodeExecutor {
  constructor(
    @inject('ValueObjectExecutor') private readonly executor: IValueObjectExecutor
  ) {}

  async execute(node: NodeValueObject, context: any): Promise<any> {
    return await this.executor.executeNode(node, context);
  }
}
```

## 总结

### 当前状态

✅ **已具备的基础设施**：
- 值对象封装（NodeValueObject、EdgeValueObject、TriggerValueObject、HookValueObject）
- 函数基类和注册表
- 函数执行器
- 内置函数库

⚠️ **需要改进的地方**：
- 值对象与函数的映射关系需要明确
- 需要统一的值对象执行接口
- 需要扩展函数注册表支持值对象查找

### 函数式编程集成能力

当前架构**基本支持**函数式编程风格：

1. **数据与行为分离** ✅ - 值对象负责数据，函数负责行为
2. **通过注册表管理函数** ✅ - FunctionRegistry 提供函数管理
3. **支持动态函数注册** ✅ - 可以运行时注册新函数
4. **支持函数组合** ⚠️ - 需要进一步增强

### 建议的实施步骤

1. **第一阶段**：扩展 FunctionRegistry 支持值对象查找
2. **第二阶段**：创建统一的 IValueObjectExecutor 接口
3. **第三阶段**：实现 ValueObjectExecutor
4. **第四阶段**：更新现有执行器使用统一接口
5. **第五阶段**：添加函数组合支持

通过以上改进，可以实现完整的函数式编程集成，使工作流组件能够灵活地与函数模块集成，通过预定义的函数执行内部逻辑。