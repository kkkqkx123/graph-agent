# Core/Checkpoint模块需求分析与设计

## 需求分析

### 核心需求
1. 提供检查点创建功能
2. 提供检查点恢复功能
3. 支持Thread状态快照
4. 支持断点续传

### 功能需求
1. 检查点创建：从Thread创建检查点
2. 检查点恢复：从检查点恢复Thread
3. 状态快照：捕获Thread的完整状态
4. 序列化支持：检查点可序列化和反序列化

### 非功能需求
1. 检查点轻量级
2. 创建和恢复快速
3. 状态一致性
4. 易于使用

## 设计说明

### 模块结构

```
checkpoint/
├── creation.ts    # 检查点创建
└── restore.ts     # 检查点恢复
```

### 核心组件

#### CheckpointCreator
检查点创建器，负责从Thread创建检查点。

**职责**：
- 从Thread创建检查点
- 捕获Thread的完整状态
- 生成检查点元数据
- 触发CHECKPOINT_CREATED事件

**核心方法**：
- createCheckpoint(thread: Thread, metadata?: CheckpointMetadata): Checkpoint
- captureThreadState(thread: Thread): ThreadStateSnapshot
- generateCheckpointMetadata(thread: Thread, metadata?: CheckpointMetadata): CheckpointMetadata

**创建流程**：
1. 捕获Thread的完整状态
2. 生成检查点ID
3. 创建检查点元数据
4. 组装Checkpoint对象
5. 触发CHECKPOINT_CREATED事件
6. 返回Checkpoint

**设计说明**：
- CheckpointCreator是检查点创建的唯一入口
- 捕获Thread的所有动态状态
- 不包含静态的workflow定义（通过workflowId引用）
- 检查点创建后由应用层负责持久化

#### CheckpointRestorer
检查点恢复器，负责从检查点恢复Thread。

**职责**：
- 从检查点恢复Thread
- 恢复Thread的完整状态
- 验证检查点有效性
- 触发THREAD_RESUMED事件

**核心方法**：
- restoreThread(checkpoint: Checkpoint): Thread
- restoreThreadState(thread: Thread, snapshot: ThreadStateSnapshot): void
- validateCheckpoint(checkpoint: Checkpoint): boolean

**恢复流程**：
1. 验证检查点有效性
2. 创建新的Thread实例
3. 从检查点恢复Thread状态
4. 设置Thread状态为PAUSED
5. 触发THREAD_RESUMED事件
6. 返回恢复的Thread

**设计说明**：
- CheckpointRestorer是检查点恢复的唯一入口
- 创建新的Thread实例，不修改原Thread
- 恢复Thread的所有动态状态
- 恢复后Thread可以继续执行

### 状态快照

#### ThreadStateSnapshot捕获
ThreadStateSnapshot包含Thread的所有动态状态：

1. **基本信息**：
   - status: Thread状态
   - currentNodeId: 当前节点ID

2. **变量信息**：
   - variables: 变量数组

3. **输入输出**：
   - input: 输入数据
   - output: 输出数据

4. **执行结果**：
   - nodeResults: 节点执行结果映射

5. **执行历史**：
   - executionHistory: 执行历史记录

6. **错误信息**：
   - errors: 错误信息数组

#### 不包含的内容
ThreadStateSnapshot不包含以下内容：
- ❌ 静态的workflow定义（通过workflowId引用）
- ❌ 节点和边的定义（通过workflowId引用）
- ❌ 工作流配置（通过workflowId引用）

### 检查点元数据

#### CheckpointMetadata
检查点元数据包含以下信息：

1. **创建者信息**：
   - creator: 创建者

2. **描述信息**：
   - description: 检查点描述

3. **标签信息**：
   - tags: 标签数组

4. **自定义字段**：
   - customFields: 自定义字段对象

### 检查点创建时机

#### 手动创建
用户主动创建检查点：
```typescript
const checkpoint = checkpointCreator.createCheckpoint(thread, {
  creator: 'user',
  description: 'Manual checkpoint'
});
```

