# 最终架构设计：Stratum-Centric Checkpoint 系统

> 目标：统一的执行状态版本管理系统  
> 范围：Agent/Graph的完整生命周期  
> 架构等级：Final Architecture (v1.0)  
> 生效日期：完全迁移后

---

## 一、整体架构

### 1.1 系统分层

```
┌──────────────────────────────────────────────────────┐
│         Application Layer                            │
│  ┌────────────────────────────────────────────────┐  │
│  │ Agent Loop Executor   │  Graph Executor         │  │
│  │ (TypeScript)          │  (TypeScript)           │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                         ↓ (State snapshots)
┌──────────────────────────────────────────────────────┐
│         Checkpoint Layer                             │
│  ┌────────────────────────────────────────────────┐  │
│  │ CheckpointManager (TypeScript)                 │  │
│  │  - Coordinates checkpoint creation             │  │
│  │  - Manages snapshot formatting                 │  │
│  │  - Handles restoration logic                   │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                    ↓ (gRPC calls)
┌──────────────────────────────────────────────────────┐
│         Transport Layer                              │
│  ┌────────────────────────────────────────────────┐  │
│  │ GrpcClient / StratumExecutor (TypeScript)      │  │
│  │  - RPC marshaling/unmarshaling                 │  │
│  │  - Connection management                       │  │
│  │  - Error handling                              │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                    ↓ (gRPC protocol)
┌──────────────────────────────────────────────────────┐
│         Stratum Service (Rust)                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ API Layer (gRPC + HTTP)                        │  │
│  │  - Request routing                             │  │
│  │  - Response formatting                         │  │
│  ├────────────────────────────────────────────────┤  │
│  │ Checkpoint Management                          │  │
│  │  - create_checkpoint()                         │  │
│  │  - restore_full() / restore_selective()        │  │
│  │  - transaction()                               │  │
│  │  - query operations (list, diff, time)        │  │
│  ├────────────────────────────────────────────────┤  │
│  │ Snapshot Management                            │  │
│  │  - Store/load (files, JSON, structured)        │  │
│  │  - Content addressing                          │  │
│  │  - Compression                                 │  │
│  ├────────────────────────────────────────────────┤  │
│  │ Storage Layer                                  │  │
│  │  - SQLite backend                              │  │
│  │  - Transactions (WAL)                          │  │
│  │  - Indexes (time, source)                      │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 1.2 核心概念定义

```
【Snapshot】
  - 执行状态的某一时刻的记录
  - 可以是：文件内容、JSON元数据、结构化数据
  - 通过source标识符分类
  - 内容寻址ID（hash-based）

【Checkpoint】
  - 多个Snapshot的集合 + 元数据
  - 表示一个"完整的执行状态"
  - 支持多父节点（merge）
  - 不可变且可引用

【Branch】
  - 线性的checkpoint序列
  - Agent/Graph执行的主线
  - 支持切换（但应该很少用）
  - 支持合并（用于实验方向）

【Restoration】
  - 从Checkpoint恢复到某个历史状态
  - 支持完整恢复或选择性恢复
  - 原子操作（要么全部恢复，要么都不）
  - 可基于时间、source等条件查询
```

---

## 二、数据模型

### 2.1 核心数据结构

```typescript
// TypeScript端的数据模型（接收层）

/**
 * Agent执行状态快照
 * 对应Stratum中 source="agent://" 的快照
 */
interface AgentStateSnapshot {
  agentLoopId: string;
  messages: Message[];
  iterations: IterationRecord[];
  variables: Record<string, unknown>;
  status: AgentLoopStatus;
  timestamp: number;
}

/**
 * Graph执行状态快照
 * 对应Stratum中 source="graph://" 的快照
 */
interface GraphStateSnapshot {
  executionId: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  messages: unknown[];
  nodeResults: Record<string, NodeExecutionResult>;
  variables: Record<string, unknown>;
  currentNode: string;
  timestamp: number;
}

/**
 * 文件状态快照
 * 对应Stratum中 source="file://" 的快照
 */
interface FileSnapshot {
  path: string;
  content: string | Buffer;
  mimeType?: string;
}

