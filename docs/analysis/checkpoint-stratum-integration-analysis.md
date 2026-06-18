# Checkpoint与Stratum集成分析报告

> 生成日期：2026-06-18  
> 分析范围：crates/stratum与packages/types/checkpoint、sdk/core/checkpoint、sdk/agent/checkpoint集成关系

---

## 一、项目架构概览

### 1.1 整体结构

```
wf-agent-monorepo/
├── crates/stratum/          ← Rust实现的版本控制引擎
│   └── src/checkpoint/       ← Rust端checkpoint实现
├── sdk/                       ← TypeScript SDK
│   ├── core/checkpoint/      ← 基础checkpoint协调器
│   ├── agent/checkpoint/     ← Agent loop checkpoint实现
│   └── services/executors/
│       └── remote/stratum/   ← StratumExecutor（gRPC客户端）
└── packages/types/
    └── src/checkpoint/       ← Checkpoint类型定义
```

### 1.2 三个关键模块

| 模块 | 技术栈 | 责任 | 生命周期 |
|-----|------|------|---------|
| **Stratum** | Rust | 文件版本控制、checkpoint存储、分支管理 | 独立服务/嵌入式进程 |
| **StratumExecutor** | TypeScript | gRPC客户端、进程管理、服务连接 | 随应用生命周期 |
| **CheckpointCoordinator** | TypeScript | Agent/Graph状态快照、delta优化 | 执行过程中 |

---

## 二、Rust端Stratum Checkpoint实现

### 2.1 核心概念

**Checkpoint** (`crates/stratum/src/checkpoint/checkpoint.rs`)
- 不可变的提交单元（类似Git commit）
- 支持多文件快照：`baseline_snapshots: Vec<SnapshotId>`
- 内容寻址ID：`id = hash(content)`（不包含created_at、git_anchor）
- 支持多父节点：`parents: Vec<CheckpointId>`（线性或合并）
- 元数据：author、message、git_anchor

```rust
pub struct Checkpoint {
    pub id: CheckpointId,                    // Content-addressed ID
    pub parents: Vec<CheckpointId>,          // Single/multiple parents
    pub baseline_snapshots: Vec<SnapshotId>, // Multi-file snapshots
    pub metadata: CheckpointMetadata,
    pub created_at: i64,
}
```

**CheckpointRepo** (`crates/stratum/src/checkpoint/repo.rs`)
- 版本仓库：管理checkpoint、分支、DAG
- 支持分支创建、切换、合并
- 支持持久化存储（SQLite）
- DAG动态构建（不持久化）

```rust
pub struct CheckpointRepo {
    pub branches: Vec<Branch>,           // 分支列表
    pub current_branch: usize,           // 当前分支
    pub checkpoint_dag: CheckpointDag,   // 有向无环图
    pub checkpoints: HashMap<CheckpointId, Checkpoint>,
    pub storage: Option<Box<dyn CheckpointPersist>>,
}
```

### 2.2 关键特性

✅ **多文件快照支持**
```rust
let cp = CheckpointBuilder::new()
    .baseline_snapshot(snap1)
    .baseline_snapshot(snap2)  // 支持多个文件快照
    .author("agent-1")
    .message("multi-file commit")
    .build()
```

✅ **分支管理**
- 创建分支、切换分支、合并分支
- 每个分支有独立的head
- 自动持久化分支状态

✅ **内容寻址**
- ID基于内容hash（使用blake3）
- 同样内容 = 同样ID（去重）
- created_at和git_anchor不影响ID

✅ **持久化**
- SQLite后端
- 增量提交自动persist
- DAG动态重建（空间优化）

---

## 三、TypeScript端Checkpoint实现

### 3.1 类型系统

**基础类型** (`packages/types/src/checkpoint/base.ts`)
```typescript
export type CheckpointType = "FULL" | "DELTA";

export interface BaseCheckpoint<TDelta, TSnapshot> {
  id: ID;                           // 唯一标识
  type: CheckpointType;             // FULL 或 DELTA
  baseCheckpointId?: ID;            // Delta时的基准checkpoint
  previousCheckpointId?: ID;        // 增量链中的前驱
  delta?: TDelta;                   // 增量数据
  snapshot?: TSnapshot;             // 完整快照
  timestamp?: number;
  metadata?: CheckpointMetadata;
}
```

