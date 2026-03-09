# Agent Loop Checkpoint 迁移分析

## 概述

本文档分析了将 Graph 层的 Checkpoint 机制迁移到 Agent 层的可行性和实施方案，旨在替代现有的全量 Snapshot 机制，实现增量快照功能。

## 背景分析

### 当前实现问题

**现有架构：`sdk/agent/snapshot/`**

1. **全量保存问题**
   - `AgentLoopSnapshotManager` 每次保存完整状态
   - 包含所有消息历史（可能上千条）
   - 包含所有迭代记录（可能上百次迭代）
   - 存储空间浪费严重

2. **缺少增量机制**
   - 无法只保存变化部分
   - 每次保存都是完整的副本
   - 快照数量随执行时间线性增长

3. **缺少配置控制**
   - 没有灵活的配置策略
   - 无法按需创建快照
   - 没有自动清理机制

### Graph 层 Checkpoint 优势

**参考架构：`sdk/graph/execution/`**

1. **增量快照机制**
   - `CheckpointDelta` 定义增量数据结构
   - 只保存新增消息、修改变量、状态变更
   - 大幅减少存储空间

2. **智能类型决策**
   - 第一个检查点总是 FULL（完整）
   - 每隔 N 个检查点创建一个 FULL（基线）
   - 其他情况创建 DELTA（增量）

3. **增量链管理**
   - DELTA 检查点引用基线检查点
   - 恢复时从基线开始，依次应用增量
   - 支持高效的恢复操作

4. **配置优先级解析**
   - `CheckpointConfigResolver` 基类
   - 支持多层级配置（全局、节点、Hook、Trigger、Tool）
   - 灵活的优先级规则

5. **自动清理策略**
   - 支持基于时间的清理
   - 支持基于数量的清理
   - 支持基于存储空间的清理

## 架构对比

### 当前架构

```
sdk/agent/
├── entities/
│   ├── agent-loop-entity.ts       # 实体类
│   └── agent-loop-state.ts        # 状态类
├── coordinators/
│   └── agent-loop-coordinator.ts  # 协调器
├── executors/
│   └── agent-loop-executor.ts     # 执行器
├── services/
│   └── agent-loop-registry.ts     # 注册表
└── snapshot/                      # 快照模块（全量）
    └── agent-loop-snapshot.ts
```

### 目标架构

```
sdk/agent/
├── entities/          # 保持不变
│   ├── agent-loop-entity.ts
│   └── agent-loop-state.ts
├── coordinators/      # 添加 checkpoint 协调器
│   ├── agent-loop-coordinator.ts
│   └── checkpoint-coordinator.ts
├── executors/         # 保持不变
│   └── agent-loop-executor.ts
├── services/          # 保持不变
│   └── agent-loop-registry.ts
├── checkpoint/        # 新增：替代 snapshot
│   ├── agent-loop-diff-calculator.ts
│   ├── agent-loop-delta-restorer.ts
│   ├── checkpoint-config-resolver.ts
│   ├── checkpoint-state-manager.ts
│   ├── checkpoint-utils.ts
│   └── index.ts
└── snapshot/          # 保留用于向后兼容
    └── agent-loop-snapshot.ts
```

## 核心差异分析

### 数据结构对比

| 维度 | Snapshot（当前） | Checkpoint（目标） |
|------|-----------------|-------------------|
| 消息 | 全量保存所有消息 | 只保存新增消息 |
| 迭代记录 | 全量保存所有迭代 | 只保存新增迭代 |
| 变量 | 全量保存所有变量 | 只保存新增和修改的变量 |
| 状态 | 完整状态快照 | 状态变更差异 |
| 存储 | 线性增长 | 增量增长 + 定期基线 |

### 性能对比

假设执行 100 次迭代，每次迭代新增 10 条消息：

| 指标 | Snapshot | Checkpoint（增量间隔 10） |
|------|----------|-------------------------|
| 检查点数量 | 100 | 100 |
| 消息总存储 | 100,000 条 | 10,000 条（基线）+ 900 条（增量）= 10,900 条 |
| 存储效率 | 100% | ~10.9% |
| 恢复速度 | O(1) | O(log n) |

