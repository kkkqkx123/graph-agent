# ThreadRegistry 架构分析报告

## 概述

本文分析 `sdk/core/execution/thread-registry.ts` 是否应该作为全局单例，并在 `sdk/core/services` 目录统一管理。

## 当前设计

### ThreadRegistry 的定义和功能

**位置**: `sdk/core/execution/thread-registry.ts`

```typescript
export class ThreadRegistry {
  private threadContexts: Map<string, ThreadContext> = new Map();
  // 核心方法: register, get, delete, getAll, clear, has
}
```

**职责**:
- 内存存储和管理 `ThreadContext` 对象
- 不负责状态转换、持久化、序列化
- 纯数据存储容器

### 当前使用模式

**1. 多实例创建**

| 位置 | 创建方式 |
|-----|--------|
| `ExecutionContext` | `new ThreadRegistry()` (L58) |
| `ThreadCoordinator` | `new ThreadRegistry()` (L54) |
| `VariableManagerAPI` | `new ThreadRegistry()` 或参数传入 (L42) |
| `ThreadRegistryAPI` | `new ThreadRegistry()` 或参数传入 (L18) |

**2. 注入和传播**

```
ExecutionContext 创建 ThreadRegistry
    ↓
ThreadCoordinator 创建独立的 ThreadRegistry
    ↓
CheckpointManager 接收 ThreadRegistry
TriggerManager 接收 ThreadRegistry
ThreadBuilder 通过 ExecutionContext 获取 ThreadRegistry
Handlers 通过 ExecutionContext 获取 ThreadRegistry
```

**3. 相关的全局单例**

- `workflowRegistry`: `sdk/core/services/workflow-registry.ts` (L860) - **全局单例**
- `eventManager`: `sdk/core/services/event-manager.ts` (L249) - **全局单例**

## 分析

### 问题1: 多实例 vs 单例

**当前状态**: ThreadRegistry 作为多实例组件
- ExecutionContext 和 ThreadCoordinator 各创建一个实例
- 同一个线程的数据可能在不同的 Registry 实例中

**问题**:
```typescript
// ExecutionContext 创建
const threadRegistry1 = new ThreadRegistry();

// ThreadCoordinator 创建
const threadRegistry2 = new ThreadRegistry();

// 同一个线程，数据分散在不同实例中
threadRegistry1.register(threadContext1); // 存在于 Registry1
threadRegistry2.register(threadContext2); // 存在于 Registry2

// 查询时可能找不到
threadRegistry1.get(childThreadId); // 返回 null，因为数据在 Registry2 中
```

### 问题2: 职责划分

**当前职责混乱**:
- ThreadRegistry: 线程上下文的内存存储
- ExecutionContext: 创建和管理 ThreadRegistry 实例
- ThreadCoordinator: 自行创建 ThreadRegistry 实例

**一致性问题**:
- 无法统一管理线程生命周期
- 无法统一访问所有线程
- 测试时无法完全隔离线程数据

### 问题3: 与现有服务层设计的不一致

**WorkflowRegistry** (服务层单例):
```typescript
// sdk/core/services/workflow-registry.ts
export const workflowRegistry = new WorkflowRegistry({...});
export type { WorkflowRegistry };
```

**EventManager** (服务层单例):
```typescript
// sdk/core/services/event-manager.ts
export const eventManager = new EventManager();
export type { EventManager };
```

**ThreadRegistry** (当前：多实例，分散在不同地方):
```typescript
// sdk/core/execution/thread-registry.ts
export class ThreadRegistry { ... }
// 无全局单例导出
```

### 问题4: 依赖注入的复杂性

**当前流程**:
1. ExecutionContext 创建 ThreadRegistry
2. 传递给 CheckpointManager
3. TriggerManager 从 ThreadRegistry 创建并持有
4. Handlers 从 ExecutionContext 获取 ThreadRegistry
5. API 层可选创建 ThreadRegistry

**结果**:
- 同一个执行过程中可能有多个 ThreadRegistry 实例
- 找不到线程或看到不一致的数据
- 难以追踪和调试

## 建议方案

### 方案对比

| 方面 | 保持现状 | 全局单例 | 混合方案* |
|-----|--------|--------|---------|
| 设计一致性 | ❌ | ✅ | ✅ |
| 线程数据统一 | ❌ | ✅ | ✅ |
| 测试隔离性 | ✅ | ❌ | ✅ |
| 多执行上下文支持 | ✅ | ❌ | ✅ |

