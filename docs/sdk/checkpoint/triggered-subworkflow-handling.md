# Triggered子工作流处理方案分析

最终采取方案3

## 一、背景

### 1. 什么是Triggered子工作流？

Triggered子工作流是由触发器（Trigger）动态触发的子工作流，具有以下特点：

- **独立执行**：在独立的执行上下文中运行
- **动态触发**：由事件或条件触发，不是工作流图的一部分
- **并行执行**：可以与主工作流并行执行
- **不修改主图**：不修改主工作流的图结构

### 2. 与SUBGRAPH节点的区别

| 特性 | SUBGRAPH节点 | Triggered子工作流 |
|------|-------------|------------------|
| 触发方式 | 工作流图定义 | 事件/条件触发 |
| 图结构 | 内联展开到主图 | 独立图结构 |
| 执行上下文 | 主工作流上下文 | 独立执行上下文 |
| Checkpoint | 主工作流Checkpoint | 需要独立Checkpoint |
| 并行性 | 顺序执行 | 可并行执行 |

### 3. 为什么需要特殊处理？

**问题**：Triggered子工作流在独立上下文中执行，主工作流的Checkpoint无法捕获其状态。

**影响**：
- 恢复主工作流时，Triggered子工作流的状态丢失
- 可能导致重复执行或遗漏执行
- 影响业务逻辑的正确性

## 二、三种处理方案

### 方案1：扁平化记录（推荐）

#### 设计思路

将主工作流和所有Triggered子工作流的状态保存在同一个Checkpoint中，使用扁平化的数据结构。

#### 数据结构

```typescript
interface ThreadStateSnapshot {
  // 主工作流状态
  mainWorkflowState: {
    currentNodeId: ID;
    nodeResults: Record<string, NodeExecutionResult>;
    variables: VariableScopes;
    status: ThreadStatus;
    input: Record<string, any>;
    output: Record<string, any>;
    errors: any[];
    // ... 其他主工作流状态
  };
  
  // 触发的子工作流状态（并行执行）
  triggeredSubgraphStates: Map<string, {
    workflowId: ID;
    triggerId: ID;
    currentNodeId: ID;
    nodeResults: Record<string, NodeExecutionResult>;
    variables: VariableScopes;
    status: ThreadStatus;
    input: Record<string, any>;
    output: Record<string, any>;
    errors: any[];
    startTime: number;
    // ... 其他子工作流状态
  }>;
}
```

#### 执行流程

```
1. 主工作流执行到NodeA
2. Trigger1触发subworkflow1（并行）
3. Trigger2触发subworkflow2（并行）
4. 主工作流继续执行到NodeB
5. 创建Checkpoint
   - 保存主工作流状态（NodeB）
   - 保存subworkflow1状态（NodeX）
   - 保存subworkflow2状态（NodeY）
6. 恢复时同时恢复所有工作流状态
```

#### 代码示例

