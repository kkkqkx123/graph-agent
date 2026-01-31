# 四级作用域系统实施计划

## 概述

本文档详细描述了将当前的两级作用域系统（`local`/`global`）升级为四级作用域系统（`global`/`thread`/`subgraph`/`loop`）的具体实施计划。

## 1. 文件修改清单

### 1.1 类型定义文件

| 文件路径 | 修改内容 | 优先级 |
|----------|----------|--------|
| `sdk/types/workflow.ts` | 更新 `WorkflowVariable.scope` 类型定义 | 高 |
| `sdk/types/thread.ts` | 更新 `ThreadVariable.scope` 类型定义，添加 `variableScopes` 结构 | 高 |
| `sdk/types/node.ts` | 更新节点配置中的作用域类型定义 | 中 |

### 1.2 核心实现文件

| 文件路径 | 修改内容 | 优先级 |
|----------|----------|--------|
| `sdk/core/execution/managers/variable-manager.ts` | 重写整个 VariableManager 实现 | 最高 |
| `sdk/core/execution/context/thread-context.ts` | 添加作用域管理方法 | 高 |
| `sdk/core/execution/managers/variable-accessor.ts` | 扩展 VariableAccessor 支持新命名空间 | 高 |
| `sdk/utils/evalutor/expression-parser.ts` | 更新表达式解析器的作用域处理 | 中 |

### 1.3 执行处理器文件

| 文件路径 | 修改内容 | 优先级 |
|----------|----------|--------|
| `sdk/core/execution/handlers/node-handlers/variable-handler.ts` | 更新 VARIABLE 节点处理器 | 高 |
| `sdk/core/execution/handlers/node-handlers/loop-start-handler.ts` | 集成循环作用域管理 | 高 |
| `sdk/core/execution/handlers/node-handlers/loop-end-handler.ts` | 集成循环作用域管理 | 高 |
| `sdk/core/execution/thread-builder.ts` | 更新 ThreadBuilder 的变量初始化逻辑 | 高 |

### 1.4 API 和验证文件

| 文件路径 | 修改内容 | 优先级 |
|----------|----------|--------|
| `sdk/api/variable-manager-api.ts` | 更新 API 接口支持新作用域 | 中 |
| `sdk/core/validation/node-validator.ts` | 更新节点验证器 | 中 |
| `sdk/core/validation/workflow-validator.ts` | 更新工作流验证器 | 中 |

### 1.5 测试文件

| 文件路径 | 修改内容 | 优先级 |
|----------|----------|--------|
| `sdk/api/__tests__/variable-manager-api.test.ts` | 更新测试用例 | 高 |
| `sdk/core/execution/__tests__/variable-manager.test.ts` | 创建新的作用域测试 | 最高 |
| 其他相关测试文件 | 更新作用域相关的测试 | 中 |

## 2. 具体代码变更

### 2.1 类型定义变更

#### `sdk/types/thread.ts`
```typescript
// 新增作用域类型枚举
export type VariableScope = 'global' | 'thread' | 'subgraph' | 'loop';

// 更新 ThreadVariable 接口
export interface ThreadVariable {
  name: string;
  value: any;
  type: string;
  scope: VariableScope; // 更新类型
  readonly: boolean;
  metadata?: Metadata;
}

// 新增 variableScopes 结构
export interface Thread {
  // ... 其他字段保持不变 ...
  
  /** 变量值映射（用于快速访问，仅包含 thread 作用域变量，向后兼容） */
  variableValues: Record<string, any>;
  
  /** 四级作用域变量存储 */
  variableScopes: {
    /** 全局作用域 - 多线程共享 */
    global: Record<string, any>;
    /** 线程作用域 - 单线程内部 */
    thread: Record<string, any>;
    /** 子图作用域栈 - 支持嵌套子图 */
    subgraph: Record<string, any>[];
    /** 循环作用域栈 - 支持嵌套循环 */
    loop: Record<string, any>[];
  };
}
```

#### `sdk/types/workflow.ts`
```typescript
// 更新 WorkflowVariable 接口
export interface WorkflowVariable {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  description?: string;
  required?: boolean;
  readonly?: boolean;
  scope?: VariableScope; // 更新类型，默认为 'thread'
}
```

