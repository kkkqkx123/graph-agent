# Checkpoint 核心层设计文档

## 概述

Checkpoint模块提供Thread执行状态的快照和恢复能力，允许在工作流执行过程中保存关键状态，并在需要时恢复到指定状态点继续执行。

## 模块位置

```
sdk/core/execution/checkpoint/
├── checkpoint-manager.ts      # 检查点管理器核心实现
├── storage/
│   ├── storage-interface.ts   # 存储抽象接口
│   ├── memory-storage.ts      # 内存存储实现
│   └── file-storage.ts        # 文件存储实现（可选）
└── index.ts                   # 模块导出
```

## 核心组件设计

### 1. CheckpointManager

**位置**: `sdk/core/execution/checkpoint/checkpoint-manager.ts`

**职责**:
- 创建和管理检查点
- 从检查点恢复Thread状态
- 与ThreadStateManager协作保存/恢复状态
- 提供检查点查询和清理功能

**核心功能**:

#### createCheckpoint
- **输入**: threadId, 可选metadata（creator, description, tags, customFields）
- **处理逻辑**:
  1. 从ThreadStateManager获取Thread对象
  2. 提取ThreadStateSnapshot（status, currentNodeId, variables, input, output, nodeResults, executionHistory, errors）
  3. 生成唯一checkpointId和timestamp
  4. 创建Checkpoint对象
  5. 调用CheckpointStorage保存
  6. 返回checkpointId
- **输出**: checkpointId

#### restoreFromCheckpoint
- **输入**: checkpointId
- **处理逻辑**:
  1. 从CheckpointStorage加载Checkpoint
  2. 验证checkpoint完整性和兼容性
  3. 使用ThreadStateManager.deserializeThread恢复Thread状态
  4. 恢复variableValues和variables数组
  5. 重新附加变量管理方法（attachVariableMethods）
  6. 将恢复的Thread注册到ThreadStateManager
  7. 返回恢复的Thread对象
- **输出**: Thread对象

#### getCheckpoint
- **输入**: checkpointId
- **处理逻辑**: 从存储加载并返回Checkpoint
- **输出**: Checkpoint对象

#### listCheckpoints
- **输入**: 可选filter（threadId, workflowId, tags, timeRange）
- **处理逻辑**: 查询存储返回符合条件的检查点列表
- **输出**: Checkpoint数组

#### deleteCheckpoint
- **输入**: checkpointId
- **处理逻辑**: 从存储删除指定检查点
- **输出**: void

#### createPeriodicCheckpoint
- **输入**: threadId, interval（毫秒）, 可选metadata
- **处理逻辑**: 设置定时器，定期自动创建检查点
- **输出**: timerId（用于取消）

#### createNodeCheckpoint
- **输入**: threadId, nodeId, 可选metadata
- **处理逻辑**: 在节点执行前后创建检查点，记录节点级别状态
- **输出**: checkpointId

### 2. CheckpointStorage接口

**位置**: `sdk/core/execution/checkpoint/storage/storage-interface.ts`

**接口定义**:

```typescript
interface CheckpointStorage {
  // 保存检查点
  save(checkpoint: Checkpoint): Promise<void>;
  
  // 加载检查点
  load(checkpointId: string): Promise<Checkpoint | null>;
  
  // 查询检查点
  list(filter?: CheckpointFilter): Promise<Checkpoint[]>;
  
  // 删除检查点
  delete(checkpointId: string): Promise<void>;
  
  // 检查检查点是否存在
  exists(checkpointId: string): Promise<boolean>;
}

interface CheckpointFilter {
  threadId?: string;
  workflowId?: string;
  tags?: string[];
  startTime?: Timestamp;
  endTime?: Timestamp;
}
```

### 3. MemoryStorage实现

**位置**: `sdk/core/execution/checkpoint/storage/memory-storage.ts`

**职责**: 内存存储，用于开发和测试环境

