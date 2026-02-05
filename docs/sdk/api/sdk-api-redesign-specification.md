# SDK API 重新设计方案

## 1. 设计目标

1. **简化API**：减少不必要的方法暴露，提供更简洁的接口
2. **明确职责**：清晰区分直接操作和间接操作的模块
3. **优化目录结构**：根据使用场景重新组织目录结构
4. **保持向后兼容**：渐进式改进，不影响现有用户

## 2. 模块重新分类与目录结构调整

### 2.1 当前目录结构问题

当前 `sdk/api/operations` 目录结构：
```
operations/
├── code/
│   └── script-execution-api.ts
├── conversation/
│   └── message-manager-api.ts
├── events/
│   └── event-manager-api.ts
├── execution/
│   └── thread-executor-api.ts
├── llm/
│   └── llm-wrapper-api.ts
├── state/
│   ├── checkpoint-manager-api.ts
│   ├── trigger-manager-api.ts
│   └── variable-manager-api.ts
└── tools/
    └── tool-execution-api.ts
```

**问题分析**：
- 目录按技术领域划分，而非使用场景
- `state` 目录包含不同使用频率的模块
- 缺乏对核心执行和辅助功能的明确区分

### 2.2 建议的新目录结构

```
api/
├── core/                    # 核心执行API（应用层直接操作）
│   ├── execution/          # 执行相关
│   │   └── thread-executor-api.ts
│   ├── llm/                # LLM相关
│   │   └── llm-api.ts
│   ├── tools/              # 工具相关
│   │   └── tool-api.ts
│   └── scripts/            # 脚本相关
│       └── script-api.ts
│
├── monitoring/             # 监控和查询API（应用层间接操作）
│   ├── messages/           # 消息查询
│   │   └── message-api.ts
│   ├── events/             # 事件监听
│   │   └── event-api.ts
│   └── state/              # 状态查询（只读）
│       └── state-api.ts
│
└── management/             # 管理API（低频操作）
    ├── checkpoints/        # 检查点管理
    │   └── checkpoint-api.ts
    └── triggers/           # 触发器管理
        └── trigger-api.ts
```

### 2.3 目录结构调整理由

