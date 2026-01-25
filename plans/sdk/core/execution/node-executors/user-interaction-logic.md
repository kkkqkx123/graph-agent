# UserInteractionNodeExecutor执行逻辑

## 概述
UserInteractionNodeExecutor负责执行USER_INTERACTION节点，触发用户交互，等待用户输入，返回用户响应。

## 核心职责
1. 验证用户交互配置
2. 触发用户交互事件
3. 等待用户输入
4. 处理用户响应
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取用户交互配置
- 从节点配置获取userInteractionType
- 从节点配置获取showMessage
- 从节点配置获取userInput（可选）

### 步骤2：验证用户交互配置
- 检查userInteractionType是否存在且不为空
- 检查userInteractionType是否合法（ask_for_approval、ask_for_input、ask_for_selection、show_message）
- 检查showMessage是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：解析showMessage中的变量引用
- 扫描showMessage中的{{variableName}}模式
- 提取所有变量名
- 从VariableManager获取每个变量的值
- 将showMessage中的{{variableName}}替换为实际值

### 步骤4：触发用户交互事件
- 创建UserInteractionEvent
- 设置event.type为USER_INTERACTION
- 设置event.timestamp为当前时间戳
- 设置event.workflowId为工作流ID
- 设置event.threadId为Thread ID
- 设置event.nodeId为节点ID
- 设置event.userInteractionType为用户交互类型
- 设置event.showMessage为解析后的showMessage
- 通过eventEmitter触发事件

### 步骤5：根据交互类型处理

#### ask_for_approval类型
- 等待用户批准或拒绝
- 用户响应：true（批准）或false（拒绝）
- 如果用户拒绝，抛出ExecutionError

#### ask_for_input类型
- 等待用户输入
- 用户响应：输入的字符串
- 如果用户取消，抛出ExecutionError

#### ask_for_selection类型
- 等待用户选择
- 用户响应：选择的选项索引或值
- 如果用户取消，抛出ExecutionError

#### show_message类型
- 显示消息给用户
- 不需要用户输入
- 用户响应：null

### 步骤6：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为USER_INTERACTION节点ID
- 设置timestamp为当前时间戳
- 设置action为"user-interaction"
- 设置details为{userInteractionType, showMessage, userInput}
- 添加到Thread的executionHistory

### 步骤7：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为USER_INTERACTION节点ID
- 设置success为true
- 设置output为{userInput}
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为USER_INTERACTION
- 如果不是，抛出ValidationError

### 步骤2：验证用户交互配置
- 检查userInteractionType是否存在且不为空
- 检查userInteractionType是否合法
- 检查showMessage是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：返回执行结果
- 返回true

## 用户交互类型处理逻辑

### ask_for_approval
- 显示批准/拒绝对话框
- 等待用户点击批准或拒绝按钮
- 如果用户批准，返回true
- 如果用户拒绝，抛出ExecutionError

### ask_for_input
- 显示输入对话框
- 等待用户输入文本
- 如果用户确认，返回输入的文本
- 如果用户取消，抛出ExecutionError

### ask_for_selection
- 显示选择列表
- 等待用户选择一个选项
- 如果用户选择，返回选择的选项
- 如果用户取消，抛出ExecutionError

### show_message
- 显示消息对话框
- 等待用户点击确定按钮
- 返回null

## 消息解析逻辑

### 步骤1：扫描消息
- 使用正则表达式扫描{{variableName}}模式
- 提取所有变量名

### 步骤2：获取变量值
- 从VariableManager获取每个变量的值
- 如果变量不存在，抛出ValidationError

### 步骤3：替换变量引用
- 将消息中的{{variableName}}替换为实际值
- 支持嵌套变量引用

### 步骤4：返回解析后的消息
- 返回解析后的消息

## 超时控制逻辑

### 步骤1：设置超时定时器
- 创建超时定时器
- 设置定时器时间为默认超时时间（300秒）

### 步骤2：等待用户输入
- 等待用户输入
- 如果在超时时间内完成，清除定时器

### 步骤3：处理超时
- 如果超时，抛出TimeoutError
- 错误消息："User interaction timeout"

## 错误处理逻辑

### 用户交互配置错误
- 如果userInteractionType或showMessage缺失，抛出ValidationError
- 错误消息："User interaction node must have userInteractionType and showMessage"

### 用户交互类型错误
- 如果userInteractionType不合法，抛出ValidationError
- 错误消息："Invalid user interaction type: {userInteractionType}"

### 变量不存在错误
- 如果showMessage引用的变量不存在，抛出ValidationError
- 错误消息："Variable not found: {variableName}"

### 用户拒绝错误
- 如果用户拒绝批准，抛出ExecutionError
- 错误消息："User rejected the approval"

### 用户取消错误
- 如果用户取消输入或选择，抛出ExecutionError
- 错误消息："User cancelled the interaction"

### 超时错误
- 如果用户交互超时，抛出TimeoutError
- 错误消息："User interaction timeout after {timeout} seconds"

## 注意事项

1. **配置验证**：严格验证用户交互配置
2. **消息解析**：正确解析消息中的变量引用
3. **交互类型**：正确处理各种交互类型
4. **超时控制**：设置合理的超时时间
5. **错误处理**：妥善处理各种错误情况
6. **用户体验**：提供清晰的用户界面
7. **事件触发**：及时触发用户交互事件