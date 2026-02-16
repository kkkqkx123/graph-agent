# 任务队列 + 线程池简化设计方案

## 1. 核心设计原则

**利用现有的Thread和ThreadContext，不引入新的复杂概念**

- ThreadContext：保持为运行时上下文对象，封装Thread数据和状态管理
- ThreadExecutor：保持为无状态的执行引擎，负责执行ThreadContext
- 新增TaskQueue：管理待执行的ThreadContext队列
- 新增ThreadPool：管理ThreadExecutor实例池
- 重构TriggeredSubworkflowManager：使用任务队列和线程池

## 2. 目录结构设计

```
sdk/core/execution/
├── managers/
│   ├── triggered-subworkflow-manager.ts          [重构]
│   ├── task-queue-manager.ts                     [新增]
│   ├── thread-pool-manager.ts                    [新增]
│   └── task-registry.ts                          [新增]
├── types/
│   └── task.types.ts                             [新增]
└── handlers/
    └── trigger-handlers/
        └── execute-triggered-subgraph-handler.ts [适配]
```

## 3. 核心组件设计

### 3.1 TaskQueueManager（任务队列管理器）

**文件路径**：`sdk/core/execution/managers/task-queue-manager.ts`

**实现方式**：有状态多实例，由TriggeredSubworkflowManager持有

**文件关系**：
- 依赖：ThreadPoolManager、ThreadExecutor、EventManager
- 被依赖：TriggeredSubworkflowManager
- 持有：待执行队列、运行中任务映射

**业务逻辑职责**：

任务队列管理器负责管理待执行的ThreadContext队列，协调任务分配给线程池。

**主要状态**：
- 待执行队列：存储ThreadContext和对应的Promise回调
- 运行中任务：存储正在执行的任务ID和Promise

**核心调用链**：

**提交同步任务**：
```
TriggeredSubworkflowManager.executeTriggeredSubgraph()
  → TaskQueueManager.submitSync(threadContext)
    → 生成taskId
    → 创建Promise(resolve, reject)
    → 将{threadContext, resolve, reject}加入待执行队列
    → 触发processQueue()
    → 等待Promise完成
    → 返回ThreadResult
```

**提交异步任务**：
```
TriggeredSubworkflowManager.executeTriggeredSubgraph()
  → TaskQueueManager.submitAsync(threadContext)
    → 生成taskId
    → 创建Promise(resolve, reject)
    → 将{threadContext, resolve, reject}加入待执行队列
    → 触发processQueue()
    → 立即返回taskId
```

**处理队列**：
```
processQueue()
  → 检查待执行队列是否为空
  → 调用ThreadPoolManager.allocateExecutor()
  → 获取可用的ThreadExecutor
  → 从队列取出第一个任务
  → 调用ThreadExecutor.executeThread(threadContext)
  → 执行完成：调用handleTaskCompleted()
    → 更新运行中任务映射
    → 调用resolve(result)
    → 触发TRIGGERED_SUBGRAPH_COMPLETED事件
    → 调用ThreadPoolManager.releaseExecutor()
  → 执行失败：调用handleTaskFailed()
    → 更新运行中任务映射
    → 调用reject(error)
    → 触发TRIGGERED_SUBGRAPH_FAILED事件
    → 调用ThreadPoolManager.releaseExecutor()
  → 递归调用processQueue()处理下一个任务
```

**取消任务**：
```
cancelTask(taskId)
  → 检查任务是否在待执行队列
  → 如果在队列：从队列移除，返回true
  → 如果正在运行：返回false（无法取消）
  → 触发TRIGGERED_SUBGRAPH_CANCELLED事件
```

### 3.2 ThreadPoolManager（线程池管理器）

**文件路径**：`sdk/core/execution/managers/thread-pool-manager.ts`

**实现方式**：有状态多实例，由TriggeredSubworkflowManager持有

**文件关系**：
- 依赖：ThreadExecutor、ExecutionContext
- 被依赖：TaskQueueManager
- 持有：ThreadExecutor实例数组、空闲Executor队列

**业务逻辑职责**：

线程池管理器负责管理ThreadExecutor实例的创建、分配和回收，实现动态扩缩容。

