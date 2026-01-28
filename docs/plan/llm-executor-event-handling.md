# LLM Executor 事件处理逻辑设计

## 概述

LLM Executor 需要改造为内部事件的监听者和处理者，负责接收来自各个节点的 LLM 执行请求，并协调工具执行、上下文操作等复杂逻辑。

## 事件监听注册

在 LLMExecutor 的构造函数中，需要注册以下内部事件监听器：

### 1. LLM执行请求监听器

监听 `InternalEventType.LLM_EXECUTION_REQUEST` 事件。

注册时机：LLMExecutor 初始化时
注销时机：LLMExecutor 销毁时

### 2. 工具执行完成监听器

监听 `InternalEventType.TOOL_EXECUTION_COMPLETED` 和 `InternalEventType.TOOL_EXECUTION_FAILED` 事件。

注册时机：LLMExecutor 初始化时
注销时机：LLMExecutor 销毁时

## LLM执行请求处理流程

当接收到 LLM_EXECUTION_REQUEST 事件时，LLMExecutor 执行以下逻辑：

### 步骤1：验证请求

- 检查事件中的必要字段是否完整（workflowId、threadId、nodeId、requestData）
- 验证 requestData 中的 prompt 是否有效
- 验证 profileId 是否存在且有效

### 步骤2：准备执行环境

- 从事件中获取 threadId 和 nodeId
- 获取当前线程的 ConversationManager 实例
- 根据 requestData 中的 contextSnapshot 恢复上下文状态
- 将 prompt 添加到对话历史中

### 步骤3：执行LLM调用

根据 requestData 中的 stream 标志决定执行方式：

#### 非流式调用

- 调用 LLMWrapper 的 generate 方法
- 传入 messages（从 ConversationManager 获取）
- 传入 tools（从 requestData 获取）
- 传入 profileId 和其他参数
- 等待 LLM 响应

#### 流式调用

- 调用 LLMWrapper 的 generateStream 方法
- 使用异步迭代器处理响应流
- 对于每个 chunk，更新对话历史
- 最终收集完整响应

### 步骤4：处理工具调用

如果 LLM 响应中包含 toolCalls：

#### 步骤4.1：发送工具执行请求

- 遍历 toolCalls 数组
- 对于每个 toolCall：
  - 构建 TOOL_EXECUTION_REQUEST 事件
  - 包含 toolCall 信息（id、name、arguments）
  - 包含 executionOptions（timeout、retries 等）
  - 通过 EventManager 发送事件

#### 步骤4.2：等待工具执行结果

- 为每个工具调用创建一个 Promise
- Promise 在接收到对应的 TOOL_EXECUTION_COMPLETED 或 TOOL_EXECUTION_FAILED 事件时 resolve
- 使用 Promise.all 等待所有工具调用完成
- 收集所有工具执行结果

#### 步骤4.3：构建工具消息

- 对于成功的工具调用，构建工具消息（role: 'tool'）
- 对于失败的工具调用，构建包含错误信息的工具消息
- 将所有工具消息添加到对话历史

#### 步骤4.4：继续LLM调用

- 如果有工具调用，再次调用 LLM（递归执行步骤3-4）
- 这是工具调用循环的核心逻辑
- 直到 LLM 不再请求工具调用，或达到最大循环次数

### 步骤5：更新上下文

- 将 LLM 响应添加到对话历史
- 更新 ConversationManager 的状态
- 更新 Token 使用统计

### 步骤6：发送完成事件

- 构建 LLM_EXECUTION_COMPLETED 事件
- 包含执行结果（content、usage、finishReason、toolCalls）
- 包含更新后的上下文快照
- 通过 EventManager 发送事件

### 错误处理

如果在任何步骤发生错误：

- 捕获错误并记录详细信息
- 构建 LLM_EXECUTION_FAILED 事件
- 包含错误信息和错误详情
- 通过 EventManager 发送事件
- 清理临时状态

## 工具执行完成处理流程

当接收到 TOOL_EXECUTION_COMPLETED 或 TOOL_EXECUTION_FAILED 事件时：

### 步骤1：匹配挂起的工具调用

- 从事件中的 toolCallId 查找对应的挂起工具调用
- 如果找到，resolve 对应的 Promise
- 如果未找到，记录警告（可能是超时或重复事件）

### 步骤2：更新状态

- 更新工具执行统计信息
- 记录工具执行结果到日志

## 用户交互处理

对于用户交互节点，LLMExecutor 需要特殊处理：

### 交互请求处理

- 识别节点类型为 user_interaction
- 暂停 LLM 调用循环
- 构建交互提示信息
- 等待用户输入（通过外部机制）

### 交互响应处理

- 接收用户输入
- 将用户消息添加到对话历史
- 继续 LLM 调用循环

## 上下文处理器处理

对于上下文处理器节点：

### 上下文读取

- 从 requestData 中获取需要读取的上下文信息
- 从 ConversationManager 读取相关历史消息
- 将读取结果作为 prompt 的一部分

### 上下文写入

- 从 LLM 响应中提取需要写入的信息
- 更新 ConversationManager 的状态
- 可能需要创建新的消息或更新现有消息

## 回调机制

LLMExecutor 通过事件机制实现回调：

### 完成回调

- 通过发送 LLM_EXECUTION_COMPLETED 事件通知调用方
- 调用方（节点执行器）监听该事件并继续执行

### 进度回调（流式）

- 对于流式响应，可以在每个 chunk 到达时发送中间事件
- 节点执行器可以监听这些事件并实时更新状态

### 错误回调

- 通过发送 LLM_EXECUTION_FAILED 事件通知调用方
- 调用方可以决定重试、跳过或终止执行

## 线程隔离

LLMExecutor 需要确保线程隔离：

### 线程上下文管理

- 每个线程有独立的 ConversationManager 实例
- 通过 threadId 区分不同线程的执行状态
- 工具执行也使用相同的 threadId 进行隔离

### 状态清理

- 线程执行完成后，清理相关的临时状态
- 取消未完成的工具调用 Promise
- 移除事件监听器（如果是一次性的）

## 性能考虑

### 并发控制

- 限制单个线程同时进行的工具调用数量
- 避免过多的并发导致资源耗尽

### 超时管理

- 为 LLM 调用设置超时时间
- 为工具调用设置超时时间
- 超时后发送失败事件并清理状态

### 缓存机制

- 缓存频繁使用的工具定义
- 缓存 LLM 响应（根据配置）

## 日志和调试

### 事件日志

- 记录所有发送和接收的事件
- 包含事件类型、时间戳、关键参数

### 执行追踪

- 为每个 LLM 调用生成唯一的追踪ID
- 记录完整的执行流程（LLM调用 -> 工具调用 -> LLM调用）

### 错误日志

- 详细记录错误信息和堆栈
- 包含上下文信息（threadId、nodeId、toolCallId等）