```typescript
// 创建Checkpoint
static async createCheckpoint(
  threadId: string,
  dependencies: CheckpointDependencies,
  metadata?: CheckpointMetadata
): Promise<string> {
  const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;
  
  const threadContext = threadRegistry.get(threadId);
  const thread = threadContext.thread;
  
  // 保存主工作流状态
  const mainWorkflowState = {
    currentNodeId: thread.currentNodeId,
    nodeResults: thread.nodeResults,
    variables: threadContext.getVariableStateManager().createSnapshot(),
    status: thread.status,
    input: thread.input,
    output: thread.output,
    errors: thread.errors
  };
  
  // 保存触发的子工作流状态
  const triggeredSubgraphStates = new Map();
  const triggeredSubgraphs = threadContext.getTriggeredSubgraphs();
  
  for (const [subgraphId, subgraphContext] of triggeredSubgraphs.entries()) {
    triggeredSubgraphStates.set(subgraphId, {
      workflowId: subgraphContext.getWorkflowId(),
      triggerId: subgraphContext.getTriggerId(),
      currentNodeId: subgraphContext.getCurrentNodeId(),
      nodeResults: subgraphContext.getNodeResults(),
      variables: subgraphContext.getVariableStateManager().createSnapshot(),
      status: subgraphContext.getStatus(),
      input: subgraphContext.getInput(),
      output: subgraphContext.getOutput(),
      errors: subgraphContext.getErrors(),
      startTime: subgraphContext.getStartTime()
    });
  }
  
  const threadState: ThreadStateSnapshot = {
    mainWorkflowState,
    triggeredSubgraphStates
  };
  
  const checkpoint: Checkpoint = {
    id: generateId(),
    threadId,
    workflowId: thread.workflowId,
    timestamp: now(),
    threadState,
    metadata
  };
  
  return await checkpointStateManager.create(checkpoint);
}

// 恢复Checkpoint
static async restoreFromCheckpoint(
  checkpointId: string,
  dependencies: CheckpointDependencies
): Promise<ThreadContext> {
  const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;
  
  const checkpoint = await checkpointStateManager.get(checkpointId);
  if (!checkpoint) {
    throw new NotFoundError(`Checkpoint not found`, 'Checkpoint', checkpointId);
  }
  
  // 恢复主工作流
  const mainThreadContext = await this.restoreMainWorkflow(
    checkpoint.threadState.mainWorkflowState,
    dependencies
  );
  
  // 恢复触发的子工作流
  for (const [subgraphId, subgraphState] of checkpoint.threadState.triggeredSubgraphStates.entries()) {
    const subgraphContext = await this.restoreSubgraph(
      subgraphState,
      dependencies
    );
    mainThreadContext.registerTriggeredSubgraph(subgraphId, subgraphContext);
  }
  
  return mainThreadContext;
}
```

#### 优点

1. **架构改动最小**：不需要引入新的Thread概念
2. **恢复语义清晰**：所有状态在一个Checkpoint中，恢复逻辑简单
3. **支持精确恢复**：可以精确恢复所有工作流的状态
4. **支持并行执行**：可以同时恢复多个并行执行的子工作流

#### 缺点

1. **Checkpoint较大**：需要保存多个工作流的状态
2. **恢复逻辑复杂**：需要同时恢复主工作流和子工作流
3. **内存占用高**：所有工作流状态同时加载到内存

#### 适用场景

- 触发子工作流数量较少（< 10个）
- 需要精确恢复所有工作流状态
- 子工作流执行时间较短

---

### 方案2：事件溯源模式

#### 设计思路

只保存主工作流状态和触发事件记录，不保存子工作流状态。恢复时重新播放触发事件，重新触发子工作流。

#### 数据结构

```typescript
interface ThreadStateSnapshot {
  // 主工作流状态
  currentNodeId: ID;
  nodeResults: Record<string, NodeExecutionResult>;
  variables: VariableScopes;
  status: ThreadStatus;
  input: Record<string, any>;
  output: Record<string, any>;
  errors: any[];
  // ... 其他主工作流状态
  
  // 触发事件记录（不保存子工作流状态）
  triggerEvents: Array<{
    triggerId: ID;
    subworkflowId: ID;
    eventData: any;
    timestamp: number;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
  }>;
}
```

#### 执行流程

```
1. 主工作流执行到NodeA
2. Trigger1触发subworkflow1
   - 记录触发事件，但不等待执行完成
   - subworkflow1在后台执行
3. 主工作流继续执行到NodeB
4. 创建Checkpoint
   - 只保存主工作流状态（NodeB）
   - 保存触发事件记录（Trigger1触发subworkflow1）
5. 恢复时
   - 恢复主工作流到NodeB
   - 重新播放触发事件，重新触发subworkflow1
```

#### 代码示例

