# SDK 管理器层改造方案

## 概述

对 SDK 的 CheckpointManager 和 TriggerManager 进行了分析，识别出两个关键设计问题，并给出了改造方案。

## 问题分析

### CheckpointManager 的问题

CheckpointManager 当前维护一个 `periodicTimers` Map 来管理定时检查点。这带来的问题是：

1. **职责混乱**：检查点快照管理是核心职责，但定时器的生命周期管理不应该由 SDK 负责，应该由应用层处理
2. **有状态设计**：维护定时器集合意味着管理器本身是有状态的，这与无状态设计原则矛盾
3. **内存泄漏风险**：当线程被删除时，对应的定时器可能未被清理
4. **单一触发方式**：只支持定时触发，不灵活

### TriggerManager 的问题

TriggerManager 维护一个 `triggers` Map，其中混合了触发器的定义（来自 WorkflowDefinition）和运行时状态（status、triggerCount、updatedAt）。这导致：

1. **状态混乱**：定义和状态混在一起，难以理清职责
2. **线程隔离破坏**：多个线程使用同一个工作流时，修改触发器状态（如禁用）会影响所有线程，而不是线程隔离的
3. **并发冲突**：直接修改对象，无原子性保证
4. **检查点无法恢复**：触发器状态无法持久化到检查点，恢复时状态会丢失
5. **无版本追踪**：无法记录状态变更历史

## 为什么 TriggerManager 不能删除

有人可能会问，为什么不用 WorkflowRegistry 直接管理触发器？原因是两者职责完全不同：

- **WorkflowRegistry**：全局单例，管理工作流的**定义**（蓝图），这是静态的、所有线程共享的
- **TriggerManager**：线程级别的实例，管理该线程中触发器的**运行时状态**（启用/禁用、触发次数等），这是动态的、线程独立的

如果用 WorkflowRegistry 替代 TriggerManager，会导致：
- 线程 A 禁用某个触发器，线程 B 也会看到禁用状态（线程隔离被破坏）
- 触发次数计数是全局的，而不是线程级别的
- 两个线程同时修改触发器状态会产生竞态条件

## 改造方案

### 1. CheckpointManager：删除定时机制

**改造内容**：
- 删除 `private periodicTimers: Map<string, NodeJS.Timeout>`
- 删除 `createPeriodicCheckpoint()` 方法
- 删除 `cancelPeriodicCheckpoint()` 方法
- 删除对 ExecutionContext 的依赖（构造函数参数）
- 删除对 EventType 和 CheckpointCreatedEvent 的导入（事件触发改由应用层负责）

**核心保留**：
- `createCheckpoint()`：创建快照
- `restoreFromCheckpoint()`：恢复状态
- 所有 CRUD 操作

**应用层如何实现定时触发**（由应用负责）：
```typescript
// 简单定时
setInterval(() => sdk.checkpoint.create(threadId), 5000);

// 事件驱动
sdk.on('node:completed', (event) => sdk.checkpoint.create(event.threadId));

// 自定义策略
class CheckpointStrategy {
  async checkpoint(threadId) {
    const context = await sdk.thread.get(threadId);
    if (shouldCheckpoint(context)) {
      await sdk.checkpoint.create(threadId);
    }
  }
}
```

**已完成的改造**：
- ✅ CheckpointManager 本体已改造（删除定时器和依赖）

**待完成**：
- [ ] CheckpointManagerAPI：删除 `enablePeriodicCheckpoints()` 和 `disablePeriodicCheckpoints()`
- [ ] ExecutionContext：删除 CheckpointManager 的定时器初始化逻辑
- [ ] 更新相关测试

### 2. TriggerManager：分离定义与状态

TriggerManager 不删除，而是改造为无状态协调器。改造的核心是分离定义（来自 WorkflowRegistry）和状态（运行时管理）。

**新增组件**：

创建 `TriggerStateManager` 类，专门管理触发器的运行时状态：

```typescript
interface TriggerRuntimeState {
  triggerId: ID;
  threadId: ID;
  status: TriggerStatus;       // 'enabled' 或 'disabled'
  triggerCount: number;         // 触发次数
  updatedAt: number;            // 最后更新时间
}

class TriggerStateManager {
  private states: Map<ID, TriggerRuntimeState>;
  
  register(state: TriggerRuntimeState): void
  getState(triggerId: ID): TriggerRuntimeState | undefined
  updateStatus(triggerId: ID, status: TriggerStatus): void
  incrementTriggerCount(triggerId: ID): void
  createSnapshot(): Map<ID, TriggerRuntimeState>
  restoreFromSnapshot(snapshot: Map<ID, TriggerRuntimeState>): void
}
```

**改造 TriggerManager**：

TriggerManager 变成协调器，不再存储触发器副本：

```typescript
class TriggerManager {
  constructor(
    private threadRegistry: ThreadRegistry,
    private workflowRegistry: WorkflowRegistry,
    private stateManager: TriggerStateManager
  ) {}
  
  get(triggerId: ID): Trigger | undefined {
    // 从 workflowRegistry 获取定义
    // 从 stateManager 获取状态
    // 合并返回
  }
  
  getAll(): Trigger[] {
    // 从 workflowRegistry 获取所有定义
    // 从 stateManager 获取各自的状态
    // 合并返回
  }
  
  async handleEvent(event: BaseEvent): Promise<void> {
    for (const trigger of this.getAll()) {
      // ... 事件匹配逻辑 ...
      this.stateManager.incrementTriggerCount(trigger.id);  // 更新状态
      this.stateManager.updateStatus(trigger.id, 'disabled'); // 更新状态
    }
  }
}
```