**实现逻辑**:
- 内部使用Map存储checkpointId到Checkpoint的映射
- 提供简单的查询过滤功能
- 支持按tags、时间范围过滤

### 4. FileStorage实现（可选）

**位置**: `sdk/core/execution/checkpoint/storage/file-storage.ts`

**职责**: 文件系统存储，用于持久化保存

**实现逻辑**:
- 将Checkpoint序列化为JSON文件
- 按目录结构组织（如按workflowId、threadId分层）
- 提供文件读写和查询功能

## 与现有模块集成

### 1. 与ThreadStateManager集成

**集成点**: ThreadStateManager提供Thread序列化/反序列化能力

**协作流程**:

**创建检查点时**:
1. CheckpointManager调用ThreadStateManager.getThread(threadId)获取Thread
2. 从Thread提取ThreadStateSnapshot
3. 调用CheckpointStorage保存

**恢复检查点时**:
1. CheckpointManager从CheckpointStorage加载Checkpoint
2. 调用ThreadStateManager.deserializeThread(checkpoint.threadState)恢复Thread
3. ThreadStateManager自动附加变量管理方法
4. 恢复的Thread自动注册到ThreadStateManager内部Map

### 2. 与ThreadExecutor集成

**集成点**: ThreadExecutor在执行关键节点时触发检查点创建

**协作流程**:

**自动检查点创建**:
1. ThreadExecutor初始化时接收可选的CheckpointManager
2. 在executeLoop中，每执行N个节点后调用checkpointManager.createCheckpoint
3. 在pause、cancel操作时创建检查点
4. 在handleForkNode和handleJoinNode前后创建检查点

**从检查点恢复执行**:
1. ThreadExecutor提供executeFromCheckpoint方法
2. 调用checkpointManager.restoreFromCheckpoint(checkpointId)恢复Thread
3. 调用executeThread继续执行

**代码集成示例**:

```typescript
// ThreadExecutor构造函数
constructor(checkpointManager?: CheckpointManager) {
  this.stateManager = new ThreadStateManager();
  this.checkpointManager = checkpointManager;
  // ... 其他初始化
}

// executeLoop中定期创建检查点
private async executeLoop(thread: Thread, options: ThreadOptions): Promise<void> {
  // ... 初始化
  let lastCheckpointStep = 0;
  
  while (stepCount < maxSteps) {
    // ... 执行逻辑
    
    // 每10步创建检查点
    if (this.checkpointManager && stepCount - lastCheckpointStep >= 10) {
      await this.checkpointManager.createCheckpoint(thread.id, {
        description: `Auto checkpoint at step ${stepCount}`
      });
      lastCheckpointStep = stepCount;
    }
    
    stepCount++;
  }
}

// pause操作创建检查点
async pause(threadId: string): Promise<void> {
  // ... 暂停逻辑
  if (this.checkpointManager) {
    await this.checkpointManager.createCheckpoint(threadId, {
      description: 'Checkpoint before pause'
    });
  }
}
```

### 3. 与ThreadCoordinator集成

**集成点**: Fork/Join操作前后创建检查点

**协作流程**:

**Fork操作**:
1. 在handleForkNode中，调用threadCoordinator.fork前创建检查点
2. 记录父Thread状态
3. fork完成后创建子Thread检查点

**Join操作**:
1. 在handleJoinNode中，等待所有子Thread完成
2. 创建Join操作前的检查点
3. join完成后创建最终状态检查点

## 恢复检查点操作流程

### 完整恢复流程

```
用户调用 ThreadExecutor.executeFromCheckpoint(checkpointId)
    ↓
ThreadExecutor 调用 CheckpointManager.restoreFromCheckpoint(checkpointId)
    ↓
CheckpointManager 从 CheckpointStorage 加载 Checkpoint
    ↓
CheckpointManager 调用 ThreadStateManager.deserializeThread(checkpoint.threadState)
    ↓
ThreadStateManager 创建 Thread 对象并附加变量管理方法
    ↓
ThreadStateManager 将 Thread 注册到内部 Map
    ↓
CheckpointManager 返回恢复的 Thread 对象
    ↓
ThreadExecutor 调用 executeThread(thread) 继续执行
    ↓
ThreadExecutor 从 checkpoint.threadState.currentNodeId 继续节点执行
```