/**
 * Checkpoint完整状态（从Stratum恢复）
 */
interface CheckpointState {
  checkpointId: string;  // Stratum Content Hash ID
  agentState?: AgentStateSnapshot;
  graphState?: GraphStateSnapshot;
  fileSnapshots?: FileSnapshot[];
  metadata: {
    author: string;
    message: string;
    createdAt: number;
  };
  ancestry: string[];  // 祖先checkpoint IDs
}

/**
 * Checkpoint查询条件
 */
interface CheckpointQuery {
  agentLoopId?: string;
  executionId?: string;
  timeRange?: [number, number];
  messageCount?: number;
  tags?: string[];
}

/**
 * 选择性恢复条件
 */
interface SelectiveRestoreOptions {
  sources?: string[];  // e.g., ["agent://", "file://src/**"]
  fields?: string[];   // 仅恢复特定字段 (agent层级)
  exclude?: string[];  // 排除某些字段
}
```

```rust
// Rust端数据模型（存储层）

/// Snapshot内容枚举
pub enum SnapshotContent {
  FileContent(Vec<u8>),
  JsonMetadata(serde_json::Value),
  Structured(Vec<u8>),
}

/// Snapshot存储单元
pub struct Snapshot {
  pub id: SnapshotId,                  // Content hash ID
  pub source: String,                   // "agent://", "graph://", "file://", etc
  pub content: SnapshotContent,
  pub content_type: ContentType,       // "file", "json", "structured"
  pub size: usize,
  pub compression: Option<Compression>,
  pub created_at: i64,
}

/// Checkpoint存储单元
pub struct Checkpoint {
  pub id: CheckpointId,                // Content hash ID
  pub parents: Vec<CheckpointId>,      // 支持多父节点
  pub baseline_snapshots: Vec<SnapshotId>,
  pub snapshot_sources: HashMap<SnapshotId, String>,  // snap_id -> source
  pub metadata: CheckpointMetadata,
  pub created_at: i64,
}

/// Branch表示
pub struct Branch {
  pub name: String,
  pub head: CheckpointId,              // 当前分支head
  pub created_at: i64,
  pub updated_at: i64,
}

/// Checkpoint DAG
pub struct CheckpointDag {
  pub nodes: HashSet<CheckpointId>,
  pub edges: HashMap<CheckpointId, Vec<CheckpointId>>,  // parent -> children
}
```

### 2.2 数据流示例

#### 场景1：Agent循环执行

```
Agent执行 → 状态变化 → CheckpointManager.createCheckpoint()
  ↓
  提取状态：
    - messages: Message[]
    - iterations: IterationRecord[]
    - variables: Record<string, any>
    - status: AgentLoopStatus
  ↓
  序列化为JSON快照：
    {
      "agentLoopId": "loop-1",
      "messages": [...],
      "iterations": [...],
      "variables": {...},
      "status": "RUNNING",
      "timestamp": 1718700000
    }
  ↓
  调用 StratumExecutor.createCheckpoint():
    POST /api/v1/checkpoint/transaction
    {
      "snapshots": [{
        "source": "agent://loop-1/iteration-5",
        "content": {...JSON above...}
      }],
      "message": "Agent iteration 5 completed",
      "author": "agent-loop-1"
    }
  ↓
  Stratum处理：
    1. 计算快照ID = hash("agent://loop-1/iteration-5" + content)
    2. 存储快照到SQLite
    3. 创建Checkpoint（references快照）
    4. 计算Checkpoint ID = hash(parents + baselines + metadata)
    5. 事务提交
  ↓
  返回checkpointId给Agent
```

#### 场景2：恢复到历史状态

```
Recovery request: restore(checkpointId)
  ↓
  StratumExecutor.restoreFull(checkpointId)
    GET /api/v1/checkpoint/{checkpointId}/restore
  ↓
  Stratum恢复过程：
    1. 查询Checkpoint及其所有快照
    2. 按source分类加载：
       - "agent://*" → AgentStateSnapshot JSON
       - "file://*" → FileSnapshot内容
    3. 返回RestoreResponse {
         checkpoint_info,
         snapshots: [...],
         ancestry: [...]
       }
  ↓
  CheckpointManager处理恢复：
    1. 解析AgentStateSnapshot JSON
    2. 重建AgentLoopEntity
      - messages = snapshot.messages
      - iterations = snapshot.iterations
      - variables = snapshot.variables
    3. 恢复文件（如需要）
    4. 返回恢复后的Agent状态
  ↓
  Agent继续执行