**Agent Loop Checkpoint** (`packages/types/src/checkpoint/agent/checkpoint.ts`)
```typescript
export type AgentLoopCheckpoint = AnyCheckpoint<AgentLoopDelta, AgentLoopStateSnapshot> & {
  agentLoopId: ID;
  timestamp: Timestamp;
};

export interface AgentLoopDelta {
  addedMessages?: Message[];
  addedIterations?: IterationRecord[];
  statusChange?: { from: AgentLoopStatus; to: AgentLoopStatus };
  otherChanges?: Record<string, unknown>;
}
```

**Graph Checkpoint** (`packages/types/src/checkpoint/graph/checkpoint.ts`)
```typescript
export type Checkpoint = AnyCheckpoint<CheckpointDelta, WorkflowExecutionStateSnapshot> & {
  executionId: ID;
  workflowId: ID;
  timestamp: Timestamp;
};

export interface CheckpointDelta {
  addedMessages?: unknown[];
  modifiedMessages?: Map<number, unknown>;
  deletedMessageIndices?: number[];
  addedVariables?: unknown[];
  modifiedVariables?: Map<string, unknown>;
  addedNodeResults?: Record<string, NodeExecutionResult>;
  statusChange?: { from: WorkflowExecutionStatus; to: WorkflowExecutionStatus };
  currentNodeChange?: { from: ID; to: ID };
  otherChanges?: Record<string, { from: unknown; to: unknown }>;
}
```

### 3.2 协调器实现

**BaseCheckpointCoordinator** (`sdk/core/checkpoint/base-checkpoint-coordinator.ts`)
- 模板方法模式
- 通用checkpoint生命周期管理
- 支持FULL/DELTA类型自动判断
- 依赖注入saveCheckpoint、listCheckpoints等

```typescript
async createCheckpoint(
  entity: TEntity,
  dependencies: CheckpointDependencies<TCheckpoint>,
  metadata?: CheckpointMetadata,
): Promise<string> {
  // 1. 提取当前状态
  const currentState = this.extractState(entity);
  
  // 2. 获取历史checkpoint
  const previousCheckpointIds = await listCheckpoints(entity.id);
  
  // 3. 判断type (FULL vs DELTA)
  const type = this.determineCheckpointType(checkpointCount, config);
  
  // 4. 构建checkpoint
  const checkpoint = await this.buildCheckpoint(...);
  
  // 5. 保存checkpoint
  await saveCheckpoint(checkpoint);
}
```

**AgentLoopCheckpointCoordinator** (`sdk/agent/checkpoint/checkpoint-coordinator.ts`)
- 扩展BaseCheckpointCoordinator
- Agent Loop特定的状态提取逻辑
- 支持checkpoint恢复（需要AgentLoopRuntimeConfig）

---

## 四、集成现状分析

### 4.1 StratumExecutor gRPC接口

**gRPC方法映射** (`sdk/services/executors/remote/implementations/stratum/types.ts`)

| gRPC方法 | 请求 | 响应 | Stratum功能 |
|---------|------|------|-----------|
| **Commit** | StratumCommitRequest | StratumCommitResponse | 创建checkpoint |
| **AgentEdit** | StratumAgentEditRequest | StratumAgentEditResponse | Agent编辑文件 |
| **AgentSubmit** | StratumAgentSubmitRequest | StratumAgentSubmitResponse | Agent提交checkpoint |
| **Log** | StratumLogRequest | StratumLogResponse | 查询checkpoint历史 |
| **BranchList** | - | StratumBranchListResponse | 列出分支 |
| **Approve** | StratumApproveRequest | StratumApproveResponse | 批准变更 |

```typescript
// StratumCommitRequest
export interface StratumCommitRequest {
  message: string;
  author?: string;
}

export interface StratumCommitResponse {
  checkpointId: string;  // Rust端生成的checkpoint ID
  message: string;
}
```

### 4.2 部署模式

**StratumExecutorConfig** 支持两种模式：

```typescript
export interface StratumExecutorConfig {
  deployMode: "embedded" | "remote";
  // Embedded mode
  binaryPath?: string;      // Rust二进制路径
  dbPath?: string;          // SQLite数据库路径
  // Remote mode
  address?: string;         // gRPC服务地址
  protoPath?: string;       // Proto定义路径
}
```