#### 自动创建
在关键节点自动创建检查点：
- FORK节点执行前
- JOIN节点执行前
- 用户交互节点执行前

#### 定时创建
按时间间隔自动创建检查点：
- 每隔N步创建一次
- 每隔N秒创建一次

### 检查点恢复流程

#### 恢复步骤
1. 从持久化存储加载Checkpoint
2. 验证Checkpoint有效性
3. 调用CheckpointRestorer恢复Thread
4. 设置Thread状态为RUNNING
5. 继续执行Thread

#### 恢复后执行
恢复后的Thread从当前节点继续执行：
- 如果当前节点已完成，执行下一个节点
- 如果当前节点未完成，重新执行当前节点

### 设计原则

1. **轻量级**：只包含创建和恢复所需的信息
2. **状态完整**：捕获Thread的完整状态
3. **可序列化**：支持序列化和反序列化
4. **应用层持久化**：持久化由应用层负责
5. **一致性**：确保恢复后的状态与创建时一致

### 与其他模块的集成

#### 与State模块的集成
- CheckpointCreator从ThreadStateManager获取Thread状态
- CheckpointRestorer将恢复的状态传递给ThreadStateManager

#### 与Execution模块的集成
- Execution模块在关键节点调用CheckpointCreator创建检查点
- Execution模块支持从检查点恢复Thread继续执行

#### WithEvents模块的集成
- 检查点创建时触发CHECKPOINT_CREATED事件
- 检查点恢复时触发THREAD_RESUMED事件

### 依赖关系

- 依赖types层的Checkpoint、ThreadStateSnapshot等类型
- 依赖types层的Thread类型
- 依赖core/state模块
- 被core/execution模块引用
- 被api/sdk模块引用

### 不包含的功能

以下功能不在checkpoint模块中实现：
- ❌ 检查点的持久化（由应用层负责）
- ❌ 检查点的查询（由应用层负责）
- ❌ 检查点的清理（由应用层负责）
- ❌ 检查点的备份（由应用层负责）
- ❌ 检查点的分析（由应用层负责）
- ❌ 检查点的管理（由应用层负责）

### 使用示例

```typescript
// 1. 创建检查点创建器和恢复器
const checkpointCreator = new CheckpointCreator();
const checkpointRestorer = new CheckpointRestorer();

// 2. 创建检查点
const checkpoint = checkpointCreator.createCheckpoint(thread, {
  creator: 'user',
  description: 'Checkpoint before fork',
  tags: ['before-fork']
});

// 3. 持久化检查点（由应用层负责）
// await saveCheckpoint(checkpoint);

// 4. 从持久化存储加载检查点（由应用层负责）
// const loadedCheckpoint = await loadCheckpoint(checkpointId);

// 5. 恢复Thread
const restoredThread = checkpointRestorer.restoreThread(loadedCheckpoint);

// 6. 继续执行
const result = await workflowExecutor.executeThread(restoredThread);
```

### 注意事项

1. **检查点大小**：检查点应该尽量轻量级，避免包含不必要的信息
2. **状态一致性**：确保恢复后的状态与创建时完全一致
3. **版本兼容**：检查点应该支持版本迁移
4. **错误处理**：检查点恢复失败时提供清晰的错误信息
5. **性能优化**：检查点创建和恢复应该快速高效
6. **应用层职责**：检查点的持久化、查询、清理等由应用层负责

### 检查点最佳实践

1. **创建时机**：
   - 在关键节点前创建检查点
   - 在长时间操作前创建检查点
   - 在用户交互前创建检查点

2. **元数据管理**：
   - 提供清晰的描述信息
   - 使用标签分类检查点
   - 记录创建者和创建时间

3. **清理策略**：
   - 定期清理过期的检查点
   - 保留重要的检查点
   - 避免检查点数量过多

4. **恢复验证**：
   - 恢复前验证检查点有效性
   - 恢复后验证Thread状态
   - 处理恢复失败的情况