**改造 ThreadContext**：

在 ThreadContext 中添加 TriggerStateManager：

```typescript
export class ThreadContext {
  readonly triggerStateManager: TriggerStateManager;
  readonly triggerManager: TriggerManager;
  
  constructor(
    thread: Thread,
    conversationManager: ConversationManager,
    threadRegistry: ThreadRegistry,
    workflowRegistry: WorkflowRegistry
  ) {
    this.triggerStateManager = new TriggerStateManager();
    this.triggerManager = new TriggerManager(
      threadRegistry,
      workflowRegistry,
      this.triggerStateManager
    );
  }
  
  getTriggerStateSnapshot(): Map<ID, TriggerRuntimeState> {
    return this.triggerStateManager.createSnapshot();
  }
  
  restoreTriggerState(snapshot: Map<ID, TriggerRuntimeState>): void {
    this.triggerStateManager.restoreFromSnapshot(snapshot);
  }
}
```

**改造 ThreadBuilder**：

修改触发器初始化逻辑，不再存储触发器定义副本，而是初始化运行时状态：

```typescript
private registerWorkflowTriggers(threadContext: ThreadContext, workflow: ProcessedWorkflowDefinition): void {
  if (!workflow.triggers || workflow.triggers.length === 0) {
    return;
  }
  
  for (const workflowTrigger of workflow.triggers) {
    const state: TriggerRuntimeState = {
      triggerId: workflowTrigger.id,
      threadId: threadContext.getThreadId(),
      status: 'enabled',
      triggerCount: 0,
      updatedAt: now()
    };
    threadContext.triggerStateManager.register(state);
  }
}
```

**改造 CheckpointManager**：

在检查点中保存和恢复触发器状态：

```typescript
async createCheckpoint(threadId: string, metadata?: CheckpointMetadata): Promise<string> {
  // ... 现有逻辑 ...
  
  const triggerStateSnapshot = threadContext.getTriggerStateSnapshot();
  
  const threadState: ThreadStateSnapshot = {
    // ... 现有字段 ...
    triggerStates: triggerStateSnapshot  // 新增：触发器状态
  };
  
  // ... 保存检查点 ...
}

async restoreFromCheckpoint(checkpointId: string): Promise<ThreadContext> {
  // ... 现有逻辑 ...
  
  if (checkpoint.threadState.triggerStates) {
    threadContext.restoreTriggerState(checkpoint.threadState.triggerStates);
  }
  
  return threadContext;
}
```

**改造 TriggerManagerAPI**：

所有修改触发器状态的操作都通过 TriggerStateManager：

```typescript
async enableTrigger(threadId: string, triggerId: string): Promise<void> {
  const triggerManager = this.getTriggerManager(threadId);
  triggerManager.stateManager.updateStatus(triggerId, 'enabled');
}

async disableTrigger(threadId: string, triggerId: string): Promise<void> {
  const triggerManager = this.getTriggerManager(threadId);
  triggerManager.stateManager.updateStatus(triggerId, 'disabled');
}
```

## 改造收益

**CheckpointManager**：
- 无状态设计，职责清晰（仅负责快照/恢复）
- 定时触发灵活性高（应用层可实现多种策略）
- 无内存泄漏风险
- 不依赖 ExecutionContext

**TriggerManager**：
- 定义与状态分离，各司其职
- 完全的线程隔离，多线程安全
- 触发器状态可持久化，检查点恢复无缝
- 易于版本控制和状态审计
- WorkflowRegistry 作为单一信息源

## 实现顺序

1. **第一步**：完成 CheckpointManager API 更新（简单）
2. **第二步**：创建 TriggerStateManager（新增，无依赖）
3. **第三步**：改造 TriggerManager（核心改造）
4. **第四步**：更新 ThreadContext、ThreadBuilder、CheckpointManager（关联改造）
5. **第五步**：更新 API 层和测试（验证）

## API 变更

**删除**：
- CheckpointManager.createPeriodicCheckpoint()
- CheckpointManager.cancelPeriodicCheckpoint()
- CheckpointManagerAPI.enablePeriodicCheckpoints()
- CheckpointManagerAPI.disablePeriodicCheckpoints()

**保留**（实现不变）：
- TriggerManager 的所有现有方法（get, getAll, enable, disable, register, unregister, handleEvent 等）
- 用户代码无感知变更

**新增**（应用层实现）：
- 定时检查点逻辑（应用层实现）

## 风险与缓解

- **API 破坏**：需要应用层迁移定时触发逻辑。通过清晰的迁移指南和示例代码缓解。
- **性能**：TriggerManager.getAll() 从 WorkflowRegistry 查询定义，但查询是 O(1)，触发器数量通常 < 50，性能无退化。
- **测试**：需要更新大量测试，但改造思路清晰，可按部就班完成。

## 文件清单

**已改造**：
- ✅ `sdk/core/execution/managers/checkpoint-manager.ts`

**待改造**：
- `sdk/api/management/checkpoint-manager-api.ts`
- `sdk/core/execution/context/execution-context.ts`
- `sdk/core/execution/context/thread-context.ts`
- `sdk/core/execution/managers/trigger-manager.ts`
- `sdk/core/execution/managers/trigger-state-manager.ts`（新建）
- `sdk/core/execution/thread-builder.ts`
- `sdk/api/management/trigger-manager-api.ts`
- 所有相关测试文件