```

#### 场景3：选择性恢复（仅消息）

```
Recovery request: selectiveRestore(checkpointId, ["messages"])
  ↓
  StratumExecutor.restoreSelective(checkpointId, ["agent://"])
    GET /api/v1/checkpoint/{checkpointId}/restore?sources=agent://
  ↓
  Stratum过滤过程：
    1. 获取Checkpoint
    2. 过滤快照：仅保留source="agent://*"的
    3. 加载这些快照的内容
    4. 返回RestoreResponse
  ↓
  CheckpointManager进一步过滤：
    1. 解析AgentStateSnapshot
    2. 仅提取"messages"字段
    3. 合并到现有状态（保留其他字段）
  ↓
  返回 { messages: [...] }
```

---

## 三、集成点

### 3.1 Agent Loop集成

```typescript
// sdk/agent/execution/agent-executor.ts

export class AgentExecutor {
  private checkpointManager: CheckpointManager;
  
  async executeIteration(
    agentLoopId: string,
    iteration: IterationNumber
  ): Promise<void> {
    // 1. 执行迭代
    const result = await this.runIteration(...);
    
    // 2. 每个迭代后创建Checkpoint
    const snapshot: AgentStateSnapshot = {
      agentLoopId,
      messages: this.agent.messages,
      iterations: this.agent.iterations,
      variables: this.agent.variables,
      status: this.agent.status,
      timestamp: Date.now(),
    };
    
    // 3. 提交到Stratum
    const checkpointId = await this.checkpointManager.createAgentCheckpoint(
      snapshot,
      `Iteration ${iteration} completed`
    );
    
    logger.info('Checkpoint created', { checkpointId, iteration });
  }
  
  async restoreFromCheckpoint(
    agentLoopId: string,
    checkpointId: string
  ): Promise<void> {
    // 1. 从Stratum恢复
    const state = await this.checkpointManager.restoreAgentState(checkpointId);
    
    // 2. 重建Agent状态
    this.agent.messages = state.messages;
    this.agent.iterations = state.iterations;
    this.agent.variables = state.variables;
    this.agent.status = state.status;
    
    // 3. 继续执行
    logger.info('Agent restored', { checkpointId, messageCount: state.messages.length });
  }
}
```

### 3.2 Graph Executor集成

```typescript
// sdk/graph/execution/graph-executor.ts

export class GraphExecutor {
  private checkpointManager: CheckpointManager;
  
  async executeNode(nodeId: string): Promise<void> {
    // 1. 执行节点
    const result = await this.executeNode(nodeId);
    
    // 2. 节点完成后创建Checkpoint
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
    
    // 3. 提交到Stratum
    const checkpointId = await this.checkpointManager.createGraphCheckpoint(
      snapshot,
      `Node ${nodeId} executed`
    );
    
    logger.info('Graph checkpoint created', { checkpointId, nodeId });
  }
}
```

### 3.3 CheckpointManager 实现框架

```typescript
// sdk/checkpoint/checkpoint-manager.ts

export class CheckpointManager {
  constructor(
    private stratumExecutor: StratumExecutor,
    private logger: Logger
  ) {}
  
  /**
   * 创建Agent Checkpoint
   */
  async createAgentCheckpoint(
    snapshot: AgentStateSnapshot,
    message: string
  ): Promise<string> {
    // 1. 序列化快照
    const content = JSON.stringify(snapshot);
    
    // 2. 创建事务
    const request = {
      snapshots: [{
        source: `agent://${snapshot.agentLoopId}`,
        content,
        contentType: 'json'
      }],
      message,
      author: snapshot.agentLoopId,
    };
    
    // 3. 提交到Stratum
    const response = await this.stratumExecutor.createCheckpoint(request);
    return response.checkpointId;
  }
  
