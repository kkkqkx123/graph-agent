# 任务队列 + 线程池架构设计文档

## 1. 总体架构概述

### 1.1 设计目标

通过引入任务队列和线程池机制，实现triggered子工作流的真正异步执行，解决以下核心问题：

1. **异步执行支持** - 实现`waitForCompletion: false`配置的实际功能
2. **并发控制** - 限制并发子工作流数量，防止资源耗尽
3. **资源管理** - 统一管理线程生命周期，避免内存泄漏
4. **超时和取消** - 支持任务超时中断和主动取消
5. **状态追踪** - 完整的任务生命周期状态管理
6. **线程关系管理** - 统一管理父子线程关系

### 1.2 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                     Handler Layer                            │
│  executeTriggeredSubgraphHandler (触发器处理函数)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Manager Layer                              │
│  TriggeredSubworkflowManager (子工作流管理器)                 │
│  - TaskQueue (任务队列)                                       │
│  - ThreadPool (线程池)                                        │
│  - ThreadRelationshipManager (线程关系管理器)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Worker Layer                               │
│  WorkerThread (工作线程)                                      │
│  - TaskExecutor (任务执行器)                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Execution Layer                            │
│  ThreadExecutor (线程执行器)                                  │
│  ThreadBuilder (线程构建器)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 目录结构设计

### 2.1 新增文件结构

```
sdk/core/execution/
├── managers/
│   ├── triggered-subworkflow-manager.ts          [修改] - 重构为使用任务队列
│   ├── execution-state-manager.ts                [保持] - 现有状态管理器
│   ├── task-queue-manager.ts                     [新增] - 任务队列管理器
│   ├── thread-pool-manager.ts                    [新增] - 线程池管理器
│   ├── thread-relationship-manager.ts            [新增] - 线程关系管理器
│   └── task-registry.ts                          [新增] - 任务注册表
├── workers/
│   ├── worker-thread.ts                          [新增] - 工作线程
│   ├── task-executor.ts                          [新增] - 任务执行器
│   └── index.ts                                  [新增] - 导出接口
├── handlers/
│   └── trigger-handlers/
│       └── execute-triggered-subgraph-handler.ts [修改] - 适配新的返回类型
├── types/
│   └── task-queue.types.ts                       [新增] - 任务队列相关类型定义
└── utils/
    └── task-utils.ts                             [新增] - 任务相关工具函数
```

### 2.2 文件分类说明

| 目录 | 用途 | 实现方式 |
|------|------|---------|
| `managers/` | 有状态管理器，管理特定领域的状态和生命周期 | 有状态多实例 |
| `workers/` | 工作线程和任务执行器 | 有状态多实例 |
| `handlers/` | 触发器处理函数 | 纯函数导出 |
| `types/` | 类型定义 | 无状态，纯类型导出 |
| `utils/` | 工具函数 | 无状态，纯函数导出 |

---

## 3. 核心组件设计

### 3.1 TaskQueueManager（任务队列管理器）

#### 3.1.1 文件信息

- **文件路径**: `sdk/core/execution/managers/task-queue-manager.ts`
- **实现方式**: 有状态多实例
- **生命周期**: 由`TriggeredSubworkflowManager`持有和管理
- **依赖关系**:
  - 依赖: `ThreadPoolManager`, `EventManager`, `TaskRegistry`
  - 被依赖: `TriggeredSubworkflowManager`

#### 3.1.2 职责描述

**核心职责**:
1. 管理待执行任务的队列
2. 协调任务分配给线程池
3. 处理同步和异步任务提交
4. 管理任务状态转换
5. 触发任务生命周期事件

**业务逻辑职责**:
- 接收任务提交请求（同步/异步）
- 维护任务队列（FIFO）
- 从线程池获取可用工作线程
- 将任务分配给工作线程
- 监听任务执行结果
- 更新任务状态
- 触发相应的事件通知

**与上下游模块集成**:
- **上游**: `TriggeredSubworkflowManager`提交任务
- **下游**: `ThreadPoolManager`获取工作线程，`WorkerThread`执行任务
- **事件**: 通过`EventManager`触发任务状态变化事件

#### 3.1.3 状态管理

**内部状态**:
- `taskQueue`: 待执行任务队列（数组）
- `runningTasks`: 正在执行的任务映射（Map<taskId, Promise>）
- `maxQueueSize`: 最大队列长度限制
- `queueStats`: 队列统计信息

**状态转换**:
```
QUEUED → RUNNING → COMPLETED
                → FAILED
                → CANCELLED
                → TIMEOUT
```

#### 3.1.4 主要功能调用链

**同步任务提交**:
```
TriggeredSubworkflowManager.executeTriggeredSubgraph()
  ↓
TaskQueueManager.submitSync(task)
  ↓
TaskQueueManager.enqueueTask(task, resolve, reject)
  ↓
TaskQueueManager.processQueue()
  ↓
ThreadPoolManager.allocateWorker()
  ↓
WorkerThread.execute(task)
  ↓
TaskQueueManager.handleTaskCompleted(taskId, result)
  ↓
resolve(result) 返回给调用者
```