1. **core/**: 包含应用层高频直接操作的核心API
2. **monitoring/**: 包含应用层用于监控、查询和调试的API
3. **management/**: 包含低频管理操作的API，可以考虑是否需要暴露

## 3. 具体API设计方案

### 3.1 Core APIs（核心执行API）

#### ThreadExecutorAPI (`core/execution/thread-executor-api.ts`)

**保留的方法**：
- `executeWorkflow(workflowId: string, options?: ExecutionOptions)`
- `executeWorkflowFromDefinition(workflow: WorkflowDefinition, options?: ExecutionOptions)`
- `pauseThread(threadId: string)`
- `resumeThread(threadId: string)`
- `cancelThread(threadId: string)`
- `getThreadStatus(threadId: string)`

**移除的方法**：
- 所有 `getXxx()` 底层访问方法
- `setThreadStatus()`, `forcePauseThread()`, `forceCancelThread()` 等强制操作方法
- 复杂的状态检查方法（合并到 `getThreadStatus()` 中）

**新增的方法**：
- `execute(options: ExecutionRequest)` - 统一的执行接口

#### LLMAPI (`core/llm/llm-api.ts`)

**保留的方法**：
- `generate(request: LLMRequest)`
- `generateStream(request: LLMRequest)`
- `generateBatch(requests: LLMRequest[])`

**移除的方法**：
- `getWrapper()` 底层访问方法
- 复杂的统计和缓存管理方法（作为可选插件）

**简化配置**：
- 移除复杂的缓存配置选项
- 提供简单的 `enableCache()` 和 `disableCache()` 方法

#### ToolAPI (`core/tools/tool-api.ts`)

**保留的方法**：
- `execute(toolName: string, parameters: Record<string, any>, options?: ToolOptions)`
- `executeBatch(executions: ToolExecutionRequest[])`
- `test(toolName: string, parameters: Record<string, any>)`

**统一错误处理**：
- 所有方法返回统一的 `ExecutionResult<T>` 类型

#### ScriptAPI (`core/scripts/script-api.ts`)

**保持现有设计**，因为已经相对简洁。

### 3.2 Monitoring APIs（监控查询API）

#### MessageAPI (`monitoring/messages/message-api.ts`)

**简化查询选项**：
- 移除复杂的分页和排序选项
- 提供简单的方法：`getMessages()`, `getRecentMessages()`, `searchMessages()`
- 统计信息通过单独的 `getMessageStats()` 方法获取

#### EventAPI (`monitoring/events/event-api.ts`)

**功能分离**：
- **EventAPI**: 只包含事件监听方法 (`on()`, `once()`, `off()`)
- **EventHistoryAPI**: 单独的类处理事件历史记录（可选）

#### StateAPI (`monitoring/state/state-api.ts`)

**只读接口**：
- `getVariables(threadId: string)`
- `getVariable(threadId: string, name: string)`
- `hasVariable(threadId: string, name: string)`
- 移除所有 `updateVariable()` 等写操作方法

### 3.3 Management APIs（管理API）

#### CheckpointAPI (`management/checkpoints/checkpoint-api.ts`)

**保持必要功能**：
- `createCheckpoint(threadId: string)`
- `restoreFromCheckpoint(checkpointId: string)`
- `getCheckpoints(threadId: string)`
- 移除复杂的过滤和批量操作方法

#### TriggerAPI (`management/triggers/trigger-api.ts`)

**评估必要性**：
- 如果确实需要，只保留：`getTriggers()`, `enableTrigger()`, `disableTrigger()`
- 考虑将此功能移入Core层，不暴露给应用层

## 4. 统一的API设计模式

### 4.1 统一的执行结果类型

```typescript
// sdk/api/types/execution-result.ts
export type ExecutionResult<T> = 
  | { success: true; data: T; executionTime: number }
  | { success: false; error: string; executionTime: number };
```

### 4.2 统一的执行选项

```typescript
// sdk/api/types/execution-options.ts
export interface ExecutionOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  logging?: boolean;
}
```

### 4.3 统一的错误处理

所有API方法都遵循相同的错误处理模式：
- 成功时返回 `ExecutionResult<T>`
- 失败时返回包含错误信息的 `ExecutionResult<T>`
- 不抛出异常（除非是严重的系统错误）

## 5. 向后兼容性策略

### 5.1 渐进式迁移

1. **v2.1**: 引入新的简化API，同时保持旧API可用
2. **v2.2**: 标记旧API为 `@deprecated`
3. **v3.0**: 移除旧API

### 5.2 兼容层

在过渡期间，提供兼容层：

```typescript
// 旧API调用自动转换为新API
class ThreadExecutorAPI {
  // @deprecated Use execute() instead
  async executeWorkflow(workflowId: string, options?: ThreadOptions) {
    return this.execute({ workflowId, options });
  }
  
  // 新API
  async execute(request: ExecutionRequest): Promise<ExecutionResult<ThreadResult>> {
    // 实际实现
  }
}
```

## 6. 实施计划

### 阶段1：核心API简化（高优先级）
- 重构 ThreadExecutorAPI
- 重构 LLMAPI  
- 统一执行结果类型和选项

### 阶段2：监控API优化（中优先级）
- 重构 MessageAPI
- 分离 EventAPI 和 EventHistoryAPI
- 创建只读 StateAPI

### 阶段3：管理API评估（低优先级）
- 评估 TriggerAPI 的必要性
- 简化 CheckpointAPI

### 阶段4：目录结构调整
- 按新结构重新组织文件
- 更新导入路径和文档

## 7. 预期收益

1. **更简洁的API**：减少50%以上的公共方法
2. **更清晰的职责**：明确区分核心执行、监控查询和管理操作
3. **更好的用户体验**：统一的错误处理和执行模式
4. **更易维护**：清晰的目录结构和模块边界