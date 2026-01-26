# Fork/Join操作记录机制设计（简化版）

## 设计原则
- 保持ThreadMetadata最小化，只记录必要的父子关系
- 策略和执行结果由各自Thread维护
- 通过Thread ID直接访问，避免额外字段
- 符合"通过ID关联，而非对象引用"的设计原则

## 核心设计

### 1. ThreadMetadata简化

只保留两个字段：
```typescript
interface ThreadMetadata {
  parentThreadId?: string      // 父进程ID（子进程维护）
  childThreadIds?: string[]    // 子进程ID数组（父进程维护）
}
```

### 2. Fork操作记录

**父进程视角：**
- 在metadata.childThreadIds中记录所有子进程ID
- 不记录forkId、forkStrategy等额外信息

**子进程视角：**
- 在metadata.parentThreadId中记录父进程ID
- 不记录forkId等额外信息

**操作流程：**
1. ThreadCoordinator.fork()创建子进程
2. 为每个子进程设置parentThreadId
3. 将子进程ID数组记录到父进程的childThreadIds
4. 触发THREAD_FORKED事件（包含父子ID信息）

### 3. Join操作记录

**父进程视角：**
- 通过childThreadIds获取所有子进程ID
- 查询各子进程状态和结果（通过ThreadStateManager）
- 根据策略合并结果到父进程output
- 触发THREAD_JOINED事件

**子进程视角：**
- 无变化，继续保留parentThreadId
- 执行结果存储在自身output中

**操作流程：**
1. ThreadCoordinator.join()接收父进程ID
2. 从父进程metadata获取childThreadIds
3. 等待所有子进程完成（通过查询子进程状态）
4. 收集子进程结果（通过子进程ID访问）
5. 合并结果到父进程

### 4. 查询机制

**查询子进程：**
```typescript
// 给定父进程ID，获取所有子进程
const parentThread = threadStateManager.getThread(parentId)
const childThreads = parentThread.metadata.childThreadIds?.map(id => 
  threadStateManager.getThread(id)
)
```

**查询父进程：**
```typescript
// 给定子进程ID，获取父进程
const childThread = threadStateManager.getThread(childId)
const parentThread = threadStateManager.getThread(
  childThread.metadata.parentThreadId
)
```

**查询Fork/Join历史：**
```typescript
// 通过执行历史查询Fork/Join节点
const history = thread.executionHistory
const forkNodes = history.filter(h => h.nodeType === 'FORK')
const joinNodes = history.filter(h => h.nodeType === 'JOIN')
```

### 5. 与ThreadExecutor协作

ThreadExecutor在节点执行时：
- handleForkNode()：调用ThreadCoordinator.fork()，记录子进程ID
- handleJoinNode()：调用ThreadCoordinator.join()，传入父进程ID
- 节点执行历史中记录节点类型（FORK/JOIN）

ThreadCoordinator：
- fork()：创建子进程，维护父子ID关系
- join()：接收父进程ID，通过ID查询子进程信息

ThreadStateManager：
- 提供通过ID查询Thread的接口
- 管理Thread的序列化和反序列化

## 优势

1. **结构简单**：只维护parentThreadId和childThreadIds
2. **查询灵活**：通过ID可以随时访问任意Thread
3. **符合设计原则**：通过ID关联，避免对象引用
4. **易于维护**：减少元数据字段，降低复杂度
5. **性能良好**：直接通过Map查询，无需额外映射

## 事件记录

THREAD_FORKED事件：
```typescript
{
  type: 'THREAD_FORKED',
  parentThreadId: string,
  childThreadIds: string[],
  timestamp: number
}
```

THREAD_JOINED事件：
```typescript
{
  type: 'THREAD_JOINED',
  parentThreadId: string,
  childThreadIds: string[],
  timestamp: number
}
```

事件已包含足够信息用于追踪Fork/Join操作，无需在ThreadMetadata中重复存储。