# SDK 存储集成分析报告

## 概述

当前项目采用**分层适配器模式**构建存储系统，整体架构分为四层：

```
packages/types          → 存储类型定义（元数据、查询选项、清理策略）
packages/storage        → 具体存储实现（SQLite、JSON、Memory、PostgreSQL）
sdk/core/checkpoint     → 抽象检查点协调器与状态管理器
sdk/{workflow,agent}    → 领域特定检查点实现
```

存储系统支持 4 种后端、12 个适配器接口，覆盖检查点、工作流、任务、Agent 循环、指标等完整场景。

---

## 架构优势

1. **元数据/BLOB 分离**: 所有 SQLite 实现将可查询元数据与二进制大对象分离存储，`list()` 和 `getMetadata()` 无需加载 BLOB 数据
2. **实体级查询优化**: 所有数据库索引围绕 `entityId + entityType` 设计，支持高效的按实体清理和恢复
3. **模板方法模式**: `BaseCheckpointCoordinator` 提供可复用的检查点生命周期，子类只需实现关键扩展点
4. **多后端一致性**: 4 种后端对同一组适配器接口提供平行实现，测试覆盖全面

---

## 问题与缺陷

### A. [严重] 双重 CheckpointStorageAdapter 定义

**位置**:
- `sdk/core/checkpoint/types.ts:15-74` — SDK 内部版本
- `packages/storage/src/types/adapter/checkpoint-adapter.ts:19-92` — 存储包版本

**问题**: 两套接口定义方法签名不完全一致（如 `list()` 参数类型不同），但 `BaseCheckpointStateManager` 强依赖 SDK 内部版本。`CheckpointState`（workflow）不得不通过 `storageAdapter as unknown as CheckpointStorageAdapter` 进行不安全类型转换。

**影响**: 类型安全性丧失；如果两个接口未来产生分歧，运行时可能因方法签名不匹配而崩溃。

**建议**: 消除 SDK 内部版本，统一依赖 `packages/storage` 中的 `CheckpointStorageAdapter`；或将 `BaseCheckpointStateManager` 的依赖由具体接口改为接受鸭子类型。

### B. [严重] 6 个存储适配器接口无后端实现

**仅有接口定义，无任何后端实现（SQLite/JSON/Memory/PostgreSQL 均缺失）**:

| 适配器 | 接口文件 | 实现状态 |
|--------|----------|----------|
| `ToolStorageAdapter` | `packages/storage/src/types/adapter/tool-adapter.ts` | ❌ 无实现 |
| `ScriptStorageAdapter` | `packages/storage/src/types/adapter/script-adapter.ts` | ❌ 无实现 |
| `NodeTemplateStorageAdapter` | `packages/storage/src/types/adapter/node-template-adapter.ts` | ❌ 无实现 |
| `HookTemplateStorageAdapter` | `packages/storage/src/types/adapter/hook-template-adapter.ts` | ❌ 无实现 |
| `TriggerStorageAdapter` | `packages/storage/src/types/adapter/trigger-adapter.ts` | ❌ 无实现 |
| `AgentProfileStorageAdapter` | `packages/storage/src/types/adapter/agent-profile-adapter.ts` | ❌ 无实现 |

然而 DI 容器 (`sdk/core/di/container-config.ts:202-236`) 已经为所有这些适配器绑定了注入标识符。运行时如果应用尝试注入这些适配器，将得到 `null`。

**建议**: 明确这些适配器的状态（标记为"待实现"或移除 DI 绑定），或实现最少一个后端（如 Memory）。

### C. [严重] CheckpointStorageListOptions 类型测试与定义不一致

**位置**:
- 实际定义: `packages/types/src/storage/checkpoint-storage.ts:37-58`（使用 `entityType`/`entityId`）
- 类型测试: `packages/types/__tests__/test-d/storage/storage-adapter.test-d.ts:238-249`（使用 `executionId`/`workflowId`）

**问题**: 类型测试文件使用了 `executionId` 和 `workflowId` 字段，但这些字段在 `CheckpointStorageListOptions` 接口中并不存在（实际定义使用 `entityType`/`entityId`）。这意味着该类型测试**无法通过编译**。

**影响**: 类型测试形同虚设，无法真正验证类型定义的正确性。

**建议**: 统一使用 `entityType`/`entityId`，更新类型测试文件以匹配实际定义。

### D. [中等] AgentLoopCheckpointStateManager 跳过适配器类型转换

**位置**: `sdk/agent/checkpoint/checkpoint-state-manager.ts:34`

**问题**: `AgentLoopCheckpointStateManager` 直接将 `StorageAdapter`（来自 `@wf-agent/storage`）传递给 `BaseCheckpointStateManager` 构造函数，**没有**进行像 `CheckpointState`（workflow 版本）那样的适配器方法映射。

