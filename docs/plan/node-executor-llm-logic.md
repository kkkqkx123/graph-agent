# LLM节点执行器逻辑设计

## 概述

LLM节点执行器负责执行LLM节点，通过发送内部事件将实际的LLM调用逻辑托管给LLMExecutor处理。

## 执行流程

### 步骤1：验证节点配置

在执行开始前，验证节点配置的有效性：

- 检查节点类型是否为LLM类型
- 验证profileId是否存在且为字符串类型
- 验证prompt是否存在且为字符串类型
- 验证tools配置（如果存在）是否为数组且每个元素包含必要的字段
- 验证parameters配置（如果存在）是否为对象且包含有效的LLM参数

如果验证失败，抛出ValidationError异常。

### 步骤2：准备执行参数

从节点配置中提取执行所需的参数：

- 从config中获取profileId
- 从config中获取prompt模板
- 从config中获取tools列表（可选）
- 从config中获取parameters对象（可选，包含temperature、maxTokens等）
- 从config中获取stream标志（可选，默认为false）

### 步骤3：解析Prompt变量引用

对prompt模板中的变量引用进行解析：

- 使用正则表达式匹配双大括号语法（例如{{variableName}}）
- 对于每个匹配的变量引用：
  - 提取变量路径（支持点号分隔的嵌套路径）
  - 从thread.variableValues中查找对应的变量值
  - 如果变量不存在，保持原样（不替换）
  - 如果变量值为字符串，直接替换
  - 如果变量值为对象，转换为JSON字符串后替换
  - 其他类型转换为字符串后替换

### 步骤4：构建LLM执行请求

创建LLM执行请求对象：

- 设置nodeId为当前节点ID
- 设置nodeType为'LLM'
- 构建requestData对象：
  - prompt：解析后的prompt文本
  - tools：从节点配置获取的工具列表（转换为LLM需要的格式）
  - profileId：从节点配置获取的profileId
  - parameters：从节点配置获取的LLM参数
  - stream：从节点配置获取的流式标志
- 构建contextSnapshot对象：
  - 从thread中获取当前的对话历史（如果有）
  - 从thread中获取variableValues
  - 从thread中获取nodeResults

### 步骤5：发送LLM执行请求事件

通过EventManager发送内部事件：

- 创建LLMExecutionRequestEvent对象
- 设置type为InternalEventType.LLM_EXECUTION_REQUEST
- 设置workflowId为thread.workflowId
- 设置threadId为thread.id
- 设置nodeId为当前节点ID
- 设置requestData为步骤4构建的请求数据
- 设置contextSnapshot为步骤4构建的上下文快照
- 通过eventManager.emitInternal()发送事件

### 步骤6：等待执行完成

发送事件后，节点执行器需要等待LLMExecutor完成执行：

- 创建Promise对象用于等待结果
- 注册一次性监听器监听LLM_EXECUTION_COMPLETED事件
- 注册一次性监听器监听LLM_EXECUTION_FAILED事件
- 使用Promise.race设置超时（从节点配置获取timeout，默认为30秒）
- 如果超时，清理监听器并抛出TimeoutError异常

### 步骤7：处理执行结果

当接收到LLM_EXECUTION_COMPLETED事件时：

- 从事件中提取result对象
- 提取content、usage、finishReason、toolCalls等信息
- 如果存在toolCalls，提取工具调用信息
- 从事件中获取updatedContext（如果有）
- 更新thread的上下文数据（如果需要）

### 步骤8：记录执行历史

将执行结果记录到thread.nodeResults中：

- 创建NodeExecutionResult对象
- 设置step为当前步骤数（thread.nodeResults.length + 1）
- 设置nodeId为当前节点ID
- 设置nodeType为'LLM'
- 设置status为'COMPLETED'
- 设置timestamp为当前时间
- 设置output为执行结果（包含content、usage、finishReason、toolCalls等）

### 步骤9：返回执行结果

返回包含以下信息的对象：

- content：LLM响应内容
- usage：Token使用情况
- finishReason：完成原因
- toolCalls：工具调用列表（如果有）
- toolResults：工具执行结果列表（如果有）

## 错误处理

### 验证错误

如果在步骤1验证失败：

- 抛出ValidationError异常
- 包含详细的错误信息和字段名
- 节点执行器捕获异常并记录到thread.errors

### 变量解析错误

如果在步骤3解析变量时发生错误：

- 记录警告日志
- 保持变量引用原样（不替换）
- 继续执行流程

### LLM执行失败

如果在步骤6接收到LLM_EXECUTION_FAILED事件：

- 从事件中提取error信息
- 记录错误日志
- 抛出ExecutionError异常
- 包含错误信息和原始错误详情

### 超时错误

如果在步骤6发生超时：

- 清理事件监听器
- 抛出TimeoutError异常
- 包含超时时间信息

### 未知错误

如果在任何步骤发生未知错误：

- 捕获错误并记录详细日志
- 抛出ExecutionError异常
- 包含错误信息和堆栈跟踪

## 流式响应支持

如果节点配置中stream为true：

- 在步骤4的requestData中设置stream为true
- 在步骤6中，LLMExecutor会通过多次事件发送响应chunk
- 节点执行器需要监听中间事件并实时更新状态
- 最终收集所有chunk组成完整响应

## 工具调用循环支持

如果LLM响应包含toolCalls：

- LLMExecutor会自动处理工具调用循环
- 节点执行器在步骤7接收到的result中可能包含toolResults
- 节点执行器将toolResults记录到执行历史中
- 节点执行器返回的结果包含完整的工具调用和执行结果信息

## 线程安全考虑

- 所有对thread对象的读取操作应该是线程安全的（只读访问）
- 对thread.nodeResults的写入应该使用线程安全的方式
- 事件监听器应该使用一次性监听器，避免重复触发
- Promise的resolve和reject应该只调用一次

## 日志和调试

- 记录每个步骤的执行时间和关键参数
- 记录发送和接收的事件类型和时间戳
- 记录LLM调用的详细信息（profileId、prompt长度等）
- 记录工具调用的数量和名称
- 在发生错误时记录详细的错误信息和上下文
