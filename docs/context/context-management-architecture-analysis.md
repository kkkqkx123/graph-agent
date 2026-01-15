# 上下文管理架构分析

## 1. 当前架构问题分析

### 1.1 上下文管理分散

**问题：**
- `ExecutionContext` 存在于domain层（`src/domain/threads/value-objects/execution-context.ts`），但Thread实体没有包含ExecutionContext属性
- `WorkflowExecutionContext` 存在于services层（`src/services/workflow/functions/types.ts`），与domain层的ExecutionContext不统一
- 上下文数据存储在哪里不明确（Thread.State？还是独立的ExecutionContext？）

**影响：**
- 上下文管理职责不清晰
- 不同层级的上下文处理不一致
- Fork/Copy操作无法正确处理上下文

### 1.2 Thread.State不包含执行上下文

**当前Thread.State结构：**
```typescript
{
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled',
  execution: {
    progress: number,
    currentStep: string | undefined,
    startedAt: string | undefined,
    completedAt: string | undefined,
    errorMessage: string | undefined,
    retryCount: number,
    lastActivityAt: string
  }
}
```

**问题：**
- 没有包含 `variables`（执行变量）
- 没有包含 `nodeContexts`（节点上下文）
- 没有包含 `promptContext`（提示词上下文）

**影响：**
- 执行上下文数据无处存储
- Fork/Copy操作无法保留执行变量
- 节点间数据传递困难

### 1.3 Fork策略的上下文处理不明确

**当前实现：**
```typescript
// ForkStrategy.calculateContextRetention
const variablesToRetain = new Set<string>(); // 空集合！
const nodeStatesToRetain = new Map<string, NodeExecutionSnapshot>();

// TODO: 从工作流上下文服务获取实际的变量列表
```

**问题：**
- `variablesToRetain` 是空集合，无法保留任何变量
- TODO注释表明需要从工作流上下文服务获取实际的变量列表
- 不清楚上下文数据应该从哪里获取

**影响：**
- Fork操作无法保留执行上下文
- 新线程无法继承父线程的变量
- Fork功能不完整

### 1.4 Workflow没有上下文定义

**问题：**
- Workflow是设计时实体，不应该包含运行时上下文
- 但Workflow可能需要定义初始上下文或上下文模板
- 当前Workflow没有提供初始上下文的机制

**影响：**
- 无法为Thread提供初始上下文
- 无法定义上下文模板
- 无法实现上下文预配置

### 1.5 Session的SharedResources与Thread的ExecutionContext关系不明确

**问题：**
- `Session.SharedResources` 管理线程间共享资源
- `Thread.ExecutionContext` 管理线程执行上下文
- 两者之间的关系和交互方式不明确

**影响：**
- 线程间共享资源与执行上下文混淆
- 资源隔离不清晰
- 并发访问控制困难

## 2. 上下文管理职责划分

### 2.1 Workflow（设计时实体）

**职责：**
- 定义工作流结构和逻辑
- 提供初始上下文模板（可选）
- 不包含运行时上下文

**上下文相关：**
- 可以定义初始变量模板
- 可以定义上下文配置
- 不存储运行时上下文数据

### 2.2 Thread（运行时实体）

**职责：**
- 管理线程执行状态
- 管理线程执行上下文
- 协调节点执行

**上下文相关：**
- 包含ExecutionContext（执行上下文）
- ExecutionContext包含：
  - `variables`: 执行变量（Map<string, unknown>）
  - `nodeContexts`: 节点上下文（Map<string, NodeContext>）
  - `promptContext`: 提示词上下文
  - `config`: 执行配置

### 2.3 Session（线程集合管理器）

**职责：**
- 管理线程集合
- 管理线程间共享资源
- 协调线程间通信

**上下文相关：**
- SharedResources管理线程间共享资源
- 不管理Thread的ExecutionContext
- Thread的ExecutionContext是线程私有的

### 2.4 ExecutionContext（执行上下文值对象）

**职责：**
- 管理执行变量
- 管理节点上下文
- 管理提示词上下文
- 提供上下文快照和恢复

**特点：**
- 不可变值对象
- 支持快照和恢复
- 支持变量继承和隔离

## 3. 推荐的架构设计

### 3.1 Thread.State结构扩展

**当前结构：**
```typescript
{
  status: string,
  execution: {
    progress: number,
    currentStep: string | undefined,
    startedAt: string | undefined,
    completedAt: string | undefined,
    errorMessage: string | undefined,
    retryCount: number,
    lastActivityAt: string
  }
}
```

