# 迁移实施指南

> 目标：从文件检查点系统完全迁移到Stratum  
> 范围：代码修改、数据迁移、测试验证  
> 方式：一次性迁移（无中间兼容层）

---

## 一、迁移概览

### 1.1 影响范围

| 模块 | 改动 | 优先级 |
|-----|------|--------|
| **Stratum (Rust)** | 功能增强（快照、恢复、事务） | P0 |
| **CheckpointManager (新建)** | 协调checkpoint的创建和恢复 | P0 |
| **AgentExecutor** | 集成CheckpointManager | P1 |
| **GraphExecutor** | 集成CheckpointManager | P1 |
| **旧Checkpoint系统** | 完全移除 | P2 |

### 1.2 时间表

```
Phase 1: Stratum增强（4周）
  ├─ Week 1: 快照系统扩展
  ├─ Week 2: 恢复API实现
  ├─ Week 3: 事务和索引
  └─ Week 4: 测试和文档

Phase 2: TypeScript集成（2周）
  ├─ Week 1: CheckpointManager开发 + Agent集成
  └─ Week 2: Graph集成 + 系统测试

Phase 3: 旧系统移除和优化（1周）
  └─ 清理、性能调优、文档补充

总耗时：7周（可并行化为4-5周）
```

---

## 二、Stratum侧改动清单

### 2.1 核心数据模型扩展

**文件：** `crates/stratum/src/core/types.rs`

```rust
// 1. 扩展SnapshotContent枚举
pub enum SnapshotContent {
  FileContent(Vec<u8>),
  JsonMetadata(serde_json::Value),  // 新增
  Structured(Vec<u8>),               // 新增
}

// 2. 扩展Snapshot结构
pub struct Snapshot {
  // ... 现有字段 ...
  pub source: String;                // 新增：快照来源
  pub content_type: String;           // 新增：内容类型
}

// 3. 扩展Checkpoint结构
pub struct Checkpoint {
  // ... 现有字段 ...
  pub snapshot_sources: HashMap<SnapshotId, String>;  // 新增
}
```

### 2.2 恢复模块实现

**新文件：** `crates/stratum/src/checkpoint/restore.rs`

- 实现 `restore_full()` - 完整恢复
- 实现 `restore_selective()` - 选择性恢复
- 实现 `restore_by_time()` - 时间查询
- 实现 `diff()` - Checkpoint差异

### 2.3 事务模块实现

**新文件：** `crates/stratum/src/checkpoint/transaction.rs`

- 实现 `CheckpointTransaction` 建造者
- 支持多快照原子提交
- 事务回滚和错误处理

### 2.4 时间索引实现

**新文件：** `crates/stratum/src/checkpoint/time_index.rs`

- BTreeMap-based索引
- `query_range()` 时间范围查询
- `find_nearest()` 最近邻查询

### 2.5 API接口扩展

**修改：** `crates/stratum/src/api/http/mod.rs` 和 `crates/stratum/src/api/rpc/mod.rs`

新增HTTP端点：
```
GET  /api/v1/checkpoint/{id}
GET  /api/v1/checkpoint/{id}/snapshots
GET  /api/v1/checkpoint/{id}/snapshots/{snapshotId}
GET  /api/v1/checkpoint/{id}/restore
POST /api/v1/checkpoint/transaction
GET  /api/v1/checkpoint/time/{timestamp}
GET  /api/v1/checkpoint/diff
```

新增gRPC服务（参见规范文档）

### 2.6 存储层更新

**修改：** `crates/stratum/src/storage/sqlite/mod.rs`

```sql
-- Schema扩展
ALTER TABLE snapshots ADD COLUMN source TEXT DEFAULT '';
ALTER TABLE snapshots ADD COLUMN content_type TEXT DEFAULT 'file';
ALTER TABLE checkpoints ADD COLUMN snapshot_sources TEXT;

CREATE TABLE time_index (
  checkpoint_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL UNIQUE
);
```

### 2.7 测试补充

**新文件或修改：** `crates/stratum/tests/`

- `restore_operations.rs` - 恢复API测试
- `transaction_semantics.rs` - 事务测试
- `time_queries.rs` - 时间查询测试
- `selective_restore.rs` - 选择性恢复测试

---

## 三、TypeScript侧改动清单

### 3.1 新建CheckpointManager

**新文件：** `sdk/checkpoint/checkpoint-manager.ts`