  /**
   * 创建Graph Checkpoint
   */
  async createGraphCheckpoint(
    snapshot: GraphStateSnapshot,
    message: string
  ): Promise<string> {
    const content = JSON.stringify(snapshot);
    
    const request = {
      snapshots: [{
        source: `graph://${snapshot.executionId}`,
        content,
        contentType: 'json'
      }],
      message,
      author: snapshot.executionId,
    };
    
    const response = await this.stratumExecutor.createCheckpoint(request);
    return response.checkpointId;
  }
  
  /**
   * 恢复Agent状态
   */
  async restoreAgentState(checkpointId: string): Promise<AgentStateSnapshot> {
    // 1. 调用Stratum恢复
    const response = await this.stratumExecutor.restoreFull(checkpointId);
    
    // 2. 解析快照内容
    const agentSnapshot = response.snapshots.find(s => 
      s.source.startsWith('agent://')
    );
    
    if (!agentSnapshot) {
      throw new Error(`No agent snapshot in checkpoint ${checkpointId}`);
    }
    
    // 3. 反序列化
    return JSON.parse(agentSnapshot.content) as AgentStateSnapshot;
  }
  
  /**
   * 选择性恢复：仅恢复消息
   */
  async restoreAgentMessages(checkpointId: string): Promise<Message[]> {
    const state = await this.restoreAgentState(checkpointId);
    return state.messages;
  }
  
  /**
   * 恢复Graph状态
   */
  async restoreGraphState(checkpointId: string): Promise<GraphStateSnapshot> {
    const response = await this.stratumExecutor.restoreFull(checkpointId);
    
    const graphSnapshot = response.snapshots.find(s =>
      s.source.startsWith('graph://')
    );
    
    if (!graphSnapshot) {
      throw new Error(`No graph snapshot in checkpoint ${checkpointId}`);
    }
    
    return JSON.parse(graphSnapshot.content) as GraphStateSnapshot;
  }
  
  /**
   * 列出Entity的所有Checkpoints
   */
  async listCheckpoints(entityId: string): Promise<CheckpointInfo[]> {
    // 查询Stratum中的checkpoint历史
    const response = await this.stratumExecutor.log({ count: 1000 });
    
    // 过滤属于该entity的checkpoints
    return response.checkpoints.filter(cp =>
      cp.snapshots.some(snap =>
        snap.source.includes(entityId)
      )
    );
  }
  
  /**
   * 时间旅行：获取特定时间点的状态
   */
  async getStateAtTime(
    entityId: string,
    timestamp: number
  ): Promise<AgentStateSnapshot | GraphStateSnapshot> {
    // 调用Stratum的时间查询
    const response = await this.stratumExecutor.restoreByTime(
      timestamp,
      `agent://${entityId}`  // or graph://${entityId}
    );
    
    const snapshot = response.snapshots[0];
    return JSON.parse(snapshot.content);
  }
  
  /**
   * 比较两个Checkpoint
   */
  async diffCheckpoints(
    fromId: string,
    toId: string
  ): Promise<CheckpointDiff> {
    return await this.stratumExecutor.diff(fromId, toId);
  }
}
```

---

## 四、关键设计决策

### 4.1 ID系统

```
【Snapshot ID】
  = hash(source + content)
  - 确定性：相同内容的快照 = 相同ID
  - 去重：自动去重相同的快照
  - 可溯源：ID反映内容

【Checkpoint ID】
  = hash(parents + baseline_snapshots + metadata)
  - 确定性：相同的变化历史 = 相同ID
  - 无冲突：分布式生成安全
  - 不含时间戳：支持离线生成
```

### 4.2 快照分类

```
【Agent快照】
  source: agent://{agentLoopId}/{iteration}
  content: JSON格式的Agent状态

【Graph快照】
  source: graph://{executionId}/{nodeId}
  content: JSON格式的Graph状态

【文件快照】
  source: file://{filePath}
  content: 文件原始内容

【系统快照】
  source: system://{identifier}
  content: 系统级信息（元数据等）