**异步任务提交**:
```
TriggeredSubworkflowManager.executeTriggeredSubgraph()
  ↓
TaskQueueManager.submitAsync(task)
  ↓
TaskQueueManager.enqueueTask(task, resolve, reject)
  ↓
TaskQueueManager.processQueue()
  ↓
ThreadPoolManager.allocateWorker()
  ↓
WorkerThread.execute(task)
  ↓
TaskQueueManager.handleTaskCompleted(taskId, result)
  ↓
EventManager.emit(TRIGGERED_SUBGRAPH_COMPLETED)
  ↓
TaskRegistry.updateTaskStatus(taskId, COMPLETED)
```

#### 3.1.5 关键方法说明

**submitSync(task)**:
- 功能: 提交同步任务，等待完成
- 返回: Promise<ExecutedSubgraphResult>
- 逻辑: 创建Promise，加入队列，等待resolve/reject

**submitAsync(task)**:
- 功能: 提交异步任务，立即返回
- 返回: Promise<string> (taskId)
- 逻辑: 创建Promise，加入队列，立即返回taskId

**processQueue()**:
- 功能: 处理队列中的任务
- 逻辑: 循环从队列取出任务，分配给线程池，直到队列为空或无可用线程

**handleTaskCompleted(taskId, result)**:
- 功能: 处理任务完成
- 逻辑: 更新任务状态，触发完成事件，resolve Promise

**handleTaskFailed(taskId, error)**:
- 功能: 处理任务失败
- 逻辑: 更新任务状态，触发失败事件，reject Promise

---

### 3.2 ThreadPoolManager（线程池管理器）

#### 3.2.1 文件信息

- **文件路径**: `sdk/core/execution/managers/thread-pool-manager.ts`
- **实现方式**: 有状态多实例
- **生命周期**: 由`TriggeredSubworkflowManager`持有和管理
- **依赖关系**:
  - 依赖: `WorkerThread`, `EventManager`
  - 被依赖: `TaskQueueManager`

#### 3.2.2 职责描述

**核心职责**:
1. 管理工作线程的创建和销毁
2. 维护空闲和忙碌线程池
3. 实现线程的动态扩缩容
4. 提供线程分配和释放接口
5. 监控线程池状态

**业务逻辑职责**:
- 初始化最小数量的工作线程
- 根据负载动态创建新线程（不超过最大值）
- 回收空闲超时的线程
- 分配空闲线程给任务
- 回收完成任务后的线程
- 提供线程池统计信息

**与上下游模块集成**:
- **上游**: `TaskQueueManager`请求分配线程
- **下游**: `WorkerThread`执行任务
- **管理**: 创建、持有、销毁`WorkerThread`实例

#### 3.2.3 状态管理

**内部状态**:
- `workers`: 所有工作线程数组
- `idleWorkers`: 空闲工作线程数组
- `busyWorkers`: 忙碌工作线程数组
- `minWorkers`: 最小线程数
- `maxWorkers`: 最大线程数
- `idleTimeout`: 空闲超时时间
- `isShuttingDown`: 是否正在关闭

**线程状态**:
```
IDLE → BUSY → IDLE
         ↓
       SHUTTING_DOWN
```

#### 3.2.4 主要功能调用链

**分配工作线程**:
```
TaskQueueManager.processQueue()
  ↓
ThreadPoolManager.allocateWorker()
  ↓
ThreadPoolManager.checkIdleWorkers()
  ↓ (有空闲线程)
ThreadPoolManager.allocateIdleWorker()
  ↓
WorkerThread.setStatus(BUSY)
  ↓
返回 WorkerThread
```

**创建新线程**:
```
ThreadPoolManager.allocateWorker()
  ↓ (无空闲线程且未达到最大值)
ThreadPoolManager.createNewWorker()
  ↓
WorkerThread构造函数
  ↓
ThreadPoolManager.workers.push(worker)
  ↓
WorkerThread.setStatus(BUSY)
  ↓
返回 WorkerThread
```

**释放工作线程**:
```
WorkerThread.execute() 完成
  ↓
ThreadPoolManager.releaseWorker(worker)
  ↓
WorkerThread.setStatus(IDLE)
  ↓
ThreadPoolManager.idleWorkers.push(worker)
  ↓
ThreadPoolManager.scheduleIdleCheck()
  ↓ (空闲超时)
ThreadPoolManager.destroyWorker(worker)
```

#### 3.2.5 关键方法说明

**allocateWorker()**:
- 功能: 分配一个可用的工作线程
- 返回: Promise<WorkerThread | null>
- 逻辑: 优先使用空闲线程，无空闲则创建新线程，达到上限则等待

**releaseWorker(worker)**:
- 功能: 释放工作线程回线程池
- 逻辑: 标记为空闲，加入空闲队列，设置空闲超时检查

**createNewWorker()**:
- 功能: 创建新的工作线程
- 逻辑: 实例化WorkerThread，配置回调，加入workers数组

**destroyWorker(worker)**:
- 功能: 销毁工作线程
- 逻辑: 调用worker.shutdown()，从数组中移除

**getPoolStats()**:
- 功能: 获取线程池统计信息
- 返回: PoolStats对象

---

### 3.3 WorkerThread（工作线程）

#### 3.3.1 文件信息

- **文件路径**: `sdk/core/execution/workers/worker-thread.ts`
- **实现方式**: 有状态多实例
- **生命周期**: 由`ThreadPoolManager`创建和管理
- **依赖关系**:
  - 依赖: `TaskExecutor`, `EventManager`
  - 被依赖: `ThreadPoolManager`