```typescript
export class CheckpointManager {
  constructor(
    private stratumExecutor: StratumExecutor,
    private logger: Logger
  ) {}
  
  // Agent API
  async createAgentCheckpoint(snapshot: AgentStateSnapshot, message: string): Promise<string>
  async restoreAgentState(checkpointId: string): Promise<AgentStateSnapshot>
  async restoreAgentMessages(checkpointId: string): Promise<Message[]>
  async listAgentCheckpoints(agentLoopId: string): Promise<CheckpointInfo[]>
  
  // Graph API
  async createGraphCheckpoint(snapshot: GraphStateSnapshot, message: string): Promise<string>
  async restoreGraphState(checkpointId: string): Promise<GraphStateSnapshot>
  
  // 通用API
  async restoreFull(checkpointId: string): Promise<CheckpointState>
  async restoreSelective(checkpointId: string, sources: string[]): Promise<Partial<CheckpointState>>
  async getStateAtTime(entityId: string, timestamp: number): Promise<any>
  async diffCheckpoints(fromId: string, toId: string): Promise<CheckpointDiff>
}
```

### 3.2 Agent集成

**修改：** `sdk/agent/execution/agent-executor.ts`

```typescript
export class AgentExecutor {
  private checkpointManager: CheckpointManager;  // 注入
  
  async executeIteration(agentLoopId: string, iteration: number): Promise<void> {
    // ... 执行逻辑 ...
    
    // 创建Checkpoint（替代旧的saveCheckpoint）
    const snapshot: AgentStateSnapshot = {
      agentLoopId,
      messages: this.agent.messages,
      iterations: this.agent.iterations,
      variables: this.agent.variables,
      status: this.agent.status,
      timestamp: Date.now(),
    };
    
    await this.checkpointManager.createAgentCheckpoint(
      snapshot,
      `Iteration ${iteration} completed`
    );
  }
  
  async restoreFromCheckpoint(checkpointId: string): Promise<void> {
    const state = await this.checkpointManager.restoreAgentState(checkpointId);
    this.agent = AgentLoopEntity.fromSnapshot(this.agentLoopId, state);
  }
}
```

### 3.3 Graph集成

**修改：** `sdk/graph/execution/graph-executor.ts`

```typescript
export class GraphExecutor {
  private checkpointManager: CheckpointManager;  // 注入
  
  async executeNode(nodeId: string): Promise<void> {
    // ... 执行逻辑 ...
    
    const snapshot: GraphStateSnapshot = {
      executionId: this.executionId,
      workflowId: this.workflowId,
      status: this.workflow.status,
      messages: this.messages,
      nodeResults: this.results,
      variables: this.variables,
      currentNode: nodeId,
      timestamp: Date.now(),
    };
    
    await this.checkpointManager.createGraphCheckpoint(
      snapshot,
      `Node ${nodeId} executed`
    );
  }
}
```

### 3.4 旧代码移除

**删除以下文件/模块：**
- `sdk/core/checkpoint/` (旧的BaseCheckpointCoordinator等)
- `sdk/agent/checkpoint/` (旧的AgentLoopCheckpointCoordinator等)
- `packages/types/src/checkpoint/` (改为仅包含数据接口定义)
- 所有与旧checkpoint相关的存储适配器

---

## 四、数据迁移策略

### 4.1 现有Checkpoint数据处理

```typescript
// 可选：如果需要保留历史数据

async function migrateExistingCheckpoints() {
  // 1. 从旧存储读取所有checkpoint
  const oldCheckpoints = await legacyStorage.listAll();
  
  // 2. 转换格式
  for (const oldCp of oldCheckpoints) {
    const agentSnapshot: AgentStateSnapshot = {
      agentLoopId: oldCp.agentLoopId,
      messages: oldCp.snapshot.messages,
      iterations: oldCp.snapshot.iterations,
      variables: oldCp.snapshot.variables,
      status: oldCp.snapshot.status,
      timestamp: oldCp.timestamp,
    };
    
    // 3. 导入到Stratum
    await checkpointManager.createAgentCheckpoint(
      agentSnapshot,
      `Migrated from legacy system at ${new Date(oldCp.timestamp).toISOString()}`
    );
  }
  
  // 4. 清理旧数据
  await legacyStorage.cleanup();
}
```

**注意：** 由于checkpoint是实验性的，可以选择直接丢弃旧数据（不迁移）

### 4.2 验证迁移完整性

```typescript
async function verifyMigration() {
  // 1. 检查checkpoint总数
  const oldCount = await legacyStorage.count();
  const newCount = await checkpointManager.listAll().length;
  
  assert(oldCount === newCount, 'Checkpoint count mismatch');
  
  // 2. 随机采样验证
  const samples = await legacyStorage.sample(10);
  for (const sample of samples) {
    const restored = await checkpointManager.restoreAgentState(sample.id);
    assertDeepEqual(sample.snapshot, restored);
  }
  
  console.log('✓ Migration verification passed');
}
```

---

## 五、测试计划

### 5.1 单元测试

**CheckpointManager测试：**
- 创建Agent checkpoint
- 创建Graph checkpoint
- 恢复Agent状态
- 恢复Graph状态
- 选择性恢复
- 时间查询