**主要状态**：
- 所有执行器：存储所有创建的ThreadExecutor实例
- 空闲执行器：存储当前空闲的ThreadExecutor实例
- 忙碌执行器：隐式状态（所有执行器 - 空闲执行器）

**核心调用链**：

**分配执行器**：
```
TaskQueueManager.processQueue()
  → ThreadPoolManager.allocateExecutor()
    → 检查空闲执行器队列是否有可用执行器
    → 如果有：从空闲队列取出，加入忙碌集合，返回该执行器
    → 如果没有：检查当前总执行器数是否达到最大值
      → 未达到：创建新的ThreadExecutor
        → 调用new ThreadExecutor(executionContext)
        → 加入所有执行器数组
        → 加入忙碌集合
        → 返回该执行器
      → 已达到：等待空闲执行器（通过Promise等待）
```

**释放执行器**：
```
TaskQueueManager.handleTaskCompleted()
  → ThreadPoolManager.releaseExecutor(executor)
    → 将执行器从忙碌集合移除
    → 将执行器加入空闲队列
    → 设置空闲超时定时器（如30秒）
    → 触发等待中的allocateExecutor()调用

**空闲超时处理**：
```
空闲超时定时器触发
  → 检查空闲执行器数是否超过最小值
  → 如果超过：销毁最老的空闲执行器
    → 从空闲队列移除
    → 从所有执行器数组移除
    → 调用executor.cleanup()清理资源
```

**关闭线程池**：
```
shutdown()
  → 设置关闭标志
  → 等待所有运行中的任务完成
  → 销毁所有空闲执行器
  → 销毁所有忙碌执行器
  → 清理资源
```

### 3.3 TaskRegistry（任务注册表）

**文件路径**：`sdk/core/execution/managers/task-registry.ts`

**实现方式**：有状态多实例，由TriggeredSubworkflowManager持有

**文件关系**：
- 依赖：无
- 被依赖：TriggeredSubworkflowManager、TaskQueueManager
- 持有：任务信息映射

**业务逻辑职责**：

任务注册表负责存储和管理所有任务的信息，包括任务状态、执行结果、时间戳等。

**主要状态**：
- 任务映射：Map<taskId, TaskInfo>

**TaskInfo结构**：
- id：任务ID
- threadContext：线程上下文
- status：任务状态（QUEUED、RUNNING、COMPLETED、FAILED、CANCELLED、TIMEOUT）
- submitTime：提交时间
- startTime：开始执行时间
- completeTime：完成时间
- result：执行结果（成功时）
- error：错误信息（失败时）

**核心调用链**：

**注册任务**：
```
TriggeredSubworkflowManager.executeTriggeredSubgraph()
  → TaskRegistry.register(threadContext)
    → 生成taskId
    → 创建TaskInfo对象
      → id = taskId
      → threadContext = threadContext
      → status = QUEUED
      → submitTime = Date.now()
    → 将TaskInfo存入任务映射
    → 返回taskId
```

**更新任务状态**：
```
TaskQueueManager.handleTaskStarted()
  → TaskRegistry.updateStatus(taskId, RUNNING)
    → 从任务映射获取TaskInfo
    → 更新status为RUNNING
    → 设置startTime为Date.now()

TaskQueueManager.handleTaskCompleted()
  → TaskRegistry.updateStatus(taskId, COMPLETED, result)
    → 从任务映射获取TaskInfo
    → 更新status为COMPLETED
    → 设置completeTime为Date.now()
    → 设置result为执行结果

TaskQueueManager.handleTaskFailed()
  → TaskRegistry.updateStatus(taskId, FAILED, error)
    → 从任务映射获取TaskInfo
    → 更新status为FAILED
    → 设置completeTime为Date.now()
    → 设置error为错误信息
```

**查询任务**：
```
TriggeredSubworkflowManager.getTaskStatus(taskId)
  → TaskRegistry.get(taskId)
    → 从任务映射查找TaskInfo
    → 返回TaskInfo或null
```

**清理过期任务**：
```
cleanup()
  → 遍历任务映射中的所有任务
  → 检查任务是否已完成且超过保留时间（如1小时）
  → 删除过期任务
  → 定期调用（如每10分钟）
