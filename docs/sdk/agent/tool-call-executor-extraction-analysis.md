# ToolCallExecutor 模块提取分析

## 概述

本文档分析 `sdk/graph/execution/executors/tool-call-executor.ts` 是否应该提取通用模块到 `sdk/core` 目录，以便 agent 和 graph 模块同时复用。

## 一、当前架构

### 1.1 ToolCallExecutor 的职责

`ToolCallExecutor` 是图执行引擎专用的工具调用执行器，核心职责包括：

1. **执行工具调用数组** - 支持并行执行
2. **处理单个工具调用** - 包含完整的生命周期管理
3. **管理工具执行结果** - 统一的结果格式
4. **触发相关事件** - started/completed/failed 事件
5. **检查点支持** - 工具调用前后的检查点创建
6. **工具可见性检查** - 基于线程的工具可见性控制
7. **中断处理** - AbortSignal + ThreadInterruptedException

### 1.2 依赖关系

```
ToolCallExecutor
├── ToolService (core)           # 工具服务
├── EventManager (core)          # 事件管理器
├── CheckpointDependencies       # 检查点依赖
├── ToolVisibilityCoordinator    # 工具可见性协调器
├── ConversationManager          # 对话管理器
└── MessageBuilder               # 消息构建器
```

### 1.3 AgentLoopExecutor 的工具执行方式

```typescript
// agent-loop-executor.ts:116-135
// 串行执行工具调用
for (const toolCall of response.toolCalls) {
    const executionResult = await this.toolService.execute(
        toolCall.function.name, 
        { parameters: ... }
    );
    
    if (executionResult.isOk()) {
        messageHistory.addToolResultMessage(
            toolCall.id,
            JSON.stringify(executionResult.value.result)
        );
    } else {
        messageHistory.addToolResultMessage(
            toolCall.id,
            JSON.stringify({ error: executionResult.error.message })
        );
    }
    toolCallCount++;
}
```

**特点**：
- 直接调用 `ToolService.execute()`
- 串行执行
- 无事件触发
- 无检查点支持
- 无工具可见性检查

## 二、是否应该提取通用模块？

### 2.1 分析结论

**建议：部分提取，但不是整体提取**

### 2.2 理由分析

#### 2.2.1 职责不同

| 组件 | 定位 | 设计目标 |
|------|------|----------|
| `ToolCallExecutor` | 图执行引擎专用 | 完整的工具执行生命周期管理 |
| `AgentLoopExecutor` | 轻量级独立执行器 | 简单、无状态、快速执行 |

`ToolCallExecutor` 是**图执行引擎的特化组件**，深度集成了图引擎的特性：
- 检查点机制
- 工具可见性控制
- 事件系统
- 中断处理

#### 2.2.2 依赖复杂度差异大

| 组件 | 依赖数量 | 依赖类型 |
|------|---------|---------|
| `ToolCallExecutor` | 4+ | ToolService, EventManager, CheckpointDependencies, ToolVisibilityCoordinator |
| `AgentLoopExecutor` | 2 | ToolService, LLMWrapper |

#### 2.2.3 已有核心层抽象

`ToolService` 已经提供了核心的工具执行能力：
- 工具注册管理
- 参数验证
- 执行器委托
- 批量执行

`sdk/core` 层的定位是**基础服务**，而非**执行策略**。

## 三、提取建议

### 3.1 可提取的内容

| 内容 | 是否提取 | 目标位置 | 原因 |
|------|---------|---------|------|
| `ToolCallTaskInfo` 接口 | ✅ 可提取 | `packages/types` | 纯数据结构，可复用 |
| 并行执行策略 | ✅ 可提取 | `sdk/core/execution/strategies/` | 通用执行模式 |
| 事件触发逻辑 | ❌ 不提取 | - | 与图引擎事件系统强耦合 |
| 检查点逻辑 | ❌ 不提取 | - | 图引擎特有功能 |
| 工具可见性检查 | ❌ 不提取 | - | 图引擎特有功能 |

### 3.2 推荐方案：提取工具执行策略接口

在 `sdk/core/execution/strategies/` 下创建工具执行策略抽象：

```
sdk/core/execution/strategies/
├── tool-execution-strategy.ts    # 工具执行策略接口
├── parallel-tool-executor.ts     # 并行执行策略
└── serial-tool-executor.ts       # 串行执行策略
```

#### 3.2.1 策略接口设计

```typescript
// tool-execution-strategy.ts

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
  threadId?: string;
  nodeId?: string;
  abortSignal?: AbortSignal;
}

/**
 * 工具调用定义
 */
export interface ToolCallDefinition {
  id: string;
  name: string;
  arguments: string;
}

/**
 * 工具执行策略接口
 */
export interface ToolExecutionStrategy {
  /**
   * 执行工具调用
   */
  execute(
    toolCalls: ToolCallDefinition[],
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult[]>;
}
```

#### 3.2.2 并行执行策略

