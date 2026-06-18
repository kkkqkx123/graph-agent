# docs/integration 导读

> 本目录包含从文件检查点系统到Stratum的完整迁移设计

---

## 文档清单

### 📋 [01-stratum-enhancement-specification.md](01-stratum-enhancement-specification.md)

**内容：** Stratum需要实现的功能规范

**阅读对象：** Rust开发者、Stratum维护者

**核心内容：**
- 快照系统扩展（支持JSON元数据、文件、结构化数据）
- 恢复API规范（完整、选择性、时间查询）
- 事务和原子性支持
- 时间索引实现
- HTTP/gRPC接口扩展
- SQLite Schema更新
- 性能优化策略

**关键API：**
```rust
restore_full(checkpoint_id) → RestoreResponse
restore_selective(checkpoint_id, source_filters) → RestoreResponse
restore_by_time(target_time, source_filter) → RestoreResponse
diff(from_id, to_id) → CheckpointDiff
transaction() → CheckpointTransaction
```

**何时开始实施：** Phase 1，预计4周

---

### 🏗️ [02-final-architecture-design.md](02-final-architecture-design.md)

**内容：** 最终系统架构和集成方式

**阅读对象：** 架构师、全栈开发者、决策者

**核心内容：**
- 四层系统架构（Application → Checkpoint → Transport → Stratum）
- 数据模型设计（快照、Checkpoint、Branch、DAG）
- 核心集成点（Agent/Graph executor）
- 关键设计决策（ID系统、快照分类、恢复策略）
- 并发控制和事务模型
- 流程规范（执行、恢复、选择性恢复）
- 错误处理和监控
- 性能特征

**快照分类规范：**
```
agent://     Agent执行状态快照
graph://     Graph执行状态快照
file://      文件内容快照（现有）
system://    系统元数据快照
```

**CheckpointManager接口：**
```typescript
createAgentCheckpoint(snapshot, message)
restoreAgentState(checkpointId)
restoreSelective(checkpointId, sources)
getStateAtTime(entityId, timestamp)
```

**何时使用：** 理解整体架构、设计评审

---

### 🚀 [03-migration-guide.md](03-migration-guide.md)

**内容：** 具体的迁移实施步骤和验收标准

**阅读对象：** 项目经理、工程师、QA

**核心内容：**
- 迁移范围和时间表（总共7-9周）
- Stratum侧改动清单（具体文件和函数）
- TypeScript侧改动清单（新增/修改的模块）
- 数据迁移策略（处理现有checkpoint）
- 测试计划（单元、集成、性能）
- 部署流程（Stratum → TypeScript → 验证）
- 验收标准（功能、性能、生产就绪）
- 风险和回滚计划

**关键里程碑：**
- Week 1-4: Stratum增强
- Week 5-6: TypeScript集成
- Week 7: 验证和优化
- Week 8-9: 部署上线

**何时开始实施：** Phase 2，取决于Phase 1完成

---

## 阅读路径

### 👨‍💼 **项目决策者**
1. 先读 `02-final-architecture-design.md` → 第一、二、三节
2. 再读 `03-migration-guide.md` → 第一、二、五节
3. 评估时间和资源

### 👨‍💻 **Rust开发者（Stratum）**
1. 先读 `02-final-architecture-design.md` → 第一、二节（理解整体背景）
2. 重点读 `01-stratum-enhancement-specification.md` → 所有内容
3. 参考 `03-migration-guide.md` → 第二节（了解集成期望）

### 👨‍💻 **TypeScript开发者（SDK）**
1. 先读 `02-final-architecture-design.md` → 第一、二、三、四节
2. 读 `01-stratum-enhancement-specification.md` → 第二、三节（了解API）
3. 重点读 `03-migration-guide.md` → 第三、四、五节

### 🧪 **QA/测试工程师**
1. 快速浏览 `02-final-architecture-design.md` → 整体架构
2. 重点读 `03-migration-guide.md` → 第五、六、七节（测试和验收）

---

## 关键概念速查表

### Snapshot（快照）
- **定义：** 执行状态在某一时刻的记录
- **类型：** 文件内容、JSON元数据、结构化数据
- **ID：** Content hash（sha3/blake3）
- **来源标识：** agent://, graph://, file://, system://

### Checkpoint
- **定义：** 多个Snapshot的集合 + 元数据
- **ID：** 基于parents + snapshots + metadata的hash
- **特性：** 不可变、支持多父节点（merge）、原子性

### Restoration（恢复）
| 方式 | 用途 | 性能 |
|-----|------|------|
| **完整恢复** | 恢复完整状态 | ~100ms |
| **选择性恢复** | 仅恢复特定source的快照 | ~50ms |
| **时间查询** | 获取特定时间点的最近快照 | ~10ms |
| **字段恢复** | 仅恢复特定字段（TS层） | <5ms |

### Source标识符规范

```
agent://loop-{agentLoopId}          Agent状态
graph://execution-{executionId}     Graph状态
file://path/to/file                  文件内容
system://metadata                    系统信息
```

---

## 核心数据流

### Agent执行流