#### 3.3.2 职责描述

**核心职责**:
1. 执行单个任务
2. 管理任务执行状态
3. 实现任务超时控制
4. 支持任务取消
5. 报告执行结果

**业务逻辑职责**:
- 接收任务分配
- 创建任务执行上下文
- 调用TaskExecutor执行任务
- 监控任务执行时间
- 处理超时和取消
- 返回执行结果或错误
- 清理执行资源

**与上下游模块集成**:
- **上游**: `ThreadPoolManager`分配任务
- **下游**: `TaskExecutor`执行具体任务
- **回调**: 通过回调函数通知`ThreadPoolManager`执行完成

#### 3.3.3 状态管理

**内部状态**:
- `status`: 线程状态（IDLE, BUSY, SHUTTING_DOWN）
- `currentTask`: 当前执行的任务
- `abortController`: 用于取消任务的AbortController
- `timeout`: 任务超时时间
- `onIdle`: 空闲回调函数
- `onComplete`: 完成回调函数

#### 3.3.4 主要功能调用链

**执行任务**:
```
ThreadPoolManager.allocateWorker()
  ↓
WorkerThread.execute(task)
  ↓
WorkerThread.setStatus(BUSY)
  ↓
WorkerThread.createAbortController()
  ↓
WorkerThread.executeWithTimeout(task)
  ↓
TaskExecutor.execute(task)
  ↓
WorkerThread.handleResult(result)
  ↓
WorkerThread.setStatus(IDLE)
  ↓
onComplete(result)
```

**任务超时**:
```
WorkerThread.executeWithTimeout(task)
  ↓
setTimeout(timeout)
  ↓ (超时触发)
WorkerThread.abortController.abort()
  ↓
TaskExecutor被中断
  ↓
WorkerThread.handleTimeout()
  ↓
onComplete(error)
```

**取消任务**:
```
ThreadPoolManager.cancelTask(taskId)
  ↓
WorkerThread.cancel()
  ↓
WorkerThread.abortController.abort()
  ↓
TaskExecutor被中断
  ↓
WorkerThread.handleCancel()
  ↓
onComplete(error)
```

#### 3.3.5 关键方法说明

**execute(task)**:
- 功能: 执行任务
- 返回: Promise<ExecutedSubgraphResult>
- 逻辑: 设置状态，创建AbortController，执行任务，处理结果

**executeWithTimeout(task)**:
- 功能: 带超时执行任务
- 逻辑: 使用Promise.race()实现超时控制

**cancel()**:
- 功能: 取消当前任务
- 返回: boolean
- 逻辑: 调用abortController.abort()

**setStatus(status)**:
- 功能: 设置线程状态
- 逻辑: 更新内部状态，触发状态变化事件

**shutdown()**:
- 功能: 关闭工作线程
- 逻辑: 取消当前任务，清理资源

---

### 3.4 TaskExecutor（任务执行器）

#### 3.4.1 文件信息

- **文件路径**: `sdk/core/execution/workers/task-executor.ts`
- **实现方式**: 有状态多实例
- **生命周期**: 由`WorkerThread`创建和管理
- **依赖关系**:
  - 依赖: `ThreadBuilder`, `ThreadExecutor`, `EventManager`
  - 被依赖: `WorkerThread`

#### 3.4.2 职责描述

**核心职责**:
1. 执行具体的子工作流任务
2. 创建子工作流上下文
3. 调用ThreadExecutor执行
4. 管理执行过程中的事件
5. 处理执行结果

**业务逻辑职责**:
- 解析任务参数
- 创建子工作流ThreadContext
- 注册子线程到ThreadRegistry
- 建立父子线程关系
- 调用ThreadExecutor执行
- 触发执行事件
- 返回执行结果
- 清理线程关系

**与上下游模块集成**:
- **上游**: `WorkerThread`调用执行
- **下游**: `ThreadBuilder`创建上下文，`ThreadExecutor`执行
- **管理**: 管理`ThreadContext`的生命周期

#### 3.4.3 状态管理

**内部状态**:
- `contextFactory`: 子工作流上下文工厂
- `executor`: 线程执行器
- `eventManager`: 事件管理器
- `threadRegistry`: 线程注册表
- `relationshipManager`: 线程关系管理器

#### 3.4.4 主要功能调用链

**执行任务**:
```
WorkerThread.execute(task)
  ↓
TaskExecutor.execute(task)
  ↓
TaskExecutor.createSubgraphContext(task)
  ↓
ThreadBuilder.buildSubgraphContext()
  ↓
TaskExecutor.registerChildThread(parentId, childId)
  ↓
ThreadRegistry.register(childContext)
  ↓
ThreadRelationshipManager.registerRelationship(parentId, childId)
  ↓
TaskExecutor.executeThread(childContext)
  ↓
ThreadExecutor.executeThread()
  ↓
TaskExecutor.handleResult(result)
  ↓
TaskExecutor.unregisterChildThread(childId)
  ↓
ThreadRelationshipManager.unregisterRelationship(childId)
  ↓
返回 result
```

#### 3.4.5 关键方法说明

**execute(task)**:
- 功能: 执行任务
- 返回: Promise<ExecutedSubgraphResult>
- 逻辑: 创建上下文，注册线程，执行任务，清理关系

