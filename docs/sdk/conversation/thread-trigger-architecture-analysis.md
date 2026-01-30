# Thread级别TriggerManager架构分析

## 当前架构分析

### 1. TriggerManager 的创建位置

#### ThreadContext 中的 TriggerManager（每个 Thread 独立）
**位置**：`sdk/core/execution/context/thread-context.ts:82`
```typescript
constructor(
  thread: Thread,
  conversationManager: ConversationManager
) {
  this.thread = thread;
  this.conversationManager = conversationManager;
  this.variableManager = new VariableManager();
  this.triggerManager = new TriggerManager();  // 每个 Thread 独立
  this.executionState = new ExecutionState();
}
```

**注释**：`触发器管理器（每个 Thread 独立）`

#### ThreadCoordinator 中的 TriggerManager（全局）
**位置**：`sdk/core/execution/thread-coordinator.ts:59`
```typescript
constructor(workflowRegistry?: any) {
  this.threadRegistry = new ThreadRegistry();
  this.threadBuilder = new ThreadBuilder(workflowRegistry);
  this.eventManager = eventManager;
  this.triggerManager = new TriggerManager();  // 全局实例
  this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
  // ✅ 不再传递 workflowRegistry 给 ThreadExecutor，触发器由 ThreadBuilder 在创建 ThreadContext 时注册
  this.threadExecutor = new ThreadExecutor(this.eventManager, this.triggerManager);
}
```

**注释**：`触发器由 ThreadBuilder 在创建 ThreadContext 时注册`

### 2. 触发器的注册流程

**ThreadBuilder.registerWorkflowTriggers**（`sdk/core/execution/thread-builder.ts:173-194`）
```typescript
private registerWorkflowTriggers(threadContext: ThreadContext, workflow: ProcessedWorkflowDefinition): void {
  // 检查工作流是否有触发器定义
  if (!workflow.triggers || workflow.triggers.length === 0) {
    return;
  }

  // 使用 ThreadContext 的 TriggerManager（每个 Thread 独立）
  const triggerManager = threadContext.triggerManager;

  // 注册所有触发器
  for (const workflowTrigger of workflow.triggers) {
    try {
      const trigger = convertToTrigger(workflowTrigger, workflow.id);
      // 设置 threadId 以确保触发器只影响当前 Thread
      trigger.threadId = threadContext.getThreadId();
      triggerManager.register(trigger);
    } catch (error) {
      // 静默处理错误，避免影响其他触发器的注册
      console.error(`Failed to register trigger ${workflowTrigger.id}:`, error);
    }
  }
}
```

**关键点**：
1. 使用 `threadContext.triggerManager`（Thread 级别的 TriggerManager）
2. 设置 `trigger.threadId` 确保触发器只影响当前 Thread
3. 注释说明"触发器由 ThreadBuilder 在创建 ThreadContext 时注册"

### 3. 触发器的执行流程

**TriggerManager.handleEvent**（`sdk/core/execution/managers/trigger-manager.ts:137-175`）
```typescript
async handleEvent(event: BaseEvent): Promise<void> {
  // 获取所有监听该事件类型的触发器
  const triggers = Array.from(this.triggers.values()).filter(
    (trigger) =>
      trigger.condition.eventType === event.type &&
      trigger.status === 'enabled' as TriggerStatus
  );

  // 评估并执行触发器
  for (const trigger of triggers) {
    try {
      // 检查触发次数限制
      if (trigger.maxTriggers && trigger.maxTriggers > 0 && trigger.triggerCount >= trigger.maxTriggers) {
        continue;
      }

      // 检查关联关系
      if (trigger.workflowId && event.workflowId !== trigger.workflowId) {
        continue;
      }
      if (trigger.threadId && event.threadId !== trigger.threadId) {  // 关键：检查 threadId
        continue;
      }

      // 对于 NODE_CUSTOM_EVENT 事件，需要额外匹配 eventName
      if (event.type === EventType.NODE_CUSTOM_EVENT) {
        const customEvent = event as NodeCustomEvent;
        if (trigger.condition.eventName && trigger.condition.eventName !== customEvent.eventName) {
          continue;
        }
      }

      // 执行触发器
      await this.executeTrigger(trigger);
    } catch (error) {
      // 静默处理错误，避免影响其他触发器
    }
  }
}
```

