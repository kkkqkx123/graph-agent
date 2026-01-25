# EndNodeExecutor执行逻辑

## 概述
EndNodeExecutor负责执行END节点，标记工作流的结束，收集执行结果，并触发THREAD_COMPLETED事件。

## 核心职责
1. 验证END节点的唯一性
2. 收集Thread的输出数据
3. 更新Thread状态为COMPLETED
4. 触发THREAD_COMPLETED事件
5. 返回最终执行结果

## doExecute方法执行逻辑

### 步骤1：验证END节点
- 检查节点类型是否为END
- 检查节点配置是否为空（END节点不需要配置）
- 如果配置不为空，抛出ValidationError

### 步骤2：验证END节点唯一性
- 从WorkflowContext获取所有节点
- 检查是否只有一个END节点
- 如果有多个END节点，抛出ValidationError

### 步骤3：验证END节点出度
- 从WorkflowContext获取END节点的所有出边
- 检查出边数量是否为0
- 如果出边数量不为0，抛出ValidationError

### 步骤4：收集Thread输出
- 从ExecutionContext获取Thread实例
- 收集Thread的output：
  - 如果Thread的output已设置，使用Thread的output
  - 如果Thread的output未设置，从最后一个执行的节点获取output
  - 如果都没有，使用空对象

### 步骤5：更新Thread状态
- 设置Thread的status为COMPLETED
- 设置Thread的endTime为当前时间戳
- 计算executionTime = endTime - startTime

### 步骤6：触发THREAD_COMPLETED事件
- 创建ThreadCompletedEvent
- 设置event.type为THREAD_COMPLETED
- 设置event.timestamp为当前时间戳
- 设置event.workflowId为工作流ID
- 设置event.threadId为Thread ID
- 设置event.output为Thread的output
- 设置event.executionTime为executionTime
- 通过eventEmitter触发事件

### 步骤7：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为END节点ID
- 设置timestamp为当前时间戳
- 设置action为"end"
- 添加到Thread的executionHistory

### 步骤8：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为END节点ID
- 设置success为true
- 设置output为Thread的output
- 设置executionTime为0（END节点不消耗时间）
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为END
- 如果不是，抛出ValidationError

### 步骤2：验证节点配置
- 检查节点配置是否为空或undefined
- 如果配置不为空，抛出ValidationError

### 步骤3：验证节点出度
- 从WorkflowContext获取节点的所有出边
- 检查出边数量是否为0
- 如果出边数量不为0，抛出ValidationError

### 步骤4：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查节点是否已执行
- 检查Thread的nodeResults中是否已包含END节点
- 如果已包含，返回false

### 步骤3：返回执行结果
- 返回true

## 输出收集逻辑

### 优先级1：Thread的output
- 如果Thread的output已设置，直接使用

### 优先级2：最后一个节点的output
- 从Thread的executionHistory获取最后一个执行的节点
- 从Thread的nodeResults获取该节点的output
- 如果output存在，使用该output

### 优先级3：空对象
- 如果以上都没有，使用空对象

## 错误处理逻辑

### 多个END节点错误
- 如果工作流中有多个END节点，抛出ValidationError
- 错误消息："Workflow must have exactly one END node"

### END节点有出边错误
- 如果END节点有出边，抛出ValidationError
- 错误消息："END node must have no outgoing edges"

### END节点有配置错误
- 如果END节点有配置，抛出ValidationError
- 错误消息："END node must have no configuration"

## 注意事项

1. **唯一性**：确保工作流中只有一个END节点
2. **出度检查**：确保END节点没有出边
3. **配置检查**：确保END节点没有配置
4. **输出收集**：正确收集Thread的输出
5. **状态更新**：正确更新Thread状态
6. **事件触发**：及时触发THREAD_COMPLETED事件
7. **历史记录**：记录执行历史