**createSubgraphContext(task)**:
- 功能: 创建子工作流上下文
- 逻辑: 调用ThreadBuilder创建ThreadContext

**registerChildThread(parentId, childId)**:
- 功能: 注册子线程
- 逻辑: 注册到ThreadRegistry，建立父子关系

**executeThread(context)**:
- 功能: 执行线程
- 逻辑: 调用ThreadExecutor.executeThread()

**unregisterChildThread(childId)**:
- 功能: 注销子线程
- 逻辑: 清理父子关系

---

### 3.5 ThreadRelationshipManager（线程关系管理器）

#### 3.5.1 文件信息

- **文件路径**: `sdk/core/execution/managers/thread-relationship-manager.ts`
- **实现方式**: 有状态全局单例（通过SingletonRegistry管理）
- **生命周期**: 由SingletonRegistry管理，全局唯一
- **依赖关系**:
  - 依赖: 无
  - 被依赖: `TaskExecutor`, `ThreadContext`

#### 3.5.2 职责描述

**核心职责**:
1. 统一管理父子线程关系
2. 维护线程关系映射
3. 追踪线程状态
4. 提供关系查询接口
5. 自动清理已完成的关系

**业务逻辑职责**:
- 注册父子线程关系
- 更新线程状态
- 查询父线程ID
- 查询子线程ID列表
- 查询活跃子线程
- 注销线程关系
- 清理所有关系

**与上下游模块集成**:
- **上游**: `TaskExecutor`注册/注销关系
- **下游**: 无
- **查询**: `ThreadContext`查询线程关系

#### 3.5.3 状态管理

**内部状态**:
- `parentToChildren`: 父线程到子线程集合的映射（Map<ID, Set<ID>>）
- `childToParent`: 子线程到父线程的映射（Map<ID, ID>）
- `threadStatus`: 线程状态映射（Map<ID, ThreadStatus>）

#### 3.5.4 主要功能调用链

**注册关系**:
```
TaskExecutor.execute(task)
  ↓
TaskExecutor.registerChildThread(parentId, childId)
  ↓
ThreadRelationshipManager.registerRelationship(parentId, childId)
  ↓
parentToChildren.set(parentId, Set([childId]))
  ↓
childToParent.set(childId, parentId)
  ↓
threadStatus.set(childId, RUNNING)
```

**注销关系**:
```
TaskExecutor.handleResult(result)
  ↓
TaskExecutor.unregisterChildThread(childId)
  ↓
ThreadRelationshipManager.unregisterRelationship(childId)
  ↓
parentId = childToParent.get(childId)
  ↓
parentToChildren.get(parentId).delete(childId)
  ↓
childToParent.delete(childId)
  ↓
threadStatus.delete(childId)
```

**查询活跃子线程**:
```
ThreadContext.getActiveChildThreadIds()
  ↓
ThreadRelationshipManager.getActiveChildThreadIds(parentId)
  ↓
children = parentToChildren.get(parentId)
  ↓
filter children where threadStatus === RUNNING
  ↓
返回活跃子线程ID列表
```

#### 3.5.5 关键方法说明

**registerRelationship(parentId, childId)**:
- 功能: 注册父子关系
- 逻辑: 更新parentToChildren和childToParent映射，初始化状态

**unregisterRelationship(childId)**:
- 功能: 注销关系
- 逻辑: 从映射中移除，清理状态

**updateThreadStatus(threadId, status)**:
- 功能: 更新线程状态
- 逻辑: 更新threadStatus映射

**getActiveChildThreadIds(parentId)**:
- 功能: 获取活跃子线程
- 返回: ID[]
- 逻辑: 过滤状态为RUNNING的子线程

**hasActiveChildren(parentId)**:
- 功能: 检查是否有活跃子线程
- 返回: boolean

---

### 3.6 TaskRegistry（任务注册表）

#### 3.6.1 文件信息

- **文件路径**: `sdk/core/execution/managers/task-registry.ts`
- **实现方式**: 有状态多实例
- **生命周期**: 由`TriggeredSubworkflowManager`持有和管理
- **依赖关系**:
  - 依赖: 无
  - 被依赖: `TriggeredSubworkflowManager`, `TaskQueueManager`

#### 3.6.2 职责描述

**核心职责**:
1. 注册任务信息
2. 更新任务状态
3. 查询任务信息
4. 存储任务结果
5. 清理过期任务

**业务逻辑职责**:
- 任务提交时注册
- 任务状态变化时更新
- 任务完成时存储结果
- 提供任务查询接口
- 定期清理过期任务

**与上下游模块集成**:
- **上游**: `TriggeredSubworkflowManager`注册任务
- **下游**: 无
- **查询**: `TriggeredSubworkflowManager`查询任务状态

#### 3.6.3 状态管理

**内部状态**:
- `tasks`: 任务信息映射（Map<taskId, TaskInfo>）

**TaskInfo结构**:
- `id`: 任务ID
- `task`: 任务对象
- `status`: 任务状态
- `submitTime`: 提交时间
- `completeTime`: 完成时间
- `result`: 执行结果
- `error`: 错误信息

#### 3.6.4 主要功能调用链

**注册任务**:
```
TriggeredSubworkflowManager.executeTriggeredSubgraph()
  ↓
TaskRegistry.register(task)
  ↓
tasks.set(taskId, TaskInfo)
  ↓
返回 taskId
```

