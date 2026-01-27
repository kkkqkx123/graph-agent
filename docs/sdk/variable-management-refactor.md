# 变量管理重构方案

## 1. 背景分析

### 1.1 当前变量管理机制

**现状：**
- 变量在 [`Thread`](sdk/types/thread.ts:115) 执行过程中通过 [`VariableManager`](sdk/core/execution/managers/variable-manager.ts:11) 动态添加和修改
- [`ThreadBuilder.buildFromDefinition()`](sdk/core/execution/thread-builder.ts:58) 中，variables 初始化为空数组
- 变量用于节点配置、边条件评估、循环控制等场景
- [`VariableManager`](sdk/core/execution/managers/variable-manager.ts:11) 为 Thread 对象附加方法（getVariable, setVariable, deleteVariable 等）
- [`ThreadContext`](sdk/core/execution/context/thread-context.ts:14) 提供相同的变量访问方法，但内部调用 Thread 的方法

**局限性：**
1. 变量没有统一的声明位置，分散在各个节点配置中
2. 缺乏类型检查和初始值验证
3. 工作流定义无法清晰表达所需的变量契约
4. 运行时可以随意添加/修改变量，缺乏约束
5. Thread 对象作为纯数据类型被附加方法，违反了类型定义的职责

### 1.2 重构目标

1. **统一变量定义来源**：Workflow 作为变量定义的唯一来源
2. **类型安全**：在编译时和运行时提供类型检查
3. **初始化验证**：在 Thread 创建时验证变量定义和初始值
4. **运行时约束**：限制运行时对变量的修改，只允许修改非只读变量
5. **职责分离**：Thread 作为纯数据对象，ThreadContext 负责运行时管理

---

## 2. 核心设计决策

### 2.1 变量管理器应该使用 Thread 还是 ThreadContext？

#### 方案1：变量管理器使用 Thread

**设计思路：**
- 继续为 Thread 对象附加变量管理方法
- Thread 对象同时承担数据存储和方法调用职责

**优点：**
- ✅ Thread 是类型定义，变量数据直接存储在 Thread 对象中
- ✅ 符合当前的架构设计，Thread 作为数据载体
- ✅ 序列化和持久化更直接，Thread 对象可以直接保存
- ✅ 类型层和核心层职责清晰，Thread 在 types 层定义

**缺点：**
- ❌ Thread 对象需要附加方法，违反了纯数据对象的原则
- ❌ 变量管理逻辑与数据存储耦合
- ❌ 难以进行变量访问的拦截和验证
- ❌ 不符合 SDK 架构中 Types 层只定义类型的原则
- ❌ Thread 类型定义中包含方法签名，增加了类型复杂度

#### 方案2：变量管理器使用 ThreadContext（推荐）

**设计思路：**
- Thread 保持为纯数据对象，只包含变量数据
- ThreadContext 负责变量管理逻辑，提供访问接口
- VariableManager 为 ThreadContext 提供变量管理能力

**优点：**
- ✅ ThreadContext 是运行时上下文，更适合管理运行时状态
- ✅ 可以在 ThreadContext 层面进行变量访问的拦截、验证和审计
- ✅ Thread 保持为纯数据对象，符合类型定义的职责
- ✅ 更好的封装性，变量管理逻辑集中在 ThreadContext 中
- ✅ 便于实现变量访问的权限控制和日志记录
- ✅ 支持更复杂的变量管理策略，如懒加载、缓存等
- ✅ 符合 SDK 架构设计原则：Types 层定义类型，Core 层实现逻辑
- ✅ ThreadContext 已经封装了 Thread，自然承担运行时管理职责

**缺点：**
- ❌ 需要重构现有的 VariableManager 实现
- ❌ ThreadContext 需要承担更多职责
- ❌ 序列化时需要从 ThreadContext 提取数据到 Thread

#### 对比总结

| 维度 | 方案1（Thread） | 方案2（ThreadContext） |
|------|----------------|------------------------|
| 职责分离 | ❌ 数据和方法耦合 | ✅ 数据和逻辑分离 |
| 类型安全 | ❌ 类型定义包含方法 | ✅ 类型定义纯数据 |
| 可扩展性 | ❌ 难以添加拦截逻辑 | ✅ 易于扩展验证逻辑 |
| 架构一致性 | ❌ 违反 Types 层原则 | ✅ 符合架构设计 |
| 序列化 | ✅ 直接序列化 | ⚠️ 需要提取数据 |
| 重构成本 | ✅ 改动较小 | ❌ 需要重构 |

