# JoinNodeExecutor执行逻辑

## 概述
JoinNodeExecutor负责执行JOIN节点，等待子Thread完成，根据策略合并结果，并触发THREAD_JOINED事件。

## 核心职责
1. 验证Join配置
2. 等待子Thread完成
3. 根据策略判断是否继续
4. 合并子Thread结果
5. 触发THREAD_JOINED事件
6. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取Join配置
- 从节点配置获取joinId
- 从节点配置获取joinStrategy
- 从节点配置获取threshold（如果joinStrategy为SUCCESS_COUNT_THRESHOLD）
- 从节点配置获取timeout

### 步骤2：验证Join配置
- 检查joinId是否存在且不为空
- 检查joinStrategy是否合法
- 如果joinStrategy为SUCCESS_COUNT_THRESHOLD，检查threshold是否存在
- 检查timeout是否存在且大于0
- 如果配置不合法，抛出ValidationError

### 步骤3：获取子Thread
- 从Thread的metadata获取childThreadIds
- 根据childThreadIds获取所有子Thread
- 如果没有子Thread，抛出ValidationError

### 步骤4：等待子Thread完成
- 调用ForkJoinManager.join(parentThread, childThreads, config)
- 传入父Thread、子Thread数组和Join配置
- 等待子Thread完成或超时
- 获取JoinResult

### 步骤5：处理Join结果
- 如果JoinResult.success为true：
  - 合并子Thread结果
  - 更新父Thread的output
- 如果JoinResult.success为false：
  - 记录错误信息
  - 根据错误处理策略决定是否继续

### 步骤6：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为JOIN节点ID
- 设置timestamp为当前时间戳
- 设置action为"join"
- 设置details为{joinId, joinStrategy, completedThreads, failedThreads}
- 添加到Thread的executionHistory

### 步骤7：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为JOIN节点ID
- 设置success为JoinResult.success
- 设置output为JoinResult.output
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为JOIN
- 如果不是，抛出ValidationError

### 步骤2：验证Join配置
- 检查joinId是否存在且不为空
- 检查joinStrategy是否合法
- 如果joinStrategy为SUCCESS_COUNT_THRESHOLD，检查threshold是否存在
- 检查timeout是否存在且大于0
- 如果配置不合法，抛出ValidationError

### 步骤3：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查是否有子Thread
- 从Thread的metadata获取childThreadIds
- 检查childThreadIds是否存在且不为空
- 如果没有子Thread，返回false

### 步骤3：返回执行结果
- 返回true

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

## 结果合并逻辑

### 单个结果
- 如果只有一个子Thread，直接使用其output

### 多个结果
- 如果有多个子Thread，将output合并为数组或对象
- 合并方式：
  - 如果所有output都是对象，合并为一个对象
  - 如果所有output都是数组，合并为一个数组
  - 否则，合并为一个数组

### 错误结果
- 如果有子Thread失败，记录错误信息
- 根据合并策略决定是否包含错误结果

## 超时处理逻辑

### 步骤1：设置超时定时器
- 创建超时定时器
- 设置定时器时间为timeout

### 步骤2：等待子Thread完成
- 等待子Thread完成
- 如果在超时时间内完成，清除定时器

### 步骤3：处理超时
- 如果超时，取消所有未完成的子Thread
- 抛出TimeoutError

## 错误处理逻辑

### Join配置错误
- 如果joinId、joinStrategy或timeout缺失，抛出ValidationError
- 错误消息："Join node must have joinId, joinStrategy, and timeout"

### 子Thread不存在错误
- 如果没有子Thread，抛出ValidationError
- 错误消息："Join node must have child threads"

### 超时错误
- 如果等待超时，抛出TimeoutError
- 错误消息："Join timeout after {timeout} seconds"

### 子Thread执行失败
- 如果子Thread执行失败，记录错误
- 根据合并策略决定是否继续

## 注意事项

1. **配置验证**：严格验证Join配置
2. **子Thread检查**：确保有子Thread
3. **超时控制**：严格控制等待时间
4. **合并策略**：正确实现各种合并策略
5. **结果合并**：正确合并子Thread结果
6. **错误处理**：妥善处理各种错误情况
7. **事件触发**：及时触发THREAD_JOINED事件
8. **资源清理**：及时取消不再需要的子Thread