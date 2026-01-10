# 条件函数架构文档

## 概述

条件函数是工作流路由控制的核心组件，用于判断Edge是否应该被触发。本文档详细说明了条件函数的架构设计、实现模式和使用方法。

## 设计原则

### 1. 统一使用函数式条件

**决策**：完全使用函数式条件，不再支持表达式式条件。

**理由**：
- ✅ **可扩展性强**：函数式条件支持任意复杂的业务逻辑
- ✅ **类型安全**：TypeScript类型检查，编译时发现错误
- ✅ **易于测试**：函数可以单独测试，提高代码质量
- ✅ **可复用性**：一次定义，多处使用
- ✅ **配置化**：通过配置文件控制具体行为
- ✅ **安全性高**：函数注册机制控制访问，避免代码注入

### 2. 双模式架构

条件函数支持两种实现模式：

#### 单例模式（Singleton Pattern）
- **适用场景**：逻辑完全固定、无需配置的条件函数
- **特点**：
  - 预实例化，性能最优
  - 无配置加载开销
  - 直接导入使用，无需注册到 FunctionRegistry
- **示例**：
  - `has_errors`：检查是否有错误
  - `has_tool_calls`：检查是否有工具调用
  - `has_tool_results`：检查是否有工具结果
  - `no_tool_calls`：检查是否没有工具调用

#### 工厂模式（Factory Pattern）
- **适用场景**：需要配置、支持动态分发的条件函数
- **特点**：
  - 支持从配置文件加载参数
  - 支持运行时配置覆盖
  - 通过 FunctionRegistry.registerFactory() 注册
- **示例**：
  - `max_iterations_reached`：检查是否达到最大迭代次数（可配置最大次数）

## 架构设计

### 类层次结构

```
SingletonConditionFunction (单例基类)
├── HasErrorsConditionFunction
├── HasToolCallsConditionFunction
├── HasToolResultsConditionFunction
└── NoToolCallsConditionFunction

BaseConditionFunction (工厂基类)
└── MaxIterationsReachedConditionFunction
```

### 核心组件

#### 1. SingletonConditionFunction

**文件**：`src/services/workflow/functions/conditions/singleton-condition-function.ts`

**特点**：
- 不使用依赖注入（`@injectable`）
- 不需要初始化（`initialize()`）
- 不需要配置验证
- 提供 `toConditionFunction()` 方法转换为函数

**使用方式**：
```typescript
import { hasErrorsCondition } from '@/services/workflow/functions/conditions';

// 直接使用预实例化的函数
const result = await hasErrorsCondition(context, config);
```

#### 2. BaseConditionFunction

**文件**：`src/services/workflow/functions/conditions/base-condition-function.ts`

**特点**：
- 使用依赖注入（`@injectable`）
- 支持配置加载（`setConfigLoader()`）
- 支持配置验证（`validateConfig()`）
- 需要初始化（`initialize()`）

**使用方式**：
```typescript
import { MaxIterationsReachedConditionFunction } from '@/services/workflow/functions/conditions';

// 通过FunctionRegistry获取
const func = functionRegistry.getFunction('condition:max_iterations_reached', config);
const result = await func.execute(context, config);
```

#### 3. FunctionRegistry

**文件**：`src/services/workflow/functions/function-registry.ts`

**职责**：
- 统一注册和管理所有工作流函数
- 支持单例和工厂两种注册模式
- 提供类型安全的函数获取方法

**注册机制**：
- 单例条件函数：直接导入使用，无需注册
- 工厂条件函数：通过 `registerFactory()` 注册

## 使用指南

### 1. 使用单例条件函数

```typescript
import { hasErrorsCondition } from '@/services/workflow/functions/conditions';

// 在Edge中使用
const edge = EdgeValueObject.create({
  id: EdgeId.generate(),
  type: EdgeType.conditional(),
  fromNodeId: nodeId1,
  toNodeId: nodeId2,
  condition: {
    type: 'function',
    functionId: 'condition:has_errors',
    config: {
      checkToolResults: true,
      checkMessages: true
    }
  },
  contextFilter: EdgeContextFilter.passAll()
});
```

