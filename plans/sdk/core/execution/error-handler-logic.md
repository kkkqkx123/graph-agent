# ErrorHandler执行逻辑

## 概述
ErrorHandler负责处理工作流执行过程中的错误，包括错误捕获、错误分类、错误处理策略决策、重试机制和错误事件触发。

## 核心职责
1. 捕获执行过程中的错误
2. 根据错误类型进行分类
3. 根据错误处理策略决定处理方式
4. 决定是否重试
5. 触发错误事件
6. 记录错误信息

## handleError方法执行逻辑

### 步骤1：捕获错误
- 捕获执行过程中抛出的错误
- 保存原始错误对象

### 步骤2：分类错误
- 根据错误类型进行分类：
  - ValidationError：验证错误
  - ExecutionError：执行错误
  - ConfigurationError：配置错误
  - TimeoutError：超时错误
  - NotFoundError：资源未找到错误
  - NetworkError：网络错误
  - LLMError：LLM调用错误
  - ToolError：工具调用错误

### 步骤3：转换错误为SDK错误
- 将原始错误转换为SDK统一的错误类型
- 保留原始错误信息
- 添加错误上下文信息
- 生成错误码

### 步骤4：记录错误
- 将错误信息添加到Thread的errors数组
- 记录错误发生的时间戳
- 记录错误发生的节点ID（如果有）
- 记录错误的堆栈跟踪

### 步骤5：触发ERROR事件
- 创建ErrorEvent
- 设置event.type为ERROR
- 设置event.timestamp为当前时间戳
- 设置event.workflowId为工作流ID
- 设置event.threadId为Thread ID
- 设置event.nodeId为节点ID（如果有）
- 设置event.error为错误信息
- 设置event.stackTrace为堆栈跟踪
- 通过eventEmitter触发事件

### 步骤6：调用错误回调
- 如果options.onError存在，调用回调函数
- 传入错误信息和上下文
- 等待回调完成

### 步骤7：决定错误处理策略
- 根据错误类型和配置决定处理策略：
  - 继续执行：忽略错误，继续执行下一个节点
  - 停止执行：停止工作流执行，返回失败结果
  - 重试：重试当前节点
  - 跳过：跳过当前节点，执行下一个节点

### 步骤8：返回错误处理结果
- 创建ErrorHandlingResult
- 设置action为处理策略（CONTINUE、STOP、RETRY、SKIP）
- 设置error为错误信息
- 设置shouldContinue为是否继续执行
- 返回ErrorHandlingResult

## shouldRetry方法执行逻辑

### 步骤1：检查错误类型
- 判断错误类型是否可重试：
  - 可重试的错误：
    - NetworkError：网络错误
    - TimeoutError：超时错误
    - RateLimitError：速率限制错误（429）
    - ServerError：服务器错误（5xx）
  - 不可重试的错误：
    - ValidationError：验证错误
    - AuthenticationError：认证错误（401）
    - PermissionError：权限错误（403）
    - NotFoundError：资源未找到错误（404）
    - ConfigurationError：配置错误

### 步骤2：检查重试次数
- 检查retries是否小于最大重试次数
- 如果retries >= maxRetries，返回false

### 步骤3：检查错误消息
- 某些错误消息可能包含不可重试的信息
- 检查错误消息是否包含"permanent"、"fatal"等关键词
- 如果包含，返回false

### 步骤4：返回重试决策
- 如果满足所有重试条件，返回true
- 否则，返回false

## getRetryDelay方法执行逻辑

### 步骤1：获取重试配置
- 从节点配置或工作流配置获取retryDelay
- 如果没有配置，使用默认重试延迟（1000ms）

### 步骤2：计算重试延迟
- 支持多种重试延迟策略：
  - 固定延迟：使用配置的retryDelay
  - 指数退避：delay = retryDelay * (2 ^ retries)
  - 线性退避：delay = retryDelay * (retries + 1)
  - 随机延迟：delay = retryDelay * (1 + Math.random())

### 步骤3：限制最大延迟
- 检查计算出的延迟是否超过最大延迟
- 如果超过，使用最大延迟
- 最大延迟默认为30000ms（30秒）

### 步骤4：返回重试延迟
- 返回计算出的重试延迟（毫秒）

## 错误分类逻辑

### ValidationError
- 触发条件：工作流定义、节点配置、参数验证失败
- 处理策略：停止执行
- 可重试：否

### ExecutionError
- 触发条件：节点执行失败
- 处理策略：根据配置决定
- 可重试：根据错误类型决定

### ConfigurationError
- 触发条件：配置错误
- 处理策略：停止执行
- 可重试：否

### TimeoutError
- 触发条件：执行超时
- 处理策略：停止执行或重试
- 可重试：是

### NotFoundError
- 触发条件：资源未找到
- 处理策略：停止执行
- 可重试：否

### NetworkError
- 触发条件：网络连接失败
- 处理策略：重试或停止执行
- 可重试：是

### LLMError
- 触发条件：LLM调用失败
- 处理策略：重试或停止执行
- 可重试：根据错误类型决定

### ToolError
- 触发条件：工具调用失败
- 处理策略：重试或停止执行
- 可重试：根据错误类型决定

## 错误处理策略

### CONTINUE策略
- 忽略错误，继续执行下一个节点
- 适用于非关键错误
- 记录错误信息

### STOP策略
- 停止工作流执行
- 设置Thread状态为FAILED
- 返回失败结果

### RETRY策略
- 重试当前节点
- 等待重试延迟
- 增加重试计数器

### SKIP策略
- 跳过当前节点
- 执行下一个节点
- 记录跳过信息

## 错误上下文

### 错误上下文信息
- workflowId：工作流ID
- threadId：线程ID
- nodeId：节点ID（如果有）
- nodeType：节点类型（如果有）
- timestamp：错误发生时间
- stackTrace：堆栈跟踪
- cause：原始错误（如果有）

### 错误上下文用途
- 用于错误诊断
- 用于错误日志
- 用于错误分析

## 错误恢复

### 自动恢复
- 对于可重试的错误，自动重试
- 对于网络错误，自动重试
- 对于超时错误，自动重试

### 手动恢复
- 对于不可重试的错误，需要手动干预
- 提供错误信息和建议
- 支持从检查点恢复

## 性能优化

### 错误缓存
- 缓存错误信息
- 避免重复处理相同的错误

### 错误聚合
- 聚合相同的错误
- 减少错误事件触发次数

### 异步处理
- 异步触发错误事件
- 不阻塞执行流程

## 注意事项

1. **错误分类**：正确分类错误类型
2. **重试策略**：合理设置重试次数和延迟
3. **错误记录**：完整记录错误信息
4. **事件触发**：及时触发错误事件
5. **上下文信息**：提供丰富的错误上下文
6. **性能优化**：优化错误处理性能