**实现细节**：
- **Embedded**: StratumProcessManager启动子进程，等待gRPC服务就绪
- **Remote**: 直接连接到已部署的Stratum服务

### 4.3 当前集成深度

```
┌─────────────────────────────────────────────────┐
│  TypeScript Application                         │
├─────────────────────────────────────────────────┤
│ AgentLoopCheckpointCoordinator (SDK/core)       │
│  - 管理状态快照                                   │
│  - FULL/DELTA决策                                │
│  - 调用saveCheckpoint()回调                      │
├─────────────────────────────────────────────────┤
│ StratumExecutor (Services layer)                │
│  - gRPC client wrapper                          │
│  - 进程管理（embedded模式）                      │
│  - 连接池                                        │
├─────────────────────────────────────────────────┤
│ gRPC Communication (Protocol)                   │
├─────────────────────────────────────────────────┤
│ Stratum Rust Service                            │
│  - CheckpointRepo                               │
│  - 分支管理、DAG                                 │
│  - SQLite持久化                                  │
└─────────────────────────────────────────────────┘
```

**集成层级：浅层的RPC调用**
- StratumExecutor仅作为协议适配层
- 没有高级业务逻辑共享
- TypeScript checkpoint与Rust checkpoint独立运作

---

## 五、功能重合分析

### 5.1 核心功能比对

| 功能 | TypeScript Checkpoint | Rust Stratum Checkpoint | 重合度 |
|-----|---------------------|----------------------|-------|
| **ID生成** | UUID (generateId) | Content-addressed hash | ❌ 不同 |
| **快照类型** | FULL/DELTA | 多文件baseline_snapshots | 🟡 部分 |
| **元数据** | description, tags | author, message, git_anchor | 🟡 部分 |
| **分支管理** | ❌ 无 | ✅ 完整(创建/切换/合并) | ❌ 无 |
| **DAG管理** | ❌ 无 | ✅ CheckpointDag | ❌ 无 |
| **多父节点** | ❌ 无 | ✅ 支持(合并) | ❌ 无 |
| **持久化** | 依赖注入 | SQLite (内置) | 🟡 不同 |
| **增量优化** | ✅ Delta链 | ❌ 每个checkpoint存全量快照 | 🟡 不同方式 |

### 5.2 设计理念的差异

#### TypeScript Checkpoint (Agent-centric)
```
目标：捕捉Agent执行状态
抽象：Message + Variable + Status
粒度：消息级、迭代级变化
设计：为了恢复Agent状态
```

#### Rust Stratum Checkpoint (File-centric)
```
目标：版本控制文件状态
抽象：Snapshot + Content Hash
粒度：文件级、多文件协调
设计：为了管理工件版本
```

### 5.3 潜在重合问题

#### 🔴 问题1：ID系统不兼容
```
TypeScript:  checkpointId = UUID()              // 随机
Rust:        checkpointId = hash(content)       // 确定性

后果：同一个逻辑checkpoint在两端有不同的ID
      无法建立映射关系
```

#### 🔴 问题2：快照粒度差异
```
TypeScript:  捕捉Agent内部状态变化 (message, iterations)
Rust:        捕捉工件文件快照 (file content)

问题：两个系统维护的快照内容、时机、格式完全不同
      无法互相还原
```

#### 🔴 问题3：分支管理重叠
```
TypeScript:  没有分支支持 (只有线性checkpoint链)
Rust:        原生分支支持 (branch create/switch/merge)

问题：如果Agent需要分支（如实验多个方向），
      TypeScript无法表达，必须绕过到Rust
      或两个系统独立管理分支
```

#### 🟡 问题4：持久化责任不清
```
TypeScript Coordinator 的 saveCheckpoint 回调：
  - 何时被调用？
  - 是否通过 StratumExecutor.commit() 写入Rust？
  - 还是本地数据库？
  
如果分开存储：
  - checkpoint一致性问题
  - 同步时序问题
  - 恢复时的数据来源问题
```

#### 🟡 问题5：多文件支持缺失
```
TypeScript:  单一executionId/agentLoopId
             对应单一Checkpoint

Rust:        baseline_snapshots: Vec<SnapshotId>
             一个Checkpoint对应多个文件

问题：Agent执行涉及多个文件修改时
      TypeScript无法表达"原子的多文件快照"
      Rust端必须手工组织多个SnapshotId
```

