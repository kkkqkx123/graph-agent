# 工具执行改进提案

## 文档概述

本文档分析了当前项目在工具和提示词消息处理方面存在的问题，并提供了详细的改进方案。

**分析基准**：对比 Anthropic SDK v0.71.2 的实现

**分析日期**：2025-01-XX

**相关文档**：
- [LLM API 参数对比](../../../infra/llm/client/api/api_parameters_comparison.md)
- [工具转换器](../../../../packages/common-utils/src/tool/converter.ts)
- [消息流事件](../../../../packages/common-utils/src/llm/message-stream-events.ts)

---

## 一、当前架构概述

### 1.1 架构定位

当前项目是基于**工作流**的 SDK 层，与单纯的 LLM-Tool 循环完全不同：

- **LLM 调用基于 LLM Node**：每次 LLM 调用是单次的，由工作流节点触发
- **不需要单独控制循环**：工具调用循环由工作流引擎控制，而非 SDK 层
- **支持直接操作提示词消息数组**：需要提供精细的消息管理能力
- **多 LLM 提供商支持**：通过转换器适配不同提供商的格式差异

### 1.2 核心组件

| 组件 | 职责 | 文件路径 |
|------|------|----------|
| **LLMExecutionCoordinator** | 高层协调器，协调单次 LLM 调用和工具执行 | `sdk/core/execution/coordinators/llm-execution-coordinator.ts` |
| **LLMExecutor** | 无状态的 LLM 调用执行器 | `sdk/core/execution/executors/llm-executor.ts` |
| **ToolCallExecutor** | 工具调用执行器 | `sdk/core/execution/executors/tool-call-executor.ts` |
| **ConversationManager** | 对话状态管理器，提供精细的消息管理 | `sdk/core/execution/managers/conversation-manager.ts` |
| **ToolService** | 工具服务，管理工具注册和执行 | `sdk/core/services/tool-service.ts` |
| **MessageStream** | 流式消息处理器，支持丰富的事件系统 | `packages/common-utils/src/llm/message-stream.ts` |

### 1.3 消息处理流程

```
用户消息 
  → ConversationManager.addMessage() 
  → LLMExecutor.executeLLMCall() 
  → 解析 toolCalls 
  → ToolCallExecutor.executeToolCalls() 
  → 构建 tool 消息 
  → ConversationManager.addMessage()
```

---

## 二、与 Anthropic SDK 的对比

### 2.1 架构定位差异

| 特性 | 当前项目 | Anthropic SDK | 评价 |
|------|---------|---------------|------|
| **架构定位** | 工作流 SDK 层 | 对话循环管理器 | 各有优势，符合不同场景 |
| **循环控制** | 由工作流引擎控制 | 自动处理 LLM-Tool 循环 | 当前项目更灵活 |
| **多提供商支持** | ✅ 支持 OpenAI、Anthropic、Gemini | ❌ 仅支持 Anthropic | 当前项目更好 |
| **适用场景** | 复杂工作流、多步骤任务 | 简单对话场景 | 各有优势 |

### 2.2 消息格式处理

**当前项目**：
- 使用统一的 [`LLMMessage`](sdk/core/execution/managers/conversation-manager.ts:18) 格式
- 通过 [`converter.ts`](packages/common-utils/src/tool/converter.ts:1) 转换不同提供商的工具格式
- 支持多种 LLM 提供商的格式差异

**Anthropic SDK**：
- 直接使用 Anthropic API 的原生格式
- 不需要格式转换

**结论**：当前项目的设计更合理，支持多提供商是必要的设计选择。

### 2.3 流式事件支持

**当前项目**：
- [`MessageStream`](packages/common-utils/src/llm/message-stream.ts:46) 提供完整的事件系统
- 支持 9 种事件类型：`CONNECT`, `STREAM_EVENT`, `TEXT`, `TOOL_CALL`, `MESSAGE`, `FINAL_MESSAGE`, `ERROR`, `ABORT`, `END`
- 支持 `on()`, `off()`, `once()`, `emitted()` 方法
- 实现 `AsyncIterable` 接口

**Anthropic SDK**：
- [`MessageStream`](ref/anthropic-sdk-v0.71.2/src/lib/MessageStream.ts:49) 提供更细粒度的事件
- 支持 12 种事件类型，包括 `citation`, `thinking`, `signature` 等高级事件

**对比**：
- ✅ 当前项目已经支持流式事件，功能基本完善
- ⚠️ Anthropic SDK 的事件粒度更细（如 `citation`, `thinking`, `signature`）
- ✅ 当前项目的 `TOOL_CALL` 事件对应 Anthropic 的 `inputJson` 事件

**结论**：当前项目已经实现了流式事件支持，基本满足需求。

### 2.4 消息管理能力

**当前项目**：
[`ConversationManager`](sdk/core/execution/managers/conversation-manager.ts:76) 提供精细的消息管理：

```typescript
// 基本操作
addMessage(message: LLMMessage): number
addMessages(...messages: LLMMessage[]): number
getMessages(): LLMMessage[]
getAllMessages(): LLMMessage[]

// 按角色过滤
filterMessagesByRole(role: string): LLMMessage[]
getMessagesByRole(role: MessageRole): LLMMessage[]
getRecentMessagesByRole(role: MessageRole, n: number): LLMMessage[]
getMessagesByRoleRange(role: MessageRole, start: number, end: number): LLMMessage[]

// 按范围获取
getMessagesByRange(start: number, end: number): LLMMessage[]
getRecentMessages(n: number): LLMMessage[]

// 消息索引管理
getMessageCountByRole(role: MessageRole): number
```