**更新任务状态**:
```
TaskQueueManager.handleTaskCompleted(taskId, result)
  ↓
TaskRegistry.updateStatus(taskId, COMPLETED)
  ↓
taskInfo.status = COMPLETED
  ↓
taskInfo.result = result
  ↓
taskInfo.completeTime = Date.now()
```

**查询任务**:
```
TriggeredSubworkflowManager.getTaskStatus(taskId)
  ↓
TaskRegistry.get(taskId)
  ↓
返回 TaskInfo
```

#### 3.6.5 关键方法说明

**register(task)**:
- 功能: 注册任务
- 返回: taskId
- 逻辑: 生成taskId，创建TaskInfo，存储到映射

**updateStatus(taskId, status)**:
- 功能: 更新任务状态
- 逻辑: 更新TaskInfo的状态和时间戳

**get(taskId)**:
- 功能: 获取任务信息
- 返回: TaskInfo | null

**cleanup()**:
- 功能: 清理过期任务
- 逻辑: 移除完成时间超过阈值的任务

---

### 3.7 TriggeredSubworkflowManager（重构）

#### 3.7.1 文件信息

- **文件路径**: `sdk/core/execution/managers/triggered-subworkflow-manager.ts`
- **实现方式**: 有状态多实例
- **生命周期**: 由`executeTriggeredSubgraphHandler`创建
- **依赖关系**:
  - 依赖: `TaskQueueManager`, `ThreadPoolManager`, `TaskRegistry`, `EventManager`
  - 被依赖: `executeTriggeredSubgraphHandler`

#### 3.7.2 职责描述

**核心职责**:
1. 管理triggered子工作流的完整生命周期
2. 协调任务队列和线程池
3. 提供统一的执行接口
4. 管理任务注册表
5. 触发任务生命周期事件

**业务逻辑职责**:
- 接收子工作流执行请求
- 根据配置选择同步/异步执行
- 提交任务到队列
- 监听任务完成事件
- 返回执行结果或任务ID
- 提供任务状态查询
- 支持任务取消
- 管理器生命周期管理

**与上下游模块集成**:
- **上游**: `executeTriggeredSubgraphHandler`调用执行
- **下游**: `TaskQueueManager`提交任务，`TaskRegistry`注册任务
- **管理**: 持有和管理`TaskQueueManager`、`ThreadPoolManager`、`TaskRegistry`

#### 3.7.3 状态管理

**内部状态**:
- `taskQueue`: 任务队列管理器
- `threadPool`: 线程池管理器
- `taskRegistry`: 任务注册表
- `eventManager`: 事件管理器
- `config`: 管理器配置

#### 3.7.4 主要功能调用链

**同步执行**:
```
executeTriggeredSubgraphHandler()
  ↓
TriggeredSubworkflowManager.executeTriggeredSubgraph(task)
  ↓ (waitForCompletion = true)
TaskRegistry.register(task)
  ↓
TaskQueueManager.submitSync(task)
  ↓
ThreadPoolManager.allocateWorker()
  ↓
WorkerThread.execute(task)
  ↓
TaskExecutor.execute(task)
  ↓
ThreadExecutor.executeThread()
  ↓
TaskQueueManager.handleTaskCompleted()
  ↓
TaskRegistry.updateStatus(COMPLETED)
  ↓
返回 ExecutedSubgraphResult
```

**异步执行**:
```
executeTriggeredSubgraphHandler()
  ↓
TriggeredSubworkflowManager.executeTriggeredSubgraph(task)
  ↓ (waitForCompletion = false)
TaskRegistry.register(task)
  ↓
TaskQueueManager.submitAsync(task)
  ↓
返回 TaskSubmissionResult { taskId, status: 'queued' }
  ↓ (后台执行)
ThreadPoolManager.allocateWorker()
  ↓
WorkerThread.execute(task)
  ↓
TaskExecutor.execute(task)
  ↓
ThreadExecutor.executeThread()
  ↓
TaskQueueManager.handleTaskCompleted()
  ↓
EventManager.emit(TRIGGERED_SUBGRAPH_COMPLETED)
  ↓
TaskRegistry.updateStatus(COMPLETED)
  ↓
TaskRegistry.cleanup() (异步任务完成后清理)
```

**查询任务状态**:
```
executeTriggeredSubgraphHandler()
  ↓
TriggeredSubworkflowManager.getTaskStatus(taskId)
  ↓
TaskRegistry.get(taskId)
  ↓
返回 TaskInfo
```

**取消任务**:
```
executeTriggeredSubgraphHandler()
  ↓
TriggeredSubworkflowManager.cancelTask(taskId)
  ↓
TaskQueueManager.cancelTask(taskId)
  ↓
WorkerThread.cancel()
  ↓
TaskRegistry.updateStatus(CANCELLED)
  ↓
返回 boolean
```

#### 3.7.5 关键方法说明

**executeTriggeredSubgraph(task)**:
- 功能: 执行触发子工作流
- 返回: Promise<ExecutedSubgraphResult | TaskSubmissionResult>
- 逻辑: 注册任务，根据配置选择同步/异步执行

**getTaskStatus(taskId)**:
- 功能: 获取任务状态
- 返回: TaskInfo | null
- 逻辑: 从TaskRegistry查询

**cancelTask(taskId)**:
- 功能: 取消任务
- 返回: Promise<boolean>
- 逻辑: 通知TaskQueueManager取消，更新状态

