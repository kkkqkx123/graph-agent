# 类型安全的工作流函数使用指南

## 概述

本文档介绍如何使用类型安全的工作流函数基类体系。新的设计通过泛型约束和专用基类，为不同类型的组件（节点、条件、路由、触发器）提供了严格的类型检查。

## 核心概念

### 1. WorkflowExecutionContext

统一的执行上下文接口，提供类型安全的上下文访问：

```typescript
interface WorkflowExecutionContext {
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getExecutionId(): string;
  getWorkflowId(): string;
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
}
```

### 2. 类型化的函数基类

#### TypedWorkflowFunction<TConfig, TResult>

通用的类型化函数基类，使用泛型约束输入输出类型：

```typescript
abstract class TypedWorkflowFunction<TConfig, TResult> extends BaseWorkflowFunction {
  abstract executeTyped(context: WorkflowExecutionContext, config: TConfig): Promise<TResult>;
}
```

#### BaseNodeFunction<TConfig>

节点函数专用基类，返回 `NodeFunctionResult`：

```typescript
abstract class BaseNodeFunction<TConfig extends NodeFunctionConfig = NodeFunctionConfig>
  extends TypedWorkflowFunction<TConfig, NodeFunctionResult>
```

#### BaseConditionFunction<TConfig>

条件函数专用基类，返回 `boolean`：

```typescript
abstract class BaseConditionFunction<TConfig extends ConditionFunctionConfig = ConditionFunctionConfig>
  extends TypedWorkflowFunction<TConfig, boolean>
```

#### BaseRoutingFunction<TConfig>

路由函数专用基类，返回 `boolean`：

```typescript
abstract class BaseRoutingFunction<TConfig extends RoutingFunctionConfig = RoutingFunctionConfig>
  extends TypedWorkflowFunction<TConfig, boolean>
```

#### BaseTriggerFunction<TConfig>

触发器函数专用基类，返回 `boolean`：

```typescript
abstract class BaseTriggerFunction<TConfig extends TriggerFunctionConfig = TriggerFunctionConfig>
  extends TypedWorkflowFunction<TConfig, boolean>
```

## 使用示例

### 示例1：创建节点函数

```typescript
import { injectable } from 'inversify';
import {
  BaseNodeFunction,
  NodeFunctionConfig,
  NodeFunctionResult,
  WorkflowExecutionContext
} from '../../base/typed-workflow-function';

// 1. 定义配置接口
interface MyNodeConfig extends NodeFunctionConfig {
  input: string;
  threshold?: number;
}

// 2. 创建节点函数类
@injectable()
export class MyNodeFunction extends BaseNodeFunction<MyNodeConfig> {
  constructor() {
    super(
      'node:my_node',
      'my_node',
      '我的节点函数描述',
      '1.0.0',
      'builtin'
    );
  }

  // 3. 实现类型安全的执行方法
  async executeTyped(context: WorkflowExecutionContext, config: MyNodeConfig): Promise<NodeFunctionResult> {
    try {
      // 执行业务逻辑
      const result = this.processData(config.input, config.threshold);

      // 更新上下文
      context.setVariable('my_result', result);

      return {
        success: true,
        output: result,
        metadata: {
          input: config.input,
          threshold: config.threshold
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 4. 可选：实现配置验证
  protected validateTypedConfig(config: MyNodeConfig): string[] {
    const errors: string[] = [];

    if (!config.input || typeof config.input !== 'string') {
      errors.push('input是必需的字符串参数');
    }

    if (config.threshold !== undefined && config.threshold < 0) {
      errors.push('threshold必须是非负数');
    }

    return errors;
  }

  private processData(input: string, threshold?: number): any {
    // 业务逻辑实现
    return { processed: input, threshold };
  }
}
```

### 示例2：创建条件函数

```typescript
import { injectable } from 'inversify';
import {
  BaseConditionFunction,
  ConditionFunctionConfig,
  WorkflowExecutionContext
} from '../../base/typed-workflow-function';

interface MyConditionConfig extends ConditionFunctionConfig {
  variableName: string;
  expectedValue: any;
}

@injectable()
export class MyConditionFunction extends BaseConditionFunction<MyConditionConfig> {
  constructor() {
    super(
      'condition:my_condition',
      'my_condition',
      '我的条件函数描述',
      '1.0.0',
      'builtin'
    );
  }

  async executeTyped(context: WorkflowExecutionContext, config: MyConditionConfig): Promise<boolean> {
    const value = context.getVariable(config.variableName);
    return value === config.expectedValue;
  }

  protected validateTypedConfig(config: MyConditionConfig): string[] {
    const errors: string[] = [];

    if (!config.variableName) {
      errors.push('variableName是必需的');
    }

    return errors;
  }
}
```

### 示例3：创建路由函数