**Anthropic SDK**：
- 消息历史存储在 `params.messages` 数组中
- 提供简单的 `pushMessages()` 方法
- 没有精细的查询和过滤功能

**结论**：✅ 当前项目的消息管理能力远超 Anthropic SDK，符合工作流场景的需求。

### 2.5 工具调用执行

**当前项目**：
[`ToolCallExecutor.executeToolCalls()`](sdk/core/execution/executors/tool-call-executor.ts:67) **顺序执行**：

```typescript
for (const toolCall of toolCalls) {
  const result = await this.executeSingleToolCall(...);
  results.push(result);
}
```

**Anthropic SDK**：
[`generateToolResponse()`](ref/anthropic-sdk-v0.71.2/src/lib/tools/BetaToolRunner.ts:394) **并行执行**：

```typescript
const toolResults = await Promise.all(
  toolUseBlocks.map(async (toolUse) => {
    const result = await tool.run(input);
    return { type: 'tool_result', tool_use_id: toolUse.id, content: result };
  })
);
```

**结论**：⚠️ 当前项目顺序执行工具调用，性能较差，应该改为并行执行。

### 2.6 上下文压缩

**当前项目**：
- 基于触发器 + 子工作流实现
- SDK 层不关心具体实现
- 应用层可以根据不同场景定制压缩策略

**Anthropic SDK**：
- 内置 [`CompactionControl`](ref/anthropic-sdk-v0.71.2/src/lib/tools/CompactionControl.ts) 机制
- 自动检测 Token 使用量并压缩

**结论**：✅ 当前项目的设计更灵活，符合不同应用场景的需求。

---

## 三、当前设计存在的问题

### 问题 1：工具调用顺序执行，性能较差 ⚠️⚠️⚠️

**严重程度**：高

**问题描述**：
[`ToolCallExecutor.executeToolCalls()`](sdk/core/execution/executors/tool-call-executor.ts:67) 使用 `for...of` 循环顺序执行工具调用。

**当前实现**：
```typescript
async executeToolCalls(
  toolCalls: Array<{ id: string; name: string; arguments: string }>,
  conversationState: ConversationManager,
  threadId?: string,
  nodeId?: string,
  options?: { abortSignal?: AbortSignal }
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  for (const toolCall of toolCalls) {
    // 检查中断信号
    if (options?.abortSignal?.aborted) {
      throw options.abortSignal.reason || new ThreadInterruptedException('Tool execution aborted', 'STOP');
    }

    const result = await this.executeSingleToolCall(
      toolCall,
      conversationState,
      threadId,
      nodeId,
      options
    );
    results.push(result);
  }

  return results;
}
```

**影响**：
- 当有多个工具调用时，总执行时间是所有工具执行时间的总和
- 无法利用并行执行提高性能
- 用户体验差，等待时间长

**示例**：
假设有 3 个工具调用，每个工具执行时间分别为 100ms、200ms、150ms：
- 顺序执行：总时间 = 100 + 200 + 150 = 450ms
- 并行执行：总时间 = max(100, 200, 150) = 200ms

**改进方案**：使用 `Promise.allSettled()` 并行执行工具调用。

---

### 问题 2：工具结果消息格式不够灵活 ⚠️⚠️

**严重程度**：中

**问题描述**：
工具结果消息使用固定的 `role: 'tool'` 格式，与某些 LLM 提供商的格式不完全匹配。

**当前实现**：
```typescript
// ToolCallExecutor.executeSingleToolCall() - 第174-180行
const toolMessage = {
  role: MessageRole.TOOL,
  content: result.success 
    ? (typeof result.result === 'string' ? result.result : JSON.stringify(result.result))
    : (result.error || 'Tool execution failed'),
  toolCallId: toolCall.id
};
conversationState.addMessage(toolMessage);
```

**影响**：
- 与某些 LLM 提供商的格式不完全匹配
- 缺少对复杂结果的支持（如多部分结果、富文本等）
- 难以扩展新的内容类型

**改进方案**：考虑使用更灵活的格式，支持多种内容类型。

---

### 问题 3：错误处理不够完善 ⚠️⚠️

**严重程度**：中

**问题描述**：
工具执行失败时的错误处理机制不够完善，缺少错误分类和恢复机制。

**当前实现**：
```typescript
// ToolCallExecutor.executeSingleToolCall() - 第241-302行
catch (error) {
  const executionTime = Date.now() - startTime;
  const errorMessage = error instanceof Error ? error.message : String(error);

  // 处理 AbortError，转换为 ThreadInterruptedException
  if (error instanceof Error && error.name === 'AbortError') {
    const reason = options?.abortSignal?.reason;
    if (reason instanceof ThreadInterruptedException) {
      throw reason; // 直接重新抛出
    }
    // 如果是其他 AbortError，转换为 ThreadInterruptedException
    throw new ThreadInterruptedException(
      'Tool execution aborted',
      'STOP', // 默认为 STOP
      threadId || '',
      nodeId || ''
    );
  }

  // 构建工具结果消息
  const toolMessage = {
    role: MessageRole.TOOL,
    content: errorMessage || 'Tool execution failed',
    toolCallId: toolCall.id
  };
  conversationState.addMessage(toolMessage);

  // ... 触发事件

  return {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    success: false,
    error: errorMessage,
    executionTime
  };
}
```

