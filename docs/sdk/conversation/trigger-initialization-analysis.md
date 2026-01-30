# Trigger初始化时机和ExecutionContext传递问题分析

## 问题概述

通过分析代码发现，trigger模块存在严重的架构问题，导致触发器处理器无法正常工作。

## 核心问题

### 1. 类型定义不匹配

**TriggerHandler 类型定义**（sdk/core/execution/handlers/trigger-handlers/index.ts:15-18）
```typescript
export type TriggerHandler = (
  action: TriggerAction,
  triggerId: string
) => Promise<TriggerExecutionResult>;
```

**实际 handler 函数签名**（以 stopThreadHandler 为例）
```typescript
export async function stopThreadHandler(
  action: TriggerAction,
  triggerId: string,
  executionContext?: ExecutionContext  // 第三个参数
): Promise<TriggerExecutionResult>
```

**问题**：类型定义只接受2个参数，但实际函数接受3个参数。

### 2. ExecutionContext 传递缺失

**TriggerManager.executeTrigger**（sdk/core/execution/managers/trigger-manager.ts:181-189）
```typescript
private async executeTrigger(trigger: Trigger): Promise<void> {
  // 使用trigger handler函数执行触发动作
  const handler = getTriggerHandler(trigger.action.type);
  const result = await handler(trigger.action, trigger.id);  // 只传递2个参数！

  // 更新触发器状态
  trigger.triggerCount++;
  trigger.updatedAt = now();
}
```

**问题**：
- `handler(trigger.action, trigger.id)` 只传递了2个参数
- 第三个参数 `executionContext` 没有被传递
- handler 函数内部使用 `ExecutionContext.createDefault()` 创建默认上下文

### 3. Handler 函数依赖 ExecutionContext

**stopThreadHandler 示例**（sdk/core/execution/handlers/trigger-handlers/stop-thread-handler.ts:53-74）
```typescript
export async function stopThreadHandler(
  action: TriggerAction,
  triggerId: string,
  executionContext?: ExecutionContext
): Promise<TriggerExecutionResult> {
  const executionTime = Date.now();
  const context = executionContext || ExecutionContext.createDefault();  // 使用默认上下文

  try {
    const { threadId } = action.parameters;

    // 从ThreadRegistry获取ThreadContext
    const threadRegistry = context.getThreadRegistry();  // 需要ExecutionContext
    const threadContext = threadRegistry.get(threadId);

    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found: ${threadId}`, 'ThreadContext', threadId);
    }
    // ...
  }
}
```

**问题**：
- handler 函数需要 ExecutionContext 来访问 ThreadRegistry、WorkflowRegistry 等组件
- 如果使用 `ExecutionContext.createDefault()`，会创建一个新的、空的上下文
- 这个新上下文与实际执行的线程上下文完全隔离，无法访问正确的 ThreadRegistry

### 4. TriggerManager 创建时机和位置

**TriggerManager 的创建位置**：

1. **ThreadCoordinator**（sdk/core/execution/thread-coordinator.ts:59）
```typescript
constructor(
  private threadRegistry: ThreadRegistry,
  private eventManager: EventManager,
  triggerManager?: TriggerManager
) {
  this.threadRegistry = threadRegistry;
  this.eventManager = eventManager;
  this.triggerManager = triggerManager || new TriggerManager();  // 创建新实例
  this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
}
```

2. **ThreadContext**（sdk/core/execution/context/thread-context.ts:82）
```typescript
constructor(
  public readonly threadId: ID,
  public readonly workflowId: ID,
  private threadRegistry: ThreadRegistry,
  private eventManager: EventManager
) {
  this.variableManager = new VariableManager();
  this.triggerManager = new TriggerManager();  // 创建新实例
  this.executionState = new ExecutionState();
}
```

3. **ThreadExecutor**（sdk/core/execution/thread-executor.ts:56）
```typescript
this.eventCoordinator = new EventCoordinator(
  this.threadRegistry,
  this.eventManagerParam || eventManager,
  triggerManager || new TriggerManager()  // 创建新实例
);
```

**问题**：
- TriggerManager 在多个地方被创建，每个实例都是独立的
- TriggerManager 没有持有 ExecutionContext
- TriggerManager 无法将 ExecutionContext 传递给 handler

## 正确的初始化时机分析

### 当前架构的问题

```
ThreadExecutor
  └─ ThreadCoordinator
      └─ TriggerManager (独立实例)
          └─ executeTrigger()
              └─ handler(action, triggerId)  // 缺少 ExecutionContext
                  └─ ExecutionContext.createDefault()  // 创建空的上下文
```

### 正确的架构应该是

```
ThreadExecutor
  └─ ExecutionContext (持有所有组件)
      ├─ ThreadRegistry
      ├─ WorkflowRegistry
      ├─ EventManager
      └─ TriggerManager (持有 ExecutionContext 引用)
          └─ executeTrigger()
              └─ handler(action, triggerId, ExecutionContext)  // 传递正确的上下文
