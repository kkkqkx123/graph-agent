# StartNodeExecutor执行逻辑

## 概述
StartNodeExecutor负责执行START节点，标记工作流的开始，初始化Thread状态，并触发THREAD_STARTED事件。

## 核心职责
1. 验证START节点的唯一性
2. 初始化Thread状态
3. 触发THREAD_STARTED事件
4. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：验证START节点
- 检查节点类型是否为START
- 检查节点配置是否为空（START节点不需要配置）
- 如果配置不为空，抛出ValidationError

### 步骤2：验证START节点唯一性
- 从WorkflowContext获取所有节点
- 检查是否只有一个START节点
- 如果有多个START节点，抛出ValidationError

### 步骤3：验证START节点入度
- 从WorkflowContext获取START节点的所有入边
- 检查入边数量是否为0
- 如果入边数量不为0，抛出ValidationError

### 步骤4：初始化Thread状态
- 从ExecutionContext获取Thread实例
- 设置Thread的status为RUNNING
- 设置Thread的currentNodeId为START节点ID
- 设置Thread的startTime为当前时间戳
- 初始化Thread的variables为空数组
- 初始化Thread的nodeResults为空Map
- 初始化Thread的executionHistory为空数组
- 初始化Thread的errors为空数组

### 步骤5：初始化Thread输入
- 从ExecutionContext获取ExecutionOptions
- 设置Thread的input为ExecutionOptions的input
- 如果input为空，设置为空对象

### 步骤6：触发THREAD_STARTED事件
- 创建ThreadStartedEvent
- 设置event.type为THREAD_STARTED
- 设置event.timestamp为当前时间戳
- 设置event.workflowId为工作流ID
- 设置event.threadId为Thread ID
- 设置event.input为Thread的input
- 通过eventEmitter触发事件

### 步骤7：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为START节点ID
- 设置timestamp为当前时间戳
- 设置action为"start"
- 添加到Thread的executionHistory

### 步骤8：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为START节点ID
- 设置success为true
- 设置output为空对象
- 设置executionTime为0（START节点不消耗时间）
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为START
- 如果不是，抛出ValidationError

### 步骤2：验证节点配置
- 检查节点配置是否为空或undefined
- 如果配置不为空，抛出ValidationError

### 步骤3：验证节点入度
- 从WorkflowContext获取节点的所有入边
- 检查入边数量是否为0
- 如果入边数量不为0，抛出ValidationError

### 步骤4：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为CREATED
- 如果不是，返回false

### 步骤2：检查节点是否已执行
- 检查Thread的nodeResults中是否已包含START节点
- 如果已包含，返回false

### 步骤3：返回执行结果
- 返回true

## 错误处理逻辑

### 多个START节点错误
- 如果工作流中有多个START节点，抛出ValidationError
- 错误消息："Workflow must have exactly one START node"

### START节点有入边错误
- 如果START节点有入边，抛出ValidationError
- 错误消息："START node must have no incoming edges"

### START节点有配置错误
- 如果START节点有配置，抛出ValidationError
- 错误消息："START node must have no configuration"

## 注意事项

1. **唯一性**：确保工作流中只有一个START节点
2. **入度检查**：确保START节点没有入边
3. **配置检查**：确保START节点没有配置
4. **状态初始化**：正确初始化Thread状态
5. **事件触发**：及时触发THREAD_STARTED事件
6. **历史记录**：记录执行历史