**影响**：
- 错误信息不够详细，难以调试
- 没有统一的错误分类机制
- 缺少对部分工具调用失败的特殊处理
- 重试策略不够灵活

**改进方案**：统一错误分类和处理机制，提供灵活的重试策略。

---

### 问题 4：缺少对工具输入的解析和验证 ⚠️

**严重程度**：中

**问题描述**：
直接使用 `JSON.parse(toolCall.arguments)` 解析工具参数，缺少验证和转换。

**当前实现**：
```typescript
// ToolCallExecutor.executeSingleToolCall() - 第160-169行
const result = await this.toolService.execute(
  toolCall.name,
  JSON.parse(toolCall.arguments),  // 直接解析，没有验证
  {
    timeout: 30000,
    retries: 0,
    retryDelay: 1000,
    signal: options?.abortSignal
  }
);
```

**Anthropic SDK 的做法**：
```typescript
// generateToolResponse() - 第425-429行
let input = toolUse.input;
if ('parse' in tool && tool.parse) {
  input = tool.parse(input);  // 支持自定义解析器
}
```

**影响**：
- 参数验证不充分，可能导致工具执行失败
- 无法支持自定义参数解析逻辑
- 缺少类型安全保障
- 错误提示不够友好

**改进方案**：支持自定义参数解析器，提供类型安全的参数验证。

---

### 问题 5：流式事件粒度可以进一步细化 ℹ️

**严重程度**：低

**问题描述**：
当前项目的流式事件系统已经比较完善，但与 Anthropic SDK 相比，事件粒度可以进一步细化。

**当前支持的事件**：
```typescript
export enum MessageStreamEventType {
  CONNECT = 'connect',
  STREAM_EVENT = 'streamEvent',
  TEXT = 'text',
  TOOL_CALL = 'toolCall',
  MESSAGE = 'message',
  FINAL_MESSAGE = 'finalMessage',
  ERROR = 'error',
  ABORT = 'abort',
  END = 'end'
}
```

**Anthropic SDK 支持的事件**：
```typescript
export interface MessageStreamEvents {
  connect: () => void;
  streamEvent: (event: MessageStreamEvent, snapshot: Message) => void;
  text: (textDelta: string, textSnapshot: string) => void;
  citation: (citation: TextCitation, citationsSnapshot: TextCitation[]) => void;
  inputJson: (partialJson: string, jsonSnapshot: unknown) => void;
  thinking: (thinkingDelta: string, thinkingSnapshot: string) => void;
  signature: (signature: string) => void;
  message: (message: Message) => void;
  contentBlock: (content: ContentBlock) => void;
  finalMessage: (message: Message) => void;
  error: (error: AnthropicError) => void;
  abort: (error: APIUserAbortError) => void;
  end: () => void;
}
```

**差异**：
- 缺少 `content_block_start`, `content_block_stop` 等细粒度事件
- 缺少 `citation`, `thinking`, `signature` 等高级事件
- 工具调用的参数生成过程无法实时获取

**影响**：
- 用户体验不够精细
- 难以实现高级的流式处理功能
- 无法实时显示思考过程

**改进方案**：考虑增加更多细粒度事件，提供事件过滤和转换机制。

---

## 四、改进方案

### 方案 1：实现并行工具调用（高优先级）

**目标**：将工具调用从顺序执行改为并行执行，提高性能。

**实现方案**：

```typescript
async executeToolCalls(
  toolCalls: Array<{ id: string; name: string; arguments: string }>,
  conversationState: ConversationManager,
  threadId?: string,
  nodeId?: string,
  options?: { abortSignal?: AbortSignal }
): Promise<ToolExecutionResult[]> {
  // 检查中断信号
  if (options?.abortSignal?.aborted) {
    throw options.abortSignal.reason || new ThreadInterruptedException('Tool execution aborted', 'STOP');
  }

  // 使用 Promise.allSettled 并行执行，即使部分失败也能继续
  const executionPromises = toolCalls.map(toolCall =>
    this.executeSingleToolCall(
      toolCall,
      conversationState,
      threadId,
      nodeId,
      options
    )
  );

  const results = await Promise.allSettled(executionPromises);

  // 转换结果
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const toolCall = toolCalls[index];
      const error = result.reason;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 构建失败的工具结果消息
      const toolMessage = {
        role: MessageRole.TOOL,
        content: errorMessage || 'Tool execution failed',
        toolCallId: toolCall.id
      };
      conversationState.addMessage(toolMessage);

      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: false,
        error: errorMessage,
        executionTime: 0
      };
    }
  });
}
```

**优点**：
- 显著提高性能，特别是当有多个工具调用时
- 使用 `Promise.allSettled()` 确保即使部分工具调用失败，其他工具调用也能继续
- 保持向后兼容，返回结果格式不变

**注意事项**：
- 需要确保工具执行是线程安全的
- 需要考虑并发限制，避免同时执行过多工具调用
- 需要更新相关测试用例

**实施步骤**：
1. 修改 `ToolCallExecutor.executeToolCalls()` 方法
2. 更新相关测试用例
3. 添加并发限制配置（可选）
4. 性能测试和优化

---

### 方案 2：增强工具结果消息格式（中优先级）

