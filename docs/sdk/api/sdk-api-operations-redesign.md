# SDK API Operations 目录重新设计方案

## 1. 目录结构说明

### 1.1 API层职责划分
- **resources/**: 资源管理API（CRUD操作）- 工作流、工具、脚本等的注册、查询、更新、删除
- **operations/**: 业务操作API - 执行、监控、管理等业务逻辑操作

### 1.2 Operations目录内部重新组织

**当前结构**：
```
operations/
├── code/
├── conversation/
├── events/
├── execution/
├── llm/
├── state/
└── tools/
```

**新结构**（按使用场景划分）：
```
operations/
├── core/                    # 核心执行API（应用层高频直接操作）
│   ├── execution/          # 工作流执行
│   ├── llm/                # LLM调用
│   ├── tools/              # 工具执行
│   └── scripts/            # 脚本执行
│
├── monitoring/             # 监控查询API（应用层中频间接操作）
│   ├── messages/           # 消息查询
│   ├── events/             # 事件监听
│   └── state/              # 状态查询（只读）
│
└── management/             # 管理API（应用层低频操作）
    ├── checkpoints/        # 检查点管理
    └── triggers/           # 触发器管理
```

## 2. 具体改进方案

### 2.1 Core APIs - 核心执行API

#### ThreadExecutorAPI (`core/execution/thread-executor-api.ts`)

**简化原则**：
- 移除所有 `getXxx()` 底层访问方法
- 移除强制操作方法（`forcePauseThread`, `forceCancelThread`等）
- 合并状态检查方法
- 统一执行接口

**保留的核心方法**：
```typescript
class ThreadExecutorAPI {
  // 执行工作流
  async executeWorkflow(workflowId: string, options?: ExecutionOptions): Promise<ExecutionResult<ThreadResult>>
  async executeWorkflowFromDefinition(workflow: WorkflowDefinition, options?: ExecutionOptions): Promise<ExecutionResult<ThreadResult>>
  
  // 生命周期控制
  async pauseThread(threadId: string): Promise<ExecutionResult<void>>
  async resumeThread(threadId: string): Promise<ExecutionResult<ThreadResult>>
  async cancelThread(threadId: string): Promise<ExecutionResult<void>>
  
  // 状态查询
  async getThreadStatus(threadId: string): Promise<ThreadStatusInfo>
}
```

**新增统一执行接口**：
```typescript
interface ExecutionRequest {
  workflowId?: string;
  workflowDefinition?: WorkflowDefinition;
  options?: ExecutionOptions;
}

async execute(request: ExecutionRequest): Promise<ExecutionResult<ThreadResult>>
```

#### LLMAPI (`core/llm/llm-api.ts`)

**简化原则**：
- 移除 `getWrapper()` 底层访问方法
- 简化缓存配置
- 统一错误处理

**保留的核心方法**：
```typescript
class LLMAPI {
  async generate(request: LLMRequest): Promise<ExecutionResult<LLMResult>>
  async *generateStream(request: LLMRequest): AsyncIterable<ExecutionResult<LLMResult>>
  async generateBatch(requests: LLMRequest[]): Promise<ExecutionResult<LLMResult[]>>
  
  // 简化的配置方法
  enableCache(): void
  disableCache(): void
  clearCache(): void
}
```

#### ToolAPI (`core/tools/tool-api.ts`)

**统一错误处理**：
```typescript
class ToolAPI {
  async execute(toolName: string, parameters: Record<string, any>, options?: ToolOptions): Promise<ExecutionResult<ToolExecutionResult>>
  async executeBatch(executions: ToolExecutionRequest[]): Promise<ExecutionResult<ToolExecutionResult[]>>
  async test(toolName: string, parameters: Record<string, any>): Promise<ExecutionResult<ToolTestResult>>
}
```

#### ScriptAPI (`core/scripts/script-api.ts`)

保持现有设计，已经相对简洁。

### 2.2 Monitoring APIs - 监控查询API

#### MessageAPI (`monitoring/messages/message-api.ts`)

**简化查询选项**：
```typescript
class MessageAPI {
  async getMessages(threadId: string): Promise<LLMMessage[]>
  async getRecentMessages(threadId: string, count: number): Promise<LLMMessage[]>
  async searchMessages(threadId: string, query: string): Promise<LLMMessage[]>
  async getMessageStats(threadId: string): Promise<MessageStats>
  async exportMessages(threadId: string, format: 'json' | 'csv'): Promise<string>
}
```

#### EventAPI (`monitoring/events/event-api.ts`)

**功能分离**：
```typescript
// EventAPI - 只负责事件监听
class EventAPI {
  on(eventType: EventType, listener: EventListener): () => void
  once(eventType: EventType, listener: EventListener): () => void
  off(eventType: EventType, listener: EventListener): boolean
  waitFor<T extends BaseEvent>(eventType: EventType, timeout?: number): Promise<T>
}

// EventHistoryAPI - 可选的事件历史记录
class EventHistoryAPI {
  async getEvents(filter?: EventFilter): Promise<BaseEvent[]>
  async getThreadEvents(threadId: string): Promise<BaseEvent[]>
  async getEventStats(filter?: EventFilter): Promise<EventStats>
  clearHistory(): void
}
```

#### StateAPI (`monitoring/state/state-api.ts`)

**只读接口**：
```typescript
class StateAPI {
  // 变量查询（只读）
  async getVariables(threadId: string): Promise<Record<string, any>>
  async getVariable(threadId: string, name: string): Promise<any>
  async hasVariable(threadId: string, name: string): Promise<boolean>
  async getVariableDefinitions(threadId: string): Promise<ThreadVariable[]>
  
  // 移除所有写操作方法
}
```

### 2.3 Management APIs - 管理API

#### CheckpointAPI (`management/checkpoints/checkpoint-api.ts`)

**简化功能**：
```typescript
class CheckpointAPI {
  async createCheckpoint(threadId: string, metadata?: CheckpointMetadata): Promise<Checkpoint>
  async restoreFromCheckpoint(checkpointId: string): Promise<Thread>
  async getCheckpoints(threadId: string): Promise<Checkpoint[]>
  async deleteCheckpoint(checkpointId: string): Promise<void>
}
```

#### TriggerAPI (`management/triggers/trigger-api.ts`)

**评估后保留核心功能**：
```typescript
class TriggerAPI {
  async getTriggers(threadId: string): Promise<Trigger[]>
  async enableTrigger(threadId: string, triggerId: string): Promise<void>
  async disableTrigger(threadId: string, triggerId: string): Promise<void>
}
```

## 3. 统一类型定义

### 3.1 统一的执行结果类型

```typescript
// sdk/api/types/execution-result.ts
export type ExecutionResult<T> = 
  | { success: true; data: T; executionTime: number }
  | { success: false; error: string; executionTime: number };

export function success<T>(data: T, executionTime: number): ExecutionResult<T> {
  return { success: true, data, executionTime };
}

export function failure<T>(error: string, executionTime: number): ExecutionResult<T> {
  return { success: false, error, executionTime };
}
```

### 3.2 统一的执行选项

```typescript
// sdk/api/types/execution-options.ts
export interface ExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 是否启用缓存 */
  cache?: boolean;
  /** 是否启用日志 */
  logging?: boolean;
}
```

## 4. 实施计划

### 阶段1：创建新的目录结构和类型定义
1. 创建 `operations/core/` 目录
2. 创建 `operations/monitoring/` 目录
3. 创建 `operations/management/` 目录
4. 创建统一的类型定义文件

### 阶段2：重构核心API（高优先级）
1. 重构 ThreadExecutorAPI
2. 重构 LLMAPI
3. 重构 ToolAPI
4. 更新 ScriptAPI

### 阶段3：重构监控API（中优先级）
1. 重构 MessageAPI
2. 分离 EventAPI 和 EventHistoryAPI
3. 创建只读 StateAPI

### 阶段4：重构管理API（低优先级）
1. 简化 CheckpointAPI
2. 简化 TriggerAPI

### 阶段5：更新导入和文档
1. 更新 `sdk/api/index.ts` 导出
2. 更新 SDK 主类
3. 更新文档和示例

## 5. 向后兼容性

在过渡期间，保留旧的API文件，标记为 `@deprecated`：

```typescript
// operations/execution/thread-executor-api.ts (旧版本)
/**
 * @deprecated Use operations/core/execution/thread-executor-api.ts instead
 */
export class ThreadExecutorAPI {
  // 旧实现，内部调用新API
}
```

## 6. 预期收益

1. **更清晰的职责划分**：core/monitoring/management 明确区分使用场景
2. **更简洁的API**：减少不必要的方法暴露
3. **更好的用户体验**：统一的错误处理和执行模式
4. **更易维护**：清晰的目录结构