**getQueueStats()**:
- 功能: 获取队列统计
- 返回: QueueStats
- 逻辑: 从TaskQueueManager获取

**shutdown()**:
- 功能: 关闭管理器
- 逻辑: 等待任务完成，关闭线程池，清理注册表

---

## 4. 类型定义设计

### 4.1 文件信息

- **文件路径**: `sdk/core/execution/types/task-queue.types.ts`
- **实现方式**: 无状态，纯类型导出
- **依赖关系**: 无

### 4.2 主要类型定义

**TaskStatus枚举**:
- QUEUED: 已排队
- RUNNING: 运行中
- COMPLETED: 已完成
- FAILED: 失败
- CANCELLED: 已取消
- TIMEOUT: 超时

**WorkerStatus枚举**:
- IDLE: 空闲
- BUSY: 忙碌
- SHUTTING_DOWN: 正在关闭

**TriggeredSubgraphTask接口**:
- subgraphId: 子工作流ID
- input: 输入数据
- triggerId: 触发器ID
- mainThreadContext: 主线程上下文
- config: 配置选项

**ExecutedSubgraphResult接口**:
- subgraphContext: 子工作流上下文
- threadResult: 执行结果
- executionTime: 执行时间

**TaskSubmissionResult接口**:
- taskId: 任务ID
- status: 任务状态
- message: 消息

**TaskInfo接口**:
- id: 任务ID
- task: 任务对象
- status: 任务状态
- submitTime: 提交时间
- completeTime: 完成时间
- result: 执行结果
- error: 错误信息

**QueueStats接口**:
- totalTasks: 总任务数
- queuedTasks: 排队任务数
- runningTasks: 运行中任务数
- completedTasks: 已完成任务数
- failedTasks: 失败任务数
- cancelledTasks: 已取消任务数

**PoolStats接口**:
- totalWorkers: 总工作线程数
- idleWorkers: 空闲工作线程数
- busyWorkers: 忙碌工作线程数

**SubworkflowManagerConfig接口**:
- minWorkers: 最小工作线程数
- maxWorkers: 最大工作线程数
- maxQueueSize: 最大队列长度
- idleTimeout: 空闲超时时间
- taskTimeout: 任务超时时间

---

## 5. 工具函数设计

### 5.1 文件信息

- **文件路径**: `sdk/core/execution/utils/task-utils.ts`
- **实现方式**: 无状态，纯函数导出
- **依赖关系**: 无

### 5.2 主要函数说明

**generateTaskId()**:
- 功能: 生成任务ID
- 返回: string
- 逻辑: 使用UUID或时间戳+随机数

**createTaskInfo(task)**:
- 功能: 创建任务信息对象
- 返回: TaskInfo
- 逻辑: 初始化TaskInfo的所有字段

**isTaskExpired(taskInfo, maxAge)**:
- 功能: 检查任务是否过期
- 返回: boolean
- 逻辑: 比较当前时间和完成时间

**calculateExecutionTime(startTime, endTime)**:
- 功能: 计算执行时间
- 返回: number (毫秒)
- 逻辑: endTime - startTime

---

## 6. 文件间关系图

### 6.1 依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    executeTriggeredSubgraphHandler           │
│                    (纯函数导出)                               │
└─────────────────────────────────────────────────────────────┘
                              ↓ 依赖
┌─────────────────────────────────────────────────────────────┐
│                  TriggeredSubworkflowManager                 │
│                  (有状态多实例)                               │
│  持有: TaskQueueManager, ThreadPoolManager, TaskRegistry     │
└─────────────────────────────────────────────────────────────┘
         ↓ 持有          ↓ 持有          ↓ 持有
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│TaskQueueMgr  │  │ThreadPoolMgr │  │TaskRegistry  │
│(有状态多实例)│  │(有状态多实例)│  │(有状态多实例)│
└──────────────┘  └──────────────┘  └──────────────┘
         ↓ 持有          ↓ 持有
┌──────────────┐  ┌──────────────┐
│WorkerThread  │  │TaskExecutor  │
│(有状态多实例)│  │(有状态多实例)│
└──────────────┘  └──────────────┘
         ↓ 持有
┌──────────────┐
│ThreadBuilder │
│ThreadExecutor│
└──────────────┘

┌─────────────────────────────────────────────────────────────┐
│              ThreadRelationshipManager                       │
│              (有状态全局单例)                                │
│  管理: SingletonRegistry                                     │
└─────────────────────────────────────────────────────────────┘
         ↑ 被依赖
┌──────────────┐
│TaskExecutor  │
└──────────────┘
```

### 6.2 调用关系图

```
Handler Layer
    ↓
TriggeredSubworkflowManager
    ├─→ TaskRegistry.register()
    ├─→ TaskQueueManager.submitSync() / submitAsync()
    │       ├─→ ThreadPoolManager.allocateWorker()
    │       │       ├─→ WorkerThread.execute()
    │       │       │       ├─→ TaskExecutor.execute()
    │       │       │       │       ├─→ ThreadBuilder.buildSubgraphContext()
    │       │       │       │       ├─→ ThreadRegistry.register()
    │       │       │       │       ├─→ ThreadRelationshipManager.registerRelationship()
    │       │       │       │       ├─→ ThreadExecutor.executeThread()
    │       │       │       │       ├─→ ThreadRelationshipManager.unregisterRelationship()
    │       │       │       │       └─→ 返回结果
    │       │       │       └─→ 返回结果
    │       │       └─→ 返回WorkerThread
    │       ├─→ 处理任务完成/失败
    │       └─→ 返回结果
    ├─→ TaskRegistry.getTaskStatus()
    ├─→ TaskQueueManager.cancelTask()
    └─→ shutdown()
            ├─→ TaskQueueManager.drain()
            └─→ ThreadPoolManager.shutdown()
