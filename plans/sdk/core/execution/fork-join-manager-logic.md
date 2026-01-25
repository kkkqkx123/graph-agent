# ForkJoinManager执行逻辑

## 概述
ForkJoinManager负责Thread的分叉（Fork）和合并（Join）操作，支持串行和并行执行策略，以及多种合并策略。

## 核心职责
1. 创建子Thread
2. 协调子Thread的执行
3. 等待子Thread完成
4. 根据策略合并子Thread的结果
5. 处理超时和错误

## fork方法执行逻辑

### 步骤1：验证Fork配置
- 检查forkId是否存在
- 检查forkStrategy是否合法（SERIAL或PARALLEL）
- 如果配置不合法，抛出ValidationError

### 步骤2：获取Fork节点的出边
- 从WorkflowContext获取Fork节点
- 获取Fork节点的所有出边
- 每个出边代表一个子Thread的执行路径

### 步骤3：创建子Thread
- 初始化子Thread数组
- 对每个出边：
  - 创建新的Thread实例
  - 设置workflowId为父Thread的workflowId
  - 设置workflowVersion为父Thread的workflowVersion
  - 复制父Thread的variables到子Thread
  - 复制父Thread的input到子Thread
  - 设置parentThreadId为父Thread的ID
  - 设置currentNodeId为出边的targetNodeId
  - 初始化子Thread的状态为CREATED
  - 添加到子Thread数组

### 步骤4：触发THREAD_FORKED事件
- 创建ThreadForkedEvent
- 设置event.type为THREAD_FORKED
- 设置event.timestamp为当前时间戳
- 设置event.workflowId为工作流ID
- 设置event.parentThreadId为父Thread ID
- 设置event.childThreadIds为子Thread ID数组
- 通过eventEmitter触发事件

### 步骤5：根据策略执行子Thread
- 如果forkStrategy为SERIAL：
  - 串行执行子Thread
- 如果forkStrategy为PARALLEL：
  - 并行执行子Thread

### 步骤6：返回子Thread数组
- 返回创建的子Thread数组

## join方法执行逻辑

### 步骤1：验证Join配置
- 检查joinId是否存在
- 检查joinStrategy是否合法
- 如果joinStrategy为SUCCESS_COUNT_THRESHOLD，检查threshold是否存在
- 检查timeout是否存在
- 如果配置不合法，抛出ValidationError

### 步骤2：等待子Thread完成
- 调用waitForCompletion(threads, strategy, timeout)
- 等待子Thread完成或超时

### 步骤3：根据策略判断是否继续
- 根据joinStrategy判断：
  - ALL_COMPLETED：所有子Thread都完成
  - ANY_COMPLETED：任意一个子Thread完成
  - ALL_FAILED：所有子Thread都失败
  - ANY_FAILED：任意一个子Thread失败
  - SUCCESS_COUNT_THRESHOLD：成功数量达到阈值

### 步骤4：合并子Thread结果
- 收集所有子Thread的output
- 根据合并策略合并结果：
  - 如果只有一个子Thread，直接使用其output
  - 如果有多个子Thread，将output合并为数组或对象

### 步骤5：触发THREAD_JOINED事件
- 创建ThreadJoinedEvent
- 设置event.type为THREAD_JOINED
- 设置event.timestamp为当前时间戳
- 设置event.workflowId为工作流ID
- 设置event.parentThreadId为父Thread ID
- 设置event.childThreadIds为子Thread ID数组
- 设置event.joinStrategy为合并策略
- 通过eventEmitter触发事件

### 步骤6：返回合并结果
- 创建JoinResult
- 设置success为是否成功
- 设置output为合并后的输出
- 设置completedThreads为完成的子Thread数组
- 设置failedThreads为失败的子Thread数组
- 返回JoinResult

## waitForCompletion方法执行逻辑

### 步骤1：初始化状态
- 创建completedThreads数组
- 创建failedThreads数组
- 创建pendingThreads数组，初始为所有子Thread
- 设置startTime为当前时间戳