### 状态恢复细节

**变量状态恢复**:
- ThreadStateManager.deserializeThread恢复variableValues对象
- 同时恢复variables数组（包含类型、作用域、只读等元数据）
- attachVariableMethods重新附加变量管理方法

**执行历史恢复**:
- nodeResults数组恢复，包含所有已执行节点的结果
- executionHistory恢复，记录完整执行轨迹
- 执行从currentNodeId继续，不会重复已执行节点

**上下文数据恢复**:
- input/output数据恢复
- metadata恢复（包含creator、tags、parentThreadId等）
- errors数组恢复，保留历史错误信息

## 抽象存储接口集成

### 存储接口设计原则

1. **抽象性**: CheckpointStorage接口定义标准操作，不依赖具体实现
2. **可扩展性**: 支持MemoryStorage、FileStorage，未来可扩展为数据库存储
3. **异步性**: 所有存储操作返回Promise，支持异步IO
4. **过滤查询**: 支持按多维度过滤查询检查点

### 存储实现选择

**开发/测试环境**:
- 使用MemoryStorage
- 简单、快速、无需清理
- 适合单元测试和集成测试

**生产环境**:
- 使用FileStorage或自定义数据库存储
- 持久化保存，支持长期保留
- 需要定期清理过期检查点

### 存储配置示例

```typescript
// 内存存储（默认）
const checkpointManager = new CheckpointManager();

// 文件存储
const fileStorage = new FileStorage('./checkpoints');
const checkpointManager = new CheckpointManager(fileStorage);

// 自定义存储（如Redis、数据库）
const customStorage = new CustomStorage(redisClient);
const checkpointManager = new CheckpointManager(customStorage);
```

## 使用场景

### 场景1：长时间运行工作流的容错
- 每执行10个节点自动创建检查点
- 系统故障后从最近检查点恢复
- 避免从头重新执行

### 场景2：手动暂停和恢复
- 用户调用pause()暂停执行
- 自动创建检查点保存状态
- 用户调用resume()从检查点恢复

### 场景3：Fork/Join并行执行
- Fork前创建父Thread检查点
- 每个子Thread完成时创建检查点
- Join时从检查点恢复并合并结果

### 场景4：A/B测试和实验
- 在关键决策点创建检查点
- 从同一检查点创建多个分支Thread
- 比较不同执行路径的结果

## 实现优先级

1. **P0（核心功能）**:
   - CheckpointManager.createCheckpoint
   - CheckpointManager.restoreFromCheckpoint
   - MemoryStorage实现
   - ThreadExecutor集成（基本恢复功能）

2. **P1（增强功能）**:
   - CheckpointManager.listCheckpoints
   - CheckpointManager.deleteCheckpoint
   - FileStorage实现
   - 自动定期检查点

3. **P2（高级功能）**:
   - 节点级别检查点
   - 检查点压缩和清理
   - 增量检查点（只保存变化部分）
   - 检查点可视化和管理界面

## 注意事项

1. **性能影响**: 频繁创建检查点会影响执行性能，需要平衡检查点频率
2. **存储空间**: 检查点可能占用大量存储空间，需要定期清理过期检查点
3. **兼容性**: 恢复检查点时需要验证工作流版本兼容性
4. **线程安全**: 并发操作检查点需要考虑线程安全性
5. **数据一致性**: 确保检查点创建时Thread状态的一致性

## 总结

Checkpoint模块通过提供状态快照和恢复能力，显著增强了SDK的容错性和灵活性。通过与ThreadStateManager和ThreadExecutor的紧密集成，实现了无缝的检查点创建和恢复流程。抽象存储接口设计保证了存储后端的可扩展性，支持从内存到文件系统再到数据库的平滑升级。