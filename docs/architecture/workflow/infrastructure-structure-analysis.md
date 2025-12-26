# src/infrastructure/workflow 目录结构调整分析

## 当前结构分析

### 现有目录结构

```
src/infrastructure/workflow/
├── edges/evaluators/          # 边评估器
│   ├── condition-evaluator.ts
│   ├── edge-evaluator.ts
│   ├── expression-evaluator.ts
│   ├── transition-evaluator.ts
│   └── index.ts
├── execution/                  # 执行上下文接口
│   ├── execution-context.interface.ts
│   └── index.ts
├── extensions/                 # 扩展机制
│   ├── hooks/                  # 钩子系统
│   ├── plugins/                # 插件系统
│   └── triggers/               # 触发器系统
├── functions/                  # 函数系统
│   ├── base/                   # 基础函数类
│   ├── builtin/                # 内置函数
│   │   ├── conditions/         # 条件函数
│   │   ├── nodes/              # 节点函数
│   │   ├── routing/            # 路由函数
│   │   └── triggers/           # 触发器函数
│   ├── common/                 # 通用工具
│   ├── executors/              # 函数执行器
│   └── registry/               # 函数注册表
├── interfaces/                 # 接口定义
│   ├── edge-evaluator.interface.ts
│   ├── execution-context-manager.interface.ts
│   ├── graph-algorithm-service.interface.ts
│   └── node-executor.interface.ts
├── nodes/                      # 节点执行器
│   ├── executors/              # 节点执行器实现
│   └── factories/              # 节点执行器工厂
├── routing/                    # 路由相关
│   ├── edge-condition-evaluator.ts
│   └── node-router.ts
├── services/                   # 服务
│   ├── graph-algorithm-service.ts
│   └── graph-validation-service.ts
├── state/                      # 状态管理
│   ├── state-persistence-service.ts
│   ├── state-query-service.ts
│   └── state-transition-manager.ts
└── strategies/                 # 执行策略
    ├── conditional-strategy.ts
    ├── execution-strategy.ts
    ├── parallel-strategy.ts
    └── sequential-strategy.ts
```

### workflow-example 结构对比

```
src/workflow-example/
├── types/                      # 类型定义
├── entities/                   # 实体（数据容器）
│   ├── node.ts
│   ├── edge.ts
│   └── trigger.ts
├── functions/                  # 函数（行为实现）
│   ├── nodes/                  # 节点函数
│   ├── edges/                  # 边函数
│   └── triggers/               # 触发器函数
├── engine/                     # 执行引擎
│   ├── execution-context.ts
│   └── workflow-engine.ts
└── examples/                   # 示例
```

## 问题分析

### 1. 节点执行器与函数系统重复

**现状**：
- `nodes/executors/` 目录包含节点执行器类（如 [`LLMNodeExecutor`](../src/infrastructure/workflow/nodes/executors/llm-node-executor.ts:14)）
- `functions/builtin/nodes/` 目录包含节点函数类（如 [`LLMNodeFunction`](../src/infrastructure/workflow/functions/builtin/nodes/llm-node.function.ts:9)）
- 两者功能重复，都是执行节点逻辑

**问题**：
- 代码重复
- 维护成本高
- 容易出现不一致

### 2. 边评估器分散

**现状**：
- `edges/evaluators/` 目录包含多个评估器
- `routing/edge-condition-evaluator.ts` 也有边评估逻辑
- `functions/common/expression-evaluator.ts` 有表达式求值逻辑

**问题**：
- 职责不清晰
- 逻辑分散
- 难以维护

### 3. 函数系统过于复杂

**现状**：
- `functions/base/base-workflow-function.ts` 定义基础函数类
- `functions/executors/function-executor.ts` 定义函数执行器
- `functions/registry/function-registry.ts` 定义函数注册表
- `functions/builtin/` 包含各种内置函数

**问题**：
- 抽象层次过多
- 学习成本高
- 使用复杂

### 4. 执行上下文不统一

**现状**：
- `execution/execution-context.interface.ts` 定义接口
- 没有统一的实现
- 各组件使用不同的上下文实现

**问题**：
- 不一致
- 难以测试
- 功能不完整

### 5. 触发器系统独立

