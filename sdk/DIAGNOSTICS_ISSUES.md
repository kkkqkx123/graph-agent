# SDK 诊断问题修复建议

## 概述

ThreadRegistry 迁移后，诊断检查发现两个编译错误。这些错误与迁移本身无关，而是现存的设计问题。

## 问题列表

### 问题 1: ThreadCoordinator 缺少 getTriggerManager() 方法

**位置**: `sdk/api/thread-executor-api.ts:174`

**错误信息**:
```
Property 'getTriggerManager' does not exist on type 'ThreadCoordinator'.
```

**代码上下文**:
```typescript
// sdk/api/thread-executor-api.ts
const coordinator = new ThreadCoordinator(this.internalWorkflowRegistry);
const triggerManager = coordinator.getTriggerManager(); // ❌ 错误
```

**根本原因**:
ThreadCoordinator 持有私有的 triggerManager，但没有提供访问方法。

**修复方案**:

**选项 A**: 添加访问器方法（推荐）
```typescript
// sdk/core/execution/thread-coordinator.ts
export class ThreadCoordinator {
  private triggerManager: TriggerManager;

  /**
   * 获取触发器管理器
   * @returns TriggerManager 实例
   */
  getTriggerManager(): TriggerManager {
    return this.triggerManager;
  }
}
```

**选项 B**: 在 ThreadContext 中获取
```typescript
// 如果 triggerManager 在 ThreadContext 中更合适
const threadContext = coordinator.getThreadContext(threadId);
const triggerManager = threadContext.getTriggerManager();
```

**建议**: 选项 A 更直接，符合 ThreadCoordinator 的职责。

---

### 问题 2: ThreadRegistry 缺少 getCurrentThread() 方法

**位置**: `sdk/core/execution/handlers/trigger-handlers/execute-triggered-subgraph-handler.ts:97`

**错误信息**:
```
Property 'getCurrentThread' does not exist on type 'ThreadRegistry'.
```

**代码上下文**:
```typescript
// sdk/core/execution/handlers/trigger-handlers/execute-triggered-subgraph-handler.ts
const threadRegistry = context.getThreadRegistry();
const mainThreadContext = threadRegistry.getCurrentThread(); // ❌ 错误
```

**根本原因**:
ThreadRegistry 是一个通用的注册表，没有"当前线程"的概念。当前线程应该从 ExecutionContext 或 ThreadContext 中获取。

**修复方案**:

**选项 A**: 从 ExecutionContext 获取（推荐）
```typescript
// 使用 ExecutionContext 中的当前线程
const mainThreadContext = context.getCurrentThread();
// 或
const mainThreadContext = context.getThreadContext();
```

**选项 B**: 在 ThreadRegistry 中追踪当前线程
```typescript
// sdk/core/services/thread-registry.ts
export class ThreadRegistry {
  private currentThread: ThreadContext | null = null;

  setCurrentThread(threadContext: ThreadContext): void {
    this.currentThread = threadContext;
  }

  getCurrentThread(): ThreadContext | null {
    return this.currentThread;
  }

  clearCurrentThread(): void {
    this.currentThread = null;
  }
}
```

**选项 C**: 从线程 ID 直接获取
```typescript
const mainThreadContext = threadRegistry.get(mainThreadId);
```

**建议**: 
- 如果 ExecutionContext 已经管理当前线程，选择 **选项 A**
- 如果需要跨多个执行流共享当前线程信息，选择 **选项 B**
- 如果有现存的 mainThreadId，选择 **选项 C**

---

## 优先级

| 问题 | 优先级 | 影响范围 |
|-----|-------|--------|
| 问题 1 (getTriggerManager) | **高** | thread-executor-api.ts |
| 问题 2 (getCurrentThread) | **中** | trigger-handlers (1 个文件) |

## 修复步骤

### 第一步: 修复问题 1

1. 在 `ThreadCoordinator` 中添加 `getTriggerManager()` 方法
2. 更新文档说明 TriggerManager 的职责
3. 验证 thread-executor-api.ts 的编译

### 第二步: 修复问题 2

1. 分析 `execute-triggered-subgraph-handler.ts` 的上下文
2. 确定最合适的修复方案（通常是获取 mainThreadId 对应的 ThreadContext）
3. 更新处理器逻辑

### 第三步: 验证

```bash
cd sdk
tsc --noEmit 2>&1 | head -20
```

应该显示 0 错误或仅显示与设计相关的现存问题。

## 参考代码

### ThreadCoordinator 修复示例

```typescript
/**
 * 获取触发器管理器
 * @returns TriggerManager 实例
 */
getTriggerManager(): TriggerManager {
  // 如果需要动态创建，可以延迟初始化
  // 但通常在构造函数中已创建
  return this.triggerManager;
}

/**
 * 获取指定线程的上下文
 * @param threadId 线程ID
 * @returns ThreadContext 或 null
 */
getThreadContext(threadId: string): ThreadContext | null {
  return this.threadRegistry.get(threadId);
}
```

### ThreadRegistry 修复示例（可选）

```typescript
// 如果决定在 ThreadRegistry 中追踪当前线程
private currentThread: ThreadContext | null = null;

setCurrentThread(threadContext: ThreadContext): void {
  this.currentThread = threadContext;
}

getCurrentThread(): ThreadContext | null {
  return this.currentThread;
}
```

## 结论

这两个问题都是现存的设计问题，与 ThreadRegistry 迁移无关。建议：

1. **立即修复问题 1** - 简单直接，添加一个访问器方法即可
2. **在下一个迭代中处理问题 2** - 需要更深入的设计分析
3. **更新 AGENTS.md** - 如果有新的约定或模式

修复这两个问题后，SDK 会通过完整的诊断检查。