### 2. 使用工厂条件函数

工厂条件函数需要先注册到 FunctionRegistry，然后通过 FunctionRegistry 获取和使用。

**注册工厂条件函数**：
```typescript
import { FunctionRegistry } from '@/services/workflow/functions';
import { MaxIterationsReachedConditionFunction } from '@/services/workflow/functions/conditions';

// 注册工厂条件函数
functionRegistry.registerFactory('condition:max_iterations_reached', {
  create: (config?: Record<string, any>) => {
    const func = new MaxIterationsReachedConditionFunction();
    func.initialize(config);
    return func;
  }
});
```

**使用工厂条件函数**：
```typescript
// 在Edge中使用
const edge = EdgeValueObject.create({
  id: EdgeId.generate(),
  type: EdgeType.conditional(),
  fromNodeId: nodeId1,
  toNodeId: nodeId2,
  condition: {
    type: 'function',
    functionId: 'condition:max_iterations_reached',
    config: {
      maxIterations: 20
    }
  },
  contextFilter: EdgeContextFilter.passAll()
});
```

### 3. 创建自定义单例条件函数

```typescript
import { SingletonConditionFunction } from '@/services/workflow/functions/conditions';
import { WorkflowExecutionContext, ConditionFunctionConfig } from '@/services/workflow/functions/types';

export class CustomConditionFunction extends SingletonConditionFunction {
  readonly id = 'condition:custom';
  readonly name = 'custom';
  readonly description = '自定义条件函数';
  override readonly version = '1.0.0';

  async execute(
    context: WorkflowExecutionContext,
    config?: ConditionFunctionConfig
  ): Promise<boolean> {
    // 实现自定义逻辑
    const value = context.getVariable('custom_value');
    return value === 'expected';
  }
}

// 导出预实例化的函数
export const customCondition = new CustomConditionFunction().toConditionFunction();
```

### 4. 创建自定义工厂条件函数

```typescript
import { injectable } from 'inversify';
import { BaseConditionFunction } from '@/services/workflow/functions/conditions';
import { WorkflowExecutionContext, ConditionFunctionConfig } from '@/services/workflow/functions/types';

export interface CustomConfig extends ConditionFunctionConfig {
  threshold: number;
}

@injectable()
export class CustomFactoryConditionFunction extends BaseConditionFunction<CustomConfig> {
  constructor() {
    super(
      'condition:custom_factory',
      'custom_factory',
      '自定义工厂条件函数',
      '1.0.0',
      'builtin'
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'threshold',
        type: 'number',
        required: true,
        description: '阈值',
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (config['threshold'] === undefined) {
      errors.push('threshold是必需的');
    } else if (typeof config['threshold'] !== 'number') {
      errors.push('threshold必须是数字');
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: CustomConfig
  ): Promise<boolean> {
    this.checkInitialized();

    const threshold = config.threshold;
    const value = context.getVariable('custom_value');

    return value >= threshold;
  }
}
```

## 配置文件支持

### 工厂条件函数配置

在配置文件中定义条件函数的基础配置：

```toml
[functions.MaxIterationsReachedConditionFunction]
maxIterations = 15
```

### 运行时配置覆盖

```typescript
const edge = EdgeValueObject.create({
  condition: {
    type: 'function',
    functionId: 'condition:max_iterations_reached',
    config: {
      maxIterations: 20  // 覆盖配置文件中的值
    }
  }
});
```

## 性能优化

### 单例条件函数的优势

1. **预实例化**：启动时创建一次，避免重复实例化
2. **无配置加载**：不需要读取配置文件
3. **直接调用**：无需通过FunctionRegistry查找
4. **内存高效**：全局共享一个实例

