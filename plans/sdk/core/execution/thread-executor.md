# ThreadExecutor 设计文档

## 需求分析

### 核心需求
执行单个 thread 实例，管理 thread 的完整执行生命周期。同时支持从 workflow 创建 thread。

### 功能需求
1. 从 workflow 创建 thread 实例
2. 执行 thread 直到完成或遇到终止条件
3. 支持暂停、恢复、取消操作
4. 协调节点执行和路由决策
5. 处理 Fork 和 Join 节点
6. 触发执行相关事件
7. 记录执行历史和元数据

### 非功能需求
1. 可靠性：正确处理各种异常情况
2. 可观测性：完整的事件和日志记录
3. 可控制性：支持暂停、恢复、取消
4. 性能：高效的执行循环

## 核心职责

1. Workflow 到 Thread 的转换
2. Thread 执行生命周期管理
3. 节点执行协调
4. 路由决策
5. Fork/Join 协调
6. 事件触发
7. 执行控制（暂停/恢复/取消）

## 主要属性

- stateManager: Thread 状态管理器，用于创建和管理 thread
- workflowValidator: Workflow 验证器，用于验证 workflow 定义
- workflowContext: 工作流上下文，用于获取节点和边信息
- nodeExecutor: 节点执行器，用于执行节点
- router: 路由器，用于选择下一个节点
- threadCoordinator: Thread 协调器，用于处理 Fork/Join
- eventManager: 事件管理器，用于触发事件
- historyManager: 历史记录管理器，用于记录执行历史

## 核心方法

### execute 方法（重载）

支持两种调用方式：
1. execute(workflow, options): 从 workflow 创建并执行 thread
2. execute(thread, options): 直接执行已有的 thread

### execute 方法（从 workflow）

接收 workflow 定义和执行选项，返回 thread 执行结果。

执行步骤：

步骤 1：验证 workflow 定义
- 调用 workflowValidator 验证 workflow
- 检查 workflow 是否包含 START 节点
- 检查 workflow 是否包含 END 节点
- 检查节点和边的引用是否有效
- 如果验证失败，抛出 ValidationError

步骤 2：创建 thread 实例
- 调用 stateManager.createThread 创建 thread
- 设置 workflowId 为 workflow.id
- 设置 workflowVersion 为 workflow.version
- 设置 input 为传入的输入数据
- 设置 status 为 CREATED
- 设置 startTime 为当前时间戳

步骤 3：设置初始节点
- 从 workflow 中查找 START 节点
- 设置 thread.currentNodeId 为 START 节点的 id
- 如果找不到 START 节点，抛出 ValidationError

步骤 4：复制 workflow 配置
- 将 workflow.config 复制到 thread.metadata
- 处理 workflow 的全局变量
- 处理 workflow 的标签和元数据

步骤 5：初始化 thread 变量
- 从 workflow.config 中提取变量定义
- 创建初始变量实例
- 设置变量的初始值

步骤 6：调用 execute 方法（从 thread）
- 传入创建的 thread 和执行选项
- 返回执行结果

### execute 方法（从 thread）

接收 thread 实例和执行选项，返回 thread 执行结果。

执行步骤：

步骤 1：验证 thread 状态
- 检查 thread 状态是否为 CREATED 或 PAUSED
- 如果状态不正确，抛出 ExecutionError

步骤 2：更新 thread 状态为 RUNNING
- 调用 stateManager.updateThreadStatus
- 设置状态为 RUNNING

步骤 3：触发 THREAD_STARTED 事件
- 创建 ThreadStartedEvent
- 设置事件类型为 THREAD_STARTED
- 设置时间戳、workflowId、threadId
- 通过 eventManager 触发事件

步骤 4：开始执行循环
- 调用 executeLoop 方法
- 传入 thread 和执行选项
- 等待执行完成

步骤 5：处理执行结果
- 如果执行成功，更新 thread 状态为 COMPLETED
- 如果执行失败，更新 thread 状态为 FAILED
- 记录错误信息

步骤 6：触发完成事件
- 如果成功，触发 THREAD_COMPLETED 事件
- 如果失败，触发 THREAD_FAILED 事件

步骤 7：返回执行结果
- 返回 ThreadResult
- 包含 threadId、success、output、error、executionTime、nodeResults、metadata

### executeLoop 方法

执行 thread 的主循环，直到遇到终止条件。

执行步骤：

步骤 1：初始化执行参数
- 获取 maxSteps 和 timeout
- 初始化 stepCount 和 startTime

步骤 2：进入执行循环
- 循环直到满足终止条件

步骤 3：检查终止条件
- 检查是否达到最大步数
- 检查是否超时
- 检查 thread 状态是否为 RUNNING
- 检查当前节点是否为 END 节点
- 如果满足终止条件，退出循环

步骤 4：获取当前节点
- 从 thread 获取 currentNodeId
- 从 workflowContext 获取节点定义
- 如果节点不存在，抛出 NotFoundError

步骤 5：执行节点
- 调用 executeNode 方法
- 传入 thread 和节点定义
- 等待执行完成

步骤 6：记录执行结果
- 将执行结果保存到 thread.nodeResults
- 调用 historyManager 记录执行历史

步骤 7：路由到下一个节点
- 调用 routeToNextNode 方法
- 传入 thread 和当前节点
- 获取下一个节点 ID

