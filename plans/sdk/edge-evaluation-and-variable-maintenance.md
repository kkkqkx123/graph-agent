# 边评估和变量维护实施计划

## 问题分析

### 当前状态

1. **Router 实现**：[`sdk/core/execution/router.ts`](sdk/core/execution/router.ts) 已实现边评估逻辑
2. **VariableManager 实现**：[`sdk/core/state/variable-manager.ts`](sdk/core/state/variable-manager.ts) 已实现变量管理
3. **类型定义**：
   - [`sdk/types/thread.ts`](sdk/types/thread.ts) 定义了 `ThreadVariable` 类型
   - [`sdk/types/edge.ts`](sdk/types/edge.ts) 定义了边条件类型

### 核心问题

#### 问题 1：Thread 变量存储结构不匹配

**现状：**
- [`Thread`](sdk/types/thread.ts:109) 类型中 `variables` 字段是 `ThreadVariable[]` 数组
- [`VariableManager`](sdk/core/state/variable-manager.ts:12) 使用 `Map<string, Map<string, ThreadVariable>>` 存储变量
- [`Router.getVariableValue()`](sdk/core/execution/router.ts:147) 尝试从 `thread` 对象直接访问变量，但 `thread.variables` 是数组

**影响：**
- 边条件评估无法正确获取变量值
- 条件边路由逻辑完全无效
- 变量路径访问（如 `output.data.items[0].name`）无法工作

#### 问题 2：变量值访问方式不一致

**现状：**
- `VariableManager` 提供了 `getVariable(threadId, name)` 方法
- `Router.getVariableValue()` 需要通过路径访问变量
- 两者之间缺少桥梁

**影响：**
- 无法支持嵌套变量访问
- 无法支持 `output`、`input` 等特殊变量访问

## 解决方案

### 方案 1：扩展 Thread 类型

#### 1.1 修改 Thread 类型定义

**文件：** [`sdk/types/thread.ts`](sdk/types/thread.ts)

**修改内容：**
```typescript
export interface Thread {
  // ... 现有字段

  /** 变量对象数组（用于持久化和元数据） */
  variables: ThreadVariable[];

  /** 变量值对象（用于运行时访问，支持路径访问） */
  variableValues: Record<string, any>;

  /** 输入数据（作为特殊变量） */
  input: Record<string, any>;

  /** 输出数据（作为特殊变量） */
  output: Record<string, any>;

  /** 节点执行结果映射（作为特殊变量） */
  nodeResults: Map<string, NodeExecutionResult>;
}
```

**说明：**
- `variableValues` 字段用于存储变量的值，支持路径访问
- `variables` 字段保留用于持久化和元数据
- `input`、`output`、`nodeResults` 作为特殊变量，可通过路径访问

#### 1.2 修改 ThreadStateManager

**文件：** [`sdk/core/state/thread-state.ts`](sdk/core/state/thread-state.ts)

**修改内容：**
```typescript
createThread(workflowId: string, workflowVersion: string, options: ThreadOptions = {}): Thread {
  const threadId = IDUtils.generate();
  const now = Date.now();

  const thread: Thread = {
    id: threadId,
    workflowId,
    workflowVersion,
    status: ThreadStatus.CREATED,
    currentNodeId: '',
    variables: [],
    variableValues: {},  // 新增字段
    input: options.input || {},
    output: {},
    nodeResults: new Map(),
    executionHistory: [],
    startTime: now,
    errors: [],
    metadata: {
      creator: options.input?.['creator'],
      tags: options.input?.['tags']
    }
  };

  this.threads.set(threadId, thread);
  return thread;
}
```

#### 1.3 修改 VariableManager

**文件：** [`sdk/core/state/variable-manager.ts`](sdk/core/state/variable-manager.ts)

**修改内容：**

**新增方法：**
```typescript
/**
 * 同步变量到 Thread
 * 将变量值同步到 Thread.variableValues
 */
syncToThread(threadId: string, thread: Thread): void {
  const variables = this.threadVariables.get(threadId);
  if (!variables) {
    return;
  }

  // 清空 variableValues
  thread.variableValues = {};

  // 填充变量值
  for (const [name, variable] of variables.entries()) {
    thread.variableValues[name] = variable.value;
  }
}

/**
 * 从 Thread 同步变量
 * 从 Thread.variableValues 同步到内部存储
 */
syncFromThread(threadId: string, thread: Thread): void {
  if (!this.threadVariables.has(threadId)) {
    this.threadVariables.set(threadId, new Map());
  }

  const variables = this.threadVariables.get(threadId)!;

  // 清空现有变量
  variables.clear();

  // 从 variableValues 填充变量
  for (const [name, value] of Object.entries(thread.variableValues)) {
    const existingVariable = thread.variables.find(v => v.name === name);
    variables.set(name, {
      name,
      value,
      type: existingVariable?.type || typeof value as any,
      scope: existingVariable?.scope || 'local',
      readonly: existingVariable?.readonly || false,
      metadata: existingVariable?.metadata
    });
  }
}
```