### 工厂条件函数的优化

1. **配置缓存**：基础配置加载后缓存
2. **延迟初始化**：按需创建实例
3. **实例复用**：相同配置的实例可以复用

## 最佳实践

### 1. 选择合适的模式

- **简单逻辑** → 使用单例模式
- **需要配置** → 使用工厂模式
- **需要复用** → 使用工厂模式
- **性能敏感** → 使用单例模式

### 2. 命名规范

- 函数ID：`condition:snake_case`
- 函数名称：`snake_case`
- 类名：`PascalCaseConditionFunction`

### 3. 版本管理

- 每个条件函数都有版本号
- 重大变更时更新版本号
- 保持向后兼容性

### 4. 错误处理

```typescript
async execute(context: WorkflowExecutionContext, config?: ConditionFunctionConfig): Promise<boolean> {
  try {
    // 实现逻辑
    return true;
  } catch (error) {
    // 记录错误
    console.error(`条件函数执行失败: ${this.name}`, error);
    // 返回默认值
    return false;
  }
}
```

## 迁移指南

### 从表达式式条件迁移到函数式条件

#### 之前（表达式式）
```typescript
const edge = EdgeValueObject.create({
  condition: '${errorCount} > 0'
});
```

#### 之后（函数式）
```typescript
const edge = EdgeValueObject.create({
  condition: {
    type: 'function',
    functionId: 'condition:has_errors',
    config: {
      checkToolResults: true,
      checkMessages: true
    }
  }
});
```

## 注册机制

### 单例条件函数

单例条件函数不需要注册到 FunctionRegistry，直接导入使用即可：

```typescript
import { hasErrorsCondition } from '@/services/workflow/functions/conditions';

// 直接使用
const result = await hasErrorsCondition(context, config);
```

### 工厂条件函数

工厂条件函数需要通过 FunctionRegistry 注册：

```typescript
import { FunctionRegistry } from '@/services/workflow/functions';
import { MaxIterationsReachedConditionFunction } from '@/services/workflow/functions/conditions';

// 注册
functionRegistry.registerFactory('condition:max_iterations_reached', {
  create: (config?: Record<string, any>) => {
    const func = new MaxIterationsReachedConditionFunction();
    func.initialize(config);
    return func;
  }
});

// 使用
const func = functionRegistry.getFunction('condition:max_iterations_reached', config);
const result = await func.execute(context, config);
```

## 内置条件函数列表

### 单例条件函数

| 函数ID | 名称 | 描述 | 版本 |
|--------|------|------|------|
| `condition:has_errors` | `has_errors` | 检查工作流状态中是否有错误 | 1.0.0 |
| `condition:has_tool_calls` | `has_tool_calls` | 检查工作流状态中是否有工具调用 | 1.0.0 |
| `condition:has_tool_results` | `has_tool_results` | 检查工作流状态中是否有工具执行结果 | 1.0.0 |
| `condition:no_tool_calls` | `no_tool_calls` | 检查工作流状态中是否没有工具调用 | 1.0.0 |

### 工厂条件函数

| 函数ID | 名称 | 描述 | 版本 | 配置参数 |
|--------|------|------|------|----------|
| `condition:max_iterations_reached` | `max_iterations_reached` | 检查工作流执行是否达到最大迭代次数 | 1.0.0 | `maxIterations` (number, 默认10) |

## 总结

条件函数架构采用双模式设计，既保证了简单场景的性能，又支持复杂场景的灵活性。通过统一使用函数式条件，提供了强大的可扩展性和类型安全性。

**核心优势**：
- ✅ 统一的函数式接口
- ✅ 双模式支持（单例+工厂）
- ✅ 配置化支持
- ✅ 类型安全
- ✅ 易于测试
- ✅ 高性能
- ✅ 可扩展性强
- ✅ 统一的注册机制（FunctionRegistry）