```

## 解决方案

### 方案1：TriggerManager 持有 ExecutionContext（推荐）

**修改 TriggerManager 构造函数**：
```typescript
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private executionContext: ExecutionContext;

  constructor(executionContext: ExecutionContext) {
    this.executionContext = executionContext;
  }

  private async executeTrigger(trigger: Trigger): Promise<void> {
    const handler = getTriggerHandler(trigger.action.type);
    // 传递 ExecutionContext
    const result = await handler(trigger.action, trigger.id, this.executionContext);

    trigger.triggerCount++;
    trigger.updatedAt = now();
  }
}
```

**修改创建 TriggerManager 的地方**：
```typescript
// ThreadCoordinator
constructor(
  private threadRegistry: ThreadRegistry,
  private eventManager: EventManager,
  private executionContext: ExecutionContext,
  triggerManager?: TriggerManager
) {
  this.threadRegistry = threadRegistry;
  this.eventManager = eventManager;
  this.executionContext = executionContext;
  this.triggerManager = triggerManager || new TriggerManager(executionContext);
  this.lifecycleManager = new ThreadLifecycleManager(this.eventManager);
}
```

**优点**：
- ExecutionContext 正确传递
- Handler 可以访问正确的 ThreadRegistry
- 符合依赖注入原则

**缺点**：
- 需要修改多个地方
- 需要确保 ExecutionContext 在创建 TriggerManager 之前已经初始化

### 方案2：修改 TriggerHandler 类型定义

**修改类型定义**：
```typescript
export type TriggerHandler = (
  action: TriggerAction,
  triggerId: string,
  executionContext?: ExecutionContext  // 添加可选参数
) => Promise<TriggerExecutionResult>;
```

**修改 TriggerManager**：
```typescript
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private executionContext?: ExecutionContext;

  constructor(executionContext?: ExecutionContext) {
    this.executionContext = executionContext;
  }

  private async executeTrigger(trigger: Trigger): Promise<void> {
    const handler = getTriggerHandler(trigger.action.type);
    // 传递 ExecutionContext（如果有的话）
    const result = await handler(trigger.action, trigger.id, this.executionContext);

    trigger.triggerCount++;
    trigger.updatedAt = now();
  }
}
```

**优点**：
- 向后兼容（executionContext 是可选的）
- 类型定义与实际函数签名匹配

**缺点**：
- 仍然需要修改 TriggerManager
- 如果没有 ExecutionContext，handler 会使用默认上下文（可能不正确）

### 方案3：使用全局单例（不推荐）

**创建全局 TriggerManager 实例**：
```typescript
// sdk/core/execution/managers/trigger-manager.ts
export const triggerManager = new TriggerManager();

export class TriggerManager {
  // ...
}
```

**在应用启动时初始化**：
```typescript
import { triggerManager } from './sdk/core/execution/managers/trigger-manager';
import { ExecutionContext } from './sdk/core/execution/context/execution-context';

const context = ExecutionContext.createDefault();
// 设置 ExecutionContext 到 triggerManager
```

**优点**：
- 简单直接
- 不需要修改多处代码

**缺点**：
- 违反依赖注入原则
- 全局状态难以测试
- 不支持多实例

## 推荐方案

**推荐使用方案1**：TriggerManager 持有 ExecutionContext

理由：
1. **正确性**：确保 ExecutionContext 正确传递到 handler
2. **可测试性**：支持依赖注入，便于测试
3. **一致性**：与其他组件（如 ThreadLifecycleManager）的设计一致
4. **可维护性**：清晰的依赖关系，易于理解和维护

## 实施步骤

### 第一步：修改 TriggerHandler 类型定义
```typescript
// sdk/core/execution/handlers/trigger-handlers/index.ts
export type TriggerHandler = (
  action: TriggerAction,
  triggerId: string,
  executionContext?: ExecutionContext
) => Promise<TriggerExecutionResult>;
```

### 第二步：修改 TriggerManager
```typescript
// sdk/core/execution/managers/trigger-manager.ts
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private executionContext?: ExecutionContext;

  constructor(executionContext?: ExecutionContext) {
    this.executionContext = executionContext;
  }

  private async executeTrigger(trigger: Trigger): Promise<void> {
    const handler = getTriggerHandler(trigger.action.type);
    const result = await handler(trigger.action, trigger.id, this.executionContext);

    trigger.triggerCount++;
    trigger.updatedAt = now();
  }
}
```

### 第三步：修改创建 TriggerManager 的地方
1. ThreadCoordinator
2. ThreadContext
3. ThreadExecutor

### 第四步：注册所有触发器处理器
在 `sdk/core/execution/handlers/trigger-handlers/index.ts` 文件末尾添加自动注册逻辑。

## 总结

当前 trigger 模块的核心问题是：
1. **类型定义不匹配**：TriggerHandler 类型定义缺少 ExecutionContext 参数
2. **ExecutionContext 传递缺失**：TriggerManager 没有持有和传递 ExecutionContext
3. **Handler 无法访问正确的上下文**：使用默认上下文导致无法访问正确的 ThreadRegistry

正确的初始化时机是：
- 在创建 TriggerManager 时传入 ExecutionContext
- ExecutionContext 应该在 TriggerManager 之前初始化
- TriggerManager 应该持有 ExecutionContext 引用，并在执行触发器时传递给 handler

推荐使用方案1，通过依赖注入的方式，让 TriggerManager 持有 ExecutionContext，确保正确的上下文传递。