**Stratum新API测试：**
- restore_full()
- restore_selective()
- restore_by_time()
- diff()
- transaction提交

### 5.2 集成测试

**端到端流程：**
1. Agent执行 → 创建Checkpoint → 恢复 → 继续执行
2. Graph执行 → 创建Checkpoint → 恢复 → 继续执行
3. 并发Agent写 → 无冲突
4. 选择性恢复 → 只恢复特定字段
5. 时间旅行 → 按时间戳查询

**性能测试：**
- 创建checkpoint延迟 < 100ms
- 恢复延迟 < 100ms
- 列表查询延迟 < 50ms

### 5.3 测试覆盖率

- Stratum新增代码：> 85%
- CheckpointManager：> 90%
- Agent/Graph集成：> 80%

---

## 六、部署流程

### 6.1 Stratum部署

```bash
# 1. 编译和测试
cd crates/stratum
cargo build --release
cargo test --all

# 2. 数据库迁移
# 运行SQL schema更新脚本

# 3. 启动服务
./target/release/stratum --config stratum.toml

# 4. 健康检查
curl http://localhost:5000/health
```

### 6.2 TypeScript应用部署

```bash
# 1. 构建
pnpm build

# 2. 测试
pnpm test

# 3. 部署
# 部署策略：蓝绿部署或灰度发布

# 4. 验证
# 确认checkpoint操作正常
```

### 6.3 回滚计划

如果迁移出现问题：

```typescript
// 1. Stratum层：保留旧snapshot表，可通过SQL查询恢复
// 2. TypeScript层：保留旧checkpoint类（标记为deprecated）
// 3. 恢复步骤：
//    - 停止新的checkpoint创建
//    - 切换回旧实现
//    - 修复问题后重新部署
```

---

## 七、验收标准

### 7.1 功能验收

- ✅ Stratum恢复API全部可用
- ✅ Agent checkpoint创建和恢复工作
- ✅ Graph checkpoint创建和恢复工作
- ✅ 选择性恢复可用
- ✅ 时间查询可用
- ✅ 事务提交支持

### 7.2 非功能验收

- ✅ 创建延迟 < 100ms (p95)
- ✅ 恢复延迟 < 100ms (p95)
- ✅ 存储空间 < 1GB/100 agents
- ✅ 代码覆盖率 > 80%
- ✅ 文档完整率 100%

### 7.3 生产就绪

- ✅ 所有告警规则配置
- ✅ 监控dashboard就位
- ✅ 日志聚合配置完毕
- ✅ 灾难恢复流程文档化
- ✅ 团队培训完成

---

## 八、文档更新清单

### 8.1 新增文档

- [ ] `docs/integration/01-stratum-enhancement-specification.md` - Stratum规范
- [ ] `docs/integration/02-final-architecture-design.md` - 架构设计
- [ ] `docs/integration/03-migration-guide.md` - 本文档
- [ ] `docs/checkpoint-operations.md` - 用户指南
- [ ] `docs/checkpoint-api-reference.md` - API参考

### 8.2 修改文档

- [ ] README - 更新checkpoint说明
- [ ] AGENTS.md - 更新开发指南
- [ ] API文档 - 新增Checkpoint API

### 8.3 代码文档

- [ ] CheckpointManager javadoc/comments
- [ ] Stratum restore模块文档
- [ ] 数据模型文档

---

## 九、风险和缓解

| 风险 | 概率 | 影响 | 缓解 |
|-----|------|------|------|
| Stratum API不稳定 | 中 | 高 | 充分的集成测试 |
| 性能下降 | 低 | 中 | 性能基准测试、缓存 |
| 数据丢失 | 极低 | 极高 | 事务、备份、WAL |
| 并发冲突 | 低 | 中 | DAG检验、merge |

---

## 十、后续优化方向

迁移完成后可考虑的增强：

1. **快照压缩** - 减少存储占用
2. **增量存储** - 减少Checkpoint大小
3. **分支实验** - 多方向Agent探索
4. **时间旅行调试** - UI可视化历史状态
5. **审计日志** - 完整的变更追踪
6. **备份和恢复** - 跨集群数据同步

---

## 总结

| 阶段 | 工作 | 时间 |
|------|------|------|
| **设计评审** | 确认架构和规范 | 1天 |
| **Stratum增强** | 实现核心功能 | 4周 |
| **TypeScript集成** | Agent/Graph适配 | 2周 |
| **测试和优化** | 性能调优、测试 | 1周 |
| **部署上线** | 分阶段部署 | 1周 |
| **监控和维护** | 线上观测和维护 | 持续 |

**总耗时：9周（含缓冲）或 7周（高效并行）**

**成果：完整的Stratum-Centric checkpoint系统，支持Agent/Graph状态版本管理**