---

## 六、集成现状结论

### 6.1 当前状态

✅ **实现了基础集成**
- StratumExecutor成功封装了gRPC通信
- 支持嵌入式和远程两种部署
- 核心RPC方法可用

❌ **业务逻辑集成不足**
- TypeScript Checkpoint 和 Rust Checkpoint 各自为政
- 没有端到端的Checkpoint生命周期管理
- ID、元数据、快照格式无统一规范

⚠️  **存在设计冲突**
- 两个Checkpoint系统目的不同（Agent状态 vs 文件版本）
- 可能导致重复记录或数据不一致

### 6.2 关键问题清单

| 优先级 | 问题 | 影响 | 建议 |
|-------|-----|------|------|
| **P0** | 何时触发Rust端checkpoint？ | checkpoint完整性 | 明确触发时机、决策规则 |
| **P0** | TypeScript/Rust ID如何映射？ | 追溯性、审计 | 统一ID生成策略或维护映射表 |
| **P1** | 多文件快照如何协调？ | 原子性、一致性 | TypeScript支持文件列表or Rust聚合 |
| **P1** | 分支管理边界在哪？ | 功能重合 | 明确分工（Rust用分支，TS用线性） |
| **P2** | 增量存储策略矛盾 | 存储效率 | 选择一个策略统一实现 |
| **P2** | 恢复时数据来源？ | 灾难恢复 | 定义检索优先级 |

---

## 七、改进建议

### 7.1 短期（现状优化）

#### 🟢 建议1：明确集成规范
```typescript
// 定义清晰的checkpoint生命周期
interface CheckpointLifecycle {
  // TypeScript端：提取状态
  onAgentIteration(agentId, state);
  
  // 决策：是否创建checkpoint
  shouldCreateCheckpoint(agentId, config): boolean;
  
  // Rust端：提交到Stratum
  submitToStratum(stratumExecutor, checkpoint): Promise<checkpointId>;
  
  // 同步元数据
  syncMetadata(tsCheckpointId, stratumCheckpointId);
}
```

#### 🟢 建议2：建立ID映射表
```typescript
// 在应用层维护映射
interface CheckpointIdMapping {
  tsCheckpointId: string;      // TypeScript UUID
  stratumCheckpointId: string; // Rust content hash
  timestamp: number;
  metadata: {
    agentId: string;
    iteration: number;
    stratumBranch: string;
  }
}
```

#### 🟢 建议3：统一元数据格式
```typescript
// 定义通用的Checkpoint元数据
interface UnifiedCheckpointMetadata {
  // 来源
  source: "agent-iteration" | "graph-node" | "manual";
  
  // 标识
  agentId?: string;
  executionId?: string;
  
  // Stratum映射
  stratumCheckpointId?: string;
  stratumBranch?: string;
  
  // 内容
  description: string;
  tags: string[];
  
  // 时间
  createdAt: number;
}
```

### 7.2 中期（设计优化）

#### 🟡 建议4：统一快照抽象
```
创建顶层接口：ICheckpointSnapshot
  ├─ AgentLoopSnapshot (messages, iterations, status)
  ├─ GraphSnapshot (workflow state, node results)
  └─ FileSnapshot (Stratum baseline_snapshots)

CheckpointCoordinator 不再直接处理特定类型
而是统一序列化为 ICheckpointSnapshot
然后通过 StratumExecutor.commit() 持久化
```

#### 🟡 建议5：分离关注点
```
TypeScript 层：状态管理（什么时候保存）
  ↓ 不涉及存储细节
Stratum 层：版本管理（如何存储、分支、合并）
  ↓ 提供统一的持久化API

中间层（适配器）：格式转换
  TypeScript Checkpoint → Stratum Checkpoint
```

#### 🟡 建议6：支持多文件快照
```typescript
// 扩展TypeScript Checkpoint类型
export interface FullCheckpoint<TSnapshot> {
  type: "FULL";
  snapshot: TSnapshot;
  
  // 新增：关联的文件快照
  associatedSnapshots?: {
    stratumCheckpointId: string;
    fileSnapshots: SnapshotId[];
  }
}
```