```
AgentExecutor.executeIteration()
  ↓
  提取状态 → AgentStateSnapshot
  ↓
  CheckpointManager.createAgentCheckpoint()
  ↓
  序列化为JSON
  ↓
  StratumExecutor.createCheckpoint()
  ↓
  Stratum处理：
    - 计算Snapshot ID
    - 计算Checkpoint ID
    - 事务提交到SQLite
  ↓
  返回checkpointId
```

### 恢复流

```
Recovery request
  ↓
  CheckpointManager.restoreAgentState(checkpointId)
  ↓
  StratumExecutor.restoreFull()
  ↓
  Stratum查询：
    - 加载Checkpoint
    - 加载所有快照
    - 按source分类
  ↓
  解析JSON快照
  ↓
  AgentLoopEntity.fromSnapshot()
  ↓
  Agent继续执行
```

---

## API快速参考

### Stratum gRPC API（新增）

```protobuf
service Stratum {
  rpc RestoreFull(RestoreFullRequest) returns (RestoreFullResponse);
  rpc RestoreSelective(RestoreSelectiveRequest) returns (RestoreSelectiveResponse);
  rpc RestoreByTime(RestoreByTimeRequest) returns (RestoreByTimeResponse);
  rpc ListSnapshots(ListSnapshotsRequest) returns (ListSnapshotsResponse);
  rpc DiffCheckpoints(DiffCheckpointsRequest) returns (DiffCheckpointsResponse);
  rpc CreateTransaction(CreateTransactionRequest) returns (TransactionHandle);
  rpc CommitTransaction(CommitTransactionRequest) returns (CommitResponse);
}
```

### Stratum HTTP API（新增）

```
GET  /api/v1/checkpoint/{id}                    → Checkpoint详情
GET  /api/v1/checkpoint/{id}/snapshots          → 快照列表
GET  /api/v1/checkpoint/{id}/restore            → 恢复
POST /api/v1/checkpoint/transaction             → 提交快照
GET  /api/v1/checkpoint/time/{timestamp}        → 时间查询
GET  /api/v1/checkpoint/diff                    → 差异对比
```

### CheckpointManager TypeScript API

```typescript
// Agent相关
createAgentCheckpoint(snapshot: AgentStateSnapshot, message: string): Promise<string>
restoreAgentState(checkpointId: string): Promise<AgentStateSnapshot>
restoreAgentMessages(checkpointId: string): Promise<Message[]>
listAgentCheckpoints(agentLoopId: string): Promise<CheckpointInfo[]>

// Graph相关
createGraphCheckpoint(snapshot: GraphStateSnapshot, message: string): Promise<string>
restoreGraphState(checkpointId: string): Promise<GraphStateSnapshot>

// 通用
restoreFull(checkpointId: string): Promise<CheckpointState>
restoreSelective(checkpointId: string, sources: string[]): Promise<Partial<CheckpointState>>
getStateAtTime(entityId: string, timestamp: number): Promise<any>
diffCheckpoints(fromId: string, toId: string): Promise<CheckpointDiff>
```

---

## 常见问题

### Q: 为什么要迁移？
**A:** 
- 现有checkpoint系统是实验性的，设计不规范
- 单一的回退方式，难以支持部分恢复
- 无分支支持，难以进行多方向探索
- Stratum提供了完整的版本控制系统

### Q: 迁移会影响现有功能吗？
**A:** 
- 不会。新系统与现有的Agent/Graph执行流程兼容
- 仅改变checkpoint的存储和恢复方式
- 如需保留旧数据，可选择迁移到Stratum

### Q: 性能会下降吗？
**A:** 
- 创建延迟：<100ms（可接受）
- 恢复延迟：<100ms（可接受）
- 查询延迟：<50ms（改进）
- 由于缓存和索引，实际性能会更好

### Q: 可以在生产环境逐步迁移吗？
**A:** 
- 不建议。这是实验性功能，建议一次性迁移
- 迁移期间可以保留旧系统（只读），作为备份
- 迁移完成后清理旧系统

### Q: 如果迁移出错怎么办？
**A:** 
- 保留Stratum备份（数据不会丢失）
- 保留旧checkpoint类（标记deprecated）
- 如需回滚，切换回旧实现
- 修复问题后重新迁移

---

## 相关文档链接

- **架构文档根目录：** [docs/analysis/](../analysis/)
- **Checkpoint当前状态分析：** [checkpoint-stratum-integration-analysis.md](../analysis/checkpoint-stratum-integration-analysis.md)
- **项目开发指南：** [AGENTS.md](../../AGENTS.md)
- **代码规范：** [CLAUDE.md](../../CLAUDE.md)

---

## 下一步

1. **设计评审** (1-2天)
   - 与团队讨论三个设计文档
   - 确认关键决策点
   - 调整时间表和资源

2. **启动Phase 1** (Stratum增强)
   - 分配Rust开发者
   - 创建功能分支
   - 开始实现

3. **并行准备Phase 2** (TypeScript集成)
   - 准备CheckpointManager框架
   - 设计集成接口
   - 准备测试用例

4. **持续同步**
   - 每周进度同步
   - 及时调整计划
   - 记录决策和变更

---

**文档版本：** 1.0  
**最后更新：** 2026-06-18  
**维护者：** Architecture Team