```

---

## 7. 与现有模块的集成

### 7.1 ExecutionContext集成

**集成方式**:
- `TriggeredSubworkflowManager`通过构造函数接收`ExecutionContext`
- 从`ExecutionContext`获取`EventManager`、`ThreadRegistry`等服务
- 不需要将新组件注册到`ExecutionContext`的`ComponentRegistry`

**原因**:
- `TriggeredSubworkflowManager`是按需创建的，不是全局单例
- 任务队列和线程池是执行时的临时资源
- 避免污染全局依赖注入容器

### 7.2 ThreadRegistry集成

**集成方式**:
- `TaskExecutor`从`ExecutionContext`获取`ThreadRegistry`
- 子工作流的`ThreadContext`注册到`ThreadRegistry`
- 父子线程关系由`ThreadRelationshipManager`管理

**调用链**:
```
TaskExecutor.execute(task)
  ↓
ThreadRegistry.register(childContext)
  ↓
ThreadRelationshipManager.registerRelationship(parentId, childId)
```

### 7.3 EventManager集成

**集成方式**:
- 所有组件通过`ExecutionContext`获取`EventManager`
- 触发任务生命周期事件
- 监听任务完成事件

**事件类型**:
- TRIGGERED_SUBGRAPH_SUBMITTED: 任务已提交
- TRIGGERED_SUBGRAPH_STARTED: 任务已开始
- TRIGGERED_SUBGRAPH_COMPLETED: 任务已完成
- TRIGGERED_SUBGRAPH_FAILED: 任务失败
- TRIGGERED_SUBGRAPH_CANCELLED: 任务已取消
- TRIGGERED_SUBGRAPH_TIMEOUT: 任务超时

### 7.4 ThreadContext集成

**集成方式**:
- `TaskExecutor`创建子工作流的`ThreadContext`
- 通过`ThreadBuilder.buildSubgraphContext()`创建
- 设置父子线程关系
- 执行完成后清理关系

**调用链**:
```
TaskExecutor.execute(task)
  ↓
ThreadBuilder.buildSubgraphContext(subgraphId, input, metadata)
  ↓
childContext.setParentThreadId(parentId)
  ↓
childContext.setTriggeredSubworkflowId(subgraphId)
  ↓
ThreadExecutor.executeThread(childContext)
  ↓
ThreadRelationshipManager.unregisterRelationship(childId)
```

---

## 8. 数据流设计

### 8.1 同步执行数据流

```
1. Handler接收请求
   ↓
2. 创建TriggeredSubworkflowManager
   ↓
3. 注册任务到TaskRegistry
   ↓
4. 提交任务到TaskQueueManager (submitSync)
   ↓
5. TaskQueueManager将任务加入队列
   ↓
6. TaskQueueManager从ThreadPoolManager获取WorkerThread
   ↓
7. WorkerThread.execute(task)
   ↓
8. TaskExecutor创建子工作流上下文
   ↓
9. 注册子线程到ThreadRegistry
   ↓
10. 建立父子关系到ThreadRelationshipManager
   ↓
11. ThreadExecutor.executeThread()
   ↓
12. 执行子工作流节点
   ↓
13. 返回执行结果
   ↓
14. 清理父子关系
   ↓
15. TaskQueueManager处理完成
   ↓
16. 更新TaskRegistry状态
   ↓
17. 触发完成事件
   ↓
18. 返回结果给Handler
```

### 8.2 异步执行数据流

```
1. Handler接收请求
   ↓
2. 创建TriggeredSubworkflowManager
   ↓
3. 注册任务到TaskRegistry
   ↓
4. 提交任务到TaskQueueManager (submitAsync)
   ↓
5. TaskQueueManager将任务加入队列
   ↓
6. 立即返回taskId给Handler
   ↓
7. Handler返回TaskSubmissionResult
   ↓
8. (后台) TaskQueueManager从ThreadPoolManager获取WorkerThread
   ↓
9. WorkerThread.execute(task)
   ↓
10. TaskExecutor创建子工作流上下文
   ↓
11. 注册子线程到ThreadRegistry
   ↓
12. 建立父子关系到ThreadRelationshipManager
   ↓
13. ThreadExecutor.executeThread()
   ↓
14. 执行子工作流节点
   ↓
15. 返回执行结果
   ↓
16. 清理父子关系
   ↓
17. TaskQueueManager处理完成
   ↓
18. 更新TaskRegistry状态
   ↓
19. 触发完成事件
   ↓
20. 清理TaskRegistry中的任务记录
```

---

## 9. 错误处理设计

### 9.1 错误类型

**TaskQueueError**:
- 队列已满
- 任务不存在
- 任务状态错误

**ThreadPoolError**:
- 线程池已关闭
- 无法分配线程
- 线程创建失败

**WorkerThreadError**:
- 任务执行失败
- 任务超时
- 任务被取消

**TaskExecutionError**:
- 子工作流不存在
- 上下文创建失败
- 执行失败

### 9.2 错误处理流程

```
任务执行失败
  ↓