**修改 setVariable 方法：**
```typescript
setVariable(
  threadId: string,
  name: string,
  value: any,
  type: 'number' | 'string' | 'boolean' | 'array' | 'object',
  scope: 'local' | 'global' = 'local',
  readonly: boolean = false
): void {
  // ... 现有逻辑

  variables.set(name, variable);

  // 新增：同步到 Thread（如果 Thread 可用）
  // 注意：这里需要通过某种方式获取 Thread 实例
  // 可以在调用 setVariable 时传入 Thread，或者通过 ThreadStateManager 获取
}
```

### 方案 2：修改 Router 变量访问逻辑

#### 2.1 修改 Router.getVariableValue 方法

**文件：** [`sdk/core/execution/router.ts`](sdk/core/execution/router.ts)

**修改内容：**
```typescript
/**
 * 获取变量值
 * @param path 变量路径，支持嵌套访问
 * @param thread Thread 实例
 * @returns 变量值
 */
private getVariableValue(path: string, thread: Thread): any {
  // 支持嵌套路径访问，如 "output.data.items[0].name"
  const parts = path.split('.');
  let value: any = thread;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }

    // 处理数组索引访问，如 items[0]
    const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      value = value[arrayName];
      if (Array.isArray(value)) {
        value = value[index];
      }
    } else {
      value = value[part];
    }
  }

  return value;
}
```

**说明：**
- 支持从 `thread.variableValues` 访问变量
- 支持从 `thread.input` 访问输入数据
- 支持从 `thread.output` 访问输出数据
- 支持从 `thread.nodeResults` 访问节点执行结果
- 支持数组索引访问，如 `items[0]`

#### 2.2 修改 evaluateCustomExpression 方法

**文件：** [`sdk/core/execution/router.ts`](sdk/core/execution/router.ts)

**修改内容：**
```typescript
/**
 * 评估自定义表达式
 * @param expression 自定义表达式
 * @param thread Thread 实例
 * @returns 表达式评估结果
 */
private evaluateCustomExpression(expression: string, thread: Thread): boolean {
  // 构建变量上下文
  const context: Record<string, any> = {
    // 添加所有变量值
    ...thread.variableValues,
    // 添加输入数据
    input: thread.input,
    // 添加输出数据
    output: thread.output,
    // 添加节点执行结果
    nodeResults: Object.fromEntries(thread.nodeResults)
  };

  // 替换变量引用 {{variableName}}
  let evaluatedExpression = expression;
  const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;
  evaluatedExpression = evaluatedExpression.replace(variablePattern, (match, varPath) => {
    const value = this.getVariableValue(varPath, thread);
    return JSON.stringify(value);
  });

  // 使用 Function 构造函数评估表达式
  try {
    const result = new Function('context', `
      with (context) {
        return (${evaluatedExpression});
      }
    `)(context);
    return Boolean(result);
  } catch (error) {
    console.error(`Failed to evaluate custom expression: ${expression}`, error);
    return false;
  }
}
```

### 方案 3：集成 VariableManager 和 ThreadStateManager

#### 3.1 创建 ExecutionContext

**文件：** `sdk/core/execution/execution-context.ts`

**内容：**
```typescript
/**
 * 执行上下文
 * 提供执行时所需的上下文信息
 */

import type { Thread } from '../../types/thread';
import type { WorkflowDefinition } from '../../types/workflow';
import { WorkflowContext } from '../state/workflow-context';
import { ThreadStateManager } from '../state/thread-state';
import { VariableManager } from '../state/variable-manager';

export class ExecutionContext {
  public readonly workflowContext: WorkflowContext;
  public readonly threadStateManager: ThreadStateManager;
  public readonly variableManager: VariableManager;
  public readonly threadId: string;

  constructor(
    workflow: WorkflowDefinition,
    threadId: string,
    threadStateManager: ThreadStateManager,
    variableManager: VariableManager
  ) {
    this.workflowContext = new WorkflowContext(workflow);
    this.threadStateManager = threadStateManager;
    this.variableManager = variableManager;
    this.threadId = threadId;
  }

  /**
   * 获取 Thread
   */
  getThread(): Thread {
    const thread = this.threadStateManager.getThread(this.threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${this.threadId}`);
    }
    return thread;
  }

  /**
   * 设置变量
   */
  setVariable(
    name: string,
    value: any,
    type: 'number' | 'string' | 'boolean' | 'array' | 'object',
    scope: 'local' | 'global' = 'local',
    readonly: boolean = false
  ): void {
    this.variableManager.setVariable(this.threadId, name, value, type, scope, readonly);

    // 同步到 Thread
    const thread = this.getThread();
    thread.variableValues[name] = value;
  }

  /**
   * 获取变量
   */
  getVariable(name: string): any {
    const thread = this.getThread();
    return thread.variableValues[name];
  }

  /**
   * 获取变量值（支持路径）
   */
  getVariableValue(path: string): any {
    const thread = this.getThread();
    const parts = path.split('.');
    let value: any = thread;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }

      // 处理数组索引访问
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const arrayName = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);
        value = value[arrayName];
        if (Array.isArray(value)) {
          value = value[index];
        }
      } else {
        value = value[part];
      }
    }

    return value;
  }
}
```

#### 3.2 修改 Router 使用 ExecutionContext

**文件：** [`sdk/core/execution/router.ts`](sdk/core/execution/router.ts)

**修改内容：**
```typescript
import type { ExecutionContext } from './execution-context';