**目标**：使用更灵活的工具结果消息格式，支持多种内容类型。

**实现方案**：

**选项 A：保持当前格式，增强内容支持**

```typescript
interface ToolResultContent {
  type: 'text' | 'json' | 'image' | 'document' | 'mixed';
  data: any;
  metadata?: Record<string, any>;
}

interface ToolMessage extends LLMMessage {
  role: MessageRole.TOOL;
  content: string | ToolResultContent | ToolResultContent[];
  toolCallId: string;
  is_error?: boolean;
}

// 在 ToolCallExecutor 中
const toolMessage: ToolMessage = {
  role: MessageRole.TOOL,
  content: result.success 
    ? {
        type: typeof result.result === 'string' ? 'text' : 'json',
        data: result.result
      }
    : {
        type: 'text',
        data: result.error || 'Tool execution failed',
        metadata: { is_error: true }
      },
  toolCallId: toolCall.id,
  is_error: !result.success
};
```

**选项 B：采用类似 Anthropic 的格式**

```typescript
interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<TextBlockParam | ImageBlockParam>;
  is_error?: boolean;
}

interface ToolMessage extends LLMMessage {
  role: MessageRole.USER;
  content: ToolResultBlock | ToolResultBlock[];
}

// 在 ToolCallExecutor 中
const toolMessage: ToolMessage = {
  role: MessageRole.USER,
  content: [{
    type: 'tool_result',
    tool_use_id: toolCall.id,
    content: result.success 
      ? (typeof result.result === 'string' ? result.result : JSON.stringify(result.result))
      : (result.error || 'Tool execution failed'),
    is_error: !result.success
  }]
};
```

**推荐**：选项 A，因为：
- 保持向后兼容
- 更灵活，支持多种内容类型
- 符合当前项目的消息格式设计

**优点**：
- 支持多种内容类型（文本、JSON、图片、文档等）
- 提供元数据支持，便于扩展
- 保持向后兼容

**注意事项**：
- 需要更新 `LLMMessage` 类型定义
- 需要更新消息序列化和反序列化逻辑
- 需要更新相关测试用例

**实施步骤**：
1. 定义新的 `ToolResultContent` 接口
2. 更新 `LLMMessage` 类型定义
3. 修改 `ToolCallExecutor` 中的消息构建逻辑
4. 更新消息序列化和反序列化逻辑
5. 更新相关测试用例

---

### 方案 3：完善错误处理机制（中优先级）

**目标**：统一错误分类和处理机制，提供灵活的重试策略。

**实现方案**：

**步骤 1：定义错误类型**

```typescript
/**
 * 工具执行错误类型
 */
export enum ToolExecutionErrorType {
  /** 参数验证错误 */
  VALIDATION_ERROR = 'validation_error',
  /** 工具执行错误 */
  EXECUTION_ERROR = 'execution_error',
  /** 超时错误 */
  TIMEOUT_ERROR = 'timeout_error',
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 权限错误 */
  PERMISSION_ERROR = 'permission_error',
  /** 资源不存在错误 */
  NOT_FOUND_ERROR = 'not_found_error',
  /** 未知错误 */
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * 工具执行错误
 */
export interface ToolExecutionError {
  /** 错误类型 */
  type: ToolExecutionErrorType;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: any;
  /** 是否可重试 */
  retryable: boolean;
  /** 建议的重试延迟（毫秒） */
  retryDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 工具执行结果（增强版）
 */
export interface ToolExecutionResult {
  /** 工具调用ID */
  toolCallId: string;
  /** 工具名称 */
  toolName: string;
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string | ToolExecutionError;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 重试次数 */
  retryCount: number;
}
```

**步骤 2：实现错误分类器**

```typescript
/**
 * 工具执行错误分类器
 */
export class ToolExecutionErrorClassifier {
  /**
   * 分类错误
   */
  static classify(error: Error): ToolExecutionError {
    const message = error.message.toLowerCase();

    // 超时错误
    if (error.name === 'TimeoutError' || message.includes('timeout')) {
      return {
        type: ToolExecutionErrorType.TIMEOUT_ERROR,
        message: error.message,
        retryable: true,
        retryDelay: 1000,
        maxRetries: 3
      };
    }

    // 网络错误
    if (error.name === 'NetworkError' || message.includes('network') || message.includes('fetch')) {
      return {
        type: ToolExecutionErrorType.NETWORK_ERROR,
        message: error.message,
        retryable: true,
        retryDelay: 2000,
        maxRetries: 5
      };
    }

    // 权限错误
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        type: ToolExecutionErrorType.PERMISSION_ERROR,
        message: error.message,
        retryable: false
      };
    }

    // 资源不存在错误
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: ToolExecutionErrorType.NOT_FOUND_ERROR,
        message: error.message,
        retryable: false
      };
    }

    // 参数验证错误
    if (message.includes('validation') || message.includes('invalid')) {
      return {
        type: ToolExecutionErrorType.VALIDATION_ERROR,
        message: error.message,
        retryable: false
      };
    }

    // 默认为执行错误
    return {
      type: ToolExecutionErrorType.EXECUTION_ERROR,
      message: error.message,
      retryable: true,
      retryDelay: 1000,
      maxRetries: 2
    };
  }
}
```

**步骤 3：实现重试策略**

