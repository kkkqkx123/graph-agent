# Agent Loop 架构分析

## 概述

本文档分析 `AgentLoopExecutor` 的当前设计问题，并提出改进建议。

## 一、当前架构对比

### 1.1 特性对比

| 特性 | `ToolCallExecutor` (graph) | `AgentLoopExecutor` (agent) |
|------|---------------------------|----------------------------|
| **工具执行方式** | 并行执行 (`Promise.allSettled`) | 串行执行 (`for...of`) |
| **事件触发** | 完整事件系统 (started/completed/failed) | 简单流事件 |
| **检查点支持** | ✅ 支持 | ❌ 不支持 |
| **工具可见性检查** | ✅ 支持 | ❌ 不支持 |
| **中断处理** | ✅ 完整的 AbortSignal + ThreadInterruptedException | ❌ 不支持 |
| **消息管理** | 使用 `ConversationManager` | 使用 `MessageHistory` |
| **依赖项** | ToolService, EventManager, CheckpointDependencies, ToolVisibilityCoordinator | 仅 ToolService, LLMWrapper |

### 1.2 架构层次对比

| 层次 | Graph 执行引擎 | Agent 模块 |
|------|---------------|-----------|
| **执行实例** | `ThreadEntity` | ❌ 无 |
| **执行状态** | `ExecutionState` | ❌ 无 |
| **生命周期管理** | `ThreadLifecycleCoordinator` + `ThreadLifecycleManager` | ❌ 无 |
| **中断控制** | `AbortController` 在 `ThreadEntity` 中 | ❌ 无 |
| **状态持久化** | 支持 | ❌ 不支持 |
| **暂停/恢复** | 支持 | ❌ 不支持 |

## 二、当前设计的问题

### 2.1 每次执行创建独立的 `MessageHistory` 实例

```typescript
// agent-loop-executor.ts:40-42
private createMessageHistory(): MessageHistory {
    return new MessageHistory();
}
```

**问题**：
- 无法支持**暂停/恢复**功能
- 无法追踪执行状态
- 无法与其他系统集成（如事件系统、检查点系统）

### 2.2 缺乏执行实例概念

当前 `AgentLoopExecutor` 是纯无状态设计，所有状态都在方法内部创建和销毁。这导致：

1. **无法追踪执行状态** - 外部无法获知执行进度
2. **无法中断执行** - 没有 `AbortController` 支持
3. **无法恢复执行** - 状态不持久化

### 2.3 与图引擎集成时的状态同步问题

从 `agent-loop-handler.ts:107-114` 可以看到：

```typescript
// 3. 将结果同步回 Graph 对话历史（用于持久化和展示）
// 注意：AgentLoopExecutor 内部使用了独立的 MessageHistory
// 我们需要将新增加的消息同步到 context.conversationManager
const allMessages = result.content ? [{ role: 'assistant', content: result.content }] : [];
// TODO: 如果需要更完整的同步，可以在 AgentLoopService 中增加获取新增消息的方法
```

**问题**：需要手动同步状态，容易出错且不完整。

## 三、改进建议

### 3.1 推荐架构设计

采用分层架构，与 Graph 执行引擎保持一致：

```
sdk/agent/
├── entities/
│   └── agent-loop-entity.ts        # Agent Loop 执行实例
├── executors/
│   └── agent-loop-executor.ts      # 核心执行逻辑（保持无状态）
├── coordinators/
│   └── agent-loop-coordinator.ts   # 生命周期协调器
├── managers/
│   └── agent-loop-state-manager.ts # 状态管理器
└── builders/
    └── agent-loop-builder.ts       # 实例构建器
```

### 3.2 核心组件设计

#### 3.2.1 `AgentLoopEntity` - 执行实例