`CheckpointState` 在构造函数中做了适配 (`sdk/workflow/checkpoint/checkpoint-state-manager.ts:33-85`)，但 `AgentLoopCheckpointStateManager` 直接传入了 `super(storageAdapter, eventManager)`。虽然 TypeScript 结构类型兼容避免了编译错误，但这是一个隐式的设计缺陷。

**建议**: 统一使用 `CheckpointState` 的适配模式，或提取公共适配函数。

### E. [中等] 两个并行的 Delta 恢复实现

**位置**:
- `sdk/core/checkpoint/utils/delta-restorer.ts`（抽象类，39-212 行）
- `sdk/core/checkpoint/base-delta-restorer.ts`（具体类，26-173 行）

**问题**: 两者功能重叠但使用不同的抽象策略。`DeltaRestorer` 要求子类实现快照提取和 delta 应用逻辑；`BaseDeltaRestorer` 则通过 `BaseDiffCalculator.applyDelta` 具体实现。

目前 `BaseCheckpointCoordinator.restore()` 直接使用 `BaseDeltaRestorer`，而 `DeltaRestorer` 似乎未在实际流程中使用。

**建议**: 移除未使用的 `DeltaRestorer`，或明确其使用场景并添加文档。

### F. [中等] SQLite 错误处理中的冗余 return

**位置**: `packages/storage/src/sqlite/base-sqlite-storage.ts:386, 399, 423, 466, 494, 514`

**问题**: `delete()`、`exists()`、`clear()`、`deleteBatch()` 等方法在 catch 块中使用 `return this.handleSqliteError(...)`。`handleSqliteError` 的返回类型为 `never`（函数总是抛出异常），因此 `return` 关键字语义上无意义。虽不产生运行时 bug，但降低代码可读性和维护性。

**建议**: 将 `return this.handleSqliteError(...)` 改为 `this.handleSqliteError(...);`（去掉 return），或直接 `throw`。

### G. [中等] PostgreSQL 缺少自动维护机制

**位置**: `packages/storage/src/postgres/base-postgres-storage.ts`

**问题**: `BasePostgresStorage` 提供了 `optimize()` 方法（运行 `VACUUM ANALYZE`），但仅在显式调用时执行。相比之下，`BaseSqliteStorage` 有 `maintenanceIntervalMs` 配置选项和自动维护定时器。

**影响**: 长时间运行的 PostgreSQL 存储可能出现性能退化而无法自动恢复。

**建议**: 为 PostgreSQL 添加可选的自动维护定时器，与 SQLite 的实现保持一致。

### H. [中等] MetricsStorageAdapter 继承体系不一致

**位置**: `packages/storage/src/types/adapter/metrics-storage-adapter.ts:54-85`

**问题**: `MetricsStorageAdapter` 没有继承 `BaseStorageAdapter`，而是定义了自己独立的接口（`saveBatch()`、`query()`、`deleteOldMetrics()`）。虽然其语义确实与 CRUD 不同，但这种不统一增加了学习成本。

具体实现 `SqliteMetricsStorage` 也没有使用 `BaseSqliteStorage`，而是直接从零实现 (`sqlite-metrics-storage.ts:37`)。

**建议**: 明确设计意图——如果 Metrics 是独立的存储维度，应有文档说明；否则考虑对齐接口体系。

### I. [低] FileCheckpoint 失败被静默处理

**位置**: `sdk/workflow/checkpoint/checkpoint-coordinator.ts`（`postRestore` 和 `createCheckpoint` 中的 try/catch）

**问题**: 文件检查点是工作流恢复的关键组成部分，但失败的 `FileCheckpointManager` 操作被 try/catch 包装并仅记录警告，没有传播错误。这意味着文件状态可能在不被注意的情况下丢失。

**建议**: 根据文件检查点的关键程度，决定是否允许失败传播，或至少通过事件系统通知上层。

### J. [低] CheckpointStore 命名误导

**位置**: `sdk/core/checkpoint/utils/checkpoint-store.ts`

**问题**: `CheckpointStore<T>` 实际上只是一个**内存中的 TTL 缓存**，不是持久化存储。其名称使读者误以为它是存储层的一部分，而持久化实际上是通过 `CheckpointStorageAdapter` 完成的。

**建议**: 重命名为 `CheckpointCache` 以更准确地反映其用途。

---

## 总结

| 级别 | 数量 | 关键问题 |
|------|------|----------|
| 严重 | 3 | 双重接口定义、6 个适配器无后端实现、类型测试与定义不一致 |
| 中等 | 5 | Agent 状态管理器跳过适配、并行 Delta 实现、SQLite return 冗余、PG 缺维护、Metrics 体系不一致 |
| 低 | 2 | FileCheckpoint 静默失败、CheckpointStore 命名误导 |

**最优先修复项**:
1. 统一 `CheckpointStorageAdapter` 接口定义，消除 `as unknown as` 类型转换
2. 明确 6 个未实现适配器的状态（实现或移除 DI 绑定）
3. 修复类型测试与类型定义不一致的问题