```typescript
/**
 * 工具执行重试策略
 */
export class ToolExecutionRetryStrategy {
  /**
   * 执行带重试的工具调用
   */
  static async executeWithRetry<T>(
    executor: () => Promise<T>,
    error: ToolExecutionError,
    currentRetry: number = 0
  ): Promise<T> {
    if (!error.retryable || currentRetry >= (error.maxRetries || 0)) {
      throw new Error(error.message);
    }

    const delay = error.retryDelay || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      return await executor();
    } catch (retryError) {
      const retryErrorObj = retryError instanceof Error ? retryError : new Error(String(retryError));
      const classifiedError = ToolExecutionErrorClassifier.classify(retryErrorObj);
      return this.executeWithRetry(executor, classifiedError, currentRetry + 1);
    }
  }
}
```

**步骤 4：集成到 ToolCallExecutor**

```typescript
private async executeSingleToolCall(
  toolCall: { id: string; name: string; arguments: string },
  conversationState: ConversationManager,
  threadId?: string,
  nodeId?: string,
  options?: { abortSignal?: AbortSignal }
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  // 获取工具配置
  let toolConfig: Tool | undefined;
  try {
    toolConfig = this.toolService.getTool(toolCall.name);
  } catch (error) {
    // 工具不存在，继续执行
  }

  try {
    // 执行工具调用（带重试）
    const result = await ToolExecutionRetryStrategy.executeWithRetry(
      () => this.toolService.execute(
        toolCall.name,
        JSON.parse(toolCall.arguments),
        {
          timeout: 30000,
          retries: 0, // 重试由 RetryStrategy 控制
          retryDelay: 1000,
          signal: options?.abortSignal
        }
      ),
      {
        type: ToolExecutionErrorType.EXECUTION_ERROR,
        message: 'Tool execution failed',
        retryable: true,
        retryDelay: 1000,
        maxRetries: 2
      }
    );

    const executionTime = Date.now() - startTime;

    // 构建工具结果消息
    const toolMessage = {
      role: MessageRole.TOOL,
      content: result.success
        ? (typeof result.result === 'string' ? result.result : JSON.stringify(result.result))
        : (result.error || 'Tool execution failed'),
      toolCallId: toolCall.id
    };
    conversationState.addMessage(toolMessage);

    // ... 触发事件

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: true,
      result: result.result,
      executionTime,
      retryCount: result.retryCount || 0
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // 分类错误
    const classifiedError = ToolExecutionErrorClassifier.classify(errorObj);

    // 处理 AbortError
    if (errorObj.name === 'AbortError') {
      const reason = options?.abortSignal?.reason;
      if (reason instanceof ThreadInterruptedException) {
        throw reason;
      }
      throw new ThreadInterruptedException(
        'Tool execution aborted',
        'STOP',
        threadId || '',
        nodeId || ''
      );
    }

    // 构建工具结果消息
    const toolMessage = {
      role: MessageRole.TOOL,
      content: classifiedError.message,
      toolCallId: toolCall.id
    };
    conversationState.addMessage(toolMessage);

    // ... 触发事件

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: false,
      error: classifiedError,
      executionTime,
      retryCount: 0
    };
  }
}
```

**优点**：
- 统一的错误分类机制
- 灵活的重试策略
- 详细的错误信息，便于调试
- 支持自定义重试逻辑

**注意事项**：
- 需要更新类型定义
- 需要更新相关测试用例
- 需要考虑重试对性能的影响

**实施步骤**：
1. 定义错误类型和接口
2. 实现错误分类器
3. 实现重试策略
4. 集成到 ToolCallExecutor
5. 更新相关测试用例

---

### 方案 4：增强参数验证（中优先级）

**目标**：支持自定义参数解析器，提供类型安全的参数验证。

**实现方案**：

**步骤 1：定义参数解析器接口**

```typescript
/**
 * 工具参数解析器
 */
export interface ToolParameterParser {
  /**
   * 解析参数
   * @param input 原始输入
   * @returns 解析后的参数
   */
  parse(input: any): any;

  /**
   * 验证参数
   * @param input 参数
   * @returns 验证结果
   */
  validate(input: any): { valid: boolean; errors: string[] };
}

/**
 * JSON Schema 参数解析器
 */
export class JsonSchemaParameterParser implements ToolParameterParser {
  constructor(private schema: any) {}

  parse(input: any): any {
    if (typeof input === 'string') {
      return JSON.parse(input);
    }
    return input;
  }

  validate(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必需字段
    if (this.schema.required) {
      for (const field of this.schema.required) {
        if (!(field in input)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // 检查字段类型
    if (this.schema.properties) {
      for (const [field, fieldSchema] of Object.entries(this.schema.properties)) {
        if (field in input) {
          const value = input[field];
          const expectedType = (fieldSchema as any).type;

          if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`Field '${field}' should be string, got ${typeof value}`);
          } else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`Field '${field}' should be number, got ${typeof value}`);
          } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
            errors.push(`Field '${field}' should be boolean, got ${typeof value}`);
          } else if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(`Field '${field}' should be array, got ${typeof value}`);
          } else if (expectedType === 'object' && typeof value !== 'object') {
            errors.push(`Field '${field}' should be object, got ${typeof value}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

**步骤 2：扩展 Tool 类型**