export class Router {
  /**
   * 选择下一个节点
   */
  selectNextNode(
    currentNode: Node,
    edges: Edge[],
    context: ExecutionContext
  ): string | null {
    // ... 现有逻辑
    const satisfiedEdges = this.filterEdges(edges, context);
    // ...
  }

  /**
   * 评估边的条件
   */
  evaluateEdgeCondition(edge: Edge, context: ExecutionContext): boolean {
    // ... 现有逻辑
    return this.evaluateCondition(edge.condition, context);
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: EdgeCondition, context: ExecutionContext): boolean {
    const variableValue = context.getVariableValue(condition.variablePath);
    // ... 现有逻辑
  }

  /**
   * 获取变量值（移除此方法，使用 context.getVariableValue）
   */
  // private getVariableValue(path: string, thread: Thread): any { ... }

  /**
   * 评估自定义表达式
   */
  private evaluateCustomExpression(expression: string, context: ExecutionContext): boolean {
    const thread = context.getThread();
    // ... 现有逻辑
  }
}
```

## 实施步骤

### 阶段 1：类型定义修改

1. **修改 Thread 类型**
   - 文件：`sdk/types/thread.ts`
   - 添加 `variableValues` 字段
   - 更新相关文档

2. **更新 ThreadStateManager**
   - 文件：`sdk/core/state/thread-state.ts`
   - 在 `createThread` 中初始化 `variableValues`
   - 在 `serializeThread` 和 `deserializeThread` 中处理 `variableValues`

### 阶段 2：VariableManager 增强

3. **添加同步方法**
   - 文件：`sdk/core/state/variable-manager.ts`
   - 实现 `syncToThread` 方法
   - 实现 `syncFromThread` 方法

4. **修改 setVariable 方法**
   - 在设置变量时同步到 Thread
   - 确保变量值的一致性

### 阶段 3：Router 修改

5. **修改 getVariableValue 方法**
   - 文件：`sdk/core/execution/router.ts`
   - 支持从 `thread.variableValues` 访问变量
   - 支持数组索引访问

6. **修改 evaluateCustomExpression 方法**
   - 构建完整的变量上下文
   - 支持所有变量类型的访问

### 阶段 4：ExecutionContext 创建

7. **创建 ExecutionContext 类**
   - 文件：`sdk/core/execution/execution-context.ts`
   - 集成 WorkflowContext、ThreadStateManager、VariableManager
   - 提供统一的变量访问接口

8. **修改 Router 使用 ExecutionContext**
   - 更新方法签名
   - 使用 `context.getVariableValue` 替代直接访问

### 阶段 5：集成测试

9. **创建测试用例**
   - 测试变量设置和获取
   - 测试边条件评估
   - 测试路径访问
   - 测试数组索引访问

10. **端到端测试**
    - 测试完整的工作流执行
    - 测试条件边路由
    - 测试变量同步

## 注意事项

1. **向后兼容性**
   - 保持 `variables` 字段用于持久化
   - `variableValues` 仅用于运行时访问

2. **性能考虑**
   - 避免频繁的变量同步
   - 考虑使用观察者模式自动同步

3. **安全性**
   - 自定义表达式评估需要考虑安全性
   - 避免执行恶意代码

4. **错误处理**
   - 变量不存在时返回 undefined
   - 路径访问失败时返回 undefined
   - 表达式评估失败时返回 false

5. **测试覆盖**
   - 单元测试覆盖所有方法
   - 集成测试覆盖完整流程
   - 边界条件测试

## 相关文件

- [`sdk/types/thread.ts`](sdk/types/thread.ts) - Thread 类型定义
- [`sdk/types/edge.ts`](sdk/types/edge.ts) - 边类型定义
- [`sdk/core/state/variable-manager.ts`](sdk/core/state/variable-manager.ts) - 变量管理器
- [`sdk/core/state/thread-state.ts`](sdk/core/state/thread-state.ts) - Thread 状态管理器
- [`sdk/core/execution/router.ts`](sdk/core/execution/router.ts) - 路由器
- [`plans/sdk/core/execution/router.md`](plans/sdk/core/execution/router.md) - Router 设计文档
- [`plans/sdk/core/execution/router-logic.md`](plans/sdk/core/execution/router-logic.md) - Router 执行逻辑