```typescript
// parallel-tool-executor.ts

export class ParallelToolExecutor implements ToolExecutionStrategy {
  constructor(
    private toolService: ToolService,
    private options?: {
      eventManager?: EventManager;
      onToolStart?: (toolCall: ToolCallDefinition) => void;
      onToolComplete?: (result: ToolExecutionResult) => void;
      onToolError?: (error: Error, toolCall: ToolCallDefinition) => void;
    }
  ) {}

  async execute(
    toolCalls: ToolCallDefinition[],
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult[]> {
    const results = await Promise.allSettled(
      toolCalls.map(tc => this.executeSingle(tc, context))
    );
    
    return results.map((result, index) => {
      // 统一处理结果...
    });
  }
}
```

#### 3.2.3 串行执行策略

```typescript
// serial-tool-executor.ts

export class SerialToolExecutor implements ToolExecutionStrategy {
  constructor(
    private toolService: ToolService
  ) {}

  async execute(
    toolCalls: ToolCallDefinition[],
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    
    for (const toolCall of toolCalls) {
      const result = await this.executeSingle(toolCall, context);
      results.push(result);
    }
    
    return results;
  }
}
```

### 3.3 使用示例

#### 3.3.1 Graph 模块使用

```typescript
// ToolCallExecutor 内部使用策略
export class ToolCallExecutor {
  private strategy: ToolExecutionStrategy;

  constructor(
    private toolService: ToolService,
    private eventManager?: EventManager,
    // ...
  ) {
    this.strategy = new ParallelToolExecutor(toolService, {
      eventManager,
      onToolStart: (tc) => this.emitStartEvent(tc),
      onToolComplete: (r) => this.emitCompleteEvent(r),
      onToolError: (e, tc) => this.emitErrorEvent(e, tc)
    });
  }

  async executeToolCalls(...) {
    // 使用策略执行
    const results = await this.strategy.execute(toolCalls, context);
    
    // 图引擎特有的后处理（检查点、可见性等）
    // ...
  }
}
```

#### 3.3.2 Agent 模块使用

```typescript
// AgentLoopExecutor 使用策略
export class AgentLoopExecutor {
  private strategy: ToolExecutionStrategy;

  constructor(
    private toolService: ToolService
  ) {
    // 简单场景使用串行策略
    this.strategy = new SerialToolExecutor(toolService);
  }

  async executeTools(toolCalls: ToolCallDefinition[]) {
    return this.strategy.execute(toolCalls, {});
  }
}
```

## 四、替代方案

### 4.1 方案 B：保持现状，通过组合复用

让 `AgentLoopExecutor` 直接使用 `ToolCallExecutor` 的简化版本：

```typescript
// 创建简化版 ToolCallExecutor
const executor = new ToolCallExecutor(toolService);  
// 不注入 eventManager、checkpointDependencies 等

// AgentLoopExecutor 内部使用
const results = await executor.executeToolCalls(
  toolCalls,
  conversationManager,
  undefined,  // threadId
  undefined,  // nodeId
  {}          // options
);
```

**优点**：改动最小
**缺点**：依赖注入复杂，可选参数过多

### 4.2 方案 C：在 ToolService 层增强

在 `ToolService` 中添加批量执行策略选项：

```typescript
// tool-service.ts
async executeBatch(
  executions: ExecutionTask[],
  options?: {
    strategy: 'parallel' | 'serial';
    threadId?: string;
  }
): Promise<ToolExecutionResult[]>
```

**优点**：核心层统一管理
**缺点**：ToolService 职责过重

## 五、总结

### 5.1 最终建议

**不建议将整个 `ToolCallExecutor` 提取到 `sdk/core`**，原因：

1. 它是**图执行引擎的特化组件**，包含大量图引擎特有的功能
2. `AgentLoopExecutor` 的设计目标是**轻量级**，引入这些复杂特性会违背其设计初衷
3. 核心层 `ToolService` 已经提供了足够的基础能力

### 5.2 如果需要复用，建议

1. **提取 `ToolCallTaskInfo` 类型** 到 `packages/types`
2. **在 `sdk/core/execution/strategies/` 创建工具执行策略抽象**
3. **让 `AgentLoopExecutor` 可以选择性地使用更丰富的执行策略**

### 5.3 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      SDK Layer                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐     ┌─────────────────────┐       │
│  │   Graph Module      │     │    Agent Module     │       │
│  │                     │     │                     │       │
│  │  ToolCallExecutor   │     │  AgentLoopExecutor  │       │
│  │        │            │     │        │            │       │
│  │        ▼            │     │        ▼            │       │
│  │  ┌─────────────┐    │     │  ┌─────────────┐    │       │
│  │  │  Parallel   │    │     │  │   Serial    │    │       │
│  │  │  Strategy   │    │     │  │  Strategy   │    │       │
│  │  └─────────────┘    │     │  └─────────────┘    │       │
│  │        │            │     │        │            │       │
│  └────────┼────────────┘     └────────┼────────────┘       │
│           │                           │                    │
│           └───────────┬───────────────┘                    │
│                       ▼                                    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Core Layer                              │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │  sdk/core/execution/strategies/              │   │  │
│  │  │  - ToolExecutionStrategy (interface)         │   │  │
│  │  │  - ParallelToolExecutor                      │   │  │
│  │  │  - SerialToolExecutor                        │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  │                       │                            │  │
│  │                       ▼                            │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │  ToolService (core service)                  │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