```

### 4.3 恢复策略

```
【完整恢复】
  - 返回所有相关快照
  - 允许调用者选择处理哪些
  - 兼容旧代码（可选字段）

【选择性恢复】
  - 在Stratum层过滤快照
  - 按source pattern筛选
  - 减少网络传输

【部分字段恢复】
  - 在TypeScript层额外过滤
  - 支持 {"messages": [...], "variables": {...}}
  - 用于合并场景
```

### 4.4 并发控制

```
【不使用锁】
  - Checkpoint是不可变的
  - 多个Agent可以并发写（不同的agentLoopId）
  - DAG支持并发提交

【冲突检测】
  - 基于parent检验
  - 如果parent不是当前head，需要merge
  - Stratum负责冲突检测

【事务隔离】
  - 单个Checkpoint提交是原子的
  - 多Snapshot在一个Checkpoint中是原子的
  - 不支持Checkpoint中间跨度的事务
```

---

## 五、流程规范

### 5.1 标准Agent执行流程

```
1. AgentLoop启动
   ↓
2. 初始化：创建初始Checkpoint
   snapshot = {agentLoopId, messages: [], iterations: [], variables: {}, status: INITIALIZING}
   checkpointId_init = await createAgentCheckpoint(snapshot)
   ↓
3. 循环迭代
   For each iteration:
     a) 执行迭代逻辑
     b) 生成新message
     c) 修改variables
     d) 更新status
     ↓
     e) 创建Checkpoint
        snapshot = {agentLoopId, messages: [...], iterations: [...], ...}
        checkpointId = await createAgentCheckpoint(snapshot)
        ↓
     f) 如果需要，推送checkpoint事件（用于UI/监控）
     ↓
     g) 继续下一迭代
   ↓
4. 完成
   status = COMPLETED
   最终Checkpoint已保存
```

### 5.2 恢复和继续流程

```
1. Agent崩溃或中断
   ↓
2. 查询最后的Checkpoint
   lastCp = listCheckpoints(agentLoopId).last()
   ↓
3. 恢复状态
   state = await restoreAgentState(lastCp.id)
   ↓
4. 重建Agent
   agentLoop = AgentLoopEntity.fromSnapshot(agentLoopId, state)
   ↓
5. 继续执行
   agentLoop.continueExecution()
   ↓
6. 正常迭代流程继续...
```

### 5.3 选择性恢复流程

```
场景：仅恢复消息历史，重置variables

1. 获取历史Checkpoint
   oldCp = await getCheckpointByTime(agentLoopId, timestamp)
   ↓
2. 选择性恢复
   oldState = await restoreAgentState(oldCp.id)
   messages = oldState.messages  // 保留
   // variables 丢弃
   ↓
3. 创建新的合成状态
   newState = {
     agentLoopId,
     messages,
     iterations: [],
     variables: {},  // 重置为空
     status: RESET
   }
   ↓
4. 创建Checkpoint（记录重置点）
   newCpId = await createAgentCheckpoint(newState, "Reset variables")
   ↓
5. 继续执行
   agentLoop.resume(newCpId)
```

---

## 六、错误和异常处理

### 6.1 Checkpoint操作异常

| 异常 | 原因 | 处理方式 |
|-----|------|---------|
| **CheckpointNotFound** | 指定ID的checkpoint不存在 | 列出可用的，提示用户 |
| **CorruptedData** | 快照数据损坏 | 记录日志，建议恢复到更早的checkpoint |
| **TransactionConflict** | Checkpoint提交冲突（parent不是head） | 自动merge或提示用户 |
| **SelectiveRestoreFailed** | 选择性过滤失败（快照不存在） | 降级到完整恢复或报错 |

### 6.2 网络和服务异常

| 异常 | 原因 | 处理方式 |
|-----|------|---------|
| **ServiceUnavailable** | Stratum服务不可用 | 重试、降级到本地缓存 |
| **NetworkTimeout** | 网络超时 | 重试、提示用户 |
| **InvalidResponse** | Stratum返回数据格式错误 | 报错，记录日志 |

---

## 七、性能特征

### 7.1 操作延迟

| 操作 | 数据量 | 预期延迟 | 瓶颈 |
|-----|------|--------|------|
| **createCheckpoint** | 100KB | <100ms | gRPC + SQLite write |
| **restoreFull** | 100KB | <100ms | SQLite read + gRPC |
| **restoreSelective** | 100KB (10%) | <50ms | Stratum过滤 |
| **listCheckpoints** | 1000个 | <50ms | 时间索引查询 |
| **diffCheckpoints** | 2个cp | <10ms | DAG遍历 |

### 7.2 存储容量

```
【假设】
- 平均Checkpoint大小：50KB
- Agent单个实例：1000个checkpoints
- 系统总实例：100个