### 步骤2：进入等待循环
- 循环直到满足退出条件

### 步骤3：检查超时
- 计算elapsedTime = 当前时间 - startTime
- 如果elapsedTime > timeout：
  - 抛出TimeoutError

### 步骤4：检查子Thread状态
- 遍历pendingThreads
- 检查每个Thread的状态：
  - 如果状态为COMPLETED：
    - 添加到completedThreads
    - 从pendingThreads移除
  - 如果状态为FAILED：
    - 添加到failedThreads
    - 从pendingThreads移除
  - 如果状态为CANCELLED：
    - 添加到failedThreads
    - 从pendingThreads移除

### 步骤5：根据策略判断是否退出
- 根据joinStrategy判断：
  - ALL_COMPLETED：
    - 如果pendingThreads为空，退出循环
  - ANY_COMPLETED：
    - 如果completedThreads不为空，退出循环
  - ALL_FAILED：
    - 如果pendingThreads为空且failedThreads.length == threads.length，退出循环
  - ANY_FAILED：
    - 如果failedThreads不为空，退出循环
  - SUCCESS_COUNT_THRESHOLD：
    - 如果completedThreads.length >= threshold，退出循环

### 步骤6：等待一段时间
- 等待100ms（可配置）
- 继续循环

### 步骤7：返回完成的Thread数组
- 返回completedThreads和failedThreads

## 串行执行逻辑

### 步骤1：初始化结果数组
- 创建results数组

### 步骤2：依次执行子Thread
- 对每个子Thread：
  - 调用WorkflowExecutor.executeThread(thread)
  - 等待执行完成
  - 将结果添加到results数组
  - 如果执行失败，根据错误处理策略决定是否继续

### 步骤3：返回结果数组
- 返回results数组

## 并行执行逻辑

### 步骤1：创建Promise数组
- 创建promises数组

### 步骤2：并行执行子Thread
- 对每个子Thread：
  - 创建Promise，调用WorkflowExecutor.executeThread(thread)
  - 将Promise添加到promises数组

### 步骤3：等待所有Promise完成
- 调用Promise.all(promises)
- 等待所有子Thread完成

### 步骤4：返回结果数组
- 返回所有Promise的结果数组

## 合并策略逻辑

### ALL_COMPLETED策略
- 等待所有子Thread完成
- 如果所有子Thread都成功，合并所有output
- 如果有子Thread失败，返回失败结果

### ANY_COMPLETED策略
- 等待任意一个子Thread完成
- 返回第一个完成的子Thread的output
- 取消其他未完成的子Thread

### ALL_FAILED策略
- 等待所有子Thread完成
- 如果所有子Thread都失败，返回失败结果
- 如果有子Thread成功，返回成功结果

### ANY_FAILED策略
- 等待任意一个子Thread失败
- 返回失败结果
- 取消其他未完成的子Thread

### SUCCESS_COUNT_THRESHOLD策略
- 等待成功数量达到阈值
- 合并所有成功的子Thread的output
- 取消其他未完成的子Thread

## 错误处理逻辑

### 子Thread执行失败
- 记录失败的子Thread
- 根据joinStrategy决定是否继续等待
- 如果决定停止，抛出ExecutionError

### 超时错误
- 如果等待超时，抛出TimeoutError
- 取消所有未完成的子Thread

### 合并失败
- 如果合并结果失败，抛出ExecutionError
- 记录错误上下文

## 性能优化

### 并行执行优化
- 使用Promise.all并行执行子Thread
- 提高执行效率

### 资源管理
- 及时取消不再需要的子Thread
- 释放资源

### 状态检查优化
- 使用事件监听，避免轮询
- 提高响应速度

## 注意事项

1. **线程安全**：确保子Thread的状态隔离
2. **超时控制**：严格控制等待时间
3. **资源清理**：及时取消不再需要的子Thread
4. **错误处理**：妥善处理各种错误情况
5. **合并策略**：正确实现各种合并策略
6. **事件触发**：及时触发相应事件