```

### 3.4 TriggeredSubworkflowManager（重构）

**文件路径**：`sdk/core/execution/managers/triggered-subworkflow-manager.ts`

**实现方式**：有状态多实例，由Handler创建

**文件关系**：
- 依赖：ThreadBuilder、ThreadExecutor、EventManager、TaskQueueManager、ThreadPoolManager、TaskRegistry
- 被依赖：executeTriggeredSubgraphHandler
- 持有：TaskQueueManager、ThreadPoolManager、TaskRegistry实例

**业务逻辑职责**：

TriggeredSubworkflowManager是triggered子工作流管理的总协调器，负责任务的创建、提交、状态查询和取消。

**核心调用链**：

**执行触发子工作流**：
```
executeTriggeredSubgraphHandler()
  → TriggeredSubworkflowManager.executeTriggeredSubgraph(task)
    → 验证参数（subgraphId是否存在）
    → 准备输入数据（从mainThreadContext获取）
    → 创建子工作流ThreadContext
      → 调用ThreadBuilder.buildSubgraphContext()
      → 设置parentThreadId
      → 设置triggeredSubworkflowId
    → 注册ThreadContext到ThreadRegistry
    → 建立父子线程关系
      → 调用mainThreadContext.registerChildThread(childId)
    → 注册任务到TaskRegistry
      → 调用TaskRegistry.register(threadContext)
      → 获取taskId
    → 根据配置选择执行方式
      → 如果waitForCompletion为true（同步）
        → 调用TaskQueueManager.submitSync(threadContext)
        → 等待执行完成
        → 获取ThreadResult
        → 注销父子关系
        → 返回{ subgraphContext, threadResult, executionTime }
      → 如果waitForCompletion为false（异步）
        → 调用TaskQueueManager.submitAsync(threadContext)
        → 立即返回{ taskId, status: 'queued', message: 'Task submitted' }
        → (后台执行完成)
        → 触发TRIGGERED_SUBGRAPH_COMPLETED事件
        → 注销父子关系
        → 清理TaskRegistry中的任务记录
```

**查询任务状态**：
```
getTaskStatus(taskId)
  → 调用TaskRegistry.get(taskId)
  → 返回TaskInfo或null
```

**取消任务**：
```
cancelTask(taskId)
  → 调用TaskQueueManager.cancelTask(taskId)
  → 如果成功
    → 更新TaskRegistry状态为CANCELLED
    → 触发TRIGGERED_SUBGRAPH_CANCELLED事件
    → 注销父子关系
  → 返回是否成功
```

**关闭管理器**：
```
shutdown()
  → 调用TaskQueueManager.drain()（等待所有任务完成）
  → 调用ThreadPoolManager.shutdown()（关闭线程池）
  → 调用TaskRegistry.cleanup()（清理任务注册表）
```

### 3.5 executeTriggeredSubgraphHandler（适配）

**文件路径**：`sdk/core/execution/handlers/trigger-handlers/execute-triggered-subgraph-handler.ts`

**实现方式**：纯函数导出

**文件关系**：
- 依赖：TriggeredSubworkflowManager、ThreadBuilder、ThreadExecutor
- 被依赖：触发器系统

**业务逻辑职责**：

Handler负责接收触发器请求，创建TriggeredSubworkflowManager，调用执行，处理返回结果。

**核心调用链**：

**处理触发请求**：
```
触发器系统调用Handler
  → executeTriggeredSubgraphHandler(action, triggerId, executionContext)
    → 解析参数（triggeredWorkflowId、waitForCompletion等）
    → 获取主线程ThreadContext
      → 从ExecutionContext获取ThreadRegistry
      → 获取当前线程ID
      → 获取mainThreadContext
    → 准备输入数据
      → 构建input对象（包含triggerId、output、input）
    → 创建TriggeredSubworkflowManager
      → 实例化ThreadBuilder
      → 实例化ThreadExecutor
      → 实例化TriggeredSubworkflowManager（传入配置）
    → 创建任务对象
      → subgraphId = triggeredWorkflowId
      → input = 准备好的输入数据
      → triggerId = triggerId
      → mainThreadContext = mainThreadContext
      → config = { waitForCompletion, timeout, recordHistory }
    → 调用manager.executeTriggeredSubgraph(task)
    → 处理返回结果
      → 如果是同步执行（返回ExecutedSubgraphResult）
        → 构建成功结果
          → message = "Triggered subgraph execution completed"
          → triggeredWorkflowId = subgraphId
          → input = 输入数据
          → output = result.subgraphContext.getOutput()
          → waitForCompletion = true
          → executed = true
          → completed = true
          → executionTime = result.executionTime
        → 返回TriggerExecutionResult
      → 如果是异步执行（返回TaskSubmissionResult）
        → 构建成功结果
          → message = "Triggered subgraph submitted"
          → triggeredWorkflowId = subgraphId
          → taskId = result.taskId
          → status = result.status
          → waitForCompletion = false
          → executed = true
          → completed = false
          → executionTime = result.executionTime
        → 返回TriggerExecutionResult
    → 捕获异常
      → 构建失败结果
        → success = false
        → error = 错误信息
      → 返回TriggerExecutionResult