### 功能对比

| 功能 | Snapshot | Checkpoint |
|------|----------|-----------|
| 完整快照 | ✅ | ✅ |
| 增量快照 | ❌ | ✅ |
| 配置控制 | ❌ | ✅ |
| 自动清理 | ❌ | ✅ |
| 元数据管理 | ✅ | ✅ |
| 向后兼容 | - | ✅ |

## 迁移必要性

### 存储优化

**场景分析：**
- 长时间运行的 Agent Loop（如：客服机器人）
- 每次迭代可能产生多条消息
- 迭代次数可能达到数千次

**当前问题：**
```typescript
// 每次保存都是全量
{
  messages: [...allMessages],  // 1000+ 条
  iterationHistory: [...allIterations],  // 1000+ 次
  variables: {...allVariables}  // 完整副本
}
```

**优化后：**
```typescript
// 增量保存
{
  delta: {
    addedMessages: [msg1, msg2, msg3],  // 只新增 3 条
    addedIterations: [iteration1001],  // 只新增 1 次
    modifiedVariables: Map(...)  // 只修改的变量
  }
}
```

### 配置灵活性

**当前限制：**
- 手动调用 `createSnapshot()`
- 无法根据执行状态自动创建
- 无法在错误时自动保存

**优化后：**
```typescript
// 灵活的配置策略
{
  global: {
    enabled: true,
    interval: 5,  // 每 5 次迭代
    onErrorOnly: false
  },
  loop: {
    enabled: true,
    interval: 3,  // 每 3 次迭代
    createCheckpointOnError: true  // 出错时自动创建
  }
}
```

### 自动清理

**当前问题：**
- 快照数量无限增长
- 需要手动清理
- 可能导致存储耗尽

**优化后：**
```typescript
// 自动清理策略
{
  cleanupPolicy: {
    type: 'count',
    maxCount: 10,  // 最多保留 10 个
    minRetention: 2  // 最少保留 2 个
  }
}
```

## 迁移方案

### 方案一：渐进式迁移（推荐）

**阶段一：兼容共存**
- 保留 `snapshot/` 目录
- 新增 `checkpoint/` 目录
- 两套系统共存
- 提供适配层

**阶段二：功能迁移**
- 新功能使用 checkpoint 系统
- 旧代码继续使用 snapshot
- 逐步迁移调用方

**阶段三：完全替换**
- 标记 snapshot 为 @deprecated
- 全面迁移到 checkpoint
- 最终删除 snapshot 目录

**优势：**
- 风险可控
- 可以逐步验证
- 向后兼容

### 方案二：直接替换

一次性替换所有代码：
- 直接删除 snapshot
- 全面实现 checkpoint
- 更新所有调用方

**优势：**
- 代码更简洁
- 维护成本更低

**劣势：**
- 风险较高
- 需要充分测试
- 可能影响现有功能

## 实现挑战

### 1. 消息管理差异

**Graph 层：**
- 使用 `ConversationManager` 管理消息
- 支持消息批次和索引

**Agent 层：**
- 使用简单的数组存储消息
- 没有复杂的索引机制

**解决方案：**
- 简化消息差异计算
- 只关注追加操作
- 不支持消息修改/删除

### 2. 状态转换差异

**Graph 层：**
- 状态转换与节点执行绑定
- 支持复杂的状态机

**Agent 层：**
- 状态转换与迭代绑定
- 相对简单的状态机

**解决方案：**
- 适配 Agent Loop 的状态转换逻辑
- 重点关注运行状态的变化

### 3. 恢复逻辑差异

**Graph 层：**
- 需要恢复完整的图结构
- 需要恢复变量作用域
- 需要恢复触发器状态

**Agent 层：**
- 只需恢复 Loop 状态
- 变量结构相对简单
- 没有复杂的触发器

**解决方案：**
- 简化恢复逻辑
- 专注于 Loop 特定的状态

## 技术细节

### 增量数据结构