**关键点**：
1. 通过 `trigger.threadId` 过滤触发器
2. 确保触发器只影响对应的 Thread

### 4. Trigger 接口定义

**Trigger 接口**（`sdk/types/trigger.ts:86-115`）
```typescript
export interface Trigger {
  /** 触发器唯一标识符 */
  id: ID;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发器类型 */
  type: TriggerType;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 触发器状态 */
  status: TriggerStatus;
  /** 关联的工作流 ID（可选） */
  workflowId?: ID;
  /** 关联的线程 ID（可选） */
  threadId?: ID;  // 关键字段
  /** 触发次数限制（0 表示无限制） */
  maxTriggers?: number;
  /** 已触发次数 */
  triggerCount: number;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 触发器元数据 */
  metadata?: Metadata;
}
```

## 架构设计分析

### 当前设计的优点

1. **Thread 隔离**：每个 Thread 有自己的 TriggerManager，触发器不会跨 Thread 影响
2. **明确的关联关系**：通过 `threadId` 字段明确关联到特定的 Thread
3. **工作流级别的触发器定义**：触发器在工作流定义中声明，执行时注册到 Thread
4. **自动清理**：Thread 销毁时，其 TriggerManager 也会被销毁

### 当前设计的问题

#### 问题1：ThreadCoordinator 的 TriggerManager 未被使用
- ThreadCoordinator 创建了一个全局的 TriggerManager
- 但注释说明"触发器由 ThreadBuilder 在创建 ThreadContext 时注册"
- 实际使用的是 ThreadContext 的 TriggerManager
- ThreadCoordinator 的 TriggerManager 似乎是冗余的

#### 问题2：ThreadContext 的 TriggerManager 无法访问 ExecutionContext
- TriggerManager 需要 ExecutionContext 来传递给 handler
- 但 ThreadContext 本身就是 ExecutionContext 的一部分
- 这造成了循环依赖的问题

#### 问题3：Handler 函数需要 ExecutionContext
- Handler 函数需要 ExecutionContext 来访问 ThreadRegistry、WorkflowRegistry
- 但 TriggerManager 没有持有 ExecutionContext
- 导致 handler 无法访问正确的上下文

## 正确的架构设计

### 方案1：ThreadContext 的 TriggerManager 持有 ThreadRegistry 引用（推荐）

**修改 ThreadContext**：
```typescript
export class ThreadContext {
  // ... 其他字段

  constructor(
    thread: Thread,
    conversationManager: ConversationManager,
    private threadRegistry: ThreadRegistry  // 添加 ThreadRegistry 引用
  ) {
    this.thread = thread;
    this.conversationManager = conversationManager;
    this.variableManager = new VariableManager();
    this.triggerManager = new TriggerManager(this.threadRegistry);  // 传递 ThreadRegistry
    this.executionState = new ExecutionState();
  }

  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }
}
```

**修改 TriggerManager**：
```typescript
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private threadRegistry: ThreadRegistry;

  constructor(threadRegistry: ThreadRegistry) {
    this.threadRegistry = threadRegistry;
  }

  private async executeTrigger(trigger: Trigger): Promise<void> {
    const handler = getTriggerHandler(trigger.action.type);
    // 创建一个临时的 ExecutionContext，只包含 ThreadRegistry
    const executionContext = {
      getThreadRegistry: () => this.threadRegistry,
      // 其他方法可以根据需要添加
    };
    const result = await handler(trigger.action, trigger.id, executionContext);

    trigger.triggerCount++;
    trigger.updatedAt = now();
  }
}
```

