# 内部事件类型定义文档

## 需要添加的内部事件类型

基于现有代码分析，需要在 `sdk/types/internal-events.ts` 中添加以下内部事件类型：

### 1. LLM执行请求事件

**事件名称**：`LLM_EXECUTION_REQUEST`

**用途**：当LLM节点、工具节点、上下文处理器节点或用户交互节点需要执行LLM调用时发送此事件。

**事件结构**：
- type: InternalEventType.LLM_EXECUTION_REQUEST
- timestamp: 事件创建时间
- workflowId: 关联的工作流ID
- threadId: 关联的线程ID
- nodeId: 请求执行的节点ID
- nodeType: 节点类型（llm、tool、context_processor、user_interaction）
- requestData: LLM请求数据，包含：
  - prompt: 处理后的prompt文本
  - tools: 可用工具列表（可选）
  - profileId: LLM配置ID
  - parameters: LLM参数（temperature、maxTokens等）
  - stream: 是否流式响应
- contextSnapshot: 当前上下文快照，包含：
  - conversationHistory: 对话历史
  - variableValues: 变量值映射
  - nodeResults: 节点执行结果

### 2. 工具执行请求事件

**事件名称**：`TOOL_EXECUTION_REQUEST`

**用途**：当LLMExecutor需要执行工具调用时发送此事件。

**事件结构**：
- type: InternalEventType.TOOL_EXECUTION_REQUEST
- timestamp: 事件创建时间
- workflowId: 关联的工作流ID
- threadId: 关联的线程ID
- toolCall: 工具调用信息，包含：
  - id: 工具调用ID
  - name: 工具名称
  - arguments: 工具参数（JSON字符串）
- executionOptions: 执行选项，包含：
  - timeout: 超时时间
  - retries: 重试次数
  - retryDelay: 重试延迟

### 3. LLM执行完成事件

**事件名称**：`LLM_EXECUTION_COMPLETED`

**用途**：当LLMExecutor完成LLM调用后发送此事件，通知原节点执行完成。

**事件结构**：
- type: InternalEventType.LLM_EXECUTION_COMPLETED
- timestamp: 事件创建时间
- workflowId: 关联的工作流ID
- threadId: 关联的线程ID
- nodeId: 原始请求节点ID
- result: LLM执行结果，包含：
  - content: 响应内容
  - usage: Token使用情况
  - finishReason: 完成原因
  - toolCalls: 工具调用列表（如果有）
- updatedContext: 更新后的上下文数据（LLMExecutor可能修改了对话历史）

### 4. 工具执行完成事件

**事件名称**：`TOOL_EXECUTION_COMPLETED`

**用途**：当ToolService完成工具执行后发送此事件，通知LLMExecutor工具执行完成。

**事件结构**：
- type: InternalEventType.TOOL_EXECUTION_COMPLETED
- timestamp: 事件创建时间
- workflowId: 关联的工作流ID
- threadId: 关联的线程ID
- toolCallId: 原始工具调用ID
- result: 工具执行结果，包含：
  - success: 是否成功
  - result: 执行结果（成功时）
  - error: 错误信息（失败时）
  - executionTime: 执行时间
  - retryCount: 重试次数

### 5. LLM执行失败事件

**事件名称**：`LLM_EXECUTION_FAILED`

**用途**：当LLMExecutor执行LLM调用失败时发送此事件。

**事件结构**：
- type: InternalEventType.LLM_EXECUTION_FAILED
- timestamp: 事件创建时间
- workflowId: 关联的工作流ID
- threadId: 关联的线程ID
- nodeId: 原始请求节点ID
- error: 错误信息
- errorDetails: 错误详情（可选）

### 6. 工具执行失败事件

**事件名称**：`TOOL_EXECUTION_FAILED`

**用途**：当ToolService执行工具失败时发送此事件。

**事件结构**：
- type: InternalEventType.TOOL_EXECUTION_FAILED
- timestamp: 事件创建时间
- workflowId: 关联的工作流ID
- threadId: 关联的线程ID
- toolCallId: 原始工具调用ID
- error: 错误信息
- errorDetails: 错误详情（可选）

## 事件枚举更新