**推荐方案：方案2（ThreadContext）**

理由：
1. 符合 SDK 架构设计原则，Types 层只定义类型，Core 层实现逻辑
2. 更好的职责分离，Thread 作为纯数据对象，ThreadContext 负责运行时管理
3. 提供更强的扩展性，便于实现变量访问的拦截、验证和审计
4. ThreadContext 已经封装了 Thread，自然承担运行时管理职责
5. 虽然需要重构，但长期收益更大

---

## 3. 详细设计方案

### 3.1 类型定义变更

#### 3.1.1 添加 WorkflowVariable 类型

在 [`sdk/types/workflow.ts`](sdk/types/workflow.ts) 中添加：

```typescript
/**
 * 工作流变量定义类型
 * 用于在工作流定义阶段声明变量，提供类型安全和初始值
 */
export interface WorkflowVariable {
  /** 变量名称 */
  name: string;
  /** 变量类型 */
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  /** 变量初始值 */
  defaultValue?: any;
  /** 变量描述 */
  description?: string;
  /** 是否必需 */
  required?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 变量作用域 */
  scope?: 'local' | 'global';
}
```

#### 3.1.2 更新 WorkflowDefinition

在 [`WorkflowDefinition`](sdk/types/workflow.ts:63) 中添加 variables 字段：

```typescript
export interface WorkflowDefinition {
  id: ID;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  /** 工作流变量定义数组，用于声明工作流执行所需的变量 */
  variables?: WorkflowVariable[];
  config?: WorkflowConfig;
  metadata?: WorkflowMetadata;
  version: Version;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 3.1.3 简化 Thread 类型

移除 Thread 类型中的方法定义，保持为纯数据对象：

```typescript
export interface Thread {
  id: ID;
  workflowId: ID;
  workflowVersion: Version;
  status: ThreadStatus;
  currentNodeId: ID;
  /** 变量数组（用于持久化和元数据） */
  variables: ThreadVariable[];
  /** 变量值映射（用于快速访问） */
  variableValues: Record<string, any>;
  input: Record<string, any>;
  output: Record<string, any>;
  nodeResults: NodeExecutionResult[];
  startTime: Timestamp;
  endTime?: Timestamp;
  errors: any[];
  metadata?: ThreadMetadata;
  contextData?: Record<string, any>;
}
```

### 3.2 VariableManager 重构

#### 3.2.1 移除动态设置方法

**移除的方法：**
- `setVariable()` - 运行时不应随意添加新变量
- `deleteVariable()` - 运行时不应删除已定义的变量

**保留的方法：**
- `getVariable()` - 读取变量值
- `hasVariable()` - 检查变量是否存在
- `getAllVariables()` - 获取所有变量
- `updateVariable()` - 更新已定义变量的值（新增，替代 setVariable）

#### 3.2.2 新增方法

```typescript
/**
 * 更新已定义变量的值
 * @param threadContext ThreadContext 实例
 * @param name 变量名称
 * @param value 新的变量值
 */
updateVariable(threadContext: ThreadContext, name: string, value: any): void {
  const thread = threadContext.thread;
  
  // 检查变量是否已定义
  const variableDef = thread.variables.find(v => v.name === name);
  if (!variableDef) {
    throw new Error(`Variable '${name}' is not defined in workflow`);
  }
  
  // 检查是否为只读变量
  if (variableDef.readonly) {
    throw new Error(`Variable '${name}' is readonly and cannot be modified`);
  }
  
  // 类型检查
  if (!this.validateType(value, variableDef.type)) {
    throw new Error(`Type mismatch for variable '${name}'. Expected ${variableDef.type}`);
  }
  
  // 更新变量值
  thread.variableValues[name] = value;
  variableDef.value = value;
}

/**
 * 从 WorkflowDefinition 初始化 Thread 变量
 * @param thread Thread 实例
 * @param workflow WorkflowDefinition 实例
 */