### 7.3 长期（架构重构）

#### 🔵 建议7：统一Checkpoint存储
```
考虑创建 CheckpointStore 抽象：
  - 自动将 TypeScript checkpoint 写入 Stratum
  - 统一查询接口
  - 自动处理ID映射和元数据同步

interface CheckpointStore {
  save(checkpoint: UnifiedCheckpoint): Promise<string>;
  load(id: string): Promise<UnifiedCheckpoint>;
  list(filter: CheckpointFilter): Promise<UnifiedCheckpoint[]>;
  restore(checkpointId: string): Promise<RestoredState>;
}
```

#### 🔵 建议8：明确多分支策略
```
决定：
1. Agent是否需要分支支持？
   - 如需：在TypeScript层建模分支概念
   - 如不需：禁用Stratum分支功能，简化为线性

2. 分支与Agent ID的关系？
   - 一个Agent→一个分支？
   - 还是多Agent→一个主分支？

3. 分支合并何时发生？
   - Agent完成后自动合并主分支？
   - 需要人工审批？
```

---

## 八、附录：文件清单

### Rust Stratum Checkpoint (crates/stratum)
```
src/checkpoint/
├── mod.rs           # 模块导出
├── checkpoint.rs    # Checkpoint定义 & CheckpointBuilder
├── branch.rs        # Branch定义
├── dag.rs           # CheckpointDag定义
└── repo.rs          # CheckpointRepo核心实现

tests/
├── checkpoint_integration.rs
├── multi_agent.rs
├── basic_workflow.rs
└── ...

benches/
├── diff.rs
├── merge.rs
└── ...
```

### TypeScript Checkpoint (packages/types & sdk)
```
packages/types/src/checkpoint/
├── base.ts                   # 基础类型
├── index.ts                  # 导出
├── variable-state.ts
├── agent/
│   ├── checkpoint.ts         # AgentLoopCheckpoint
│   ├── config.ts
│   ├── snapshot.ts
│   └── index.ts
└── graph/
    ├── checkpoint.ts         # GraphCheckpoint
    ├── config.ts
    ├── snapshot.ts
    └── index.ts

sdk/core/checkpoint/
├── base-checkpoint-coordinator.ts    # 基类
├── base-checkpoint-state-manager.ts
├── base-diff-calculator.ts
├── base-delta-restorer.ts
├── types.ts
├── utils/
│   ├── checkpoint-cache.ts
│   ├── checkpoint-config-resolver.ts
│   ├── delta-calculator.ts
│   ├── delta-restorer.ts
│   ├── cleanup-policy.ts
│   └── constants.ts
└── __tests__/

sdk/agent/checkpoint/
├── checkpoint-coordinator.ts         # Agent具体实现
├── checkpoint-state-manager.ts
└── __tests__/
```

### StratumExecutor (sdk/services)
```
sdk/services/executors/remote/
├── BaseRemoteExecutor.ts
├── types.ts
└── implementations/stratum/
    ├── StratumExecutor.ts           # 核心gRPC客户端
    ├── stratum-process.ts           # 子进程管理
    ├── types.ts                      # gRPC类型定义
    └── index.ts
```

---

## 九、参考文档

1. **Stratum集成方案**：docs/plan/stratum-integration-plan.md
2. **Rust Checkpoint实现**：crates/stratum/AGENTS.md
3. **TypeScript Checkpoint类型**：packages/types/src/checkpoint/
4. **开发指南**：AGENTS.md (根目录)

---

## 十、关键术语

| 术语 | 定义 |
|-----|------|
| **Checkpoint** | 状态快照，用于恢复或审计 |
| **Snapshot** | 特定时刻的完整状态记录 |
| **Delta** | 相对于基准的增量变化 |
| **Baseline** | Delta的参考点（前一个FULL checkpoint） |
| **Branch** | 版本控制中的平行开发线（Stratum专有） |
| **DAG** | 有向无环图，表示checkpoint的继承关系 |
| **Content-addressed** | 根据内容hash生成ID（Stratum用） |
| **StratumExecutor** | TypeScript中的Stratum gRPC客户端 |
| **CheckpointRepo** | Rust中的checkpoint仓库实现 |
| **CheckpointCoordinator** | TypeScript中的checkpoint协调器 |