```typescript
/**
 * 工具定义（扩展版）
 */
export interface Tool {
  /** 工具名称 */
  name: string;
  /** 工具类型 */
  type: ToolType;
  /** 工具描述 */
  description: string;
  /** 参数 schema */
  parameters: any;
  /** 工具配置 */
  config?: any;
  /** 参数解析器（可选） */
  parameterParser?: ToolParameterParser;
  /** 元数据 */
  metadata?: {
    category?: string;
    tags?: string[];
    [key: string]: any;
  };
}
```

**步骤 3：集成到 ToolService**

```typescript
async execute(
  toolName: string,
  parameters: Record<string, any>,
  options: ToolExecutionOptions = {},
  threadId?: string
): Promise<ToolExecutionResult> {
  // 获取工具定义
  const tool = this.getTool(toolName);

  // 使用自定义解析器（如果有）
  let parsedParams = parameters;
  if (tool.parameterParser) {
    try {
      parsedParams = tool.parameterParser.parse(parameters);
    } catch (error) {
      throw new ValidationError(
        `Failed to parse parameters for tool '${toolName}': ${error instanceof Error ? error.message : String(error)}`,
        { toolName, parameters }
      );
    }

    // 验证参数
    const validation = tool.parameterParser.validate(parsedParams);
    if (!validation.valid) {
      throw new ValidationError(
        `Parameter validation failed for tool '${toolName}': ${validation.errors.join(', ')}`,
        { toolName, parameters, errors: validation.errors }
      );
    }
  }

  // 获取对应的执行器
  const executor = this.executors.get(tool.type);
  if (!executor) {
    throw new ToolError(
      `No executor found for tool type '${tool.type}'`,
      toolName,
      tool.type
    );
  }

  // 执行工具
  try {
    return await executor.execute(tool, parsedParams, options, threadId);
  } catch (error) {
    if (error instanceof Error) {
      throw new ToolError(
        `Tool execution failed: ${error.message}`,
        toolName,
        tool.type,
        { parameters: parsedParams },
        error
      );
    }
    throw error;
  }
}
```

**步骤 4：更新 ToolCallExecutor**

```typescript
private async executeSingleToolCall(
  toolCall: { id: string; name: string; arguments: string },
  conversationState: ConversationManager,
  threadId?: string,
  nodeId?: string,
  options?: { abortSignal?: AbortSignal }
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  // 获取工具配置
  let toolConfig: Tool | undefined;
  try {
    toolConfig = this.toolService.getTool(toolCall.name);
  } catch (error) {
    // 工具不存在，继续执行
  }

  try {
    // 解析参数（如果工具有自定义解析器，由 ToolService 处理）
    let parsedArguments: Record<string, any>;
    try {
      parsedArguments = JSON.parse(toolCall.arguments);
    } catch (error) {
      throw new ValidationError(
        `Failed to parse tool arguments: ${error instanceof Error ? error.message : String(error)}`,
        { toolCall, arguments: toolCall.arguments }
      );
    }

    // 执行工具调用
    const result = await this.toolService.execute(
      toolCall.name,
      parsedArguments,
      {
        timeout: 30000,
        retries: 0,
        retryDelay: 1000,
        signal: options?.abortSignal
      }
    );

    const executionTime = Date.now() - startTime;

    // 构建工具结果消息
    const toolMessage = {
      role: MessageRole.TOOL,
      content: result.success
        ? (typeof result.result === 'string' ? result.result : JSON.stringify(result.result))
        : (result.error || 'Tool execution failed'),
      toolCallId: toolCall.id
    };
    conversationState.addMessage(toolMessage);

    // ... 触发事件

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: true,
      result: result.result,
      executionTime,
      retryCount: result.retryCount || 0
    };
  } catch (error) {
    // ... 错误处理
  }
}
```

**优点**：
- 支持自定义参数解析逻辑
- 提供类型安全的参数验证
- 改进错误提示
- 灵活性和可扩展性强

**注意事项**：
- 需要更新类型定义
- 需要更新相关测试用例
- 需要考虑性能影响

**实施步骤**：
1. 定义参数解析器接口
2. 实现 JSON Schema 参数解析器
3. 扩展 Tool 类型
4. 集成到 ToolService
5. 更新 ToolCallExecutor
6. 更新相关测试用例

---

### 方案 5：增强流式事件粒度（低优先级）

**目标**：增加更多细粒度事件，提供更好的用户体验。

**实现方案**：

**步骤 1：扩展事件类型**

```typescript
export enum MessageStreamEventType {
  // 现有事件
  CONNECT = 'connect',
  STREAM_EVENT = 'streamEvent',
  TEXT = 'text',
  TOOL_CALL = 'toolCall',
  MESSAGE = 'message',
  FINAL_MESSAGE = 'finalMessage',
  ERROR = 'error',
  ABORT = 'abort',
  END = 'end',

  // 新增事件
  CONTENT_BLOCK_START = 'contentBlockStart',
  CONTENT_BLOCK_STOP = 'contentBlockStop',
  CONTENT_BLOCK_DELTA = 'contentBlockDelta',
  CITATION = 'citation',
  THINKING = 'thinking',
  SIGNATURE = 'signature',
  INPUT_JSON = 'inputJson'
}
```

**步骤 2：定义新事件接口**