步骤 8：更新当前节点
- 调用 stateManager.setCurrentNode
- 设置 thread.currentNodeId 为下一个节点 ID

步骤 9：增加步数计数
- 增加 stepCount
- 更新执行元数据

### executeNode 方法

执行单个节点。

执行步骤：

步骤 1：检查节点类型
- 如果节点类型为 FORK，调用 handleForkNode
- 如果节点类型为 JOIN，调用 handleJoinNode
- 否则，调用 nodeExecutor.execute

步骤 2：触发 NODE_STARTED 事件
- 创建 NodeStartedEvent
- 设置事件类型为 NODE_STARTED
- 设置节点 ID 和类型
- 通过 eventManager 触发事件

步骤 3：执行节点逻辑
- 调用 nodeExecutor.execute
- 传入 thread 和节点定义
- 等待执行完成

步骤 4：触发完成事件
- 如果成功，触发 NODE_COMPLETED 事件
- 如果失败，触发 NODE_FAILED 事件

步骤 5：返回执行结果
- 返回 NodeExecutionResult

### handleForkNode 方法

处理 Fork 节点。

执行步骤：

步骤 1：获取 Fork 配置
- 从节点定义中获取 forkId 和 forkStrategy

步骤 2：调用 ThreadCoordinator.fork
- 传入 thread ID 和 Fork 配置
- 等待子 thread 创建完成

步骤 3：更新 thread 元数据
- 记录子 thread ID 到 thread.metadata.childThreadIds

步骤 4：返回执行结果
- 返回包含子 thread ID 的执行结果

### handleJoinNode 方法

处理 Join 节点。

执行步骤：

步骤 1：获取 Join 配置
- 从节点定义中获取 joinId、joinStrategy 和 timeout

步骤 2：获取子 thread ID
- 从 thread.metadata.childThreadIds 获取子 thread ID

步骤 3：调用 ThreadCoordinator.join
- 传入 thread ID、子 thread ID 和 Join 配置
- 等待子 thread 完成并合并结果

步骤 4：更新 thread 输出
- 将合并结果设置到 thread.output

步骤 5：返回执行结果
- 返回包含合并结果的执行结果

### routeToNextNode 方法

路由到下一个节点。

执行步骤：

步骤 1：获取当前节点的出边
- 从 workflowContext 获取当前节点的出边

步骤 2：调用 Router.selectNextNode
- 传入当前节点、出边和 thread
- 获取下一个节点 ID

步骤 3：返回下一个节点 ID
- 返回下一个节点 ID，如果没有则返回 null

### pause 方法

暂停 thread 执行。

执行步骤：

步骤 1：验证 thread 状态
- 检查 thread 状态是否为 RUNNING
- 如果不是，抛出 ExecutionError

步骤 2：更新 thread 状态为 PAUSED
- 调用 stateManager.updateThreadStatus
- 设置状态为 PAUSED

步骤 3：触发 THREAD_PAUSED 事件
- 创建 ThreadPausedEvent
- 设置事件类型为 THREAD_PAUSED
- 通过 eventManager 触发事件

### resume 方法

恢复 thread 执行。

执行步骤：

步骤 1：验证 thread 状态
- 检查 thread 状态是否为 PAUSED
- 如果不是，抛出 ExecutionError

步骤 2：更新 thread 状态为 RUNNING
- 调用 stateManager.updateThreadStatus
- 设置状态为 RUNNING

步骤 3：触发 THREAD_RESUMED 事件
- 创建 ThreadResumedEvent
- 设置事件类型为 THREAD_RESUMED
- 通过 eventManager 触发事件

步骤 4：继续执行循环
- 调用 executeLoop 方法
- 传入 thread 和执行选项
- 等待执行完成

步骤 5：返回执行结果
- 返回 ThreadResult

### cancel 方法

取消 thread 执行。

执行步骤：

步骤 1：验证 thread 状态
- 检查 thread 状态是否为 RUNNING 或 PAUSED
- 如果不是，抛出 ExecutionError

步骤 2：更新 thread 状态为 CANCELLED
- 调用 stateManager.updateThreadStatus
- 设置状态为 CANCELLED

步骤 3：取消子 thread（如果有）
- 检查 thread.metadata.childThreadIds
- 如果有子 thread，递归取消所有子 thread

## 错误处理

### Workflow 验证失败
- 抛出 ValidationError
- 包含详细的验证错误信息

### 节点执行失败
- 记录错误到 thread.errors
- 触发 NODE_FAILED 事件
- 根据 workflow 配置决定是否继续执行

### 路由失败
- 记录错误到 thread.errors
- 触发 ERROR 事件
- 终止执行

### Fork/Join 失败
- 记录错误到 thread.errors
- 触发 ERROR 事件
- 终止执行

### 超时
- 抛出 TimeoutError
- 更新 thread 状态为 TIMEOUT
- 触发 THREAD_FAILED 事件

## 注意事项

1. **状态一致性**：确保 thread 状态的转换正确
2. **事件触发**：所有关键操作都要触发事件
3. **错误处理**：妥善处理各种错误情况
4. **资源清理**：及时清理不再需要的资源
5. **子线程管理**：正确管理子 thread 的生命周期
6. **接口统一**：支持从 workflow 和 thread 两种方式执行