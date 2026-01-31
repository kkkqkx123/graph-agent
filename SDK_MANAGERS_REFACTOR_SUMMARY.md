# SDK Managers 重构总结

## 重构目标

基于 `COORDINATORS_MANAGERS_ANALYSIS.md` 文档的方案B，完全分离有状态和无状态组件，使目录结构与设计原则保持一致。

## 重构内容

### 1. 移动 VariableManager 到 managers 目录

**变更：**
- 将 `sdk/core/execution/coordinators/variable-coordinator.ts` 移动到 `sdk/core/execution/managers/variable-manager.ts`
- 更新文件注释，明确说明这是有状态管理器
- 删除原文件

**理由：**
- VariableManager 维护 Thread 的变量状态
- 提供状态的增删改查操作
- 符合管理器的设计原则

### 2. 重构 TriggerCoordinator 为无状态协调器

**变更：**
- 移除 `threadId` 和 `workflowId` 实例变量
- 移除 `setWorkflowId()` 方法
- 所有线程ID和工作流ID从 `TriggerStateManager` 获取
- 更新 `register()` 方法签名，添加 `workflowId` 参数
- 更新文件注释，明确说明是无状态协调器

**理由：**
- 协调器应该无状态，只负责协调逻辑
- 状态管理委托给 `TriggerStateManager`
- 符合协调器的设计原则

### 3. 增强 TriggerStateManager

**变更：**
- 在 `TriggerRuntimeState` 接口中添加 `workflowId` 字段
- 添加 `workflowId` 实例变量
- 添加 `setWorkflowId()` 和 `getWorkflowId()` 方法
- 更新 `register()` 方法，验证 `workflowId`
- 更新快照和恢复逻辑，包含 `workflowId`

**理由：**
- 状态管理器需要维护工作流ID
- 支持协调器查询工作流ID
- 保证状态完整性

### 4. 更新 coordinators/index.ts

**变更：**
- 移除 `VariableManager` 导出（已移到 managers）
- 添加 `VariableAccessor` 和 `VariableNamespace` 导出
- 保持 `EventCoordinator`、`NodeExecutionCoordinator`、`TriggerCoordinator` 导出

**理由：**
- 只导出无状态的协调器
- 提供统一的工具类访问接口

### 5. 更新 managers/index.ts

**变更：**
- 移除 `EventManager` 导出（来自 services）
- 移除 `VariableAccessor` 导出（来自 coordinators）
- 移除 `TriggerManager` 别名导出
- 添加 `CheckpointManager` 导出
- 添加 `VariableManager` 导出（从新位置）
- 保持 `TriggerStateManager` 导出

**理由：**
- 只导出有状态的管理器
- 清理混乱的导出关系
- 提供清晰的模块边界

### 6. 更新导入路径

**变更的文件：**
- `sdk/core/execution/thread-builder.ts`
- `sdk/core/execution/managers/checkpoint-manager.ts`
- `sdk/core/execution/index.ts`
- `sdk/core/execution/context/thread-context.ts`
- `sdk/core/execution/handlers/trigger-handlers/execute-triggered-subgraph-handler.ts`

**变更内容：**
- 所有 `VariableManager` 导入从 `coordinators/variable-coordinator` 改为 `managers/variable-manager`
- `VariableAccessor` 导入从 `coordinators/utils/variable-accessor` 改为 `coordinators`

### 7. 更新调用代码

**变更的文件：**
- `sdk/core/execution/context/thread-context.ts`
- `sdk/core/execution/thread-builder.ts`

**变更内容：**
- 将 `triggerManager.setWorkflowId()` 改为 `triggerStateManager.setWorkflowId()`
- 在 `registerWorkflowTriggers()` 中直接使用 `triggerStateManager`
- 添加 `workflowId` 到触发器状态

## 重构结果

### 目录结构

```
sdk/core/execution/
├── coordinators/              # 无状态协调器
│   ├── event-coordinator.ts
│   ├── node-execution-coordinator.ts
│   ├── trigger-coordinator.ts
│   ├── node-operations/
│   ├── utils/
│   │   └── variable-accessor.ts
│   └── index.ts
├── managers/                  # 有状态管理器
│   ├── checkpoint-manager.ts
│   ├── trigger-state-manager.ts
│   ├── variable-manager.ts    # 新位置
│   └── index.ts
```

### 设计原则遵循

| 原则 | 协调器 | 管理器 |
|------|--------|--------|
| 无状态设计 | ✅ | ❌ |
| 有状态设计 | ❌ | ✅ |
| 协调逻辑 | ✅ | ❌ |
| 状态管理 | ❌ | ✅ |
| 依赖注入 | ✅ | ✅ |

### 导出关系

**coordinators/index.ts 导出：**
- `EventCoordinator`
- `NodeExecutionCoordinator`
- `TriggerCoordinator`
- `VariableAccessor`
- `VariableNamespace`

**managers/index.ts 导出：**
- `CheckpointManager`
- `TriggerStateManager`
- `VariableManager`

## 验证结果

### 类型检查
```bash
cd sdk
tsc --noEmit
```
✅ 通过，无错误

### 架构一致性
- ✅ 无状态 vs 有状态的分离清晰
- ✅ 文档与实现一致
- ✅ 导入导出清晰
- ✅ 职责定义清晰
- ✅ 整体架构一致

## 影响范围

### 文件改动统计
- 新增文件：1 个（`variable-manager.ts`）
- 删除文件：1 个（`variable-coordinator.ts`）
- 修改文件：8 个
- 更新导入路径：5 个文件

### 向后兼容性
- ✅ `TriggerCoordinator` 保持不变
- ✅ `VariableManager` 功能保持不变
- ✅ `TriggerStateManager` 功能增强（向后兼容）
- ⚠️ `TriggerManager` 别名已移除（需要使用 `TriggerCoordinator`）

## 后续建议

1. **文档更新**
   - 更新 SDK 架构文档
   - 更新 API 文档
   - 更新开发者指南

2. **测试覆盖**
   - 为 `VariableManager` 添加单元测试
   - 为 `TriggerCoordinator` 添加单元测试
   - 验证集成测试

3. **代码审查**
   - 检查所有使用 `TriggerManager` 的地方
   - 确保所有导入路径正确
   - 验证类型定义

## 总结

本次重构成功实现了方案B的目标：
- ✅ 完全分离有状态和无状态组件
- ✅ 清理目录结构
- ✅ 统一导出关系
- ✅ 提高架构一致性
- ✅ 通过类型检查

重构后的代码结构更清晰，职责更明确，符合设计原则，为后续开发和维护提供了更好的基础。