```typescript
/**
 * 内容块开始事件
 */
export interface MessageStreamContentBlockStartEvent {
  type: MessageStreamEventType.CONTENT_BLOCK_START;
  index: number;
  contentBlock: {
    type: 'text' | 'tool_use' | 'thinking' | 'image' | 'document';
    [key: string]: any;
  };
}

/**
 * 内容块停止事件
 */
export interface MessageStreamContentBlockStopEvent {
  type: MessageStreamEventType.CONTENT_BLOCK_STOP;
  index: number;
}

/**
 * 内容块增量事件
 */
export interface MessageStreamContentBlockDeltaEvent {
  type: MessageStreamEventType.CONTENT_BLOCK_DELTA;
  index: number;
  delta: {
    type: 'text_delta' | 'input_json_delta' | 'thinking_delta' | 'signature_delta';
    [key: string]: any;
  };
}

/**
 * 引用事件
 */
export interface MessageStreamCitationEvent {
  type: MessageStreamEventType.CITATION;
  citation: {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    start_char_index: number;
    end_char_index: number;
    type: 'char_location' | 'page_location' | 'content_block_location';
  };
  citationsSnapshot: any[];
}

/**
 * 思考事件
 */
export interface MessageStreamThinkingEvent {
  type: MessageStreamEventType.THINKING;
  thinkingDelta: string;
  thinkingSnapshot: string;
}

/**
 * 签名事件
 */
export interface MessageStreamSignatureEvent {
  type: MessageStreamEventType.SIGNATURE;
  signature: string;
}

/**
 * 输入 JSON 事件
 */
export interface MessageStreamInputJsonEvent {
  type: MessageStreamEventType.INPUT_JSON;
  partialJson: string;
  jsonSnapshot: unknown;
}
```

**步骤 3：更新 MessageStream**

```typescript
export class MessageStream implements AsyncIterable<InternalStreamEvent> {
  // ... 现有代码

  /**
   * 累积消息（增强版）
   */
  accumulateMessage(event: InternalStreamEvent): LLMMessage | null {
    switch (event.type) {
      case 'message_start':
        // ... 现有逻辑
        break;

      case 'content_block_start':
        if (!this.currentMessageSnapshot) {
          throw new ExecutionError('No message in progress');
        }
        if (!Array.isArray(this.currentMessageSnapshot.content)) {
          this.currentMessageSnapshot.content = [];
        }
        this.currentMessageSnapshot.content.push({
          type: event.data.content_block.type,
          ...event.data.content_block
        });
        
        // 触发内容块开始事件
        this.emit(MessageStreamEventType.CONTENT_BLOCK_START, {
          type: MessageStreamEventType.CONTENT_BLOCK_START,
          index: this.currentMessageSnapshot.content.length - 1,
          contentBlock: event.data.content_block
        } as MessageStreamContentBlockStartEvent);
        break;

      case 'content_block_delta':
        if (!this.currentMessageSnapshot) {
          throw new ExecutionError('No message in progress');
        }
        if (!Array.isArray(this.currentMessageSnapshot.content)) {
          break;
        }
        const lastBlock = this.currentMessageSnapshot.content[this.currentMessageSnapshot.content.length - 1];
        if (!lastBlock) break;
        
        if (event.data.delta.type === 'text_delta') {
          if (lastBlock.type === 'text') {
            lastBlock.text += event.data.delta.text;
            this.currentTextSnapshot += event.data.delta.text;
            // 触发文本增量事件
            this.emit(MessageStreamEventType.TEXT, {
              type: MessageStreamEventType.TEXT,
              delta: event.data.delta.text,
              snapshot: this.currentTextSnapshot
            } as MessageStreamTextEvent);
          }
        } else if (event.data.delta.type === 'input_json_delta') {
          if (lastBlock.type === 'tool_use' && lastBlock.tool_use) {
            if (typeof lastBlock.tool_use.input !== 'object') {
              const currentInput = typeof lastBlock.tool_use.input === 'string'
                ? lastBlock.tool_use.input
                : '';
              lastBlock.tool_use.input = currentInput + event.data.delta.partial_json;
            }
            
            // 触发输入 JSON 事件
            this.emit(MessageStreamEventType.INPUT_JSON, {
              type: MessageStreamEventType.INPUT_JSON,
              partialJson: event.data.delta.partial_json,
              jsonSnapshot: lastBlock.tool_use.input
            } as MessageStreamInputJsonEvent);
          }
        } else if (event.data.delta.type === 'thinking_delta') {
          if (lastBlock.type === 'thinking') {
            lastBlock.thinking += event.data.delta.thinking;
            
            // 触发思考事件
            this.emit(MessageStreamEventType.THINKING, {
              type: MessageStreamEventType.THINKING,
              thinkingDelta: event.data.delta.thinking,
              thinkingSnapshot: lastBlock.thinking
            } as MessageStreamThinkingEvent);
          }
        } else if (event.data.delta.type === 'signature_delta') {
          if (lastBlock.type === 'thinking') {
            lastBlock.signature = event.data.delta.signature;
            
            // 触发签名事件
            this.emit(MessageStreamEventType.SIGNATURE, {
              type: MessageStreamEventType.SIGNATURE,
              signature: event.data.delta.signature
            } as MessageStreamSignatureEvent);
          }
        }
        
        // 触发内容块增量事件
        this.emit(MessageStreamEventType.CONTENT_BLOCK_DELTA, {
          type: MessageStreamEventType.CONTENT_BLOCK_DELTA,
          index: this.currentMessageSnapshot.content.length - 1,
          delta: event.data.delta
        } as MessageStreamContentBlockDeltaEvent);
        break;

      case 'content_block_stop':
        // 触发内容块停止事件
        if (this.currentMessageSnapshot && Array.isArray(this.currentMessageSnapshot.content)) {
          this.emit(MessageStreamEventType.CONTENT_BLOCK_STOP, {
            type: MessageStreamEventType.CONTENT_BLOCK_STOP,
            index: this.currentMessageSnapshot.content.length - 1
          } as MessageStreamContentBlockStopEvent);
        }
        
        // ... 现有逻辑
        break;

      // ... 其他事件处理
    }

    return this.currentMessageSnapshot;
  }
}
```