**现状**：
- `extensions/triggers/` 是独立的触发器系统
- 与函数系统分离
- 与 workflow-example 的设计不一致

**问题**：
- 设计不一致
- 难以扩展
- 学习成本高

## 调整建议

### 建议的新结构

```
src/infrastructure/workflow/
├── types/                      # 类型定义（新增）
│   ├── function-types.ts       # 函数类型
│   └── index.ts
├── execution/                  # 执行相关
│   ├── execution-context.ts    # 执行上下文实现（新增）
│   ├── execution-context.interface.ts
│   └── index.ts
├── functions/                  # 函数系统（简化）
│   ├── registry/               # 函数注册表
│   │   ├── function-registry.ts
│   │   └── simplified-function-registry.ts（新增）
│   ├── wrappers/               # 函数包装器（新增）
│   │   ├── function-node-executor.ts
│   │   ├── function-edge-evaluator.ts
│   │   └── function-trigger-evaluator.ts
│   ├── builtin/                # 内置函数（简化）
│   │   ├── nodes/              # 节点函数
│   │   ├── edges/              # 边函数（新增）
│   │   ├── triggers/           # 触发器函数（新增）
│   │   └── index.ts
│   └── index.ts
├── evaluators/                 # 评估器（新增，整合）
│   ├── expression-evaluator.ts # 表达式求值器
│   ├── condition-evaluator.ts  # 条件评估器
│   └── index.ts
├── strategies/                 # 执行策略
│   ├── execution-strategy.ts
│   ├── sequential-strategy.ts
│   ├── parallel-strategy.ts
│   └── index.ts
├── engine/                     # 执行引擎（新增）
│   ├── workflow-engine.ts
│   └── index.ts
├── extensions/                 # 扩展机制
│   ├── hooks/
│   ├── plugins/
│   └── index.ts
├── services/                   # 服务
│   ├── graph-algorithm-service.ts
│   ├── graph-validation-service.ts
│   └── index.ts
├── state/                      # 状态管理
│   ├── state-persistence-service.ts
│   ├── state-query-service.ts
│   ├── state-transition-manager.ts
│   └── index.ts
└── index.ts
```

### 具体调整方案

#### 1. 删除重复的节点执行器

**删除**：
- `nodes/executors/` 目录（所有节点执行器类）
- `nodes/factories/` 目录（节点执行器工厂）

**原因**：
- 节点执行逻辑通过函数系统实现
- 使用函数包装器统一管理

**迁移**：
- 将节点执行逻辑迁移到 `functions/builtin/nodes/`
- 使用 `FunctionNodeExecutor` 包装器

#### 2. 整合边评估器

**删除**：
- `edges/evaluators/` 目录（保留必要的接口）
- `routing/edge-condition-evaluator.ts`

**新增**：
- `evaluators/expression-evaluator.ts` - 统一的表达式求值器
- `evaluators/condition-evaluator.ts` - 统一的条件评估器

**原因**：
- 边评估逻辑通过函数系统实现
- 使用 `FunctionEdgeEvaluator` 包装器

#### 3. 简化函数系统

**保留**：
- `functions/registry/function-registry.ts` - 现有注册表（向后兼容）
- `functions/builtin/` - 内置函数

**新增**：
- `functions/registry/simplified-function-registry.ts` - 简化的注册表
- `functions/wrappers/` - 函数包装器
- `functions/types/function-types.ts` - 函数类型定义

**删除**：
- `functions/base/base-workflow-function.ts` - 使用函数类型替代
- `functions/executors/function-executor.ts` - 使用包装器替代

#### 4. 统一执行上下文

**新增**：
- `execution/workflow-execution-context.ts` - 统一的执行上下文实现

**保留**：
- `execution/execution-context.interface.ts` - 接口定义

**原因**：
- 提供一致的执行上下文实现
- 添加事件管理功能
- 简化使用

#### 5. 整合触发器系统

**保留**：
- `extensions/triggers/` - 作为扩展机制

**新增**：
- `functions/builtin/triggers/` - 触发器函数
- `functions/wrappers/function-trigger-evaluator.ts` - 触发器包装器

**原因**：
- 触发器作为函数系统的一部分
- 保持扩展机制的灵活性