**优点**：
- ThreadContext 的 TriggerManager 可以访问 ThreadRegistry
- Handler 可以访问正确的 ThreadRegistry
- 保持 Thread 隔离的设计
- 不需要全局的 TriggerManager

**缺点**：
- 需要修改 ThreadContext 的构造函数
- 需要修改 ThreadBuilder 创建 ThreadContext 的代码

### 方案2：ThreadContext 本身作为 ExecutionContext

**修改 TriggerManager**：
```typescript
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private threadContext: ThreadContext;

  constructor(threadContext: ThreadContext) {
    this.threadContext = threadContext;
  }

  private async executeTrigger(trigger: Trigger): Promise<void> {
    const handler = getTriggerHandler(trigger.action.type);
    // 直接传递 ThreadContext 作为 ExecutionContext
    const result = await handler(trigger.action, trigger.id, this.threadContext);

    trigger.triggerCount++;
    trigger.updatedAt = now();
  }
}
```

**修改 ThreadContext**：
```typescript
export class ThreadContext {
  // ... 其他字段

  constructor(
    thread: Thread,
    conversationManager: ConversationManager,
    private threadRegistry: ThreadRegistry
  ) {
    this.thread = thread;
    this.conversationManager = conversationManager;
    this.variableManager = new VariableManager();
    this.triggerManager = new TriggerManager(this);  // 传递 ThreadContext
    this.executionState = new ExecutionState();
  }

  // 实现 ExecutionContext 接口
  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }

  getWorkflowRegistry(): WorkflowRegistry {
    // 需要添加 WorkflowRegistry 引用
    return this.workflowRegistry;
  }
}
```

**优点**：
- ThreadContext 本身就是 ExecutionContext
- Handler 可以直接访问 ThreadContext 的所有方法
- 简化了架构

**缺点**：
- ThreadContext 需要实现 ExecutionContext 接口
- 可能需要添加更多依赖（如 WorkflowRegistry）
- ThreadContext 的职责增加

### 方案3：移除 ThreadCoordinator 的 TriggerManager

**修改 ThreadCoordinator**：
```typescript
export class ThreadCoordinator {
  private threadRegistry: ThreadRegistry;
  private threadBuilder: ThreadBuilder;
  private threadExecutor: ThreadExecutor;
  private lifecycleManager: ThreadLifecycleManager;
  private eventManager: EventManager;
  // 移除 triggerManager

  constructor(workflowRegistry?: any) {
    this.threadRegistry = new ThreadRegistry();
    this.threadBuilder = new ThreadBuilder(workflowRegistry);
    this.eventManager = eventManager;
    // 移除 this.triggerManager = new TriggerManager();
    this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
    // 修改 ThreadExecutor 构造函数，不传递 triggerManager
    this.threadExecutor = new ThreadExecutor(this.eventManager);
  }
}
```

**修改 ThreadExecutor**：
```typescript
export class ThreadExecutor {
  // ... 其他字段

  constructor(
    eventManager: EventManager
    // 移除 triggerManager 参数
  ) {
    this.eventManager = eventManager;
    // 移除 this.triggerManager = triggerManager;
  }

  // 修改执行逻辑，使用 ThreadContext 的 TriggerManager
  async executeThread(threadContext: ThreadContext): Promise<ThreadResult> {
    // ...
    // 使用 threadContext.triggerManager 处理事件
    await threadContext.triggerManager.handleEvent(event);
    // ...
  }
}
```

**优点**：
- 移除了冗余的全局 TriggerManager
- 每个 Thread 使用自己的 TriggerManager
- 架构更清晰

**缺点**：
- 需要修改 ThreadExecutor 的执行逻辑
- 需要确保 ThreadContext 的 TriggerManager 可以访问必要的上下文

## 推荐方案

**推荐使用方案1 + 方案3的组合**：

1. **移除 ThreadCoordinator 的 TriggerManager**（方案3）
2. **ThreadContext 的 TriggerManager 持有 ThreadRegistry 引用**（方案1）