initializeFromWorkflow(thread: Thread, workflow: WorkflowDefinition): void {
  if (!workflow.variables || workflow.variables.length === 0) {
    thread.variables = [];
    thread.variableValues = {};
    return;
  }
  
  thread.variables = workflow.variables.map(v => ({
    name: v.name,
    value: v.defaultValue,
    type: v.type,
    scope: v.scope || 'local',
    readonly: v.readonly || false,
    metadata: {
      description: v.description,
      required: v.required
    }
  }));
  
  thread.variableValues = {};
  for (const variable of thread.variables) {
    thread.variableValues[variable.name] = variable.value;
  }
}
```

### 3.3 ThreadBuilder 更新

#### 3.3.1 修改 buildFromDefinition 方法

```typescript
private async buildFromDefinition(
  workflow: WorkflowDefinition, 
  options: ThreadOptions = {}
): Promise<ThreadContext> {
  // ... 验证逻辑 ...
  
  const threadId = IDUtils.generate();
  const now = Date.now();

  const thread: Partial<Thread> = {
    id: threadId,
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    status: 'CREATED' as ThreadStatus,
    currentNodeId: startNode.id,
    input: options.input || {},
    output: {},
    nodeResults: [],
    startTime: now,
    errors: [],
    metadata: {
      creator: options.input?.['creator'],
      tags: options.input?.['tags']
    }
  };

  // 从 WorkflowDefinition 初始化变量
  this.variableManager.initializeFromWorkflow(thread as Thread, workflow);

  // 创建其他组件...
  const workflowContext = new WorkflowContext(workflow);
  const conversationManager = new ConversationManager({
    tokenLimit: options.tokenLimit || 4000
  });
  const llmExecutor = new LLMExecutor(conversationManager);

  return new ThreadContext(
    thread as Thread,
    workflowContext,
    llmExecutor
  );
}
```

### 3.4 ThreadContext 更新

#### 3.4.1 移除 setVariable 和 deleteVariable 方法

```typescript
export class ThreadContext {
  // ... 其他方法 ...

  /**
   * 获取 Thread 变量值
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(name: string): any {
    return this.thread.variableValues[name];
  }

  /**
   * 更新已定义变量的值
   * @param name 变量名称
   * @param value 新的变量值
   */
  updateVariable(name: string, value: any): void {
    this.variableManager.updateVariable(this, name, value);
  }

  /**
   * 检查变量是否存在
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(name: string): boolean {
    return name in this.thread.variableValues;
  }

  /**
   * 获取所有变量
   * @returns 所有变量值
   */
  getAllVariables(): Record<string, any> {
    return { ...this.thread.variableValues };
  }