### 2.2 VariableManager 重写

#### 核心数据结构
```typescript
// sdk/core/execution/managers/variable-manager.ts

export class VariableManager {
  // 移除原有的 variableValues 和 globalVariableValues 逻辑
  // 使用新的四级作用域结构
  
  initializeFromWorkflow(thread: Thread, workflow: WorkflowDefinition): void {
    if (!workflow.variables || workflow.variables.length === 0) {
      thread.variables = [];
      thread.variableValues = {};
      thread.variableScopes = {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      };
      return;
    }

    // 从 WorkflowVariable 创建 ThreadVariable
    thread.variables = workflow.variables.map((v: WorkflowVariable): ThreadVariable => ({
      name: v.name,
      value: v.defaultValue,
      type: v.type,
      scope: v.scope || 'thread', // 默认为 thread 作用域
      readonly: v.readonly || false,
      metadata: {
        description: v.description,
        required: v.required
      }
    }));

    // 初始化四级作用域
    thread.variableScopes = {
      global: {},
      thread: {},
      subgraph: [],
      loop: []
    };

    // 按作用域分配变量值
    for (const variable of thread.variables) {
      switch (variable.scope) {
        case 'global':
          thread.variableScopes.global[variable.name] = variable.value;
          break;
        case 'thread':
          thread.variableScopes.thread[variable.name] = variable.value;
          thread.variableValues[variable.name] = variable.value; // 向后兼容
          break;
        case 'subgraph':
        case 'loop':
          // subgraph 和 loop 作用域的变量在运行时动态创建
          // 这里只做声明，不初始化值
          break;
      }
    }
  }
}
```

#### 变量访问和更新
```typescript
// 获取变量值 - 按作用域优先级查找
getVariable(threadContext: ThreadContext, name: string): any {
  const scopes = threadContext.thread.variableScopes;
  
  // 1. 循环作用域（最高优先级）
  if (scopes.loop.length > 0) {
    const currentLoopScope = scopes.loop[scopes.loop.length - 1];
    if (name in currentLoopScope) {
      return currentLoopScope[name];
    }
  }
  
  // 2. 子图作用域
  if (scopes.subgraph.length > 0) {
    const currentSubgraphScope = scopes.subgraph[scopes.subgraph.length - 1];
    if (name in currentSubgraphScope) {
      return currentSubgraphScope[name];
    }
  }
  
  // 3. 线程作用域
  if (name in scopes.thread) {
    return scopes.thread[name];
  }
  
  // 4. 全局作用域（最低优先级）
  if (name in scopes.global) {
    return scopes.global[name];
  }
  
  return undefined;
}

// 更新变量值
updateVariable(threadContext: ThreadContext, name: string, value: any, explicitScope?: VariableScope): void {
  const thread = threadContext.thread;
  const variableDef = thread.variables.find(v => v.name === name);
  
  if (!variableDef) {
    throw new Error(`Variable '${name}' is not defined in workflow`);
  }
  
  if (variableDef.readonly) {
    throw new Error(`Variable '${name}' is readonly`);
  }
  
  if (!this.validateType(value, variableDef.type)) {
    throw new Error(`Type mismatch for variable '${name}'`);
  }
  
  // 如果指定了显式作用域，使用该作用域
  const targetScope = explicitScope || variableDef.scope;
  
  switch (targetScope) {
    case 'global':
      thread.variableScopes.global[name] = value;
      break;
    case 'thread':
      thread.variableScopes.thread[name] = value;
      thread.variableValues[name] = value; // 向后兼容
      break;
    case 'subgraph':
      if (thread.variableScopes.subgraph.length === 0) {
        throw new Error('Cannot set subgraph variable outside of subgraph context');
      }
      thread.variableScopes.subgraph[thread.variableScopes.subgraph.length - 1][name] = value;
      break;
    case 'loop':
      if (thread.variableScopes.loop.length === 0) {
        throw new Error('Cannot set loop variable outside of loop context');
      }
      thread.variableScopes.loop[thread.variableScopes.loop.length - 1][name] = value;
      break;
  }
  
  variableDef.value = value;
}
```