**理由**：
1. **Thread 隔离**：保持每个 Thread 有自己的 TriggerManager
2. **正确的上下文传递**：TriggerManager 可以访问 ThreadRegistry
3. **架构清晰**：移除冗余的全局 TriggerManager
4. **最小改动**：只需要修改 ThreadContext 和 TriggerManager

## 实施步骤

### 第一步：修改 ThreadContext
```typescript
export class ThreadContext {
  // ... 其他字段

  constructor(
    thread: Thread,
    conversationManager: ConversationManager,
    private threadRegistry: ThreadRegistry  // 添加 ThreadRegistry 引用
  ) {
    this.thread = thread;
    this.conversationManager = conversationManager;
    this.variableManager = new VariableManager();
    this.triggerManager = new TriggerManager(this.threadRegistry);  // 传递 ThreadRegistry
    this.executionState = new ExecutionState();
  }

  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }
}
```

### 第二步：修改 TriggerManager
```typescript
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private threadRegistry: ThreadRegistry;

  constructor(threadRegistry: ThreadRegistry) {
    this.threadRegistry = threadRegistry;
  }

  private async executeTrigger(trigger: Trigger): Promise<void> {
    const handler = getTriggerHandler(trigger.action.type);
    // 创建一个临时的 ExecutionContext
    const executionContext = {
      getThreadRegistry: () => this.threadRegistry,
    };
    const result = await handler(trigger.action, trigger.id, executionContext);

    trigger.triggerCount++;
    trigger.updatedAt = now();
  }
}
```

### 第三步：修改 ThreadBuilder
```typescript
export class ThreadBuilder {
  // ... 其他字段

  async build(workflowId: string, options: ThreadOptions = {}): Promise<ThreadContext> {
    // ... 其他逻辑

    // 创建 ThreadContext，传递 ThreadRegistry
    const threadContext = new ThreadContext(
      thread,
      conversationManager,
      this.threadRegistry  // 传递 ThreadRegistry
    );

    // ... 其他逻辑
  }
}
```

### 第四步：修改 ThreadCoordinator
```typescript
export class ThreadCoordinator {
  // ... 其他字段
  // 移除 triggerManager

  constructor(workflowRegistry?: any) {
    this.threadRegistry = new ThreadRegistry();
    this.threadBuilder = new ThreadBuilder(workflowRegistry);
    this.eventManager = eventManager;
    // 移除 this.triggerManager = new TriggerManager();
    this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
    this.threadExecutor = new ThreadExecutor(this.eventManager);  // 不传递 triggerManager
  }
}
```

### 第五步：修改 ThreadExecutor
```typescript
export class ThreadExecutor {
  // ... 其他字段
  // 移除 triggerManager

  constructor(
    eventManager: EventManager
    // 移除 triggerManager 参数
  ) {
    this.eventManager = eventManager;
    // 移除 this.triggerManager = triggerManager;
  }

  async executeThread(threadContext: ThreadContext): Promise<ThreadResult> {
    // ... 其他逻辑

    // 使用 threadContext.triggerManager 处理事件
    await threadContext.triggerManager.handleEvent(event);

    // ... 其他逻辑
  }
}
```

## 总结

**当前架构的核心问题**：
1. ThreadCoordinator 的 TriggerManager 是冗余的
2. ThreadContext 的 TriggerManager 无法访问 ExecutionContext
3. Handler 函数需要 ExecutionContext 来访问 ThreadRegistry

**正确的架构设计**：
1. 每个 Thread 有自己的 TriggerManager（保持当前设计）
2. ThreadContext 的 TriggerManager 持有 ThreadRegistry 引用
3. 移除 ThreadCoordinator 的 TriggerManager
4. TriggerManager 在执行触发器时，创建临时的 ExecutionContext 传递给 handler

**关键点**：
- 触发器是 Thread 级别的，不是全局的
- 通过 `threadId` 字段确保触发器只影响对应的 Thread
- TriggerManager 需要访问 ThreadRegistry 来传递给 handler
- 移除冗余的全局 TriggerManager，简化架构