  // 移除 setVariable 和 deleteVariable 方法
}
```

---

## 4. 实施步骤

### 阶段1：类型定义变更
1. 在 [`sdk/types/workflow.ts`](sdk/types/workflow.ts) 中添加 `WorkflowVariable` 类型
2. 在 `WorkflowDefinition` 中添加 `variables` 字段
3. 简化 `Thread` 类型，移除方法定义

### 阶段2：VariableManager 重构
1. 移除 `attachVariableMethods` 方法
2. 移除 `setVariable` 和 `deleteVariable` 方法
3. 添加 `updateVariable` 方法
4. 添加 `initializeFromWorkflow` 方法
5. 添加 `validateType` 方法

### 阶段3：ThreadBuilder 更新
1. 修改 `buildFromDefinition` 方法，使用 `initializeFromWorkflow`
2. 修改 `createCopy` 方法，确保变量正确复制
3. 修改 `createFork` 方法，确保变量正确复制

### 阶段4：ThreadContext 更新
1. 移除 `setVariable` 和 `deleteVariable` 方法
2. 添加 `updateVariable` 方法
3. 更新 `getVariable` 方法，直接访问 `thread.variableValues`
4. 注入 `VariableManager` 实例

### 阶段5：执行器更新
1. 更新 [`VariableNodeExecutor`](sdk/core/execution/executors/node/variable-node-executor.ts)，使用 `updateVariable`
2. 更新 [`LoopStartNodeExecutor`](sdk/core/execution/executors/node/loop-start-node-executor.ts)，使用 `updateVariable`
3. 更新其他使用 `setVariable` 的执行器
4. 更新测试用例

### 阶段6：测试和验证
1. 编写单元测试验证变量初始化
2. 编写单元测试验证变量更新约束
3. 编写单元测试验证只读变量保护
4. 编写集成测试验证完整流程

---

## 5. 影响范围分析

### 5.1 需要修改的文件

**类型层（sdk/types/）：**
- [`workflow.ts`](sdk/types/workflow.ts) - 添加 WorkflowVariable 类型
- [`thread.ts`](sdk/types/thread.ts) - 简化 Thread 类型

**核心层（sdk/core/execution/）：**
- [`managers/variable-manager.ts`](sdk/core/execution/managers/variable-manager.ts) - 重构变量管理逻辑
- [`context/thread-context.ts`](sdk/core/execution/context/thread-context.ts) - 更新变量访问方法
- [`thread-builder.ts`](sdk/core/execution/thread-builder.ts) - 更新变量初始化逻辑
- [`executors/node/variable-node-executor.ts`](sdk/core/execution/executors/node/variable-node-executor.ts) - 使用 updateVariable
- [`executors/node/loop-start-node-executor.ts`](sdk/core/execution/executors/node/loop-start-node-executor.ts) - 使用 updateVariable
- [`executors/trigger/set-variable-executor.ts`](sdk/core/execution/executors/trigger/set-variable-executor.ts) - 使用 updateVariable

### 5.2 兼容性影响

**破坏性变更：**
- ❌ `Thread.setVariable()` 方法被移除
- ❌ `Thread.deleteVariable()` 方法被移除
- ❌ `ThreadContext.setVariable()` 方法被移除
- ❌ `ThreadContext.deleteVariable()` 方法被移除

**新增功能：**
- ✅ `WorkflowDefinition.variables` 字段
- ✅ `ThreadContext.updateVariable()` 方法
- ✅ 变量类型验证
- ✅ 只读变量保护

**向后兼容方案：**
1. 提供迁移指南，说明如何将现有工作流迁移到新架构
2. 在过渡期内保留 `setVariable` 方法，但标记为 deprecated
3. 提供工具自动检测和报告未定义的变量使用

---

## 6. 优势总结

### 6.1 架构优势
1. **职责分离**：Thread 作为纯数据对象，ThreadContext 负责运行时管理
2. **类型安全**：编译时和运行时双重类型检查
3. **单一来源**：Workflow 作为变量定义的唯一来源
4. **可扩展性**：便于添加变量访问的拦截、验证和审计

### 6.2 开发体验优势
1. **清晰的契约**：工作流定义明确声明所需的变量
2. **类型提示**：IDE 可以提供更好的类型提示和自动补全
3. **错误预防**：在编译时和运行时捕获变量使用错误
4. **文档友好**：变量定义本身就是最好的文档

### 6.3 运行时优势
1. **性能优化**：变量定义在初始化时完成，运行时无需动态创建
2. **内存优化**：避免运行时动态添加变量导致的内存泄漏
3. **安全性**：只读变量保护，防止意外修改
4. **可观测性**：变量定义清晰，便于调试和监控

---

## 7. 风险和挑战

### 7.1 技术风险
1. **重构范围大**：涉及多个核心模块，需要仔细测试
2. **兼容性问题**：现有工作流可能依赖动态变量创建
3. **性能影响**：变量访问需要额外的验证逻辑

### 7.2 缓解措施
1. **分阶段实施**：按照实施步骤逐步推进，每个阶段充分测试
2. **提供迁移工具**：帮助现有工作流迁移到新架构
3. **性能测试**：确保变量访问性能满足要求
4. **文档完善**：提供详细的迁移指南和最佳实践

---

## 8. 总结

本方案通过将变量管理从 Thread 迁移到 ThreadContext，实现了以下目标：

1. **统一变量定义来源**：Workflow 作为变量定义的唯一来源
2. **类型安全**：在编译时和运行时提供类型检查
3. **初始化验证**：在 Thread 创建时验证变量定义和初始值
4. **运行时约束**：限制运行时对变量的修改，只允许修改非只读变量
5. **职责分离**：Thread 作为纯数据对象，ThreadContext 负责运行时管理

虽然需要重构现有代码，但长期收益显著，符合 SDK 架构设计原则，为未来的扩展和维护奠定了良好的基础。