【计算】
- 单实例：1000 × 50KB = 50MB
- 全系统：100 × 50MB = 5GB
- 压缩率：~70% → ~1.5GB

【超期清理】
- 默认：保留最近1000个checkpoints
- 配置化：可按时间或数量清理
```

### 7.3 优化方向

- 快照压缩（gzip/zstd）
- 增量存储（delta snapshots）
- 多层索引（time, source, entityId）
- 本地缓存（LRU热快照）

---

## 八、监控和可观测性

### 8.1 关键指标

```
【业务指标】
- checkpoints_created_total
- checkpoints_restored_total
- restoration_time_ms (histogram)
- checkpoint_size_bytes (histogram)

【系统指标】
- checkpoint_storage_bytes
- checkpoint_query_latency_ms
- transaction_conflicts_total
- stratum_rpc_errors_total

【告警阈值】
- Checkpoint creation failure rate > 1%
- Restoration time > 5s
- Stratum service unavailable > 30s
- Storage usage > 80% of quota
```

### 8.2 日志规范

```typescript
// Checkpoint操作日志
logger.info('Checkpoint created', {
  checkpointId,
  entityId,
  snapshotCount,
  dataSize,
  duration,
});

logger.info('Checkpoint restored', {
  checkpointId,
  entityId,
  snapshotCount,
  fields: ['messages', 'variables'],
  duration,
});

logger.error('Checkpoint operation failed', {
  operation: 'create',
  entityId,
  error,
  retryable: true,
});
```

---

## 九、版本化和演进

### 9.1 Checkpoint版本控制

```
【Snapshot版本】
version 1:  {"agentLoopId", "messages", "iterations", "variables", "status"}
version 2:  (未来) 可能增加新字段

【向后兼容】
- 新版本能读旧数据（可选字段）
- 旧版本不能读新数据（忽略未知字段）
- migration: 可选的数据升级流程
```

### 9.2 API版本化

```
HTTP API:  /api/v1/checkpoint/{id}
gRPC API:  service Stratum { ... }

【更新策略】
- Breaking changes: 新版本号（v2）
- 新功能: 可选参数或新endpoint
- 废弃: 6个月deprecation period
```

---

## 十、总结

| 维度 | 设计 |
|-----|------|
| **核心职责** | Stratum管理所有执行状态版本 |
| **数据流** | Application → CheckpointManager → Stratum |
| **Snapshot类型** | agent://, graph://, file://, system:// |
| **恢复能力** | 完整、选择性、按时间、按字段 |
| **并发模型** | 无锁，基于parent检验 |
| **存储** | SQLite + 时间/source索引 |
| **扩展点** | 快照压缩、增量存储、分支实验 |
| **监控** | 关键指标、日志、告警 |

---

## 附录：与现有系统的差异

| 方面 | 现有系统 | 新架构 |
|-----|--------|--------|
| **存储位置** | 多个地方（本地DB、缓存等） | 统一Stratum |
| **ID方式** | UUID（随机） | Content hash（确定性） |
| **恢复粒度** | 全量 | 全量、选择性、按字段 |
| **分支支持** | 无 | 有（Stratum原生） |
| **快照类型** | 仅执行状态 | 执行状态+文件+元数据 |
| **事务** | 无 | 有（多快照原子） |
| **查询** | 基于metadata | 基于source、时间、内容 |
| **性能** | 未优化 | 优化了索引和缓存 |
