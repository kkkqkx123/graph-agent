# WorkflowExecutor执行逻辑

## 概述
WorkflowExecutor是工作流执行引擎的核心，负责协调整个工作流的执行流程，从START节点到END节点的完整执行过程。

## 核心职责
1. 初始化工作流执行环境
2. 协调节点执行顺序
3. 管理执行生命周期
4. 处理执行结果和错误
5. 支持暂停、恢复、取消操作

## execute方法执行逻辑

### 步骤1：验证工作流定义
- 调用WorkflowValidator验证工作流定义的完整性和正确性
- 检查工作流是否包含START和END节点
- 检查节点和边的连接关系是否合法
- 检查工作流结构是否可达
- 如果验证失败，抛出ValidationError

### 步骤2：创建Thread实例
- 调用ThreadStateManager创建新的Thread实例
- 设置workflowId为当前工作流ID
- 设置workflowVersion为当前工作流版本
- 初始化Thread状态为CREATED
- 设置Thread的input为ExecutionOptions中的input
- 初始化Thread的variables为空数组
- 初始化Thread的nodeResults为空Map
- 初始化Thread的executionHistory为空数组
- 初始化Thread的errors为空数组
- 设置Thread的startTime为当前时间戳
- 设置Thread的currentNodeId为START节点ID

### 步骤3：初始化执行上下文
- 创建WorkflowContext实例，传入工作流定义
- 构建nodeMap，将所有节点按ID索引
- 构建edgeMap，将所有边按ID索引
- 创建ExecutionContext实例，包含：
  - thread: Thread实例
  - workflowContext: WorkflowContext实例
  - options: ExecutionOptions
  - eventEmitter: 事件发射器

### 步骤4：触发THREAD_STARTED事件
- 创建ThreadStartedEvent
- 设置event.type为THREAD_STARTED
- 设置event.timestamp为当前时间戳
- 设置event.workflowId为工作流ID
- 设置event.threadId为Thread ID
- 设置event.input为Thread的input
- 通过eventEmitter触发事件

### 步骤5：更新Thread状态为RUNNING
- 调用ThreadStateManager更新Thread状态为RUNNING
- 触发状态变更事件

### 步骤6：开始执行循环
- 初始化stepCount为0
- 初始化lastNodeTime为当前时间戳
- 进入执行循环

### 步骤7：执行循环逻辑
#### 循环条件检查
- 检查stepCount是否超过maxSteps，如果超过则抛出TimeoutError
- 检查Thread状态是否为RUNNING，如果不是则退出循环
- 检查是否超时，如果超时则抛出TimeoutError

#### 获取当前节点
- 从ThreadStateManager获取currentNodeId
- 从WorkflowContext获取对应的Node实例
- 如果节点不存在，抛出NotFoundError

#### 执行节点
- 创建NodeExecutor实例（根据节点类型）
- 调用NodeExecutor.execute(context)
- 等待执行结果

#### 处理节点执行结果
- 如果执行成功：
  - 将NodeExecutionResult添加到Thread的nodeResults
  - 将执行记录添加到Thread的executionHistory
  - 调用options.onNodeExecuted回调（如果存在）
- 如果执行失败：
  - 将错误信息添加到Thread的errors
  - 调用options.onError回调（如果存在）
  - 根据错误处理策略决定是否继续执行

#### 路由到下一个节点
- 如果当前节点是END节点：
  - 退出执行循环
- 否则：
  - 调用Router.selectNextNode获取下一个节点ID
  - 如果当前节点是ROUTE节点：
    - Router.selectNextNode返回null（由RouteNodeExecutor处理路由）
    - 从NodeExecutionResult中获取selectedNode作为下一个节点
  - 如果Router.selectNextNode返回null且不是ROUTE节点：
    - 抛出ExecutionError（没有可用的路由）
  - 更新Thread的currentNodeId为下一个节点ID

#### 更新步数
- stepCount加1
- 更新lastNodeTime为当前时间戳

### 步骤8：处理执行完成
- 设置Thread状态为COMPLETED
- 设置Thread的endTime为当前时间戳
- 计算executionTime = endTime - startTime
- 收集Thread的output（从END节点或最后一个节点获取）
- 触发THREAD_COMPLETED事件