```typescript
// 创建Checkpoint
static async createCheckpoint(
  threadId: string,
  dependencies: CheckpointDependencies,
  metadata?: CheckpointMetadata
): Promise<string> {
  const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;
  
  const threadContext = threadRegistry.get(threadId);
  const thread = threadContext.thread;
  
  // 保存主工作流状态
  const mainWorkflowState = {
    currentNodeId: thread.currentNodeId,
    nodeResults: thread.nodeResults,
    variables: threadContext.getVariableStateManager().createSnapshot(),
    status: thread.status,
    input: thread.input,
    output: thread.output,
    errors: thread.errors
  };
  
  // 保存触发事件记录（不保存子工作流状态）
  const triggerEvents = threadContext.getTriggerEvents();
  
  const threadState: ThreadStateSnapshot = {
    ...mainWorkflowState,
    triggerEvents
  };
  
  const checkpoint: Checkpoint = {
    id: generateId(),
    threadId,
    workflowId: thread.workflowId,
    timestamp: now(),
    threadState,
    metadata
  };
  
  return await checkpointStateManager.create(checkpoint);
}

// 恢复Checkpoint
static async restoreFromCheckpoint(
  checkpointId: string,
  dependencies: CheckpointDependencies
): Promise<ThreadContext> {
  const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;
  
  const checkpoint = await checkpointStateManager.get(checkpointId);
  if (!checkpoint) {
    throw new NotFoundError(`Checkpoint not found`, 'Checkpoint', checkpointId);
  }
  
  // 恢复主工作流
  const threadContext = await this.restoreMainWorkflow(
    checkpoint.threadState,
    dependencies
  );
  
  // 重新播放触发事件
  for (const triggerEvent of checkpoint.threadState.triggerEvents) {
    if (triggerEvent.status === 'pending') {
      // 重新触发子工作流
      await threadContext.replayTriggerEvent(triggerEvent);
    }
  }
  
  return threadContext;
}
```

#### 优点

1. **Checkpoint轻量**：只保存主工作流状态和触发事件
2. **子工作流独立**：子工作流执行状态不污染主工作流
3. **符合事件驱动架构**：使用事件溯源模式，易于理解和维护
4. **内存占用低**：不需要同时加载所有工作流状态

#### 缺点

1. **需要幂等性**：子工作流必须支持幂等执行
2. **可能重复执行**：恢复时可能重复执行已完成的子工作流
3. **需要去重机制**：需要处理重复触发问题
4. **状态不一致**：恢复后的子工作流状态可能与原状态不一致

#### 适用场景

- 子工作流都是幂等的
- 可以接受重复执行
- 子工作流执行时间较长
- 触发子工作流数量较多

---

### 方案3：主从分离模式

#### 设计思路

为主工作流和每个Triggered子工作流创建独立的Thread和Checkpoint，通过父子关系关联。

#### 数据结构

```typescript
// 主Thread的Checkpoint
interface MainThreadStateSnapshot {
  currentNodeId: ID;
  nodeResults: Record<string, NodeExecutionResult>;
  variables: VariableScopes;
  status: ThreadStatus;
  input: Record<string, any>;
  output: Record<string, any>;
  errors: any[];
  // ... 其他主工作流状态
  
  // 子Thread引用
  childThreadIds: ID[];
}

// 子Thread的Checkpoint
interface SubThreadStateSnapshot {
  parentThreadId: ID;
  triggerId: ID;
  workflowId: ID;
  currentNodeId: ID;
  nodeResults: Record<string, NodeExecutionResult>;
  variables: VariableScopes;
  status: ThreadStatus;
  input: Record<string, any>;
  output: Record<string, any>;
  errors: any[];
  startTime: number;
  // ... 其他子工作流状态
}
```

#### 执行流程

```
1. 主工作流执行到NodeA
2. Trigger1触发subworkflow1
   - 创建新的子Thread
   - 子Thread独立执行
3. 主工作流继续执行到NodeB
4. 创建Checkpoint
   - 为主Thread创建Checkpoint（包含子Thread引用）
   - 为子Thread创建独立Checkpoint
5. 恢复时
   - 恢复主Thread
   - 恢复所有子Thread
   - 重建父子关系
```

#### 代码示例

