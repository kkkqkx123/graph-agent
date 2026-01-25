# ForkNodeExecutor执行逻辑

## 概述
ForkNodeExecutor负责执行FORK节点，创建子Thread，支持串行和并行分叉策略，并触发THREAD_FORKED事件。

## 核心职责
1. 验证Fork配置
2. 创建子Thread
3. 根据策略执行子Thread
4. 触发THREAD_FORKED事件
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取Fork配置
- 从节点配置获取forkId
- 从节点配置获取forkStrategy

### 步骤2：验证Fork配置
- 检查forkId是否存在且不为空
- 检查forkStrategy是否合法（SERIAL或PARALLEL）
- 如果配置不合法，抛出ValidationError

### 步骤3：获取Fork节点的出边
- 从WorkflowContext获取Fork节点
- 获取Fork节点的所有出边
- 每个出边代表一个子Thread的执行路径

### 步骤4：验证出边数量
- 检查出边数量是否大于0
- 如果出边数量为0，抛出ValidationError

### 步骤5：创建子Thread
- 调用ForkJoinManager.fork(parentThread, config)
- 传入父Thread和Fork配置
- 等待子Thread创建完成
- 获取子Thread数组

### 步骤6：根据策略执行子Thread
- 如果forkStrategy为SERIAL：
  - 串行执行子Thread
  - 依次执行每个子Thread
  - 等待所有子Thread完成
- 如果forkStrategy为PARALLEL：
  - 并行执行子Thread
  - 同时执行所有子Thread
  - 等待所有子Thread完成

### 步骤7：收集子Thread结果
- 收集所有子Thread的output
- 收集所有子Thread的执行结果
- 创建结果数组

### 步骤8：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为FORK节点ID
- 设置timestamp为当前时间戳
- 设置action为"fork"
- 设置details为{forkId, forkStrategy, childThreadIds}
- 添加到Thread的executionHistory

### 步骤9：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为FORK节点ID
- 设置success为true
- 设置output为{childThreadIds, results}
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为FORK
- 如果不是，抛出ValidationError

### 步骤2：验证Fork配置
- 检查forkId是否存在且不为空
- 检查forkStrategy是否合法
- 如果配置不合法，抛出ValidationError

### 步骤3：验证出边数量
- 从WorkflowContext获取节点的所有出边
- 检查出边数量是否大于0
- 如果出边数量为0，抛出ValidationError

### 步骤4：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查是否有可用的出边
- 从WorkflowContext获取节点的所有出边
- 检查出边数量是否大于0
- 如果出边数量为0，返回false

### 步骤3：返回执行结果
- 返回true

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

## 子Thread创建逻辑

### 步骤1：复制父Thread状态
- 复制父Thread的variables到子Thread
- 复制父Thread的input到子Thread
- 复制父Thread的metadata到子Thread

### 步骤2：设置子Thread属性
- 设置workflowId为父Thread的workflowId
- 设置workflowVersion为父Thread的workflowVersion
- 设置parentThreadId为父Thread的ID
- 设置currentNodeId为出边的targetNodeId
- 初始化子Thread的状态为CREATED

### 步骤3：初始化子Thread执行历史
- 初始化子Thread的nodeResults为空Map
- 初始化子Thread的executionHistory为空数组
- 初始化子Thread的errors为空数组

### 步骤4：返回子Thread
- 返回创建的子Thread

## 错误处理逻辑

### Fork配置错误
- 如果forkId或forkStrategy缺失，抛出ValidationError
- 错误消息："Fork node must have forkId and forkStrategy"

### 出边数量错误
- 如果Fork节点没有出边，抛出ValidationError
- 错误消息："Fork node must have at least one outgoing edge"

### 子Thread执行失败
- 如果子Thread执行失败，记录错误
- 根据错误处理策略决定是否继续执行其他子Thread

## 注意事项

1. **配置验证**：严格验证Fork配置
2. **出边检查**：确保Fork节点有出边
3. **子Thread创建**：正确创建子Thread
4. **策略执行**：根据策略正确执行子Thread
5. **错误处理**：妥善处理子Thread执行失败
6. **事件触发**：及时触发THREAD_FORKED事件
7. **资源管理**：及时清理不再需要的资源