**推荐结构：**
```typescript
{
  status: string,
  execution: {
    progress: number,
    currentStep: string | undefined,
    startedAt: string | undefined,
    completedAt: string | undefined,
    errorMessage: string | undefined,
    retryCount: number,
    lastActivityAt: string
  },
  context: {
    variables: Record<string, unknown>,
    nodeContexts: Record<string, unknown>,
    promptContext: Record<string, unknown>
  }
}
```

**说明：**
- 在Thread.State中添加 `context` 字段
- `context` 包含执行上下文数据
- ExecutionContext值对象可以基于State.context.data创建

### 3.2 Thread实体添加ExecutionContext属性

**推荐设计：**
```typescript
export interface ThreadProps {
  readonly id: ID;
  readonly sessionId: ID;
  readonly workflowId: ID;
  readonly priority: ThreadPriority;
  readonly title?: string;
  readonly description?: string;
  readonly metadata: Metadata;
  readonly deletionStatus: DeletionStatus;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly state: State;
  readonly executionContext: ExecutionContext; // 新增
}

export class Thread extends Entity {
  // 获取执行上下文
  public get executionContext(): ExecutionContext {
    return this.props.executionContext;
  }

  // 更新执行上下文
  public updateExecutionContext(context: ExecutionContext): Thread {
    return new Thread({
      ...this.props,
      executionContext: context,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  // 设置变量
  public setVariable(key: string, value: unknown): Thread {
    const newContext = this.props.executionContext.setVariable(key, value);
    return this.updateExecutionContext(newContext);
  }

  // 获取变量
  public getVariable(key: string): unknown | undefined {
    return this.props.executionContext.getVariable(key);
  }
}
```

### 3.3 Fork策略的上下文处理

**推荐实现：**
```typescript
public calculateContextRetention(
  thread: Thread,
  forkPoint: NodeId
): ContextRetentionPlan {
  let includePromptContext = false;
  let includeHistory = false;
  let includeMetadata = false;

  // 根据上下文保留类型设置标志
  switch (this.props.contextRetention) {
    case 'full':
      includePromptContext = true;
      includeHistory = true;
      includeMetadata = true;
      break;
    case 'partial':
      includePromptContext = true;
      includeHistory = true;
      includeMetadata = false;
      break;
    case 'minimal':
      includePromptContext = false;
      includeHistory = false;
      includeMetadata = false;
      break;
  }

  // 从Thread.ExecutionContext获取变量
  const variablesToRetain = new Set<string>(
    thread.executionContext.variables.keys()
  );

  // 从Thread.ExecutionContext获取节点上下文
  const nodeStatesToRetain = new Map<string, NodeExecutionSnapshot>();
  for (const [nodeId, context] of thread.executionContext.nodeContexts.entries()) {
    // 转换为NodeExecutionSnapshot
    nodeStatesToRetain.set(nodeId, this.toNodeExecutionSnapshot(context));
  }

  return {
    variablesToRetain,
    nodeStatesToRetain,
    includePromptContext,
    includeHistory,
    includeMetadata,
  };
}
```

### 3.4 Workflow提供初始上下文

**推荐设计：**
```typescript
export interface WorkflowProps {
  readonly id: ID;
  readonly definition: WorkflowDefinition;
  readonly graph: WorkflowGraphData;
  readonly subWorkflowReferences: Map<string, WorkflowReference>;
  readonly initialContext?: ExecutionContext; // 新增：初始上下文模板
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly createdBy?: ID;
  readonly updatedBy?: ID;
}

export class Workflow extends Entity {
  // 获取初始上下文
  public get initialContext(): ExecutionContext | undefined {
    return this.props.initialContext;
  }

  // 设置初始上下文
  public setInitialContext(context: ExecutionContext): Workflow {
    return new Workflow({
      ...this.props,
      initialContext: context,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }
}
```

### 3.5 Thread创建时继承Workflow初始上下文