#### 6. 新增执行引擎

**新增**：
- `engine/workflow-engine.ts` - 工作流执行引擎

**原因**：
- 参考 workflow-example 的设计
- 提供统一的执行入口
- 简化使用

## 迁移步骤

### 阶段1：创建新的类型和包装器（不影响现有功能）

1. 创建 `types/function-types.ts`
2. 创建 `wrappers/function-node-executor.ts`
3. 创建 `wrappers/function-edge-evaluator.ts`
4. 创建 `wrappers/function-trigger-evaluator.ts`
5. 创建 `registry/simplified-function-registry.ts`

### 阶段2：创建统一的执行上下文

1. 创建 `execution/workflow-execution-context.ts`
2. 更新现有代码使用新的执行上下文
3. 添加单元测试

### 阶段3：整合评估器

1. 创建 `evaluators/expression-evaluator.ts`
2. 创建 `evaluators/condition-evaluator.ts`
3. 迁移现有评估逻辑
4. 删除旧的评估器

### 阶段4：迁移节点执行器

1. 将节点执行逻辑迁移到 `functions/builtin/nodes/`
2. 使用 `FunctionNodeExecutor` 包装器
3. 删除 `nodes/executors/` 目录
4. 删除 `nodes/factories/` 目录

### 阶段5：整合边评估器

1. 将边评估逻辑迁移到 `functions/builtin/edges/`
2. 使用 `FunctionEdgeEvaluator` 包装器
3. 删除 `edges/evaluators/` 目录
4. 删除 `routing/edge-condition-evaluator.ts`

### 阶段6：整合触发器系统

1. 将触发器逻辑迁移到 `functions/builtin/triggers/`
2. 使用 `FunctionTriggerEvaluator` 包装器
3. 更新 `extensions/triggers/` 使用新的触发器函数

### 阶段7：创建执行引擎

1. 创建 `engine/workflow-engine.ts`
2. 实现执行引擎
3. 添加单元测试
4. 更新文档

### 阶段8：清理和优化

1. 删除不再使用的文件
2. 更新导入路径
3. 更新文档
4. 添加示例

## 代码示例

### 1. 简化的函数注册表

```typescript
// src/infrastructure/workflow/functions/registry/simplified-function-registry.ts

import { NodeExecutorFunction, EdgeEvaluatorFunction, TriggerEvaluatorFunction } from '../types/function-types';

/**
 * 简化的函数注册表
 * 参考 workflow-example 的设计
 */
export class SimplifiedFunctionRegistry {
  private nodeFunctions: Map<string, NodeExecutorFunction> = new Map();
  private edgeFunctions: Map<string, EdgeEvaluatorFunction> = new Map();
  private triggerFunctions: Map<string, TriggerEvaluatorFunction> = new Map();

  /**
   * 注册节点函数
   */
  registerNodeFunction(nodeType: string, func: NodeExecutorFunction): void {
    this.nodeFunctions.set(nodeType, func);
  }

  /**
   * 注册边函数
   */
  registerEdgeFunction(edgeType: string, func: EdgeEvaluatorFunction): void {
    this.edgeFunctions.set(edgeType, func);
  }

  /**
   * 注册触发器函数
   */
  registerTriggerFunction(triggerType: string, func: TriggerEvaluatorFunction): void {
    this.triggerFunctions.set(triggerType, func);
  }

  /**
   * 获取节点函数
   */
  getNodeFunction(nodeType: string): NodeExecutorFunction | undefined {
    return this.nodeFunctions.get(nodeType);
  }

  /**
   * 获取边函数
   */
  getEdgeFunction(edgeType: string): EdgeEvaluatorFunction | undefined {
    return this.edgeFunctions.get(edgeType);
  }

  /**
   * 获取触发器函数
   */
  getTriggerFunction(triggerType: string): TriggerEvaluatorFunction | undefined {
    return this.triggerFunctions.get(triggerType);
  }
}

// 导出单例
export const simplifiedFunctionRegistry = new SimplifiedFunctionRegistry();
```

### 2. 函数包装器