```typescript
export class AgentLoopEntity {
  /** 执行实例 ID */
  readonly id: string;
  
  /** 配置 */
  readonly config: AgentLoopConfig;
  
  /** 消息历史 */
  messages: LLMMessage[] = [];
  
  /** 变量存储 */
  variables: Map<string, any> = new Map();
  
  /** 中断控制 */
  abortController?: AbortController;
  
  /** 对话管理器（可选集成） */
  conversationManager?: ConversationManager;
  
  /** 执行状态 */
  status: 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  
  /** 当前迭代次数 */
  iterations: number = 0;
  
  /** 工具调用次数 */
  toolCallCount: number = 0;
  
  /** 检查点数据 */
  checkpointData?: any;
}
```

#### 3.2.2 `AgentLoopCoordinator` - 生命周期协调器

```typescript
export class AgentLoopCoordinator {
  /**
   * 执行 Agent Loop
   */
  async execute(config: AgentLoopConfig): Promise<AgentLoopResult>;
  
  /**
   * 暂停执行
   */
  async pause(loopId: string): Promise<void>;
  
  /**
   * 恢复执行
   */
  async resume(loopId: string): Promise<AgentLoopResult>;
  
  /**
   * 停止执行
   */
  async stop(loopId: string): Promise<void>;
}
```

#### 3.2.3 `AgentLoopExecutor` - 保持无状态的核心执行器

```typescript
export class AgentLoopExecutor {
  /**
   * 执行 Agent Loop
   * @param entity 执行实例
   * @returns 执行结果
   */
  async execute(entity: AgentLoopEntity): Promise<AgentLoopResult>;
  
  /**
   * 流式执行
   */
  async *executeStream(entity: AgentLoopEntity): AsyncGenerator<AgentStreamEvent>;
}
```

### 3.3 状态转换规则

```
CREATED ──────> RUNNING ──────> COMPLETED
                  │
                  ├──> PAUSED ──> RUNNING
                  │
                  ├──> FAILED
                  │
                  └──> CANCELLED
```

## 四、方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **当前无状态设计** | 简单、易测试、无副作用 | 无法暂停/恢复、无法追踪状态、集成困难 |
| **完整执行实例架构** | 支持暂停/恢复、状态追踪、与 Graph 引擎一致 | 复杂度增加 |

## 五、实施建议

### 5.1 分阶段实施

**阶段一：基础架构**
1. 创建 `AgentLoopEntity` 实体类
2. 修改 `AgentLoopExecutor` 接收 `AgentLoopEntity` 参数
3. 添加 `AbortController` 支持

**阶段二：生命周期管理**
1. 创建 `AgentLoopCoordinator` 协调器
2. 创建 `AgentLoopStateManager` 状态管理器
3. 实现暂停/恢复功能

**阶段三：集成优化**
1. 与 `ConversationManager` 集成
2. 添加事件系统支持
3. 添加检查点支持（可选）

### 5.2 向后兼容

保持现有 API 不变，新增基于 `AgentLoopEntity` 的 API：

```typescript
// 现有 API（保持不变）
const executor = new AgentLoopExecutor(llmWrapper, toolService);
const result = await executor.run(config);

// 新增 API（推荐）
const coordinator = new AgentLoopCoordinator(/* dependencies */);
const result = await coordinator.execute(config);

// 支持暂停/恢复
const loopId = await coordinator.start(config);
await coordinator.pause(loopId);
const result = await coordinator.resume(loopId);
```

## 六、总结

`AgentLoopExecutor` 的无状态设计在简单场景下是合理的，但随着功能需求的增加（暂停/恢复、状态追踪、与 Graph 引擎集成），需要引入完整的执行实例架构。

建议采用与 Graph 执行引擎一致的分层架构：
- **Entity 层**：封装执行状态
- **Coordinator 层**：管理生命周期
- **Executor 层**：保持无状态，专注核心执行逻辑

这样设计后，`AgentLoopExecutor` 可以：
1. 作为独立组件使用（简单场景）
2. 通过 `AgentLoopCoordinator` 使用完整功能（复杂场景）
3. 与 Graph 执行引擎无缝集成