#### 作用域管理方法
```typescript
// 进入子图作用域
enterSubgraphScope(threadContext: ThreadContext): void {
  threadContext.thread.variableScopes.subgraph.push({});
}

// 退出子图作用域
exitSubgraphScope(threadContext: ThreadContext): void {
  if (threadContext.thread.variableScopes.subgraph.length === 0) {
    throw new Error('No subgraph scope to exit');
  }
  threadContext.thread.variableScopes.subgraph.pop();
}

// 进入循环作用域
enterLoopScope(threadContext: ThreadContext): void {
  threadContext.thread.variableScopes.loop.push({});
}

// 退出循环作用域
exitLoopScope(threadContext: ThreadContext): void {
  if (threadContext.thread.variableScopes.loop.length === 0) {
    throw new Error('No loop scope to exit');
  }
  threadContext.thread.variableScopes.loop.pop();
}
```

### 2.3 ThreadContext 集成

```typescript
// sdk/core/execution/context/thread-context.ts

// 添加作用域管理方法
enterSubgraph(workflowId: ID, parentWorkflowId: ID, input: any): void {
  // 先创建新的子图作用域
  this.variableManager.enterSubgraphScope(this);
  
  // 再调用原有的执行状态管理
  this.executionState.enterSubgraph(workflowId, parentWorkflowId, input);
}

exitSubgraph(): void {
  // 先调用原有的执行状态管理
  this.executionState.exitSubgraph();
  
  // 再退出子图作用域
  this.variableManager.exitSubgraphScope(this);
}

// 添加循环作用域管理方法
enterLoop(): void {
  this.variableManager.enterLoopScope(this);
}

exitLoop(): void {
  this.variableManager.exitLoopScope(this);
}
```

### 2.4 Loop 处理器集成

#### LoopStartHandler
```typescript
// sdk/core/execution/handlers/node-handlers/loop-start-handler.ts

export async function loopStartHandler(thread: Thread, node: Node): Promise<any> {
  // ... 原有逻辑 ...
  
  // 获取 ThreadContext（需要通过某种方式获取）
  const threadContext = /* 获取 ThreadContext */;
  
  // 进入新的循环作用域
  threadContext.enterLoop();
  
  // 设置循环变量到当前循环作用域
  threadContext.updateVariable(variableName, currentValue, 'loop');
  
  // ... 原有逻辑 ...
}
```

#### LoopEndHandler
```typescript
// sdk/core/execution/handlers/node-handlers/loop-end-handler.ts

export async function loopEndHandler(thread: Thread, node: Node): Promise<any> {
  // ... 原有逻辑 ...
  
  const threadContext = /* 获取 ThreadContext */;
  
  // 退出循环作用域
  threadContext.exitLoop();
  
  // ... 原有逻辑 ...
}
```

### 2.5 VariableAccessor 扩展

```typescript
// sdk/core/execution/managers/variable-accessor.ts

export enum VariableNamespace {
  INPUT = 'input',
  OUTPUT = 'output',
  GLOBAL = 'global',
  THREAD = 'thread',
  SUBGRAPH = 'subgraph',
  LOOP = 'loop'
}

get(path: string): any {
  if (!path) return undefined;
  
  const parts = path.split('.');
  const namespace = parts[0];
  const remainingPath = parts.slice(1).join('.');
  
  switch (namespace) {
    case VariableNamespace.INPUT:
      return this.getFromInput(remainingPath);
    case VariableNamespace.OUTPUT:
      return this.getFromOutput(remainingPath);
    case VariableNamespace.GLOBAL:
      return this.getFromGlobal(remainingPath || path);
    case VariableNamespace.THREAD:
      return this.getFromThread(remainingPath || path);
    case VariableNamespace.SUBGRAPH:
      return this.getFromSubgraph(remainingPath || path);
    case VariableNamespace.LOOP:
      return this.getFromLoop(remainingPath || path);
    default:
      // 默认行为：按作用域优先级查找
      return this.getFromScopedVariables(path);
  }
}

private getFromScopedVariables(path: string): any {
  // 提取根变量名
  const pathParts = path.split('.');
  const rootVarName = pathParts[0];
  
  if (!rootVarName) return undefined;
  
  const rootValue = this.threadContext.getVariable(rootVarName);
  
  if (rootValue === undefined) return undefined;
  
  // 如果路径包含嵌套，使用 resolvePath 解析剩余路径
  if (pathParts.length > 1) {
    const remainingPath = pathParts.slice(1).join('.');
    return resolvePath(remainingPath, rootValue);
  }
  
  return rootValue;
}
```

