# LLMNodeExecutor执行逻辑

## 概述
LLMNodeExecutor负责执行LLM节点，调用LLM API，处理LLM响应，支持流式和非流式调用。

## 核心职责
1. 验证LLM配置
2. 解析prompt中的变量引用
3. 调用LLM API
4. 处理LLM响应
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取LLM配置
- 从节点配置获取profileId
- 从节点配置获取prompt
- 从节点配置获取parameters（可选）

### 步骤2：验证LLM配置
- 检查profileId是否存在且不为空
- 检查prompt是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：获取LLM Profile
- 从LLMWrapper获取LLM Profile
- 根据profileId查询Profile
- 如果Profile不存在，抛出NotFoundError

### 步骤4：解析prompt中的变量引用
- 扫描prompt中的{{variableName}}模式
- 提取所有变量名
- 从VariableManager获取每个变量的值
- 将prompt中的{{variableName}}替换为实际值

### 步骤5：构建LLM请求
- 创建LLMRequest对象
- 设置profileId为节点配置的profileId
- 设置messages为解析后的prompt
- 如果parameters存在，设置parameters为节点配置的parameters
- 设置stream为false（默认非流式）

### 步骤6：调用LLM API
- 调用LLMWrapper.generate(request)
- 等待LLM响应
- 获取LLMResult

### 步骤7：处理LLM响应
- 如果LLM调用成功：
  - 获取响应内容
  - 获取token使用情况
  - 获取完成原因
- 如果LLM调用失败：
  - 获取错误信息
  - 记录错误

### 步骤8：处理工具调用（如果有）
- 如果LLMResult包含toolCalls：
  - 触发TOOL_CALLED事件
  - 调用ToolService执行工具
  - 等待工具执行完成
  - 将工具调用结果添加到output

### 步骤9：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为LLM节点ID
- 设置timestamp为当前时间戳
- 设置action为"llm"
- 设置details为{profileId, prompt, response, usage}
- 添加到Thread的executionHistory

### 步骤10：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为LLM节点ID
- 设置success为LLM调用是否成功
- 设置output为{content, toolCalls, usage}
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为LLM
- 如果不是，抛出ValidationError

### 步骤2：验证LLM配置
- 检查profileId是否存在且不为空
- 检查prompt是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：验证LLM Profile
- 从LLMWrapper获取LLM Profile
- 检查Profile是否存在
- 如果不存在，抛出ValidationError

### 步骤4：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查LLM Profile是否存在
- 从LLMWrapper获取LLM Profile
- 检查Profile是否存在
- 如果不存在，返回false

### 步骤3：返回执行结果
- 返回true

## Prompt解析逻辑

### 步骤1：扫描prompt
- 使用正则表达式扫描{{variableName}}模式
- 提取所有变量名

### 步骤2：获取变量值
- 从VariableManager获取每个变量的值
- 如果变量不存在，抛出ValidationError

### 步骤3：替换变量引用
- 将prompt中的{{variableName}}替换为实际值
- 支持嵌套变量引用

### 步骤4：返回解析后的prompt
- 返回解析后的prompt

## 工具调用处理逻辑

### 步骤1：检查toolCalls
- 检查LLMResult是否包含toolCalls
- 如果不包含，跳过工具调用处理

### 步骤2：遍历toolCalls
- 对每个toolCall：
  - 触发TOOL_CALLED事件
  - 调用ToolService.execute(toolName, parameters)
  - 等待工具执行完成
  - 触发TOOL_COMPLETED或TOOL_FAILED事件
  - 将工具调用结果添加到output

### 步骤3：返回工具调用结果
- 返回所有工具调用结果

## 流式调用逻辑

### 步骤1：构建流式请求
- 创建LLMRequest对象
- 设置stream为true

### 步骤2：调用流式API
- 调用LLMWrapper.generateStream(request)
- 获取AsyncIterable<LLMResult>

### 步骤3：处理流式响应
- 迭代获取流式结果
- 累积响应内容
- 触发事件通知进度

### 步骤4：返回完整响应
- 返回完整的LLMResult

## 错误处理逻辑

### LLM配置错误
- 如果profileId或prompt缺失，抛出ValidationError
- 错误消息："LLM node must have profileId and prompt"

### LLM Profile不存在错误
- 如果LLM Profile不存在，抛出NotFoundError
- 错误消息："LLM Profile not found: {profileId}"

### 变量不存在错误
- 如果prompt引用的变量不存在，抛出ValidationError
- 错误消息："Variable not found: {variableName}"

### LLM调用错误
- 如果LLM调用失败，抛出LLMError
- 错误消息："LLM call failed: {error}"

### 工具调用错误
- 如果工具调用失败，记录错误
- 根据错误处理策略决定是否继续

## 注意事项

1. **配置验证**：严格验证LLM配置
2. **Profile检查**：确保LLM Profile存在
3. **Prompt解析**：正确解析prompt中的变量引用
4. **工具调用**：正确处理工具调用
5. **错误处理**：妥善处理各种错误情况
6. **流式支持**：支持流式和非流式调用
7. **性能优化**：优化LLM调用性能