```typescript
// 创建主Thread的Checkpoint
static async createMainCheckpoint(
  threadId: string,
  dependencies: CheckpointDependencies,
  metadata?: CheckpointMetadata
): Promise<string> {
  const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;
  
  const threadContext = threadRegistry.get(threadId);
  const thread = threadContext.thread;
  
  // 保存主工作流状态
  const mainWorkflowState = {
    currentNodeId: thread.currentNodeId,
    nodeResults: thread.nodeResults,
    variables: threadContext.getVariableStateManager().createSnapshot(),
    status: thread.status,
    input: thread.input,
    output: thread.output,
    errors: thread.errors
  };
  
  // 获取子Thread引用
  const childThreadIds = threadContext.getChildThreadIds();
  
  const threadState: MainThreadStateSnapshot = {
    ...mainWorkflowState,
    childThreadIds
  };
  
  const checkpoint: Checkpoint = {
    id: generateId(),
    threadId,
    workflowId: thread.workflowId,
    timestamp: now(),
    threadState,
    metadata
  };
  
  return await checkpointStateManager.create(checkpoint);
}

// 创建子Thread的Checkpoint
static async createSubCheckpoint(
  threadId: string,
  dependencies: CheckpointDependencies,
  metadata?: CheckpointMetadata
): Promise<string> {
  const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;
  
  const threadContext = threadRegistry.get(threadId);
  const thread = threadContext.thread;
  
  // 保存子工作流状态
  const subWorkflowState = {
    parentThreadId: threadContext.getParentThreadId(),
    triggerId: threadContext.getTriggerId(),
    workflowId: thread.workflowId,
    currentNodeId: thread.currentNodeId,
    nodeResults: thread.nodeResults,
    variables: threadContext.getVariableStateManager().createSnapshot(),
    status: thread.status,
    input: thread.input,
    output: thread.output,
    errors: thread.errors,
    startTime: thread.getStartTime()
  };
  
  const checkpoint: Checkpoint = {
    id: generateId(),
    threadId,
    workflowId: thread.workflowId,
    timestamp: now(),
    threadState: subWorkflowState,
    metadata
  };
  
  return await checkpointStateManager.create(checkpoint);
}

// 恢复主Thread
static async restoreMainThread(
  checkpointId: string,
  dependencies: CheckpointDependencies
): Promise<ThreadContext> {
  const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;
  
  const checkpoint = await checkpointStateManager.get(checkpointId);
  if (!checkpoint) {
    throw new NotFoundError(`Checkpoint not found`, 'Checkpoint', checkpointId);
  }
  
  // 恢复主工作流
  const threadContext = await this.restoreMainWorkflow(
    checkpoint.threadState,
    dependencies
  );
  
  // 恢复所有子Thread
  for (const childThreadId of checkpoint.threadState.childThreadIds) {
    const childCheckpointId = await this.findChildCheckpoint(childThreadId);
    const childContext = await this.restoreSubThread(childCheckpointId, dependencies);
    threadContext.registerChildThread(childContext);
  }
  
  return threadContext;
}
```

#### 优点

1. **完全符合Thread模型**：每个工作流都有独立的Thread
2. **子工作流独立管理**：子工作流有完整的生命周期
3. **支持独立Checkpoint**：每个Thread可以独立创建和恢复Checkpoint
4. **资源隔离**：子工作流资源独立，互不影响

#### 缺点

1. **需要管理多个Thread**：需要维护Thread的父子关系
2. **Thread间通信复杂**：主Thread和子Thread需要通信机制
3. **资源开销大**：每个Thread都需要独立的资源
4. **恢复逻辑复杂**：需要同时恢复主Thread和所有子Thread

#### 适用场景

- 子工作流复杂，需要独立管理
- 子工作流执行时间很长
- 需要子工作流独立Checkpoint
- 资源充足

---

## 三、方案对比

| 维度 | 方案1：扁平化记录 | 方案2：事件溯源 | 方案3：主从分离 |
|------|------------------|----------------|----------------|
| **架构改动** | 小 | 中 | 大 |
| **Checkpoint大小** | 大 | 小 | 中 |
| **恢复复杂度** | 中 | 低 | 高 |
| **内存占用** | 高 | 低 | 中 |
| **精确恢复** | 高 | 中 | 高 |
| **幂等性要求** | 无 | 有 | 无 |
| **并行支持** | 好 | 好 | 好 |
| **资源隔离** | 差 | 好 | 好 |
| **适用场景** | 触发子工作流较少 | 子工作流幂等 | 子工作流复杂 |

---

## 四、推荐方案

### 默认推荐：方案1（扁平化记录）