WorkerThread捕获错误
  ↓
TaskExecutor.handleResult(error)
  ↓
TaskQueueManager.handleTaskFailed(taskId, error)
  ↓
TaskRegistry.updateStatus(FAILED, error)
  ↓
EventManager.emit(TRIGGERED_SUBGRAPH_FAILED)
  ↓
同步执行: reject(error)
异步执行: 仅触发事件
```

---

## 10. 性能优化考虑

### 10.1 线程池优化

**动态扩缩容**:
- 初始化最小线程数（如2个）
- 根据负载动态创建新线程（不超过最大值）
- 空闲超时后回收线程（如30秒）

**线程复用**:
- 工作线程执行完任务后不立即销毁
- 放回空闲池供后续任务使用
- 减少线程创建销毁开销

### 10.2 队列优化

**队列限制**:
- 设置最大队列长度（如100）
- 防止内存无限增长
- 队列满时拒绝新任务

**优先级队列**:
- 未来可扩展支持任务优先级
- 高优先级任务优先执行

### 10.3 资源清理

**任务清理**:
- 异步任务完成后从TaskRegistry清理
- 定期清理过期任务（如1小时前完成的）

**线程清理**:
- 空闲超时后自动回收
- 管理器关闭时强制清理

---

## 11. 测试策略

### 11.1 单元测试

**TaskQueueManager测试**:
- 同步任务提交
- 异步任务提交
- 队列满处理
- 任务状态转换
- 事件触发

**ThreadPoolManager测试**:
- 线程分配
- 线程释放
- 动态扩缩容
- 空闲超时
- 统计信息

**WorkerThread测试**:
- 任务执行
- 超时控制
- 任务取消
- 状态管理

**TaskExecutor测试**:
- 上下文创建
- 线程注册
- 关系管理
- 结果返回

**ThreadRelationshipManager测试**:
- 关系注册
- 关系注销
- 状态更新
- 查询功能

### 11.2 集成测试

**端到端测试**:
- 同步执行流程
- 异步执行流程
- 任务取消流程
- 超时处理流程

**并发测试**:
- 多任务并发执行
- 线程池压力测试
- 队列压力测试

**错误处理测试**:
- 任务失败处理
- 线程池关闭处理
- 资源泄漏检测

---

## 12. 向后兼容性

### 12.1 接口兼容

**TriggeredSubworkflowManager.executeTriggeredSubgraph()**:
- 保持现有接口签名
- 返回类型扩展为联合类型
- 同步执行返回`ExecutedSubgraphResult`
- 异步执行返回`TaskSubmissionResult`

**Handler返回值**:
- 保持`TriggerExecutionResult`结构
- 扩展result字段支持两种返回类型

### 12.2 配置兼容

**TriggeredSubgraphTask.config**:
- `waitForCompletion`配置现在生效
- `timeout`配置现在生效
- 新增配置项有默认值

### 12.3 事件兼容

**现有事件**:
- TRIGGERED_SUBGRAPH_STARTED
- TRIGGERED_SUBGRAPH_COMPLETED
- TRIGGERED_SUBGRAPH_FAILED

**新增事件**:
- TRIGGERED_SUBGRAPH_SUBMITTED
- TRIGGERED_SUBGRAPH_CANCELLED
- TRIGGERED_SUBGRAPH_TIMEOUT

---

## 13. 实施建议

### 13.1 实施顺序

**阶段一：基础设施**
1. 创建类型定义文件
2. 实现ThreadRelationshipManager
3. 实现TaskRegistry
4. 编写单元测试

**阶段二：核心组件**
1. 实现WorkerThread
2. 实现TaskExecutor
3. 实现ThreadPoolManager
4. 实现TaskQueueManager
5. 编写单元测试

**阶段三：集成**
1. 重构TriggeredSubworkflowManager
2. 更新executeTriggeredSubgraphHandler
3. 编写集成测试

**阶段四：优化**
1. 性能优化
2. 错误处理完善
3. 文档更新
4. 全面测试

### 13.2 风险控制

**渐进式实施**:
- 先实现同步执行，确保功能正确
- 再实现异步执行，确保不破坏现有功能
- 最后优化性能和资源管理

**充分测试**:
- 每个阶段完成后进行充分测试
- 保持现有测试通过
- 添加新的测试覆盖

**回滚计划**:
- 保留原有实现作为备份
- 分支开发，主分支保持稳定
- 出现问题可快速回滚

---

## 14. 总结

本设计文档详细描述了通过任务队列和线程池实现triggered子工作流异步执行的完整方案。设计遵循以下原则：

1. **分层清晰** - Handler、Manager、Worker三层架构
2. **职责单一** - 每个组件职责明确
3. **依赖注入** - 通过构造函数注入依赖
4. **事件驱动** - 通过事件管理器通知状态变化
5. **向后兼容** - 保持现有接口，扩展功能
6. **可测试性** - 每个组件独立可测试
7. **可扩展性** - 易于添加新功能

通过这个设计，可以彻底解决当前triggered子工作流设计中的异步执行、并发控制、资源管理等核心问题，为系统提供更好的性能和可维护性。