```

## 4. 类型定义

**文件路径**：`sdk/core/execution/types/task.types.ts`

**实现方式**：无状态，纯类型导出

**主要类型**：

- **TaskStatus枚举**：QUEUED、RUNNING、COMPLETED、FAILED、CANCELLED、TIMEOUT
- **WorkerStatus枚举**：IDLE、BUSY、SHUTTING_DOWN
- **TriggeredSubgraphTask接口**：子工作流任务定义
- **ExecutedSubgraphResult接口**：同步执行结果
- **TaskSubmissionResult接口**：异步执行结果
- **TaskInfo接口**：任务信息
- **QueueStats接口**：队列统计
- **PoolStats接口**：线程池统计
- **SubworkflowManagerConfig接口**：管理器配置

## 5. 与现有模块集成

### 5.1 ExecutionContext集成

**集成方式**：
- TriggeredSubworkflowManager通过构造函数接收ExecutionContext
- 从ExecutionContext获取EventManager、ThreadRegistry等服务
- 不将新组件注册到ExecutionContext的ComponentRegistry

**原因**：
- TaskQueueManager和ThreadPoolManager是执行时的临时资源
- 不是全局单例服务
- 避免污染全局依赖注入容器

### 5.2 ThreadRegistry集成

**集成方式**：
- TaskExecutor从ExecutionContext获取ThreadRegistry
- 子工作流的ThreadContext注册到ThreadRegistry
- 父子线程关系由ThreadRelationshipManager管理

**调用链**：
```
TaskQueueManager.processQueue()
  → ThreadExecutor.executeThread(threadContext)
    → ThreadRegistry.register(threadContext)
    → ThreadRelationshipManager.registerRelationship(parentId, childId)
```

### 5.3 EventManager集成

**集成方式**：
- 所有组件通过ExecutionContext获取EventManager
- 触发任务生命周期事件

**事件类型**：
- TRIGGERED_SUBGRAPH_SUBMITTED：任务已提交
- TRIGGERED_SUBGRAPH_STARTED：任务已开始
- TRIGGERED_SUBGRAPH_COMPLETED：任务已完成
- TRIGGERED_SUBGRAPH_FAILED：任务失败
- TRIGGERED_SUBGRAPH_CANCELLED：任务已取消
- TRIGGERED_SUBGRAPH_TIMEOUT：任务超时

### 5.4 ThreadContext集成

**集成方式**：
- TaskExecutor创建子工作流的ThreadContext
- 通过ThreadBuilder.buildSubgraphContext()创建
- 设置父子线程关系
- 执行完成后清理关系

**调用链**：
```
TaskQueueManager.processQueue()
  → ThreadExecutor.executeThread(threadContext)
    → ThreadBuilder.buildSubgraphContext()
    → childContext.setParentThreadId(parentId)
    → childContext.setTriggeredSubworkflowId(subgraphId)
    → ThreadExecutor.executeThread(childContext)
    → ThreadRelationshipManager.unregisterRelationship(childId)