**理由**：
1. **架构改动最小**：不需要引入新的Thread概念
2. **恢复语义清晰**：所有状态在一个Checkpoint中，恢复逻辑简单
3. **支持精确恢复**：可以精确恢复所有工作流的状态
4. **与现有架构最匹配**：符合当前的Thread模型

**适用条件**：
- 触发子工作流数量较少（< 10个）
- 需要精确恢复所有工作流状态
- 子工作流执行时间较短

### 优化推荐：方案2（事件溯源）

**理由**：
1. **Checkpoint轻量**：只保存主工作流状态和触发事件
2. **符合事件驱动架构**：使用事件溯源模式，易于理解和维护
3. **内存占用低**：不需要同时加载所有工作流状态

**适用条件**：
- 子工作流都是幂等的
- 可以接受重复执行
- 子工作流执行时间较长
- 触发子工作流数量较多

### 特殊场景：方案3（主从分离）

**理由**：
1. **完全符合Thread模型**：每个工作流都有独立的Thread
2. **子工作流独立管理**：子工作流有完整的生命周期
3. **支持独立Checkpoint**：每个Thread可以独立创建和恢复Checkpoint

**适用条件**：
- 子工作流复杂，需要独立管理
- 子工作流执行时间很长
- 需要子工作流独立Checkpoint
- 资源充足

---

## 五、实现建议

### 方案1实现要点

1. **修改ThreadStateSnapshot接口**：
```typescript
interface ThreadStateSnapshot {
  // 主工作流状态
  currentNodeId: ID;
  nodeResults: Record<string, NodeExecutionResult>;
  variables: VariableScopes;
  // ...
  
  // 触发的子工作流状态
  triggeredSubgraphStates?: Map<string, {
    workflowId: ID;
    triggerId: ID;
    currentNodeId: ID;
    nodeResults: Record<string, NodeExecutionResult>;
    variables: VariableScopes;
    // ...
  }>;
}
```

2. **修改CheckpointCoordinator**：
   - 创建Checkpoint时保存子工作流状态
   - 恢复Checkpoint时恢复子工作流状态

3. **修改ThreadContext**：
   - 添加获取子工作流状态的方法
   - 添加注册子工作流的方法

### 方案2实现要点

1. **修改ThreadStateSnapshot接口**：
```typescript
interface ThreadStateSnapshot {
  // 主工作流状态
  currentNodeId: ID;
  nodeResults: Record<string, NodeExecutionResult>;
  variables: VariableScopes;
  // ...
  
  // 触发事件记录
  triggerEvents: Array<{
    triggerId: ID;
    subworkflowId: ID;
    eventData: any;
    timestamp: number;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
  }>;
}
```

2. **修改CheckpointCoordinator**：
   - 创建Checkpoint时保存触发事件
   - 恢复Checkpoint时重新播放触发事件

3. **修改ThreadContext**：
   - 添加获取触发事件的方法
   - 添加重放触发事件的方法

4. **确保子工作流幂等性**：
   - 子工作流需要支持幂等执行
   - 添加去重机制

### 方案3实现要点

1. **创建SubThread类型**：
```typescript
class SubThread extends Thread {
  parentThreadId: ID;
  triggerId: ID;
  
  constructor(
    parentThreadId: ID,
    triggerId: ID,
    // ... 其他参数
  ) {
    super(...);
    this.parentThreadId = parentThreadId;
    this.triggerId = triggerId;
  }
}
```

2. **修改ThreadContext**：
   - 添加管理子Thread的方法
   - 添加获取子Thread引用的方法

3. **修改CheckpointCoordinator**：
   - 为主Thread创建Checkpoint
   - 为子Thread创建独立Checkpoint
   - 恢复时重建父子关系

---

## 六、总结

Triggered子工作流的处理是一个复杂的问题，需要根据具体场景选择合适的方案：

1. **方案1（扁平化记录）**：适合触发子工作流较少的场景，架构改动最小
2. **方案2（事件溯源）**：适合子工作流幂等的场景，Checkpoint轻量
3. **方案3（主从分离）**：适合子工作流复杂的场景，完全独立管理

**推荐默认使用方案1**，因为它与现有架构最匹配，改动最小，恢复语义最清晰。