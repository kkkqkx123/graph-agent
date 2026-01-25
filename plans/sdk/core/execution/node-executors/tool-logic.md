# ToolNodeExecutor执行逻辑

## 概述
ToolNodeExecutor负责执行TOOL节点，调用工具服务，处理工具响应，支持超时和重试。

## 核心职责
1. 验证工具配置
2. 解析参数中的变量引用
3. 调用工具服务
4. 处理工具响应
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取工具配置
- 从节点配置获取toolName
- 从节点配置获取parameters
- 从节点配置获取timeout（可选）
- 从节点配置获取retries（可选）

### 步骤2：验证工具配置
- 检查toolName是否存在且不为空
- 检查parameters是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：验证工具是否存在
- 从ToolService获取工具定义
- 根据toolName查询工具
- 如果工具不存在，抛出NotFoundError

### 步骤4：解析参数中的变量引用
- 遍历parameters对象
- 扫描每个参数值中的{{variableName}}模式
- 提取所有变量名
- 从VariableManager获取每个变量的值
- 将参数值中的{{variableName}}替换为实际值

### 步骤5：验证参数
- 调用ToolService.validateParameters(tool, parameters)
- 验证参数是否符合工具的schema
- 如果验证失败，抛出ValidationError

### 步骤6：构建工具执行选项
- 创建ToolExecutionOptions对象
- 如果timeout存在，设置timeout
- 如果retries存在，设置retries
- 设置retryDelay为默认值（1000ms）

### 步骤7：调用工具服务
- 调用ToolService.execute(toolName, parameters, options)
- 等待工具执行完成
- 获取ToolExecutionResult

### 步骤8：处理工具响应
- 如果工具执行成功：
  - 获取工具输出
  - 获取执行时间
- 如果工具执行失败：
  - 获取错误信息
  - 记录错误

### 步骤9：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为TOOL节点ID
- 设置timestamp为当前时间戳
- 设置action为"tool"
- 设置details为{toolName, parameters, result}
- 添加到Thread的executionHistory

### 步骤10：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为TOOL节点ID
- 设置success为工具执行是否成功
- 设置output为工具输出
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为TOOL
- 如果不是，抛出ValidationError

### 步骤2：验证工具配置
- 检查toolName是否存在且不为空
- 检查parameters是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：验证工具是否存在
- 从ToolService获取工具定义
- 检查工具是否存在
- 如果不存在，抛出ValidationError

### 步骤4：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查工具是否存在
- 从ToolService获取工具定义
- 检查工具是否存在
- 如果不存在，返回false

### 步骤3：返回执行结果
- 返回true

## 参数解析逻辑

### 步骤1：遍历参数对象
- 遍历parameters对象的所有键值对

### 步骤2：扫描参数值
- 使用正则表达式扫描{{variableName}}模式
- 提取所有变量名

### 步骤3：获取变量值
- 从VariableManager获取每个变量的值
- 如果变量不存在，抛出ValidationError

### 步骤4：替换变量引用
- 将参数值中的{{variableName}}替换为实际值
- 支持嵌套变量引用

### 步骤5：返回解析后的参数
- 返回解析后的参数对象

## 参数验证逻辑

### 步骤1：获取工具schema
- 从工具定义获取parameters schema

### 步骤2：验证必需参数
- 检查所有required参数是否提供
- 如果有必需参数缺失，抛出ValidationError

### 步骤3：验证参数类型
- 检查每个参数的类型是否匹配schema
- 如果类型不匹配，尝试类型转换
- 如果转换失败，抛出ValidationError

### 步骤4：验证参数约束
- 检查参数的约束条件（enum、format等）
- 如果约束不满足，抛出ValidationError

### 步骤5：返回验证结果
- 返回true

## 超时控制逻辑

### 步骤1：设置超时定时器
- 创建超时定时器
- 设置定时器时间为timeout

### 步骤2：执行工具
- 调用ToolService.execute
- 等待工具执行完成

### 步骤3：处理超时
- 如果在超时时间内完成，清除定时器
- 如果超时，终止工具执行
- 抛出TimeoutError

## 重试逻辑

### 步骤1：初始化重试计数器
- 设置retryCount为0

### 步骤2：执行工具
- 调用ToolService.execute
- 等待工具执行完成

### 步骤3：处理执行失败
- 如果执行失败：
  - 检查retryCount是否小于retries
  - 如果是，增加retryCount
  - 等待retryDelay时间
  - 重新执行工具
  - 重复步骤2-3
  - 如果否，抛出ExecutionError

### 步骤4：返回执行结果
- 如果执行成功，返回执行结果
- 如果重试次数用完，抛出ExecutionError

## 错误处理逻辑

### 工具配置错误
- 如果toolName或parameters缺失，抛出ValidationError
- 错误消息："Tool node must have toolName and parameters"

### 工具不存在错误
- 如果工具不存在，抛出NotFoundError
- 错误消息："Tool not found: {toolName}"

### 变量不存在错误
- 如果参数引用的变量不存在，抛出ValidationError
- 错误消息："Variable not found: {variableName}"

### 参数验证错误
- 如果参数验证失败，抛出ValidationError
- 错误消息："Parameter validation failed: {error}"

### 工具执行错误
- 如果工具执行失败，抛出ToolExecutionError
- 错误消息："Tool execution failed: {error}"

### 超时错误
- 如果工具执行超时，抛出TimeoutError
- 错误消息："Tool execution timeout after {timeout} seconds"

## 注意事项

1. **配置验证**：严格验证工具配置
2. **工具检查**：确保工具存在
3. **参数解析**：正确解析参数中的变量引用
4. **参数验证**：严格验证参数
5. **超时控制**：严格控制执行时间
6. **重试策略**：合理设置重试次数和延迟
7. **错误处理**：妥善处理各种错误情况