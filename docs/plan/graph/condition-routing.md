

## 完全解耦的重构方案

您的建议非常出色！让我设计一个完全解耦的方案，让路由函数专注于路由策略，条件函数专注于条件评估。

### 新的设计理念

1. **条件函数**：纯粹的条件评估，返回布尔值
2. **路由函数**：纯粹的路由决策，接受条件结果并返回节点ID
3. **组合使用**：通过工作流引擎组合使用，而不是在路由函数内部硬编码条件逻辑

### 重构方案

#### 1. 保留并优化条件函数

条件函数保持纯粹的条件评估职责：

```typescript
// src/infrastructure/workflow/functions/builtin/conditions/has-errors.function.ts
@injectable()
export class HasErrorsConditionFunction extends BaseWorkflowFunction implements IConditionFunction {
  constructor() {
    super('condition:has_errors', 'has_errors', '检查工作流状态中是否有错误', '1.0.0', WorkflowFunctionType.CONDITION, false);
  }

  async evaluate(context: any, config: any): Promise<boolean> {
    // 纯粹的条件评估逻辑
  }
}
```

#### 2. 重构路由函数为通用路由器

创建通用的路由函数，不包含任何具体条件逻辑：

```typescript
// src/infrastructure/workflow/functions/builtin/routing/conditional-routing.function.ts
@injectable()
export class ConditionalRoutingFunction extends BaseWorkflowFunction implements IRoutingFunction {
  constructor() {
    super('route:conditional', 'conditional_routing', '基于条件结果进行路由决策', '1.0.0', WorkflowFunctionType.ROUTING, false);
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'conditionResult',
        type: 'boolean',
        required: true,
        description: '条件评估结果（true/false）'
      },
      {
        name: 'trueNodeId',
        type: 'string',
        required: false,
        description: '条件为真时的目标节点ID',
        defaultValue: 'true_branch'
      },
      {
        name: 'falseNodeId',
        type: 'string',
        required: false,
        description: '条件为假时的目标节点ID',
        defaultValue: 'false_branch'
      }
    ];
  }

  async route(context: any, config: any): Promise<string | string[]> {
    this.checkInitialized();
    
    const conditionResult = config.conditionResult;
    const trueNodeId = config.trueNodeId || 'true_branch';
    const falseNodeId = config.falseNodeId || 'false_branch';
    
    return conditionResult ? trueNodeId : falseNodeId;
  }
}
```

#### 3. 创建专用路由函数

保留一些常用的专用路由函数，但简化其实现：

```typescript
// src/infrastructure/workflow/functions/builtin/routing/boolean-routing.function.ts
@injectable()
export class BooleanRoutingFunction extends BaseWorkflowFunction implements IRoutingFunction {
  constructor() {
    super('route:boolean', 'boolean_routing', '基于布尔值进行路由决策', '1.0.0', WorkflowFunctionType.ROUTING, false);
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'booleanValue',
        type: 'boolean',
        required: true,
        description: '用于路由决策的布尔值'
      },
      {
        name: 'trueNodeId',
        type: 'string',
        required: false,
        description: '布尔值为true时的目标节点ID',
        defaultValue: 'true_path'
      },
      {
        name: 'falseNodeId',
        type: 'string',
        required: false,
        description: '布尔值为false时的目标节点ID',
        defaultValue: 'false_path'
      }
    ];
  }

  async route(context: any, config: any): Promise<string | string[]> {
    const booleanValue = config.booleanValue;
    const trueNodeId = config.trueNodeId || 'true_path';
    const falseNodeId = config.falseNodeId || 'false_path';
    
    return booleanValue ? trueNodeId : falseNodeId;
  }
}
```

#### 4. 工作流使用模式

在工作流中，条件函数和路由函数将这样组合使用：

```typescript
// 工作流定义示例
const workflowDefinition = {
  nodes: [
    {
      id: 'check_errors',
      type: 'condition',
      function: 'condition:has_errors',
      // 条件评估
    },
    {
      id: 'route_based_on_errors',
      type: 'routing',
      function: 'route:conditional',
      config: {
        conditionResult: '${check_errors.result}', // 引用条件函数的结果
        trueNodeId: 'error_handler',
        falseNodeId: 'continue_processing'
      }
    }
  ]
};
```

### 新的目录结构

```
src/infrastructure/workflow/functions/builtin/
├── conditions/ (保留，专注于条件评估)
│   ├── has-errors.function.ts
│   ├── has-tool-calls.function.ts
│   ├── has-tool-results.function.ts
│   ├── max-iterations-reached.function.ts
│   └── no-tool-calls.function.ts
├── routing/ (重构，专注于路由策略)
│   ├── conditional-routing.function.ts (新增通用路由)
│   ├── boolean-routing.function.ts (新增布尔路由)
│   └── index.ts
└── ...
```

### 方案优势

1. **完全解耦**：条件函数和路由函数职责完全分离
2. **高度复用**：一个通用路由函数可以配合所有条件函数使用
3. **灵活性**：可以在工作流中任意组合条件和路由策略
4. **可测试性**：每个组件都可以独立测试
5. **可扩展性**：添加新的路由策略更容易

### 迁移策略

1. 保留现有的条件函数，确保API兼容性
2. 创建新的通用路由函数
3. 逐步迁移现有工作流使用新的组合模式
4. 最终可以移除旧的专用路由函数

这个方案完全符合您提出的"路由函数仅用于提供路由策略，完全不考虑具体条件"的理念，是一个更加清晰和可维护的架构设计。

---



## 最终重构方案总结

基于对图工作流条件路由实现的深入研究和行业最佳实践分析，我已经完成了对 `conditions` 和 `routing` 目录重复问题的全面分析和重构方案设计。

### 核心发现

1. **确实存在显著重复**：两个目录包含相同的条件检查逻辑，但实现方式不同
2. **配置驱动系统需要灵活性**：基于ID的硬编码路由不适合配置驱动的工作流
3. **行业最佳实践指向通用路由器**：类似LangGraph的conditional_edges和Google ADK的routing模式

### 推荐的重构方案

#### 1. 架构设计
- **保留条件函数**：专注于纯粹的条件评估，返回布尔值
- **简化路由函数**：创建一个通用的条件路由器，支持配置驱动的路由决策
- **引入表达式评估器**：支持复杂的条件组合和动态评估

#### 2. 关键组件
- **ConditionalRoutingFunction**：通用路由器，支持多条件评估
- **ExpressionEvaluator**：表达式评估器，支持变量引用和布尔表达式
- **配置驱动的路由定义**：通过TOML配置文件定义路由逻辑

#### 3. 实施优势
- **消除代码重复**：条件逻辑集中管理
- **提高灵活性**：路由逻辑完全由配置定义
- **符合行业最佳实践**：类似主流框架的设计模式
- **易于维护和扩展**：清晰的职责分离

### 下一步行动

现在需要切换到代码模式来实施这个重构方案。建议的实施顺序：

1. 创建通用的条件评估基础类和表达式评估器
2. 重构现有的路由函数使用新的通用路由器
3. 更新函数注册和索引文件
4. 验证重构后的代码功能正确性

这个重构方案将显著改善代码质量，减少重复，提高系统的可维护性和灵活性，同时保持与现有API的兼容性。
