# Thread Handlers 模块

## 概述

Thread Handlers 提供线程生命周期操作的无状态处理函数，用于动态线程的创建、取消和状态查询。

> **注意**：此模块与 LLM Tool 调用机制无关，专门用于线程管理操作。命名已从 `tool-handlers` 重命名为 `thread-handlers` 以避免概念混淆。

## 目录结构

```
thread-handlers/
├── index.ts                    # 模块导出
├── create-thread-handler.ts    # 线程操作处理函数
└── README.md                   # 本文档
```

## 核心接口

### ThreadOperationResult

线程操作执行结果接口：

```typescript
interface ThreadOperationResult {
  success: boolean;      // 是否成功
  result?: any;          // 执行结果
  error?: string;        // 错误信息
  executionTime: number; // 执行时间（毫秒）
}
```

### ThreadOperationContext

线程操作上下文，包含执行所需的所有依赖：

```typescript
interface ThreadOperationContext {
  threadRegistry: ThreadRegistry;
  taskRegistry: TaskRegistry;
  eventManager: EventManager;
  threadBuilder: ThreadBuilder;
  taskQueueManager: TaskQueueManager;
  currentThreadId?: string;
}
```

## 处理函数

### createThreadHandler

创建动态线程，支持同步和异步执行模式。

**参数**：
- `action: CreateThreadRequest` - 创建线程请求
- `triggerId: string` - 触发器 ID
- `context: ThreadOperationContext` - 线程操作上下文

**返回**：`Promise<ThreadOperationResult>`

**同步执行结果**：
```typescript
{
  success: true,
  result: {
    message: 'Dynamic thread execution completed',
    workflowId: string,
    input: object,
    output: any,
    waitForCompletion: true,
    executed: true,
    completed: true,
    executionTime: number
  }
}
```

**异步执行结果**：
```typescript
{
  success: true,
  result: {
    message: 'Dynamic thread submitted',
    workflowId: string,
    threadId: string,
    status: string,
    waitForCompletion: false,
    executed: true,
    completed: false,
    executionTime: number
  }
}
```

### cancelThreadHandler

取消动态线程。

**参数**：
- `action: { threadId: string }` - 取消线程请求
- `triggerId: string` - 触发器 ID
- `context: ThreadOperationContext` - 线程操作上下文

**返回**：`Promise<ThreadOperationResult>`

### getThreadStatusHandler

查询动态线程状态。

**参数**：
- `action: { threadId: string }` - 查询线程状态请求
- `triggerId: string` - 触发器 ID
- `context: ThreadOperationContext` - 线程操作上下文

**返回**：`Promise<ThreadOperationResult>`

## 使用示例

```typescript
import {
  createThreadHandler,
  cancelThreadHandler,
  getThreadStatusHandler,
  type ThreadOperationContext
} from './thread-handlers/index.js';

// 准备上下文
const context: ThreadOperationContext = {
  threadRegistry,
  taskRegistry,
  eventManager,
  threadBuilder,
  taskQueueManager,
  currentThreadId: 'main-thread-123'
};

// 创建线程
const result = await createThreadHandler(
  {
    workflowId: 'workflow-456',
    input: { data: 'test' },
    config: { waitForCompletion: false }
  },
  'trigger-789',
  context
);

// 查询状态
if (result.success && result.result.threadId) {
  const status = await getThreadStatusHandler(
    { threadId: result.result.threadId },
    'trigger-789',
    context
  );
}

// 取消线程
await cancelThreadHandler(
  { threadId: 'thread-to-cancel' },
  'trigger-789',
  context
);
```

## 设计原则

1. **无状态函数式设计**：每个函数都是纯函数，不维护内部状态
2. **职责单一**：每个函数只做一件事
3. **依赖注入**：通过 `ThreadOperationContext` 传入所有依赖
4. **统一结果格式**：所有函数返回 `ThreadOperationResult`

## 未来扩展：支持 LLM 动态创建线程

如果需要让 LLM 在运行时动态创建线程，需要将此模块封装为 SDK 内置工具。

### 改造方案概述

#### 1. 新增 BUILTIN 工具类型

```typescript
// packages/types/src/tool/state.ts
export type ToolType =
  | 'STATELESS'
  | 'STATEFUL'
  | 'REST'
  | 'MCP'
  | 'BUILTIN';  // 新增
```

#### 2. 定义 BuiltinToolConfig

```typescript
// packages/types/src/tool/tool-config.ts
export interface BuiltinToolConfig {
  execute: (
    parameters: Record<string, any>,
    context: BuiltinToolExecutionContext
  ) => Promise<any>;
}

export interface BuiltinToolExecutionContext {
  threadId?: string;
  threadRegistry?: ThreadRegistry;
  taskRegistry?: TaskRegistry;
  eventManager?: EventManager;
  threadBuilder?: ThreadBuilder;
  taskQueueManager?: TaskQueueManager;
}
```

#### 3. 实现 BuiltinExecutor

```typescript
// packages/tool-executors/src/builtin/BuiltinExecutor.ts
export class BuiltinExecutor extends BaseExecutor {
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadId?: string,
    context?: BuiltinToolExecutionContext
  ): Promise<any> {
    const config = tool.config as BuiltinToolConfig;
    return config.execute(parameters, context);
  }
}
```

#### 4. 创建内置工具定义

```typescript
// sdk/core/builtins/tools/thread-tools.ts
export const createThreadTool: Tool = {
  id: 'builtin_create_thread',
  name: 'create_thread',
  type: 'BUILTIN',
  description: 'Create a new dynamic thread to execute a workflow',
  parameters: { /* JSON Schema */ },
  config: {
    execute: async (params, context) => {
      return createThreadHandler(params, params.triggerId, {
        threadRegistry: context.threadRegistry,
        // ... 其他依赖
      });
    }
  }
};
```

#### 5. 关键改造位置

| 文件 | 改造内容 |
|------|----------|
| `packages/types/src/tool/state.ts` | 添加 `'BUILTIN'` 类型 |
| `packages/types/src/tool/tool-config.ts` | 添加 `BuiltinToolConfig` 接口 |
| `packages/tool-executors/src/builtin/` | 新增 `BuiltinExecutor` |
| `sdk/core/services/tool-service.ts` | 初始化 BuiltinExecutor |
| `sdk/graph/execution/executors/tool-call-executor.ts` | 传递执行上下文 |
| `sdk/core/builtins/` | 新增内置工具目录 |

### 实现优先级

- **Phase 1**：基础设施（类型定义、BuiltinExecutor）
- **Phase 2**：线程工具实现（工具定义、注册）
- **Phase 3**：上下文注入机制（ToolCallExecutor 改造）

## 变更历史

- **2026-03-09**：从 `tool-handlers` 重命名为 `thread-handlers`，避免与 LLM Tool 概念混淆
- **2026-03-09**：引入 `ThreadOperationContext` 统一管理依赖
- **2026-03-09**：重命名 `ToolExecutionResult` 为 `ThreadOperationResult`