```typescript
import {
  BaseRoutingFunction,
  RoutingFunctionConfig,
  WorkflowExecutionContext
} from '../../base/typed-workflow-function';

interface MyRoutingConfig extends RoutingFunctionConfig {
  minSuccessRate: number;
}

export class MyRoutingFunction extends BaseRoutingFunction<MyRoutingConfig> {
  constructor() {
    super(
      'routing:my_routing',
      'my_routing',
      '我的路由函数描述',
      '1.0.0',
      'builtin'
    );
  }

  async executeTyped(context: WorkflowExecutionContext, config: MyRoutingConfig): Promise<boolean> {
    const nodeStates = config.nodeStates;
    if (!nodeStates) {
      return false;
    }

    // 计算成功率
    let successCount = 0;
    let totalCount = 0;

    for (const [nodeId, state] of nodeStates) {
      totalCount++;
      if (state?.status?.isSuccess?.()) {
        successCount++;
      }
    }

    const successRate = totalCount > 0 ? successCount / totalCount : 0;
    return successRate >= config.minSuccessRate;
  }

  protected validateTypedConfig(config: MyRoutingConfig): string[] {
    const errors: string[] = [];

    if (config.minSuccessRate === undefined || config.minSuccessRate < 0 || config.minSuccessRate > 1) {
      errors.push('minSuccessRate必须是0-1之间的数字');
    }

    return errors;
  }
}
```

## 多函数执行

### 场景1：顺序执行多个节点函数

在workflow执行策略中，节点会按照定义的顺序依次执行：

```typescript
// 在 SequentialStrategy 中
for (const nodeId of nodeIds) {
  const node = workflow.getNode(nodeId);
  const result = await nodeExecutor.execute(node, context);
  // 结果会自动存储到上下文中
}
```

### 场景2：并行执行多个节点函数

在workflow执行策略中，可以使用并行执行：

```typescript
// 在 ParallelStrategy 中
const promises = nodeIds.map(nodeId => {
  const node = workflow.getNode(nodeId);
  return nodeExecutor.execute(node, context);
});

const results = await Promise.all(promises);
```

### 场景3：条件执行

在workflow执行策略中，根据条件函数的结果决定执行路径：

```typescript
// 在 ConditionalStrategy 中
const canExecute = await conditionFunction.execute(context, config);
if (canExecute) {
  // 执行目标节点
  await nodeExecutor.execute(targetNode, context);
}
```

## 类型安全优势

### 1. 编译时类型检查

```typescript
// ✅ 类型安全
const config: LLMNodeConfig = {
  prompt: 'Hello',
  model: 'gpt-4',
  temperature: 0.7
};

// ❌ 编译错误
const badConfig: LLMNodeConfig = {
  prompt: 123, // 类型错误
  temperature: 'high' // 类型错误
};
```

### 2. 自动补全和IDE支持

IDE会根据配置接口提供自动补全和类型提示：

```typescript
config. // IDE会提示: prompt, model, temperature, maxTokens
```

### 3. 返回类型约束

```typescript
// 节点函数返回 NodeFunctionResult
const result: NodeFunctionResult = await nodeFunction.executeTyped(context, config);

// 条件函数返回 boolean
const condition: boolean = await conditionFunction.executeTyped(context, config);
```

## 迁移指南

### 从旧版本迁移

如果你有使用旧版 `BaseWorkflowFunction` 的代码，可以按以下步骤迁移：

1. **定义配置接口**：
```typescript
interface MyConfig extends NodeFunctionConfig {
  // 你的配置字段
}
```

2. **继承专用基类**：
```typescript
// 旧版本
export class MyFunction extends BaseWorkflowFunction {
  async execute(context: any, config: any): Promise<any> {
    // ...
  }
}

// 新版本
export class MyFunction extends BaseNodeFunction<MyConfig> {
  async executeTyped(context: WorkflowExecutionContext, config: MyConfig): Promise<NodeFunctionResult> {
    // ...
  }
}
```

3. **更新配置验证**：
```typescript
// 旧版本
protected validateCustomConfig(config: any): string[] {
  // ...
}

// 新版本
protected validateTypedConfig(config: MyConfig): string[] {
  // 现在config有类型提示
}
```

## 最佳实践

### 1. 始终定义配置接口

```typescript
// ✅ 推荐
interface MyConfig extends NodeFunctionConfig {
  field1: string;
  field2?: number;
}

// ❌ 不推荐
async executeTyped(context: WorkflowExecutionContext, config: any): Promise<NodeFunctionResult> {
  const field1 = config.field1; // 没有类型检查
}
```

### 2. 使用可选字段

```typescript
interface MyConfig extends NodeFunctionConfig {
  requiredField: string;
  optionalField?: number; // 使用 ? 标记可选字段
}
```

### 3. 提供默认值

```typescript
async executeTyped(context: WorkflowExecutionContext, config: MyConfig): Promise<NodeFunctionResult> {
  const threshold = config.threshold ?? 0.5; // 使用 ?? 提供默认值
  // ...
}
```

### 4. 实现配置验证

```typescript
protected validateTypedConfig(config: MyConfig): string[] {
  const errors: string[] = [];

  if (!config.requiredField) {
    errors.push('requiredField是必需的');
  }

  if (config.optionalField !== undefined && config.optionalField < 0) {
    errors.push('optionalField必须是非负数');
  }

  return errors;
}
```

### 5. 返回标准化的结果

```typescript
async executeTyped(context: WorkflowExecutionContext, config: MyConfig): Promise<NodeFunctionResult> {
  try {
    const result = await this.doWork(config);
    return {
      success: true,
      output: result,
      metadata: {
        // 添加有用的元数据
        timestamp: new Date().toISOString(),
        config: config
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

## 总结

新的类型安全函数基类体系提供了：

1. **严格的类型检查**：编译时捕获类型错误
2. **更好的IDE支持**：自动补全和类型提示
3. **清晰的接口定义**：每种组件类型都有专用的基类
4. **统一的返回格式**：标准化的结果结构
5. **易于维护**：类型约束使代码更清晰

通过使用这些基类，你可以创建类型安全、易于维护的工作流函数。