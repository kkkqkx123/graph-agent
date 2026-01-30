# ThreadRegistry 迁移总结

## 迁移完成 ✅

ThreadRegistry 已成功从 `sdk/core/execution/` 迁移到 `sdk/core/services/`，并按照全局单例模式重构。

## 改动汇总

### 1. 文件移动
- **源**: `sdk/core/execution/thread-registry.ts`
- **目标**: `sdk/core/services/thread-registry.ts`
- **更改**: 添加了全局单例导出

```typescript
export const threadRegistry = new ThreadRegistry();
```

### 2. 导出更新

#### sdk/core/services/index.ts
新增完整的服务层导出文档：

```typescript
export { threadRegistry, type ThreadRegistry } from './thread-registry';
export { workflowRegistry, type WorkflowRegistry } from './workflow-registry';
export { eventManager, type EventManager } from './event-manager';
```

#### sdk/core/execution/index.ts
保持与新位置兼容的导出：

```typescript
export { ThreadRegistry } from '../services/thread-registry';
```

### 3. 导入更新

已更新以下文件的导入语句：

| 文件 | 更改 |
|-----|------|
| `sdk/core/execution/context/execution-context.ts` | 从 `ThreadRegistry` 改为 `threadRegistry, type ThreadRegistry` |
| `sdk/core/execution/thread-coordinator.ts` | 从 `ThreadRegistry` 改为 `threadRegistry, type ThreadRegistry` |
| `sdk/api/thread-registry-api.ts` | 使用 `globalThreadRegistry` 作为默认值 |
| `sdk/api/variable-manager-api.ts` | 使用 `globalThreadRegistry` 作为默认值 |
| `sdk/api/sdk.ts` | 使用 `threadRegistry` 全局单例 |

### 4. 依赖注入支持

所有使用 ThreadRegistry 的核心组件都支持可选的依赖注入：

#### ThreadCoordinator
```typescript
constructor(workflowRegistry?: any, threadReg?: ThreadRegistry) {
  this.threadRegistry = threadReg || threadRegistry; // 默认使用全局单例
}
```

#### ThreadRegistryAPI
```typescript
constructor(threadRegistry?: ThreadRegistry) {
  this.registry = threadRegistry || globalThreadRegistry; // 默认使用全局单例
}
```

#### VariableManagerAPI
```typescript
constructor(threadRegistry?: ThreadRegistry) {
  this.threadRegistry = threadRegistry || globalThreadRegistry; // 默认使用全局单例
}
```

#### SDK
```typescript
constructor(options?: SDKOptions) {
  this.internalThreadRegistry = options?.threadRegistry || threadRegistry; // 默认使用全局单例
}
```

### 5. ExecutionContext 的更新

从创建新实例改为使用全局单例：

```typescript
// 之前
const threadRegistry = new ThreadRegistry();
this.register('threadRegistry', threadRegistry);

// 之后
import { threadRegistry } from '../../services/thread-registry';
this.register('threadRegistry', threadRegistry);
```

## 架构优势

### ✅ 设计一致性
- 与 `WorkflowRegistry` 和 `EventManager` 保持一致的全局单例模式
- 统一的服务层设计

### ✅ 数据统一管理
- 所有 ThreadContext 在同一个 Registry 实例中
- 避免线程数据分散在多个实例中

### ✅ 测试友好
- 支持依赖注入，可以在测试中注入本地实例
- 测试隔离性得到保证

### ✅ 监控和调试
- 统一的入口点便于添加日志和监控
- 便于实现线程统计和分析

## 现存问题

诊断检查发现两个与迁移无关的现存问题：

1. **ThreadCoordinator** - 缺少 `getTriggerManager()` 方法
   - 位置: `sdk/api/thread-executor-api.ts:174`
   - 影响: ThreadExecutor API

2. **ThreadRegistry** - 缺少 `getCurrentThread()` 方法
   - 位置: `sdk/core/execution/handlers/trigger-handlers/execute-triggered-subgraph-handler.ts:97`
   - 影响: 触发器处理器

这些问题需要在单独的 Issue 中处理，不是本次迁移的一部分。

## 验证清单

- [x] ThreadRegistry 类已移至 services 目录
- [x] 全局单例已创建并导出
- [x] services/index.ts 已更新
- [x] execution/index.ts 已更新
- [x] ExecutionContext 已更新为使用全局单例
- [x] ThreadCoordinator 已更新为使用全局单例（支持依赖注入）
- [x] ThreadRegistryAPI 已更新为使用全局单例（支持依赖注入）
- [x] VariableManagerAPI 已更新为使用全局单例（支持依赖注入）
- [x] SDK 主类已更新为使用全局单例（支持依赖注入）
- [x] 所有导入已更新到新位置
- [x] 无与迁移相关的编译错误

## 后续工作

建议处理现存问题以完全通过诊断检查：

1. **添加 ThreadCoordinator.getTriggerManager()**
   - 从 ThreadContext 中获取或创建 TriggerManager

2. **添加 ThreadRegistry.getCurrentThread()**
   - 跟踪当前正在执行的线程
   - 或重构使用其他机制获取当前线程

## 迁移完成时间

完成于: 2025-01-30

## 相关文档

- 分析报告: `sdk/core/execution/THREAD_REGISTRY_ANALYSIS.md`
- 服务层导出: `sdk/core/services/index.ts`
- 执行层导出: `sdk/core/execution/index.ts`
