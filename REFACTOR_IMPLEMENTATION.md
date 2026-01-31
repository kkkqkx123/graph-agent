# SDK 管理器改造 - 实现清单

基于 `SDK_MANAGERS_REFACTOR.md` 中的分析和方案，本清单列出具体的实现步骤。

## 第一阶段：CheckpointManager 简化（已启动）

### 已完成
- ✅ 删除 `periodicTimers` Map
- ✅ 删除 `createPeriodicCheckpoint()` 和 `cancelPeriodicCheckpoint()` 方法
- ✅ 删除 ExecutionContext 依赖
- ✅ 删除事件相关导入
- 文件：`sdk/core/execution/managers/checkpoint-manager.ts`

### 待完成
- [ ] 更新 `sdk/api/management/checkpoint-manager-api.ts`
  - 删除 `enablePeriodicCheckpoints()` 和 `disablePeriodicCheckpoints()`
- [ ] 更新 `sdk/core/execution/context/execution-context.ts`
  - 移除 CheckpointManager 的定时器初始化
- [ ] 更新 `sdk/core/execution/managers/__tests__/checkpoint-manager.test.ts`
  - 删除定时相关测试，添加无状态验证

## 第二阶段：TriggerManager 改造（待启动）

### 任务 1：创建 TriggerStateManager
- [ ] 新建 `sdk/core/execution/managers/trigger-state-manager.ts`
  - 定义 `TriggerRuntimeState` 接口
  - 实现 `register()`、`getState()`、`updateStatus()`、`incrementTriggerCount()`
  - 实现 `createSnapshot()` 和 `restoreFromSnapshot()`

- [ ] 新建 `sdk/core/execution/managers/__tests__/trigger-state-manager.test.ts`
  - 测试状态管理、线程隔离、并发安全

### 任务 2：改造 TriggerManager
- [ ] 修改 `sdk/core/execution/managers/trigger-manager.ts`
  - 删除 `private triggers: Map<ID, Trigger>`
  - 添加 `TriggerStateManager` 参数
  - 改造 `get()` 和 `getAll()` 为查询 + 合并
  - 改造 `register()` 为初始化状态
  - 改造 `enable()`、`disable()`、`handleEvent()` 为通过 StateManager 更新

- [ ] 重写 `sdk/core/execution/managers/__tests__/trigger-manager.test.ts`
  - 测试从 WorkflowRegistry 查询
  - 测试与 TriggerStateManager 集成

### 任务 3：更新 ThreadContext
- [ ] 修改 `sdk/core/execution/context/thread-context.ts`
  - 添加 `triggerStateManager` 属性
  - 在构造函数中初始化 `TriggerStateManager`
  - 添加 `getTriggerStateSnapshot()` 和 `restoreTriggerState()`

- [ ] 更新对应测试

### 任务 4：更新 ThreadBuilder
- [ ] 修改 `sdk/core/execution/thread-builder.ts` 的 `registerWorkflowTriggers()`
  - 改为初始化 `TriggerRuntimeState` 而非存储 Trigger 副本

### 任务 5：检查点触发器支持
- [ ] 修改 `sdk/core/execution/managers/checkpoint-manager.ts`
  - 在 `createCheckpoint()` 中保存 `triggerStates`
  - 在 `restoreFromCheckpoint()` 中恢复 `triggerStates`
  - 更新 `ThreadStateSnapshot` 类型

### 任务 6：API 层更新
- [ ] 修改 `sdk/api/management/trigger-manager-api.ts`
  - 所有状态修改操作通过 TriggerStateManager

## 第三阶段：测试与验证（待启动）

- [ ] 运行所有现有测试，修复失败的测试
- [ ] 编写集成测试（触发器完整生命周期、检查点恢复）
- [ ] 编写并发测试（多线程触发器隔离）
- [ ] 性能基准测试（对比改造前后）

## 预期收益

**CheckpointManager**：无状态、职责清晰、内存安全
**TriggerManager**：定义与状态分离、线程隔离、检查点支持、并发安全

## 关键决策

所有决策已在 `SDK_MANAGERS_REFACTOR.md` 中详细论述，包括：
- 为什么删除定时机制
- 为什么保留 TriggerManager（不用 WorkflowRegistry 替代）
- 如何分离定义与状态
- 如何保证线程隔离