```typescript
// src/infrastructure/workflow/functions/wrappers/function-node-executor.ts

import { NodeExecutorFunction, NodeInput, NodeConfig, NodeOutput } from '../types/function-types';
import { IExecutionContext } from '../../execution/execution-context.interface';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 函数节点执行器
 * 将函数包装为执行器
 */
export class FunctionNodeExecutor {
  private readonly executorFunction: NodeExecutorFunction;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    executorFunction: NodeExecutorFunction
  ) {
    this.executorFunction = executorFunction;
  }

  /**
   * 执行节点
   */
  async execute(input: NodeInput, config: NodeConfig, context: IExecutionContext): Promise<NodeOutput> {
    return await this.executorFunction(input, config, context);
  }
}
```

### 3. 统一的执行上下文

```typescript
// src/infrastructure/workflow/execution/workflow-execution-context.ts

import { IExecutionContext } from './execution-context.interface';
import { NodeOutput } from '../functions/types/function-types';

/**
 * 工作流执行上下文实现
 * 参考 workflow-example 的设计
 */
export class WorkflowExecutionContext implements IExecutionContext {
  private readonly _executionId: string;
  private readonly _workflowId: string;
  private readonly _data: Map<string, any>;
  private readonly _nodeResults: Map<string, NodeOutput>;
  private readonly _recentEvents: Map<string, any>;
  private readonly _startTime: number;

  constructor(workflowId: string, executionId?: string) {
    this._workflowId = workflowId;
    this._executionId = executionId || this.generateExecutionId();
    this._data = new Map();
    this._nodeResults = new Map();
    this._recentEvents = new Map();
    this._startTime = Date.now();

    // 初始化工作流级别的变量
    this._data.set('workflow', {
      id: workflowId,
      executionId: this._executionId,
      startTime: this._startTime
    });
  }

  get executionId(): string {
    return this._executionId;
  }

  get workflowId(): string {
    return this._workflowId;
  }

  get startTime(): number {
    return this._startTime;
  }

  /**
   * 设置变量
   */
  setVariable(path: string, value: any): void {
    const parts = path.split('.');
    const key = parts[0];

    if (!key) {
      return;
    }

    if (parts.length === 1) {
      this._data.set(key, value);
    } else {
      const current = this._data.get(key) || {};
      const nestedValue = this.setNestedValue(current, parts.slice(1), value);
      this._data.set(key, nestedValue);
    }
  }

  /**
   * 获取变量
   */
  getVariable(path: string): any {
    const parts = path.split('.');
    const key = parts[0];

    if (!key) {
      return undefined;
    }

    if (parts.length === 1) {
      return this._data.get(key);
    }

    const current = this._data.get(key);
    if (current === null || current === undefined) {
      return undefined;
    }

    return this.getNestedValue(current, parts.slice(1));
  }

  /**
   * 获取所有数据
   */
  getAllData(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of this._data.entries()) {
      result[key] = value;
    }

    // 添加节点结果
    result['node'] = {};
    for (const [nodeId, output] of this._nodeResults.entries()) {
      result['node'][nodeId] = {
        success: output.success,
        data: output.data,
        error: output.error
      };
    }

    return result;
  }

  /**
   * 设置节点执行结果
   */
  setNodeResult(nodeId: string, result: NodeOutput): void {
    this._nodeResults.set(nodeId, result);

    // 同时设置到数据中，方便访问
    this.setVariable(`node.${nodeId}`, {
      success: result.success,
      data: result.data,
      error: result.error
    });
  }

  /**
   * 获取节点执行结果
   */
  getNodeResult(nodeId: string): NodeOutput | undefined {
    return this._nodeResults.get(nodeId);
  }

  /**
   * 设置最近的事件
   */
  setRecentEvent(eventType: string, event: any): void {
    this._recentEvents.set(eventType, event);
  }

  /**
   * 获取最近的事件
   */
  getRecentEvent(eventType: string): any {
    return this._recentEvents.get(eventType);
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this._data.clear();
    this._nodeResults.clear();
    this._recentEvents.clear();
  }

  /**
   * 获取执行时长（毫秒）
   */
  getExecutionDuration(): number {
    return Date.now() - this._startTime;
  }

  /**
   * 获取已执行的节点数量
   */
  getExecutedNodeCount(): number {
    return this._nodeResults.size;
  }

  /**
   * 获取成功的节点数量
   */
  getSuccessNodeCount(): number {
    let count = 0;
    for (const result of this._nodeResults.values()) {
      if (result.success) {
        count++;
      }
    }
    return count;
  }

  /**
   * 获取失败的节点数量
   */
  getFailedNodeCount(): number {
    let count = 0;
    for (const result of this._nodeResults.values()) {
      if (!result.success) {
        count++;
      }
    }
    return count;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, path: string[], value: any): any {
    if (path.length === 0) {
      return value;
    }

    const key = path[0];
    if (!key) {
      return obj;
    }

    const remaining = path.slice(1);

    if (obj === null || typeof obj !== 'object') {
      obj = {};
    }

    if (remaining.length === 0) {
      obj[key] = value;
    } else {
      obj[key] = this.setNestedValue(obj[key] || {}, remaining, value);
    }

    return obj;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string[]): any {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    if (path.length === 0) {
      return obj;
    }

    const key = path[0];
    if (!key) {
      return undefined;
    }

    const remaining = path.slice(1);

    if (key in obj) {
      return this.getNestedValue(obj[key], remaining);
    }

    return undefined;
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 转换为字符串表示
   */
  toString(): string {
    return `WorkflowExecutionContext(workflowId=${this._workflowId}, executionId=${this._executionId}, nodes=${this._nodeResults.size})`;
  }
}
```

