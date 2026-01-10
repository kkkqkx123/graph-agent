# Edge 函数式条件集成指南

## 概述

本文档详细说明了如何在Edge中使用函数式条件进行路由控制。函数式条件提供了强大的可扩展性、类型安全性和配置化支持。

## 核心概念

### 函数式条件

函数式条件是通过注册的条件函数来判断Edge是否应该被触发的方式。相比表达式式条件，函数式条件具有以下优势：

- ✅ **可扩展性强**：支持任意复杂的业务逻辑
- ✅ **类型安全**：TypeScript类型检查，编译时发现错误
- ✅ **易于测试**：函数可以单独测试
- ✅ **可复用性**：一次定义，多处使用
- ✅ **配置化**：通过配置文件控制具体行为
- ✅ **安全性高**：函数注册机制控制访问

### 条件函数类型

条件函数支持两种实现模式：

1. **单例模式**：逻辑完全固定、无需配置，预实例化，性能最优
2. **工厂模式**：支持配置，支持动态分发，可从配置文件加载参数

## 使用方法

### 1. 基本用法

#### 使用单例条件函数

```typescript
import { EdgeValueObject, EdgeType, EdgeContextFilter } from '@/domain/workflow/value-objects/edge';

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

#### 使用工厂条件函数

```typescript
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

### 2. 内置条件函数

#### has_errors

检查工作流状态中是否有错误。

**函数ID**：`condition:has_errors`
**类型**：单例
**配置参数**：
- `checkToolResults` (boolean, 可选)：检查工具结果中的错误，默认true
- `checkMessages` (boolean, 可选)：检查消息中的错误，默认true

**示例**：
```typescript
condition: {
  type: 'function',
  functionId: 'condition:has_errors',
  config: {
    checkToolResults: true,
    checkMessages: true
  }
}
```

#### has_tool_calls

检查工作流状态中是否有工具调用。

**函数ID**：`condition:has_tool_calls`
**类型**：单例
**配置参数**：无

**示例**：
```typescript
condition: {
  type: 'function',
  functionId: 'condition:has_tool_calls'
}
```

#### has_tool_results

检查工作流状态中是否有工具执行结果。

**函数ID**：`condition:has_tool_results`
**类型**：单例
**配置参数**：无

**示例**：
```typescript
condition: {
  type: 'function',
  functionId: 'condition:has_tool_results'
}
```

#### no_tool_calls

检查工作流状态中是否没有工具调用。

**函数ID**：`condition:no_tool_calls`
**类型**：单例
**配置参数**：无

**示例**：
```typescript
condition: {
  type: 'function',
  functionId: 'condition:no_tool_calls'
}
```

#### max_iterations_reached

检查工作流执行是否达到最大迭代次数。

**函数ID**：`condition:max_iterations_reached`
**类型**：工厂
**配置参数**：
- `maxIterations` (number, 可选)：最大迭代次数，默认10

**示例**：
```typescript
condition: {
  type: 'function',
  functionId: 'condition:max_iterations_reached',
  config: {
    maxIterations: 20
  }
}
```

### 3. 创建自定义条件函数

#### 创建单例条件函数

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

#### 创建工厂条件函数

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

### 4. 配置文件支持

#### 定义基础配置

在配置文件中定义条件函数的基础配置：

```toml
[functions.MaxIterationsReachedConditionFunction]
maxIterations = 15
```

#### 运行时配置覆盖

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

## 实际应用场景

### 场景1：错误处理路由

```typescript
// 当有错误时，路由到错误处理节点
const errorEdge = EdgeValueObject.create({
  id: EdgeId.generate(),
  type: EdgeType.conditional(),
  fromNodeId: processNodeId,
  toNodeId: errorHandlingNodeId,
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

// 当没有错误时，路由到下一个节点
const successEdge = EdgeValueObject.create({
  id: EdgeId.generate(),
  type: EdgeType.conditional(),
  fromNodeId: processNodeId,
  toNodeId: nextNodeId,
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

### 场景2：工具调用检测

```typescript
// 当有工具调用时，路由到工具执行节点
const toolCallEdge = EdgeValueObject.create({
  id: EdgeId.generate(),
  type: EdgeType.conditional(),
  fromNodeId: llmNodeId,
  toNodeId: toolExecutionNodeId,
  condition: {
    type: 'function',
    functionId: 'condition:has_tool_calls'
  },
  contextFilter: EdgeContextFilter.passAll()
});

// 当没有工具调用时，路由到结束节点
const noToolCallEdge = EdgeValueObject.create({
  id: EdgeId.generate(),
  type: EdgeType.conditional(),
  fromNodeId: llmNodeId,
  toNodeId: endNodeId,
  condition: {
    type: 'function',
    functionId: 'condition:no_tool_calls'
  },
  contextFilter: EdgeContextFilter.passAll()
});
```

### 场景3：迭代次数控制

```typescript
// 当达到最大迭代次数时，路由到结束节点
const maxIterationsEdge = EdgeValueObject.create({
  id: EdgeId.generate(),
  type: EdgeType.conditional(),
  fromNodeId: loopNodeId,
  toNodeId: endNodeId,
  condition: {
    type: 'function',
    functionId: 'condition:max_iterations_reached',
    config: {
      maxIterations: 10
    }
  },
  contextFilter: EdgeContextFilter.passAll()
});

// 当未达到最大迭代次数时，继续循环
const continueEdge = EdgeValueObject.create({
  id: EdgeId.generate(),
  type: EdgeType.conditional(),
  fromNodeId: loopNodeId,
  toNodeId: loopNodeId,
  condition: {
    type: 'function',
    functionId: 'condition:max_iterations_reached',
    config: {
      maxIterations: 10
    }
  },
  contextFilter: EdgeContextFilter.passAll()
});
```

## 最佳实践

### 1. 选择合适的条件函数类型

- **简单逻辑** → 使用单例条件函数
- **需要配置** → 使用工厂条件函数
- **需要复用** → 使用工厂条件函数
- **性能敏感** → 使用单例条件函数

### 2. 配置参数设计

- 使用有意义的参数名称
- 提供合理的默认值
- 添加详细的参数描述
- 实现参数验证

### 3. 错误处理

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

### 4. 性能优化

- 单例条件函数：预实例化，避免重复创建
- 工厂条件函数：配置缓存，延迟初始化
- 避免在条件函数中执行耗时操作

## 故障排查

### 问题1：条件函数未找到

**错误信息**：`条件函数 condition:xxx 未找到`

**解决方案**：
1. 检查函数ID是否正确
2. 确认条件函数已正确注册
3. 检查函数是否已导出

### 问题2：配置验证失败

**错误信息**：`配置验证失败: xxx`

**解决方案**：
1. 检查配置参数是否符合要求
2. 查看参数类型和约束
3. 确认必需参数已提供

### 问题3：条件函数执行失败

**错误信息**：`条件函数执行失败: xxx`

**解决方案**：
1. 检查上下文变量是否存在
2. 确认条件函数逻辑正确
3. 查看错误日志获取详细信息

## 总结

函数式条件为Edge路由控制提供了强大而灵活的机制。通过合理使用单例和工厂两种模式，可以在性能和灵活性之间取得平衡。

**核心优势**：
- ✅ 统一的函数式接口
- ✅ 双模式支持（单例+工厂）
- ✅ 配置化支持
- ✅ 类型安全
- ✅ 易于测试
- ✅ 高性能
- ✅ 可扩展性强

**相关文档**：
- [条件函数架构文档](./condition-function-architecture.md)
- [Edge值对象文档](./edge-value-object.md)
- [工作流执行文档](./workflow-execution.md)