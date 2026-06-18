# Checkpoint Module

TypeScript侧的CheckpointManager实现，与Layertwine后端进行checkpoint相关操作的协调。

## 结构

```
checkpoint/
├── checkpoint-manager.ts          # 核心实现
├── types.ts                       # 类型定义
├── examples.ts                    # 使用示例
├── INTEGRATION_GUIDE.md           # 集成指南（详细）
├── index.ts                       # 模块导出
└── __tests__/
    └── checkpoint-manager.integration.test.ts  # 集成测试
```

## 快速开始

```typescript
import { CheckpointManager } from "@wf-agent/sdk/checkpoint";
import { LayertwineExecutor } from "@wf-agent/sdk";

// 初始化
const executor = new LayertwineExecutor({
  deployMode: "remote",
  address: "localhost:5000"
});
await executor.connect({ address: "localhost:5000" });

const cm = new CheckpointManager(executor);

// 创建Agent checkpoint
const cpId = await cm.createAgentCheckpoint(snapshot, "message");

// 恢复状态
const restored = await cm.restoreAgentState(cpId);
```

## 核心功能

### Agent相关
- `createAgentCheckpoint()` - 创建Agent快照
- `restoreAgentState()` - 恢复完整Agent状态
- `restoreAgentMessages()` - 仅恢复消息

### Graph相关
- `createGraphCheckpoint()` - 创建Graph快照
- `restoreGraphState()` - 恢复Graph状态

### 通用操作
- `restoreFull()` - 完整恢复checkpoint
- `restoreSelective()` - 按source过滤恢复
- `getStateAtTime()` - 时间查询
- `listCheckpoints()` - 列出checkpoints
- `diffCheckpoints()` - 对比两个checkpoints

## 类型定义

关键类型：
- `AgentStateSnapshot` - Agent执行快照
- `GraphStateSnapshot` - Graph执行快照
- `CheckpointState` - 完整checkpoint状态
- `SelectiveRestoreOptions` - 选择性恢复选项

## 与LayertwineExecutor的关系

```
CheckpointManager
└─ 使用 → LayertwineExecutor
           ├── commit() - 创建checkpoint
           ├── restoreCheckpoint() - 完整恢复
           ├── restoreSelectiveCheckpoint() - 选择性恢复
           ├── restoreCheckpointByTime() - 时间查询
           ├── diffCheckpoints() - 对比
           └── getSnapshot() - 获取快照内容
```

## 集成点

建议的集成位置：

1. **应用层** (推荐)
   - 在Agent/Graph执行完成后手动创建checkpoint
   - 应用决定checkpoint的频率和条件
   - 完全可选

2. **Agent Executor**
   - 在AgentExecutionCoordinator的迭代循环中
   - 自动创建checkpoint（可配置）

3. **Graph Executor**
   - 在GraphExecutor的节点完成后
   - 自动创建checkpoint（可配置）

## 性能指标

| 操作 | 数据量 | 预期延迟 | 瓶颈 |
|-----|------|--------|------|
| createCheckpoint | 100KB | <100ms | gRPC + SQLite write |
| restoreCheckpoint | 100KB | <100ms | SQLite read + gRPC |
| restoreSelective | 100KB | <50ms | Layertwine过滤 |
| listCheckpoints | 1000个 | <50ms | 时间索引查询 |
| diffCheckpoints | 2个cp | <10ms | DAG遍历 |

## 使用模式

### 模式1：手动checkpoint（推荐入门）

```typescript
// 应用层控制checkpoint
const result = await agentExecutor.execute(entity);
if (result.success) {
  await checkpointManager.createAgentCheckpoint(snapshot, "Success");
}
```

### 模式2：定期checkpoint

```typescript
// 每N个迭代创建一个checkpoint
if (iteration % 5 === 0) {
  await checkpointManager.createAgentCheckpoint(snapshot, `Iteration ${iteration}`);
}
```

### 模式3：条件checkpoint

```typescript
// 仅在特定条件下创建checkpoint
if (toolCallCount > threshold || errorOccurred) {
  await checkpointManager.createAgentCheckpoint(snapshot, "Conditional save");
}
```

## 错误处理

CheckpointManager可能的错误：

- `"Layertwine executor not connected"` - 需要先connect
- `"No agent snapshot found in checkpoint {id}"` - checkpoint不包含Agent快照
- 网络超时 - Layertwine服务不可用

## 与现有checkpoint系统的关系

这个新的CheckpointManager是对旧系统的完全替代：

| 方面 | 旧系统 | 新系统 |
|-----|-------|-------|
| 后端存储 | 多个地方 | 统一Layertwine |
| ID方式 | UUID | Content hash |
| 恢复粒度 | 全量 | 全量+选择性+按字段 |
| 事务支持 | 无 | 有 |
| 时间查询 | 无 | 有 |

## 后续优化

未来可考虑的增强：

1. **自动checkpoint** - 在Executor层自动创建
2. **快照压缩** - 减少存储占用
3. **增量存储** - 仅存储增量
4. **分支实验** - 支持多分支探索
5. **时间旅行UI** - 可视化历史状态

## 相关文档

- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 详细集成指南
- [examples.ts](./examples.ts) - 代码示例