### 步骤9：返回执行结果
- 创建ExecutionResult实例
- 设置threadId为Thread ID
- 设置success为true
- 设置output为Thread的output
- 设置executionTime为计算出的执行时间
- 设置nodeResults为Thread的nodeResults数组
- 设置metadata为Thread的metadata
- 返回ExecutionResult

## executeThread方法执行逻辑

### 步骤1：验证Thread状态
- 检查Thread是否存在
- 检查Thread状态是否为PAUSED或CREATED
- 如果状态不正确，抛出ValidationError

### 步骤2：初始化执行上下文
- 创建WorkflowContext实例（从Thread的workflowId获取工作流定义）
- 创建ExecutionContext实例，包含Thread、WorkflowContext等

### 步骤3：触发THREAD_RESUMED事件
- 创建ThreadResumedEvent
- 设置相关属性
- 通过eventEmitter触发事件

### 步骤4：更新Thread状态为RUNNING
- 调用ThreadStateManager更新Thread状态为RUNNING

### 步骤5：继续执行循环
- 从Thread的currentNodeId开始执行
- 执行逻辑与execute方法的步骤7相同

### 步骤6：返回执行结果
- 与execute方法的步骤8和步骤9相同

## pause方法执行逻辑

### 步骤1：验证Thread状态
- 检查Thread是否存在
- 检查Thread状态是否为RUNNING
- 如果状态不正确，抛出ValidationError

### 步骤2：设置暂停标志
- 在ExecutionContext中设置paused标志为true

### 步骤3：等待当前节点执行完成
- 等待当前节点的执行完成
- 不开始新的节点执行

### 步骤4：更新Thread状态为PAUSED
- 调用ThreadStateManager更新Thread状态为PAUSED

### 步骤5：触发THREAD_PAUSED事件
- 创建ThreadPausedEvent
- 设置相关属性
- 通过eventEmitter触发事件

## resume方法执行逻辑

### 步骤1：验证Thread状态
- 检查Thread是否存在
- 检查Thread状态是否为PAUSED
- 如果状态不正确，抛出ValidationError

### 步骤2：调用executeThread方法
- 调用executeThread(thread)
- 等待执行完成

### 步骤3：返回执行结果
- 返回executeThread的结果

## cancel方法执行逻辑

### 步骤1：验证Thread状态
- 检查Thread是否存在
- 检查Thread状态是否为RUNNING或PAUSED
- 如果状态不正确，抛出ValidationError

### 步骤2：设置取消标志
- 在ExecutionContext中设置cancelled标志为true

### 步骤3：等待当前操作完成
- 等待当前节点的执行完成或取消
- 中断执行循环

### 步骤4：更新Thread状态为CANCELLED
- 调用ThreadStateManager更新Thread状态为CANCELLED
- 设置Thread的endTime为当前时间戳

### 步骤5：触发THREAD_CANCELLED事件
- 创建ThreadCancelledEvent
- 设置相关属性
- 通过eventEmitter触发事件

## 错误处理逻辑

### 验证错误
- 如果工作流验证失败，抛出ValidationError
- 不创建Thread实例

### 执行错误
- 如果节点执行失败，调用ErrorHandler处理错误
- 根据错误处理策略决定是否继续执行
- 如果决定停止执行，设置Thread状态为FAILED
- 触发THREAD_FAILED事件

### 超时错误
- 如果执行超时，抛出TimeoutError
- 设置Thread状态为TIMEOUT
- 触发THREAD_FAILED事件

### 取消错误
- 如果执行被取消，设置Thread状态为CANCELLED
- 触发THREAD_CANCELLED事件

## 性能优化

### 节点查询优化
- 使用WorkflowContext的nodeMap快速查询节点
- 避免每次都遍历nodes数组

### 边查询优化
- 使用WorkflowContext的edgeMap快速查询边
- 避免每次都遍历edges数组

### 事件触发优化
- 批量触发事件，减少事件发射次数
- 使用异步事件处理，不阻塞执行流程

### 内存管理
- 及时清理已完成Thread的执行上下文
- 避免内存泄漏

## 注意事项

1. **线程安全**：确保多Thread并发执行时的状态隔离
2. **状态一致性**：确保Thread状态的一致性
3. **错误处理**：妥善处理各种错误情况
4. **事件触发**：及时触发相应事件
5. **资源清理**：及时清理不再使用的资源
6. **超时控制**：严格控制执行时间，避免无限循环