### 2.6 Fork/Join 适配

```typescript
// sdk/core/execution/thread-builder.ts

async createFork(parentThreadContext: ThreadContext, forkConfig: any): Promise<ThreadContext> {
  // ...
  
  const forkThread: Partial<Thread> = {
    // ...
    variableScopes: {
      // global 作用域通过引用共享
      global: parentThread.variableScopes.global,
      // thread 作用域深拷贝
      thread: { ...parentThread.variableScopes.thread },
      // subgraph 和 loop 作用域在 fork 时清空（新线程从根开始）
      subgraph: [],
      loop: []
    },
    // 向后兼容的 variableValues
    variableValues: { ...parentThread.variableValues }
  };
  
  // ...
}
```

## 3. 向后兼容性策略

### 3.1 作用域映射
- `local` → `thread`（完全等价）
- `global` → `global`（保持不变）

### 3.2 API 兼容性
- 保持现有的 `variableValues` 字段，仅包含 `thread` 作用域变量
- 现有的 API 方法继续工作，内部自动转换作用域

### 3.3 表达式兼容性
- 简单变量名（无前缀）继续默认从 `thread` 作用域查找
- 现有的 `variables.xxx` 语法继续工作，等价于 `thread.xxx`

## 4. 测试策略

### 4.1 单元测试
- **作用域隔离测试**：验证不同作用域的变量不会相互干扰
- **作用域继承测试**：验证作用域查找的优先级正确
- **边界条件测试**：测试空作用域、嵌套作用域等边界情况

### 4.2 集成测试
- **Fork/Join 测试**：验证全局作用域的共享行为
- **Subgraph 嵌套测试**：验证多层子图的作用域管理
- **Loop 嵌套测试**：验证多层循环的作用域管理
- **混合场景测试**：同时使用多种作用域的复杂场景

### 4.3 回归测试
- **现有功能测试**：确保所有现有功能继续正常工作
- **性能测试**：验证新实现的性能影响在可接受范围内

## 5. 实施时间线

### 阶段 1：基础架构（1-2天）
- 更新类型定义
- 实现新的 VariableManager
- 创建基础测试用例

### 阶段 2：核心集成（2-3天）
- 集成到 ThreadContext
- 更新 Loop 和 Subgraph 处理器
- 实现 VariableAccessor 扩展

### 阶段 3：API 和验证（1-2天）
- 更新 API 接口
- 更新验证器
- 完善向后兼容性

### 阶段 4：测试和优化（2-3天）
- 全面测试覆盖
- 性能优化
- 文档更新

### 总计：6-10个工作日

## 6. 风险评估和缓解

### 6.1 主要风险
- **性能影响**：四级作用域查找可能增加性能开销
- **复杂性增加**：代码复杂度显著增加，维护成本上升
- **兼容性问题**：可能存在未考虑到的边缘情况

### 6.2 缓解措施
- **性能优化**：实现缓存机制，优化查找算法
- **渐进式实施**：分阶段实施，每个阶段都有完整的测试覆盖
- **回滚计划**：保留完整的回滚方案，确保可以快速恢复

## 7. 验收标准

- [ ] 所有现有测试用例通过
- [ ] 新的作用域功能按预期工作
- [ ] Fork/Join 操作中的全局变量共享正常
- [ ] Subgraph 和 Loop 中的作用域隔离正常
- [ ] 表达式解析器支持新的命名空间语法
- [ ] 性能影响在可接受范围内（< 10%）
- [ ] 完整的文档和示例更新