**优点**：
- 提供更细粒度的事件
- 改善用户体验
- 支持高级功能（如实时显示思考过程）
- 与 Anthropic SDK 保持一致

**注意事项**：
- 需要更新类型定义
- 需要更新相关测试用例
- 需要考虑性能影响

**实施步骤**：
1. 扩展事件类型枚举
2. 定义新事件接口
3. 更新 MessageStream 类
4. 更新相关测试用例
5. 更新文档

---

## 五、实施优先级和时间表

### 优先级排序

| 优先级 | 方案 | 预计工作量 | 影响范围 |
|--------|------|-----------|---------|
| **P0** | 方案 1：并行工具调用 | 2-3 天 | 性能提升显著 |
| **P1** | 方案 3：完善错误处理 | 3-4 天 | 提高可靠性 |
| **P1** | 方案 4：增强参数验证 | 2-3 天 | 提高健壮性 |
| **P2** | 方案 2：增强消息格式 | 3-4 天 | 提高灵活性 |
| **P3** | 方案 5：增强流式事件 | 4-5 天 | 改善用户体验 |

### 实施时间表

**第 1 周**：
- 实施方案 1：并行工具调用
- 编写测试用例
- 性能测试和优化

**第 2 周**：
- 实施方案 3：完善错误处理
- 实施方案 4：增强参数验证
- 编写测试用例

**第 3 周**：
- 实施方案 2：增强消息格式
- 编写测试用例
- 更新文档

**第 4 周**（可选）：
- 实施方案 5：增强流式事件
- 编写测试用例
- 更新文档

---

## 六、风险评估

### 技术风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 并行执行导致并发问题 | 中 | 高 | 使用 `Promise.allSettled()`，确保线程安全 |
| 类型定义变更导致兼容性问题 | 低 | 中 | 保持向后兼容，提供迁移指南 |
| 性能优化引入新 bug | 中 | 中 | 充分的测试，性能基准测试 |
| 错误处理逻辑复杂化 | 中 | 低 | 清晰的代码结构，充分的文档 |

### 业务风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 改进导致现有功能失效 | 低 | 高 | 充分的回归测试 |
| 用户需要适应新的 API | 中 | 中 | 提供迁移指南，保持向后兼容 |
| 性能提升不明显 | 低 | 低 | 性能基准测试，持续优化 |

---

## 七、总结

### 当前设计的优势

1. ✅ **架构定位清晰**：基于工作流的 SDK 层，符合实际应用场景
2. ✅ **多提供商支持**：通过转换器适配不同 LLM 提供商
3. ✅ **流式事件支持**：已实现完整的事件系统
4. ✅ **精细的消息管理**：提供丰富的消息查询和过滤功能
5. ✅ **灵活的上下文压缩**：基于触发器+子工作流，支持不同场景

### 需要改进的地方

1. ⚠️⚠️⚠️ **工具调用性能**：应该改为并行执行（高优先级）
2. ⚠️⚠️ **错误处理**：需要更完善的错误分类和恢复机制（中优先级）
3. ⚠️⚠️ **参数验证**：需要增强参数解析和验证（中优先级）
4. ⚠️⚠️ **工具结果格式**：可以考虑更灵活的格式（中优先级）
5. ℹ️ **流式事件粒度**：可以考虑增加更多细粒度事件（低优先级）

### 与 Anthropic SDK 的对比

| 特性 | 当前项目 | Anthropic SDK | 评价 |
|------|---------|---------------|------|
| 架构定位 | 工作流 SDK | 对话循环管理器 | 各有优势 |
| 多提供商支持 | ✅ 支持 | ❌ 不支持 | 当前项目更好 |
| 流式事件 | ✅ 基本支持 | ✅ 细粒度支持 | Anthropic 更细 |
| 消息管理 | ✅ 精细管理 | ⚠️ 简单管理 | 当前项目更好 |
| 工具调用 | ⚠️ 顺序执行 | ✅ 并行执行 | Anthropic 更好 |
| 上下文压缩 | ✅ 灵活配置 | ✅ 内置机制 | 各有优势 |
| 错误处理 | ⚠️ 基本支持 | ✅ 完善支持 | Anthropic 更好 |
| 参数验证 | ⚠️ 基本支持 | ✅ 自定义支持 | Anthropic 更好 |

### 最终结论

当前项目的设计总体上是合理的，符合基于工作流的应用场景。主要需要改进的是：

1. **工具调用性能**：改为并行执行（高优先级，预计 2-3 天）
2. **错误处理机制**：完善错误分类和恢复（中优先级，预计 3-4 天）
3. **参数验证**：增强参数解析和验证（中优先级，预计 2-3 天）

其他方面（如流式事件、消息管理、上下文压缩）已经做得很好，不需要大的改动。

通过实施这些改进方案，可以显著提高工具执行的性能、可靠性和健壮性，同时保持当前项目的架构优势。