### 4. 表达式求值器

```typescript
// src/infrastructure/workflow/evaluators/expression-evaluator.ts

import { IExecutionContext } from '../execution/execution-context.interface';

/**
 * 表达式求值器
 * 参考 workflow-example 的设计
 */
export class ExpressionEvaluator {
  /**
   * 评估表达式
   */
  evaluate(expression: string, context: IExecutionContext): any {
    // 替换变量占位符
    const processedExpr = this.replacePlaceholders(expression, context.getAllData());
    // 安全求值
    return this.safeEvaluate(processedExpr);
  }

  /**
   * 替换变量占位符
   */
  private replacePlaceholders(expression: string, data: Record<string, any>): string {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;

    return expression.replace(placeholderRegex, (match, path) => {
      const value = this.getValueByPath(data, path.trim());
      return this.valueToString(value);
    });
  }

  /**
   * 根据路径获取值
   */
  private getValueByPath(data: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current: any = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * 将值转换为字符串
   */
  private valueToString(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * 安全求值
   */
  private safeEvaluate(expression: string): any {
    const trimmed = expression.trim();

    // 布尔值
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    // 数字
    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return Number(trimmed);
    }

    // 字符串（带引号）
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1);
    }

    // 比较表达式
    const comparisonRegex = /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;
    const match = trimmed.match(comparisonRegex);

    if (match) {
      const [, left, operator = '', right] = match;
      const leftValue = this.parseValue(left);
      const rightValue = this.parseValue(right);

      switch (operator) {
        case '==':
          return leftValue == rightValue;
        case '!=':
          return leftValue != rightValue;
        case '>=':
          return leftValue >= rightValue;
        case '<=':
          return leftValue <= rightValue;
        case '>':
          return leftValue > rightValue;
        case '<':
          return leftValue < rightValue;
        default:
          return false;
      }
    }

    // 默认返回原始值
    return trimmed;
  }

  /**
   * 解析值
   */
  private parseValue(str?: string): any {
    if (!str) return undefined;

    const trimmed = str.trim();

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return Number(trimmed);
    }

    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }
}

// 导出单例
export const expressionEvaluator = new ExpressionEvaluator();
```

## 总结

通过以上调整，`src/infrastructure/workflow` 目录将更加清晰、简洁和易于维护：

1. **消除重复**：删除节点执行器和边评估器的重复实现
2. **统一设计**：采用函数式编程风格，与 workflow-example 保持一致
3. **简化结构**：减少抽象层次，降低学习成本
4. **提高可维护性**：逻辑集中，易于理解和修改
5. **保持扩展性**：通过函数注册表和包装器支持扩展

这些调整将使基础设施层更加符合函数式编程的设计思想，同时保持 DDD 架构的优势。