```

## 6. 数据流设计

### 6.1 同步执行数据流

```
1. Handler接收请求
2. 创建TriggeredSubworkflowManager
3. 创建子工作流ThreadContext
4. 注册到ThreadRegistry
5. 建立父子关系
6. 提交到TaskQueueManager (submitSync)
7. TaskQueueManager加入待执行队列
8. TaskQueueManager调用processQueue()
9. TaskQueueManager调用ThreadPoolManager.allocateExecutor()
10. ThreadPoolManager返回ThreadExecutor
11. TaskQueueManager调用ThreadExecutor.executeThread(threadContext)
12. ThreadExecutor执行子工作流
13. 返回ThreadResult
14. TaskQueueManager调用handleTaskCompleted()
15. 更新TaskRegistry状态
16. 触发完成事件
17. 注销父子关系
18. 返回结果给Handler
```

### 6.2 异步执行数据流

```
1. Handler接收请求
2. 创建TriggeredSubworkflowManager
3. 创建子工作流ThreadContext
4. 注册到ThreadRegistry
5. 建立父子关系
6. 提交到TaskQueueManager (submitAsync)
7. TaskQueueManager加入待执行队列
8. TaskQueueManager返回taskId
9. Handler返回TaskSubmissionResult
10. (后台) TaskQueueManager调用processQueue()
11. TaskQueueManager调用ThreadPoolManager.allocateExecutor()
12. ThreadPoolManager返回ThreadExecutor
13. TaskQueueManager调用ThreadExecutor.executeThread(threadContext)
14. ThreadExecutor执行子工作流
15. 返回ThreadResult
16. TaskQueueManager调用handleTaskCompleted()
17. 更新TaskRegistry状态
18. 触发完成事件
19. 注销父子关系
20. 清理TaskRegistry中的任务记录
```

## 7. 错误处理

### 7.1 错误类型

- **TaskQueueError**：队列已满、任务不存在
- **ThreadPoolError**：线程池已关闭、无法分配执行器
- **TaskExecutionError**：子工作流不存在、执行失败

### 7.2 错误处理流程

```
任务执行失败
  → ThreadExecutor抛出异常
  → TaskQueueManager捕获异常
  → TaskQueueManager调用handleTaskFailed()
  → 更新TaskRegistry状态为FAILED
  → 触发TRIGGERED_SUBGRAPH_FAILED事件
  → 同步执行：reject(error)
  → 异步执行：仅触发事件
```

## 8. 性能优化

### 8.1 线程池优化

- **动态扩缩容**：初始化最小执行器数，根据负载创建新执行器，空闲超时回收
- **执行器复用**：执行完任务后不销毁，放回空闲队列供后续使用

### 8.2 队列优化

- **队列限制**：设置最大队列长度，防止内存无限增长
- **任务清理**：异步任务完成后从TaskRegistry清理，定期清理过期任务

## 9. 向后兼容性

### 9.1 接口兼容

- TriggeredSubworkflowManager.executeTriggeredSubgraph()保持现有接口
- 返回类型扩展为联合类型
- Handler返回值保持TriggerExecutionResult结构

### 9.2 配置兼容

- waitForCompletion配置现在生效
- timeout配置现在生效
- 新增配置项有默认值

### 9.3 事件兼容

- 现有事件（STARTED、COMPLETED、FAILED）保持不变
- 新增事件（SUBMITTED、CANCELLED、TIMEOUT）

## 10. 实施建议

### 10.1 实施顺序

**阶段一：基础设施**
1. 创建类型定义文件
2. 实现TaskRegistry
3. 编写单元测试

**阶段二：核心组件**
1. 实现ThreadPoolManager
2. 实现TaskQueueManager
3. 编写单元测试

**阶段三：集成**
1. 重构TriggeredSubworkflowManager
2. 更新executeTriggeredSubgraphHandler
3. 编写集成测试

**阶段四：优化**
1. 性能优化
2. 错误处理完善
3. 文档更新
4. 全面测试

### 10.2 风险控制

- 渐进式实施，先实现同步执行确保功能正确
- 再实现异步执行确保不破坏现有功能
- 保持现有测试通过，添加新的测试覆盖
- 分支开发，主分支保持稳定，出现问题可快速回滚