**混合方案**: ThreadRegistry 支持全局单例和本地实例两种模式

### 推荐方案: 移至服务层 + 支持依赖注入

**1. 将 ThreadRegistry 迁移到 services 目录**

```typescript
// sdk/core/services/thread-registry.ts
export class ThreadRegistry { ... }

/**
 * 全局线程注册表单例
 * 用于生产环境和跨执行上下文的线程管理
 */
export const threadRegistry = new ThreadRegistry();

export type { ThreadRegistry };
```

**2. 移除 ExecutionContext 中的自行创建**

```typescript
// sdk/core/execution/context/execution-context.ts
// 使用服务层的全局单例
import { threadRegistry } from '../../services/thread-registry';

initialize(): void {
  // 使用全局单例而不是创建新实例
  this.register('threadRegistry', threadRegistry);
  // ...
}
```

**3. 更新 ThreadCoordinator**

```typescript
// sdk/core/execution/thread-coordinator.ts
import { threadRegistry } from '../services/thread-registry';

export class ThreadCoordinator {
  private threadRegistry: ThreadRegistry;

  constructor(threadRegistry?: ThreadRegistry) {
    // 支持依赖注入（测试用），默认使用全局单例
    this.threadRegistry = threadRegistry || threadRegistry;
  }
  // ...
}
```

**4. 统一 API 层**

```typescript
// sdk/api/thread-registry-api.ts
import { threadRegistry } from '../core/services/thread-registry';

export class ThreadRegistryAPI {
  private registry: ThreadRegistry;

  constructor(threadRegistry?: ThreadRegistry) {
    // 默认使用全局单例
    this.registry = threadRegistry || threadRegistry;
  }
  // ...
}
```

**5. 更新 services/index.ts**

```typescript
// sdk/core/services/index.ts
export { threadRegistry, type ThreadRegistry } from './thread-registry';
export { workflowRegistry, type WorkflowRegistry } from './workflow-registry';
export { eventManager, type EventManager } from './event-manager';
```

## 实施影响

### 需要修改的文件

1. **文件移动**:
   - `sdk/core/execution/thread-registry.ts` → `sdk/core/services/thread-registry.ts`

2. **导入更新** (约 30+ 文件):
   - ExecutionContext
   - ThreadCoordinator
   - ThreadBuilder
   - CheckpointManager
   - TriggerManager
   - 各类 Handlers
   - API 层文件
   - 测试文件

3. **新增文件**:
   - `sdk/core/services/index.ts` (更新)

### 优势

✅ **设计一致性**: 与 WorkflowRegistry、EventManager 保持一致
✅ **数据统一**: 所有线程数据在同一个 Registry 中
✅ **生命周期管理**: 可以统一管理线程的创建、注册、清理
✅ **易于测试**: 支持注入本地实例进行测试隔离
✅ **监控和调试**: 统一的入口点便于添加日志和监控

### 风险

⚠️ **全局状态**: 多个执行上下文共享线程数据（可通过命名隔离缓解）
⚠️ **内存泄漏**: 需要明确的清理机制防止线程数据积累
⚠️ **并发问题**: 高并发场景下可能出现竞态条件（可通过 Map 的原子操作缓解）

## 实施步骤

1. **新建 `sdk/core/services/thread-registry.ts`**
   - 复制 ThreadRegistry 类定义
   - 添加全局单例导出
   - 添加类型导出

2. **更新 `sdk/core/services/index.ts`**
   - 添加 threadRegistry 导出

3. **更新所有导入**
   - 搜索 `from '../../execution/thread-registry'`
   - 替换为 `from '../../services/thread-registry'`

4. **更新 ExecutionContext**
   - 移除 `new ThreadRegistry()` 的创建
   - 使用导入的全局单例或参数传入

5. **验证和测试**
   - 运行类型检查
   - 运行相关单元测试
   - 验证线程数据的一致性

## 总结

**建议**：将 ThreadRegistry 从 `sdk/core/execution/` 迁移到 `sdk/core/services/`，并作为全局单例导出，同时支持依赖注入以满足测试需求。

这样做的好处是：
- 与现有的 WorkflowRegistry、EventManager 设计保持一致
- 确保线程数据的统一管理和访问
- 提高代码的可维护性和可测试性
- 为未来的特性（如线程监控、统计）奠定基础
