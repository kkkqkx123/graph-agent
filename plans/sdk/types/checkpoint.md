# Checkpoint类型需求分析与设计

## 需求分析

### 核心需求
1. 定义检查点的结构和内容
2. 支持检查点创建和恢复
3. 支持Thread状态快照
4. 支持断点续传

### 功能需求
1. 检查点包含Thread的完整状态
2. 检查点支持序列化和反序列化
3. 检查点用于执行恢复
4. 检查点包含时间戳和元数据

### 非功能需求
1. 检查点可序列化
2. 检查点可持久化（由应用层负责）
3. 检查点轻量级设计

## 设计说明

### 核心类型

#### Checkpoint
检查点类型。

**属性**：
- id: 检查点唯一标识符
- threadId: 关联的线程ID
- workflowId: 关联的工作流ID
- timestamp: 创建时间戳
- threadState: 线程状态快照
- metadata: 检查点元数据

**设计说明**：
- Checkpoint是Thread状态的快照
- 包含Thread的完整状态信息
- 可序列化，支持持久化
- 用于执行恢复

#### ThreadStateSnapshot
线程状态快照类型。

**属性**：
- status: 线程状态
- currentNodeId: 当前节点ID
- variables: 变量数组
- input: 输入数据
- output: 输出数据
- nodeResults: 节点执行结果映射
- executionHistory: 执行历史记录
- errors: 错误信息数组

**设计说明**：
- ThreadStateSnapshot是Thread状态的完整快照
- 包含所有执行相关的动态信息
- 不包含静态的workflow定义（通过workflowId引用）

#### CheckpointMetadata
检查点元数据类型。

**属性**：
- creator: 创建者
- description: 检查点描述
- tags: 标签数组
- customFields: 自定义字段对象

### 设计原则

1. **轻量级**：只包含创建和恢复所需的信息
2. **状态快照**：完整的Thread状态快照
3. **可序列化**：支持序列化和反序列化
4. **应用层持久化**：持久化由应用层负责

### 与Thread的集成

#### 检查点创建时机
1. **手动创建**：用户主动创建检查点
2. **自动创建**：在关键节点自动创建（如Fork前）
3. **定时创建**：按时间间隔自动创建

#### 检查点恢复流程
1. 从持久化存储加载Checkpoint
2. 从Checkpoint恢复ThreadStateSnapshot
3. 创建新的Thread实例
4. 从恢复的状态继续执行

#### 职责划分
- **Thread**: 执行实例，包含动态状态
- **Checkpoint**: Thread状态快照，用于恢复
- **应用层**: 负责Checkpoint的持久化、查询、清理等

### 不包含的功能

以下功能由应用层负责，不在SDK中实现：
- ❌ 检查点查询
- ❌ 检查点清理
- ❌ 检查点备份
- ❌ 检查点分析
- ❌ 检查点管理（这里指的是额外的操作，不是指检查点创建）

### 依赖关系

- 依赖common类型定义基础类型
- 依赖thread类型（ThreadStateSnapshot）
- 依赖workflow类型（通过workflowId）
- 被core/checkpoint模块引用
- 被events类型引用（CHECKPOINT_CREATED事件）

### 使用示例

```typescript
// 1. 创建检查点
const checkpoint: Checkpoint = {
  id: 'checkpoint-1',
  threadId: 'thread-1',
  workflowId: 'workflow-1',
  timestamp: Date.now(),
  threadState: {
    status: ThreadStatus.RUNNING,
    currentNodeId: 'node-2',
    variables: [...],
    input: {...},
    output: {...},
    nodeResults: {...},
    executionHistory: [...],
    errors: []
  },
  metadata: {
    creator: 'user',
    description: 'Checkpoint before fork'
  }
};

// 2. 恢复线程
const restoredThread = Thread.fromCheckpoint(checkpoint);

// 3. 继续执行
await executeThread(restoredThread);