```typescript
interface AgentLoopDelta {
  // 新增的消息（只追加）
  addedMessages?: LLMMessage[];

  // 新增的迭代记录（只追加）
  addedIterations?: IterationRecord[];

  // 修改的变量
  modifiedVariables?: Map<string, any>;

  // 状态变更
  statusChange?: {
    from: AgentLoopStatus;
    to: AgentLoopStatus;
  };

  // 其他状态差异
  otherChanges?: Record<string, { from: any; to: any }>;
}
```

### 检查点类型决策

```typescript
function determineCheckpointType(
  checkpointCount: number,
  config: DeltaStorageConfig
): AgentLoopCheckpointType {
  // 未启用增量：总是完整
  if (!config.enabled) return FULL;

  // 第一个：总是完整
  if (checkpointCount === 0) return FULL;

  // 定期基线：每隔 N 个
  if (checkpointCount % config.baselineInterval === 0) return FULL;

  // 其他：增量
  return DELTA;
}
```

### 恢复链式逻辑

```
Checkpoint Chain:
Checkpoint 0 (FULL) ← Base
  ↓
Checkpoint 1 (DELTA) ← adds delta1
  ↓
Checkpoint 2 (DELTA) ← adds delta2
  ↓
Checkpoint 3 (DELTA) ← adds delta3

Restore:
1. Load Checkpoint 3
2. Find Base: Checkpoint 0
3. Apply delta1 → delta2 → delta3
4. Return complete state
```

## 配置示例

### 全局配置

```typescript
const globalCheckpointConfig = {
  enabled: true,
  interval: 5,  // 每 5 次迭代创建一次
  onErrorOnly: false,
  deltaStorage: {
    enabled: true,
    baselineInterval: 10,  // 每 10 个检查点创建一个基线
    maxDeltaChainLength: 20
  },
  cleanupPolicy: {
    type: 'count',
    maxCount: 10,
    minRetention: 2
  }
};
```

### Loop 级配置

```typescript
const loopConfig = {
  maxIterations: 100,
  createCheckpoint: true,
  checkpointInterval: 3,  // 每 3 次迭代
  createCheckpointOnError: true  // 出错时自动创建
};
```

### 运行时配置

```typescript
// 在执行时动态决定
const shouldCreate = resolver.resolveAgentConfig(
  globalConfig,
  loopConfig,
  {
    currentIteration: 5,
    hasError: true  // 出错时强制创建
  }
);
```

## 预期收益

### 存储优化

- **消息存储：** 减少约 90%
- **迭代记录：** 减少约 90%
- **整体存储：** 减少约 80-90%

### 性能提升

- **创建速度：** 提升 50-70%（只保存增量）
- **恢复速度：** 略有下降（需要应用增量链）
- **清理效率：** 提升 100%（自动清理）

### 功能增强

- **配置灵活：** 支持多层级配置
- **自动清理：** 防止存储耗尽
- **错误恢复：** 自动在错误时创建检查点

### 维护性

- **架构统一：** 与 Graph 层保持一致
- **代码复用：** 复用核心 Checkpoint 框架
- **向后兼容：** 支持渐进式迁移

## 风险评估

### 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 增量计算错误 | 高 | 中 | 充分测试差异计算逻辑 |
| 恢复失败 | 高 | 低 | 实现降级机制 |
| 性能下降 | 中 | 低 | 性能基准测试 |
| 配置复杂 | 低 | 中 | 提供默认配置 |

### 迁移风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 兼容性问题 | 高 | 低 | 保留旧 API |
| 数据丢失 | 高 | 极低 | 充分测试恢复逻辑 |
| 回滚困难 | 中 | 低 | 渐进式迁移 |

## 总结

### 必要性

✅ **高度必要**
- 解决存储浪费问题
- 提供配置灵活性
- 实现自动清理
- 统一架构设计

### 可行性

✅ **高度可行**
- Graph 层已验证
- Agent 层结构相对简单
- 可以复用核心框架

### 推荐方案

✅ **渐进式迁移**
- 风险可控
- 可以逐步验证
- 向后兼容

### 下一步

1. 创建详细设计文档
2. 实现核心组件
3. 编写单元测试
4. 集成测试
5. 性能基准测试
6. 逐步迁移调用方
7. 完全替换旧实现