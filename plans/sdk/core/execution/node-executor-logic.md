# NodeExecutor执行逻辑

## 概述
NodeExecutor是节点执行器的基类，定义了节点执行的标准接口和通用逻辑。所有具体的节点执行器都继承自NodeExecutor。

## 核心职责
1. 定义节点执行的标准接口
2. 提供节点执行的通用逻辑
3. 处理节点执行的前置和后置操作
4. 处理超时和重试
5. 触发节点相关事件

## execute方法执行逻辑

### 步骤1：验证节点
- 调用validate(node)验证节点配置
- 如果验证失败，抛出ValidationError

### 步骤2：检查是否可以执行
- 调用canExecute(node, context)检查节点是否可以执行
- 如果不能执行，返回skipped结果

### 步骤3：触发NODE_STARTED事件
- 创建NodeStartedEvent
- 设置event.type为NODE_STARTED
- 设置event.timestamp为当前时间戳
- 设置event.workflowId为工作流ID
- 设置event.threadId为Thread ID
- 设置event.nodeId为节点ID
- 设置event.nodeType为节点类型
- 通过eventEmitter触发事件

### 步骤4：更新节点状态为RUNNING
- 在Thread的nodeResults中创建或更新节点状态
- 设置节点状态为RUNNING

### 步骤5：记录开始时间
- 记录节点执行的开始时间
- 用于计算执行时间

### 步骤6：执行节点
- 调用doExecute(context)执行节点的具体逻辑
- 等待执行结果
- 如果执行超时，抛出TimeoutError

### 步骤7：处理执行结果
- 如果执行成功：
  - 创建NodeExecutionResult
  - 设置success为true
  - 设置output为执行输出
  - 设置executionTime为当前时间 - 开始时间
  - 设置metadata为节点元数据
- 如果执行失败：
  - 捕获错误
  - 创建NodeExecutionResult
  - 设置success为false
  - 设置error为错误信息
  - 设置executionTime为当前时间 - 开始时间
  - 设置metadata为节点元数据

### 步骤8：更新节点状态
- 如果执行成功，更新节点状态为COMPLETED
- 如果执行失败，更新节点状态为FAILED

### 步骤9：触发节点完成事件
- 如果执行成功：
  - 触发NODE_COMPLETED事件
- 如果执行失败：
  - 触发NODE_FAILED事件

### 步骤10：返回执行结果
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点基本信息
- 检查节点ID是否存在
- 检查节点名称是否存在
- 检查节点类型是否合法

### 步骤2：验证节点配置
- 根据节点类型验证节点配置
- 检查必需的配置项是否存在
- 检查配置项的值是否合法

### 步骤3：验证节点输入
- 检查节点输入定义是否合法
- 检查必需的输入是否提供

### 步骤4：验证节点输出
- 检查节点输出定义是否合法

### 步骤5：返回验证结果
- 如果验证通过，返回true
- 如果验证失败，抛出ValidationError

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查节点状态
- 检查节点是否已经执行过
- 如果已经执行完成，返回false

### 步骤3：检查前置条件
- 根据节点类型检查前置条件
- 例如：FORK节点需要检查是否有子Thread
- 例如：JOIN节点需要检查是否有子Thread完成

### 步骤4：返回执行结果
- 如果可以执行，返回true
- 如果不能执行，返回false

## doExecute方法执行逻辑

### 说明
doExecute是抽象方法，由具体的节点执行器实现。每个节点执行器根据自己的业务逻辑实现doExecute方法。

### 子类实现要求
- 必须实现doExecute方法
- 必须返回执行结果
- 必须处理错误情况
- 必须支持超时控制

## 超时控制逻辑

### 步骤1：获取超时配置
- 从节点配置中获取超时时间
- 如果没有配置，使用默认超时时间

### 步骤2：设置超时定时器
- 创建超时定时器
- 设置定时器时间为超时时间

### 步骤3：执行节点
- 调用doExecute(context)执行节点
- 等待执行结果

### 步骤4：处理超时
- 如果在超时时间内完成，清除定时器
- 如果超时，抛出TimeoutError

## 重试逻辑

### 步骤1：获取重试配置
- 从节点配置中获取重试次数
- 从节点配置中获取重试延迟

### 步骤2：初始化重试计数器
- 设置retryCount为0

### 步骤3：执行节点
- 调用doExecute(context)执行节点
- 等待执行结果

### 步骤4：处理执行失败
- 如果执行失败：
  - 检查retryCount是否小于最大重试次数
  - 如果是，增加retryCount
  - 等待重试延迟时间
  - 重新执行节点
  - 如果否，抛出ExecutionError

### 步骤5：返回执行结果
- 如果执行成功，返回执行结果
- 如果重试次数用完，抛出ExecutionError

## 错误处理逻辑

### 步骤1：捕获错误
- 捕获doExecute方法抛出的所有错误

### 步骤2：记录错误
- 将错误信息添加到Thread的errors数组
- 记录错误发生的时间和上下文

### 步骤3：触发错误事件
- 创建ErrorEvent
- 设置相关属性
- 通过eventEmitter触发事件

### 步骤4：调用错误回调
- 如果options.onError存在，调用回调函数
- 传入错误信息和上下文

### 步骤5：决定是否继续执行
- 根据错误处理策略决定是否继续执行
- 如果决定继续，返回失败结果
- 如果决定停止，抛出ExecutionError

## 事件触发逻辑

### NODE_STARTED事件
- 在节点开始执行前触发
- 包含节点ID、节点类型等信息

### NODE_COMPLETED事件
- 在节点执行成功后触发
- 包含节点ID、输出数据、执行时间等信息

### NODE_FAILED事件
- 在节点执行失败后触发
- 包含节点ID、错误信息等信息

## 性能优化

### 异步执行
- 使用async/await支持异步执行
- 不阻塞主线程

### 资源清理
- 及时清理不再使用的资源
- 避免内存泄漏

### 缓存优化
- 缓存节点配置
- 避免重复解析

## 注意事项

1. **状态一致性**：确保节点状态的一致性
2. **错误处理**：妥善处理各种错误情况
3. **事件触发**：及时触发相应事件
4. **超时控制**：严格控制执行时间
5. **重试策略**：合理设置重试次数和延迟
6. **资源清理**：及时清理不再使用的资源