需要在 `InternalEventType` 枚举中添加以下值：

```typescript
export enum InternalEventType {
  // 现有事件类型...
  
  /** LLM执行请求 */
  LLM_EXECUTION_REQUEST = 'INTERNAL_LLM_EXECUTION_REQUEST',
  /** LLM执行完成 */
  LLM_EXECUTION_COMPLETED = 'INTERNAL_LLM_EXECUTION_COMPLETED',
  /** LLM执行失败 */
  LLM_EXECUTION_FAILED = 'INTERNAL_LLM_EXECUTION_FAILED',
  /** 工具执行请求 */
  TOOL_EXECUTION_REQUEST = 'INTERNAL_TOOL_EXECUTION_REQUEST',
  /** 工具执行完成 */
  TOOL_EXECUTION_COMPLETED = 'INTERNAL_TOOL_EXECUTION_COMPLETED',
  /** 工具执行失败 */
  TOOL_EXECUTION_FAILED = 'INTERNAL_TOOL_EXECUTION_FAILED'
}
```

## 事件联合类型更新

需要在 `InternalEvent` 联合类型中添加新的事件接口：

```typescript
export type InternalEvent =
  | ForkRequestEvent
  | ForkCompletedEvent
  | ForkFailedEvent
  | JoinRequestEvent
  | JoinCompletedEvent
  | JoinFailedEvent
  | CopyRequestEvent
  | CopyCompletedEvent
  | CopyFailedEvent
  | LLMExecutionRequestEvent
  | LLMExecutionCompletedEvent
  | LLMExecutionFailedEvent
  | ToolExecutionRequestEvent
  | ToolExecutionCompletedEvent
  | ToolExecutionFailedEvent;
```

## 事件传递流程

### LLM执行请求流程

1. 节点执行器（LLMNodeExecutor等）准备执行参数
2. 节点执行器发送 LLM_EXECUTION_REQUEST 事件
3. LLMExecutor监听该事件并接收请求
4. LLMExecutor执行LLM调用
5. LLMExecutor发送 LLM_EXECUTION_COMPLETED 或 LLM_EXECUTION_FAILED 事件
6. 节点执行器监听完成事件并继续执行

### 工具执行请求流程

1. LLMExecutor在LLM调用中发现工具调用需求
2. LLMExecutor发送 TOOL_EXECUTION_REQUEST 事件
3. ToolService监听该事件并接收请求
4. ToolService执行工具调用
5. ToolService发送 TOOL_EXECUTION_COMPLETED 或 TOOL_EXECUTION_FAILED 事件
6. LLMExecutor监听完成事件并继续LLM调用循环

## 事件上下文信息

所有事件都包含以下基础上下文信息：

- workflowId: 工作流ID，用于标识所属工作流
- threadId: 线程ID，用于标识所属线程
- timestamp: 时间戳，用于追踪和调试

额外上下文：
- nodeId: 节点ID，用于标识请求来源节点
- toolCallId: 工具调用ID，用于关联工具调用请求和结果

## 错误处理

事件机制中的错误处理原则：

1. **请求事件**：发送方不等待响应，继续执行其他逻辑
2. **完成/失败事件**：接收方根据事件类型处理成功或失败情况
3. **超时处理**：由发送方通过其他机制（如Promise超时）处理
4. **错误传递**：错误信息通过失败事件传递，包含详细的错误描述

## 与现有事件的兼容性

新添加的事件类型与现有事件类型（FORK、JOIN、COPY）完全兼容：

- 使用相同的基接口 `BaseInternalEvent`
- 使用相同的枚举 `InternalEventType`
- 使用相同的事件管理器方法（`emitInternal`、`onInternal`）
- 遵循相同的命名规范（INTERNAL_前缀）

## 实现注意事项

1. **事件监听注册**：LLMExecutor和ToolService需要在初始化时注册内部事件监听器
2. **事件清理**：节点执行完成后，应该清理一次性的事件监听器，避免内存泄漏
3. **事件顺序**：确保事件按顺序处理，特别是工具调用循环中的多个工具调用
4. **线程安全**：事件处理应该考虑线程安全性，避免并发问题
5. **调试支持**：事件应该包含足够的信息用于调试和日志记录