**推荐实现：**
```typescript
public static create(
  sessionId: ID,
  workflowId: ID,
  workflow: Workflow, // 新增参数
  priority?: ThreadPriority,
  title?: string,
  description?: string,
  metadata?: Record<string, unknown>
): Thread {
  const now = Timestamp.now();
  const threadId = ID.generate();
  const threadPriority = priority || ThreadPriority.normal();

  // 创建统一状态管理
  const state = State.create(
    threadId,
    StateEntityType.thread(),
    {
      status: 'pending',
      execution: {
        progress: 0,
        currentStep: undefined,
        startedAt: undefined,
        completedAt: undefined,
        errorMessage: undefined,
        retryCount: 0,
        lastActivityAt: now.toISOString(),
      },
      context: {
        variables: workflow.initialContext?.variables.toRecord() || {},
        nodeContexts: {},
        promptContext: workflow.initialContext?.promptContext.toRecord() || {},
      },
    },
    {
      workflowId: workflowId.value,
      sessionId: sessionId.value,
    }
  );

  // 创建执行上下文
  const executionContext = workflow.initialContext
    ? ExecutionContext.fromProps({
        variables: new Map(workflow.initialContext.variables),
        promptContext: workflow.initialContext.promptContext,
        nodeContexts: new Map(workflow.initialContext.nodeContexts),
        config: {},
      })
    : ExecutionContext.create(PromptContext.create(''));

  const props: ThreadProps = {
    id: threadId,
    sessionId,
    workflowId,
    priority: threadPriority,
    title,
    description,
    metadata: Metadata.create(metadata || {}),
    deletionStatus: DeletionStatus.active(),
    createdAt: now,
    updatedAt: now,
    version: Version.initial(),
    state,
    executionContext, // 新增
  };

  return new Thread(props);
}
```

## 4. 上下文管理流程

### 4.1 Thread创建流程

```
1. Workflow定义初始上下文（可选）
   ↓
2. Thread创建时继承Workflow初始上下文
   ↓
3. Thread.State包含上下文数据
   ↓
4. Thread.ExecutionContext基于State.context创建
   ↓
5. 节点执行时使用ExecutionContext
```

### 4.2 Fork流程

```
1. ForkStrategy计算上下文保留计划
   ↓
2. 从父Thread.ExecutionContext获取变量和节点上下文
   ↓
3. 根据策略过滤变量和节点上下文
   ↓
4. 创建子Thread.ExecutionContext
   ↓
5. 子Thread继承过滤后的上下文
```

### 4.3 Copy流程

```
1. CopyStrategy计算上下文复制计划
   ↓
2. 从源Thread.ExecutionContext获取变量和节点上下文
   ↓
3. 根据策略复制变量和节点上下文
   ↓
4. 创建新Thread.ExecutionContext
   ↓
5. 新Thread包含复制的上下文
```

## 5. 实施建议

### 5.1 优先级

**高优先级：**
1. Thread.State添加context字段
2. Thread实体添加ExecutionContext属性
3. ForkStrategy从Thread.ExecutionContext获取变量

**中优先级：**
4. Workflow添加initialContext属性
5. Thread创建时继承Workflow初始上下文
6. CopyStrategy从Thread.ExecutionContext获取变量

**低优先级：**
7. 优化ExecutionContext性能
8. 添加上下文验证
9. 添加上下文监控

### 5.2 实施步骤

1. **扩展Thread.State结构**
   - 在Thread.State.data中添加context字段
   - 更新ThreadRepository的序列化/反序列化逻辑

2. **Thread实体添加ExecutionContext属性**
   - 在ThreadProps中添加executionContext字段
   - 添加ExecutionContext相关的getter和setter方法
   - 更新Thread.create方法

3. **修复ForkStrategy**
   - 从Thread.ExecutionContext获取变量
   - 实现正确的上下文保留逻辑

4. **Workflow添加initialContext**
   - 在WorkflowProps中添加initialContext字段
   - 添加initialContext相关的getter和setter方法

5. **Thread创建时继承Workflow初始上下文**
   - 更新Thread.create方法
   - 从Workflow继承初始上下文

6. **更新相关服务**
   - 更新ThreadExecution服务
   - 更新ThreadCopy服务
   - 更新ThreadFork服务

## 6. 总结

### 6.1 核心问题

1. **上下文管理分散**：ExecutionContext和WorkflowExecutionContext不统一
2. **Thread.State不包含执行上下文**：执行变量无处存储
3. **Fork策略不完整**：无法保留执行上下文
4. **Workflow没有初始上下文**：无法为Thread提供初始上下文
5. **SharedResources与ExecutionContext关系不明确**：职责划分不清

### 6.2 解决方案

1. **Thread.State添加context字段**：存储执行上下文数据
2. **Thread实体添加ExecutionContext属性**：提供统一的上下文访问接口
3. **ForkStrategy从Thread.ExecutionContext获取变量**：实现正确的上下文保留
4. **Workflow添加initialContext**：提供初始上下文模板
5. **明确SharedResources和ExecutionContext的职责**：SharedResources管理共享资源，ExecutionContext管理执行上下文

### 6.3 预期效果

1. **统一的上下文管理**：所有上下文操作通过ExecutionContext
2. **完整的Fork/Copy功能**：正确保留和继承执行上下文
3. **清晰的职责划分**：Workflow、Thread、Session各司其职
4. **更好的可维护性**：上下文管理逻辑集中化
5. **更好的可扩展性**：易于添加新的上下文功能