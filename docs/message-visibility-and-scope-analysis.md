# 提示词消息可见范围与作用域管理分析

## 概述

本文档分析了当前项目中提示词消息的可见范围与作用域管理机制，以及线程执行机制是否能避免并发访问问题。

## 一、消息可见范围管理机制

### 1.1 核心概念

项目采用**批次边界机制**来管理消息的可见范围：

- **可见消息**：当前批次边界之后的消息，会被发送给LLM
- **不可见消息**：当前批次边界之前的消息，仅存储但不发送给LLM
- **批次边界**：通过 [`startNewBatch()`](../sdk/core/utils/batch-management-utils.ts:18) 设置，控制消息可见性

### 1.2 可见范围计算器

[`VisibleRangeCalculator`](../sdk/core/utils/visible-range-calculator.ts:1) 提供纯函数式的可见范围计算：

```typescript
// 获取当前批次的边界索引
export function getCurrentBoundary(markMap: MessageMarkMap): number {
  const boundary = markMap.batchBoundaries[markMap.currentBatch];
  return boundary;
}

// 获取可见消息的原始索引
export function getVisibleOriginalIndices(markMap: MessageMarkMap): number[] {
  const boundary = getCurrentBoundary(markMap);
  return markMap.originalIndices.filter(index => index >= boundary);
}

// 获取可见消息
export function getVisibleMessages(
  messages: LLMMessage[],
  markMap: MessageMarkMap
): LLMMessage[] {
  const visibleIndices = getVisibleOriginalIndices(markMap);
  return visibleIndices
    .map(index => messages[index])
    .filter((msg): msg is LLMMessage => msg !== undefined);
}
```

**设计特点**：
- 所有函数都是纯函数，不持有任何状态
- 基于索引操作，不修改原数组
- 支持可见索引与原始索引的双向转换

### 1.3 批次管理工具

[`BatchManagementUtils`](../sdk/core/utils/batch-management-utils.ts:1) 提供批次管理功能：

```typescript
// 开始新批次
export function startNewBatch(
  markMap: MessageMarkMap,
  boundaryIndex: number
): MessageMarkMap {
  // 验证边界索引
  if (boundaryIndex < 0 || boundaryIndex > markMap.originalIndices.length) {
    throw new ExecutionError(`Invalid boundary index: ${boundaryIndex}`);
  }

  // 创建新的标记映射副本
  const newMarkMap: MessageMarkMap = {
    ...markMap,
    originalIndices: [...markMap.originalIndices],
    typeIndices: { /* ... */ },
    batchBoundaries: [...markMap.batchBoundaries],
    boundaryToBatch: [...markMap.boundaryToBatch]
  };

  // 添加新边界
  newMarkMap.batchBoundaries.push(boundaryIndex);
  const newBatch = markMap.currentBatch + 1;
  newMarkMap.boundaryToBatch.push(newBatch);
  newMarkMap.currentBatch = newBatch;

  return newMarkMap;
}

// 回退到指定批次
export function rollbackToBatch(
  markMap: MessageMarkMap,
  targetBatch: number
): MessageMarkMap {
  // 验证目标批次存在
  if (!markMap.boundaryToBatch.includes(targetBatch)) {
    throw new ExecutionError(`Target batch ${targetBatch} not found`);
  }

  const targetBoundaryIndex = markMap.boundaryToBatch.indexOf(targetBatch);
  
  // 截断到目标批次
  const newMarkMap: MessageMarkMap = {
    ...markMap,
    batchBoundaries: markMap.batchBoundaries.slice(0, targetBoundaryIndex + 1),
    boundaryToBatch: markMap.boundaryToBatch.slice(0, targetBoundaryIndex + 1),
    currentBatch: targetBatch
  };

  return newMarkMap;
}
```

### 1.4 消息操作工具

[`MessageOperationUtils`](../sdk/core/utils/message-operation-utils.ts:1) 提供批次感知的消息操作：

```typescript
// 执行消息操作
export function executeOperation(
  context: MessageOperationContext,
  operation: MessageOperationConfig
): MessageOperationResult {
  const { messages, markMap, options = {} } = context;
  const visibleOnly = options.visibleOnly ?? true;

  switch (operation.operation) {
    case 'TRUNCATE':
      return executeTruncateOperation(messages, markMap, operation, visibleOnly);
    case 'INSERT':
      return executeInsertOperation(messages, markMap, operation, visibleOnly);
    case 'REPLACE':
      return executeReplaceOperation(messages, markMap, operation, visibleOnly);
    case 'CLEAR':
      return executeClearOperation(messages, markMap, operation, visibleOnly);
    case 'FILTER':
      return executeFilterOperation(messages, markMap, operation, visibleOnly);
    case 'BATCH_MANAGEMENT':
      return executeBatchManagementOperation(messages, markMap, operation);
  }
}
```

**支持的操作**：
- `TRUNCATE`：截断消息（支持只操作可见消息）
- `INSERT`：插入消息（支持在可见位置插入）
- `REPLACE`：替换消息（支持只替换可见消息）
- `CLEAR`：清空消息（支持只清空可见消息）
- `FILTER`：过滤消息（支持只过滤可见消息）
- `BATCH_MANAGEMENT`：批次管理（开始新批次、回退批次）

## 二、消息存储机制

### 2.1 ConversationManager

[`ConversationManager`](../sdk/core/execution/managers/conversation-manager.ts:79) 负责管理消息历史和消息索引：

```typescript
export class ConversationManager implements LifecycleCapable<ConversationState> {
  private messages: LLMMessage[] = [];
  private tokenUsageTracker: TokenUsageTracker;
  private markMap: MessageMarkMap;
  private typeIndexManager: TypeIndexManager;

  // 添加消息
  addMessage(message: LLMMessage): number {
    this.messages.push({ ...message });
    const newIndex = this.messages.length - 1;

    // 同步更新标记映射
    this.markMap.originalIndices.push(newIndex);
    this.markMap.typeIndices[message.role].push(newIndex);

    // 同步更新类型索引
    this.typeIndexManager.addIndex(message.role, newIndex);

    return this.messages.length;
  }

  // 获取当前可见消息
  getMessages(): LLMMessage[] {
    return getVisibleMessages(this.messages, this.markMap);
  }

  // 获取所有消息（包括不可见消息）
  getAllMessages(): LLMMessage[] {
    return [...this.messages];
  }

  // 开始新批次
  startNewBatchWithInitialTools(boundaryIndex: number): void {
    this.markMap = startNewBatch(this.markMap, boundaryIndex);
    // 添加初始工具描述消息
    if (!this.hasToolDescriptionMessage()) {
      const toolDescMessage = this.getInitialToolDescriptionMessage();
      if (toolDescMessage) {
        this.addMessage(toolDescMessage);
      }
    }
  }
}
```

**核心职责**：
1. 消息历史管理
2. Token统计和事件触发（委托给 [`TokenUsageTracker`](../sdk/core/execution/token-usage-tracker.ts:1)）
3. 消息索引管理（使用工具函数）
4. 消息可见性管理（通过批次边界控制）

### 2.2 GlobalMessageStorage

[`GlobalMessageStorage`](../sdk/core/services/global-message-storage.ts:36) 统一管理所有线程的消息历史：

```typescript
class GlobalMessageStorage {
  private messageHistories: Map<string, LLMMessage[]> = new Map();
  private referenceCounts: Map<string, number> = new Map();
  private batchSnapshots: Map<string, Map<number, BatchSnapshot>> = new Map();

  // 存储消息历史
  storeMessages(threadId: string, messages: LLMMessage[]): void {
    // 深度复制消息数组，避免外部修改影响存储
    this.messageHistories.set(threadId, messages.map(msg => ({ ...msg })));
  }

  // 获取消息历史
  getMessages(threadId: string): LLMMessage[] | undefined {
    const messages = this.messageHistories.get(threadId);
    if (!messages) {
      return undefined;
    }
    // 返回副本，避免外部修改影响存储
    return messages.map(msg => ({ ...msg }));
  }

  // 添加引用计数
  addReference(threadId: string): void {
    const count = this.referenceCounts.get(threadId) || 0;
    this.referenceCounts.set(threadId, count + 1);
  }

  // 移除引用计数，自动清理不再使用的消息
  removeReference(threadId: string): void {
    const count = this.referenceCounts.get(threadId) || 0;
    if (count <= 1) {
      this.cleanupThread(threadId);
      this.referenceCounts.delete(threadId);
    } else {
      this.referenceCounts.set(threadId, count - 1);
    }
  }

  // 记录批次消息快照
  saveBatchSnapshot(threadId: string, batchId: number, messages: LLMMessage[]): void {
    if (!this.batchSnapshots.has(threadId)) {
      this.batchSnapshots.set(threadId, new Map());
    }
    const snapshots = this.batchSnapshots.get(threadId)!;
    snapshots.set(batchId, {
      batchId,
      messages: messages.map(msg => ({ ...msg })),
      timestamp: now()
    });
  }
}
```

**设计原则**：
- 单例模式，全局唯一实例
- 线程安全，支持并发访问
- 引用计数，自动清理不再使用的消息历史
- 批次版本控制，支持不同批次的消息快照

## 三、线程执行机制分析

### 3.1 ThreadContext

[`ThreadContext`](../sdk/core/execution/context/thread-context.ts:45) 是线程执行的核心上下文：

```typescript
export class ThreadContext implements LifecycleCapable {
  public readonly thread: Thread;
  public readonly conversationManager: ConversationManager;
  private readonly variableCoordinator: VariableCoordinator;
  private readonly triggerStateManager: TriggerStateManager;
  private readonly executionState: ExecutionState;
  private readonly interruptionManager: InterruptionManager;
  private readonly toolVisibilityCoordinator: ToolVisibilityCoordinator;

  // 获取对话历史（可见消息）
  getConversationHistory(): LLMMessage[] {
    return this.conversationManager.getMessages();
  }

  // 向对话历史添加消息
  addMessageToConversation(message: LLMMessage): void {
    this.conversationManager.addMessage(message);
  }
}
```

**设计特点**：
- 每个线程拥有独立的 [`ConversationManager`](../sdk/core/execution/managers/conversation-manager.ts:79) 实例
- 每个线程拥有独立的 [`TriggerStateManager`](../sdk/core/execution/managers/trigger-state-manager.ts:1) 实例
- 每个线程拥有独立的 [`InterruptionManager`](../sdk/core/execution/managers/interruption-manager.ts:1) 实例
- 每个线程拥有独立的 [`ToolVisibilityCoordinator`](../sdk/core/execution/coordinators/tool-visibility-coordinator.ts:1) 实例

### 3.2 ThreadExecutor

[`ThreadExecutor`](../sdk/core/execution/thread-executor.ts:44) 负责执行单个 [`ThreadContext`](../sdk/core/execution/context/thread-context.ts:45)：

```typescript
export class ThreadExecutor {
  private nodeExecutionCoordinator: NodeExecutionCoordinator;
  private llmExecutionCoordinator: LLMExecutionCoordinator;
  private eventManager: EventManager;
  private workflowRegistry: WorkflowRegistry;
  private executionContext: ExecutionContext;
  private interruptionDetector: InterruptionDetector;

  // 执行 ThreadContext
  async executeThread(threadContext: ThreadContext): Promise<ThreadResult> {
    try {
      // 执行主循环
      while (true) {
        // 检查中断状态
        const shouldContinue = await this.checkInterruption(threadContext);
        if (!shouldContinue) {
          break;
        }

        // 获取当前节点
        const currentNode = this.getCurrentNode(threadContext);
        if (!currentNode) {
          break;
        }

        // 执行节点
        const nodeResult = await this.nodeExecutionCoordinator.executeNode(threadContext, currentNode);

        // 处理节点执行结果
        if (nodeResult.status === 'COMPLETED') {
          if (this.isEndNode(currentNode)) {
            this.completeThread(threadContext);
            break;
          }
          this.routeToNextNode(threadContext, currentNode, nodeResult);
        } else if (nodeResult.status === 'FAILED') {
          await handleNodeFailure(threadContext, currentNode, nodeResult);
        } else if (nodeResult.status === 'SKIPPED') {
          this.routeToNextNode(threadContext, currentNode, nodeResult);
        }
      }

      return this.createThreadResult(threadContext);
    } catch (error) {
      await handleExecutionError(threadContext, error);
      return this.createThreadResult(threadContext);
    }
  }
}
```

**执行特点**：
- 专注于执行单个 [`ThreadContext`](../sdk/core/execution/context/thread-context.ts:45)
- 不负责线程的创建、注册和管理
- 通过协调器模式委托具体职责给专门的组件

### 3.3 ThreadPoolManager

[`ThreadPoolManager`](../sdk/core/execution/managers/thread-pool-manager.ts:24) 管理 [`ThreadExecutor`](../sdk/core/execution/thread-executor.ts:44) 实例的生命周期：

```typescript
export class ThreadPoolManager {
  private allExecutors: Map<string, ExecutorWrapper> = new Map();
  private idleExecutors: string[] = [];
  private busyExecutors: Set<string> = new Set();
  private waitingPromises: Array<{
    resolve: (executor: any) => void;
    reject: (error: Error) => void;
  }> = [];

  // 分配执行器
  async allocateExecutor(): Promise<any> {
    // 1. 检查空闲执行器
    if (this.idleExecutors.length > 0) {
      const executorId = this.idleExecutors.shift()!;
      const wrapper = this.allExecutors.get(executorId)!;
      wrapper.status = 'BUSY';
      this.busyExecutors.add(executorId);
      return wrapper.executor;
    }

    // 2. 检查是否可以创建新执行器
    if (this.allExecutors.size < this.config.maxExecutors) {
      const wrapper = this.createExecutor();
      wrapper.status = 'BUSY';
      this.busyExecutors.add(wrapper.executorId);
      return wrapper.executor;
    }

    // 3. 等待空闲执行器
    return new Promise((resolve, reject) => {
      this.waitingPromises.push({ resolve, reject });
    });
  }

  // 释放执行器
  releaseExecutor(executor: any): void {
    // 从忙碌集合移除
    this.busyExecutors.delete(executorId);

    // 检查是否有等待的 Promise
    if (this.waitingPromises.length > 0) {
      const waiting = this.waitingPromises.shift()!;
      wrapper.status = 'BUSY';
      this.busyExecutors.add(executorId);
      waiting.resolve(wrapper.executor);
      return;
    }

    // 加入空闲队列
    wrapper.status = 'IDLE';
    this.idleExecutors.push(executorId);

    // 设置空闲超时定时器
    this.scheduleIdleTimeout(executorId);
  }
}
```

**池化机制**：
- 维护空闲执行器队列和忙碌执行器集合
- 动态扩缩容（[`minExecutors`](../sdk/core/execution/managers/thread-pool-manager.ts:71) 到 [`maxExecutors`](../sdk/core/execution/managers/thread-pool-manager.ts:72)）
- 空闲超时回收（[`idleTimeout`](../sdk/core/execution/managers/thread-pool-manager.ts:73)）

## 四、并发访问问题分析

### 4.1 线程隔离机制

**每个线程的隔离状态**：

1. **独立的 ConversationManager**：
   - 每个线程拥有独立的 [`ConversationManager`](../sdk/core/execution/managers/conversation-manager.ts:79) 实例
   - 消息数组 `messages` 是线程私有的
   - 标记映射 `markMap` 是线程私有的

2. **独立的 TriggerStateManager**：
   - 每个线程拥有独立的 [`TriggerStateManager`](../sdk/core/execution/managers/trigger-state-manager.ts:1) 实例
   - 触发器状态是线程私有的

3. **独立的 InterruptionManager**：
   - 每个线程拥有独立的 [`InterruptionManager`](../sdk/core/execution/managers/interruption-manager.ts:1) 实例
   - 中断信号是线程私有的

4. **独立的 ToolVisibilityCoordinator**：
   - 每个线程拥有独立的 [`ToolVisibilityCoordinator`](../sdk/core/execution/coordinators/tool-visibility-coordinator.ts:1) 实例
   - 工具可见性上下文是线程私有的

### 4.2 共享资源分析

**全局共享资源**：

1. **GlobalMessageStorage**：
   - 单例模式，全局唯一实例
   - 使用 `Map<string, LLMMessage[]>` 存储不同线程的消息历史
   - 通过 `threadId` 隔离不同线程的消息
   - **潜在问题**：没有显式的并发控制机制

2. **EventManager**：
   - 单例模式，全局唯一实例
   - 负责事件发布和订阅
   - **潜在问题**：事件处理可能存在并发问题

3. **ThreadRegistry**：
   - 单例模式，全局唯一实例
   - 负责线程注册和查询
   - **潜在问题**：并发注册和查询可能存在竞态条件

4. **WorkflowRegistry**：
   - 单例模式，全局唯一实例
   - 负责工作流注册和查询
   - **潜在问题**：并发注册和查询可能存在竞态条件

5. **ToolService**：
   - 单例模式，全局唯一实例
   - 负责工具注册和查询
   - **潜在问题**：并发注册和查询可能存在竞态条件

### 4.3 潜在并发问题

#### 问题1：GlobalMessageStorage 缺少并发控制

**问题描述**：
[`GlobalMessageStorage`](../sdk/core/services/global-message-storage.ts:36) 使用 `Map` 存储消息历史，但没有显式的并发控制机制。

**影响**：
- 多个线程同时调用 [`storeMessages()`](../sdk/core/services/global-message-storage.ts:47) 可能导致数据竞争
- 多个线程同时调用 [`getMessages()`](../sdk/core/services/global-message-storage.ts:57) 可能返回不一致的数据
- 多个线程同时调用 [`removeReference()`](../sdk/core/services/global-message-storage.ts:79) 可能导致引用计数错误

**建议**：
- 使用 `Mutex` 或 `Semaphore` 保护共享状态
- 或者使用并发安全的数据结构（如 `AsyncLock`）

#### 问题2：ThreadRegistry 缺少并发控制

**问题描述**：
[`ThreadRegistry`](../sdk/core/services/thread-registry.ts:1) 使用 `Map` 存储线程上下文，但没有显式的并发控制机制。

**影响**：
- 多个线程同时注册可能导致数据竞争
- 多个线程同时查询可能返回不一致的数据

**建议**：
- 使用 `Mutex` 或 `Semaphore` 保护共享状态
- 或者使用并发安全的数据结构

#### 问题3：EventManager 事件处理并发问题

**问题描述**：
[`EventManager`](../sdk/core/services/event-manager.ts:1) 的事件处理可能存在并发问题。

**影响**：
- 多个线程同时发布事件可能导致事件处理顺序混乱
- 事件监听器的并发执行可能导致状态不一致

**建议**：
- 使用事件队列机制，确保事件按顺序处理
- 或者使用并发安全的事件处理机制

#### 问题4：ConversationManager 的 markMap 更新

**问题描述**：
[`ConversationManager`](../sdk/core/execution/managers/conversation-manager.ts:79) 的 `markMap` 更新操作不是原子的。

**影响**：
- 在 [`addMessage()`](../sdk/core/execution/managers/conversation-manager.ts:123) 中，`markMap` 的多个字段更新不是原子的
- 如果在更新过程中发生异常，可能导致 `markMap` 状态不一致

**建议**：
- 使用不可变数据结构，确保每次更新都创建新的 `markMap`
- 或者使用事务机制确保更新的原子性

### 4.4 线程池并发控制

**ThreadPoolManager 的并发控制**：

```typescript
export class ThreadPoolManager {
  private allExecutors: Map<string, ExecutorWrapper> = new Map();
  private idleExecutors: string[] = [];
  private busyExecutors: Set<string> = new Set();
  private waitingPromises: Array<{
    resolve: (executor: any) => void;
    reject: (error: Error) => void;
  }> = [];

  // 分配执行器
  async allocateExecutor(): Promise<any> {
    // 检查空闲执行器
    if (this.idleExecutors.length > 0) {
      const executorId = this.idleExecutors.shift()!;
      const wrapper = this.allExecutors.get(executorId)!;
      wrapper.status = 'BUSY';
      this.busyExecutors.add(executorId);
      return wrapper.executor;
    }

    // 检查是否可以创建新执行器
    if (this.allExecutors.size < this.config.maxExecutors) {
      const wrapper = this.createExecutor();
      wrapper.status = 'BUSY';
      this.busyExecutors.add(wrapper.executorId);
      return wrapper.executor;
    }

    // 等待空闲执行器
    return new Promise((resolve, reject) => {
      this.waitingPromises.push({ resolve, reject });
    });
  }
}
```

**并发控制机制**：
- 使用 `Promise` 队列管理等待的任务
- 使用 `Set` 跟踪忙碌的执行器
- 使用数组管理空闲的执行器

**潜在问题**：
- `allocateExecutor()` 和 `releaseExecutor()` 之间的状态转换不是原子的
- 可能出现执行器状态不一致的情况

**建议**：
- 使用 `Mutex` 保护状态转换
- 或者使用状态机模式确保状态转换的正确性

## 五、改进建议

### 5.1 添加并发控制机制

**建议1：使用 Mutex 保护共享状态**

```typescript
import { Mutex } from 'async-mutex';

class GlobalMessageStorage {
  private mutex = new Mutex();
  private messageHistories: Map<string, LLMMessage[]> = new Map();

  async storeMessages(threadId: string, messages: LLMMessage[]): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.messageHistories.set(threadId, messages.map(msg => ({ ...msg })));
    } finally {
      release();
    }
  }

  async getMessages(threadId: string): Promise<LLMMessage[] | undefined> {
    const release = await this.mutex.acquire();
    try {
      const messages = this.messageHistories.get(threadId);
      if (!messages) {
        return undefined;
      }
      return messages.map(msg => ({ ...msg }));
    } finally {
      release();
    }
  }
}
```

**建议2：使用不可变数据结构**

```typescript
interface MessageMarkMap {
  readonly originalIndices: readonly number[];
  readonly typeIndices: {
    readonly system: readonly number[];
    readonly user: readonly number[];
    readonly assistant: readonly number[];
    readonly tool: readonly number[];
  };
  readonly batchBoundaries: readonly number[];
  readonly boundaryToBatch: readonly number[];
  readonly currentBatch: number;
}

// 每次更新都创建新的 markMap
const newMarkMap: MessageMarkMap = {
  ...markMap,
  originalIndices: [...markMap.originalIndices, newIndex],
  currentBatch: markMap.currentBatch + 1
};
```

**建议3：使用事务机制**

```typescript
class ConversationManager {
  async addMessageWithTransaction(message: LLMMessage): Promise<number> {
    // 开始事务
    const transaction = this.beginTransaction();

    try {
      // 执行操作
      this.messages.push({ ...message });
      const newIndex = this.messages.length - 1;

      // 更新标记映射
      const newMarkMap = {
        ...this.markMap,
        originalIndices: [...this.markMap.originalIndices, newIndex],
        typeIndices: {
          ...this.markMap.typeIndices,
          [message.role]: [...this.markMap.typeIndices[message.role], newIndex]
        }
      };

      // 提交事务
      transaction.commit(newMarkMap);

      return this.messages.length;
    } catch (error) {
      // 回滚事务
      transaction.rollback();
      throw error;
    }
  }
}
```

### 5.2 优化线程池管理

**建议1：使用状态机模式**

```typescript
enum ExecutorState {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  SHUTDOWN = 'SHUTDOWN'
}

class ExecutorWrapper {
  state: ExecutorState = ExecutorState.IDLE;
  executor: ThreadExecutor;
  lastUsedTime: number;

  transitionTo(newState: ExecutorState): void {
    // 验证状态转换的合法性
    const validTransitions = {
      [ExecutorState.IDLE]: [ExecutorState.BUSY, ExecutorState.SHUTDOWN],
      [ExecutorState.BUSY]: [ExecutorState.IDLE, ExecutorState.SHUTDOWN],
      [ExecutorState.SHUTDOWN]: []
    };

    if (!validTransitions[this.state].includes(newState)) {
      throw new Error(`Invalid state transition: ${this.state} -> ${newState}`);
    }

    this.state = newState;
  }
}
```

**建议2：添加执行器健康检查**

```typescript
class ThreadPoolManager {
  private healthCheckInterval: NodeJS.Timeout;

  constructor(executionContext: ExecutionContext, config?: SubworkflowManagerConfig) {
    // ... 初始化代码

    // 启动健康检查
    this.startHealthCheck();
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkExecutorHealth();
    }, 60000); // 每分钟检查一次
  }

  private checkExecutorHealth(): void {
    for (const [executorId, wrapper] of this.allExecutors.entries()) {
      if (wrapper.state === ExecutorState.BUSY) {
        const idleTime = now() - wrapper.lastUsedTime;
        if (idleTime > this.config.maxExecutionTime) {
          // 执行器可能卡住了，需要处理
          this.handleStuckExecutor(executorId);
        }
      }
    }
  }

  private handleStuckExecutor(executorId: string): void {
    // 记录警告
    console.warn(`Executor ${executorId} may be stuck`);

    // 尝试中断执行
    const wrapper = this.allExecutors.get(executorId);
    if (wrapper) {
      // 这里需要实现中断逻辑
      // 例如：通过 AbortSignal 中断执行
    }
  }
}
```

### 5.3 优化消息可见性管理

**建议1：添加可见性变更事件**

```typescript
class ConversationManager {
  private visibilityChangeListeners: Array<(visibleCount: number) => void> = [];

  startNewBatchWithInitialTools(boundaryIndex: number): void {
    const oldVisibleCount = getVisibleOriginalIndices(this.markMap).length;
    
    this.markMap = startNewBatch(this.markMap, boundaryIndex);
    
    const newVisibleCount = getVisibleOriginalIndices(this.markMap).length;
    
    // 触发可见性变更事件
    if (oldVisibleCount !== newVisibleCount) {
      this.notifyVisibilityChange(newVisibleCount);
    }
  }

  private notifyVisibilityChange(visibleCount: number): void {
    for (const listener of this.visibilityChangeListeners) {
      listener(visibleCount);
    }
  }

  onVisibilityChange(listener: (visibleCount: number) => void): void {
    this.visibilityChangeListeners.push(listener);
  }
}
```

**建议2：添加可见性统计**

```typescript
class ConversationManager {
  getVisibilityStats(): {
    totalMessages: number;
    visibleMessages: number;
    invisibleMessages: number;
    currentBatch: number;
    batchCount: number;
  } {
    const totalMessages = this.messages.length;
    const visibleMessages = getVisibleOriginalIndices(this.markMap).length;
    const invisibleMessages = totalMessages - visibleMessages;
    const currentBatch = this.markMap.currentBatch;
    const batchCount = this.markMap.batchBoundaries.length;

    return {
      totalMessages,
      visibleMessages,
      invisibleMessages,
      currentBatch,
      batchCount
    };
  }
}
```

## 六、总结

### 6.1 当前实现的优点

1. **线程隔离**：每个线程拥有独立的状态管理器，避免了大部分并发问题
2. **批次机制**：通过批次边界控制消息可见性，支持消息压缩和回退
3. **纯函数设计**：可见范围计算和消息操作使用纯函数，易于测试和维护
4. **引用计数**：[`GlobalMessageStorage`](../sdk/core/services/global-message-storage.ts:36) 使用引用计数自动清理不再使用的消息历史
5. **线程池管理**：[`ThreadPoolManager`](../sdk/core/execution/managers/thread-pool-manager.ts:24) 提供高效的执行器池化机制

### 6.2 当前实现的潜在问题

1. **缺少并发控制**：全局共享资源（如 [`GlobalMessageStorage`](../sdk/core/services/global-message-storage.ts:36)、[`ThreadRegistry`](../sdk/core/services/thread-registry.ts:1)）缺少显式的并发控制机制
2. **状态不一致**：[`ConversationManager`](../sdk/core/execution/managers/conversation-manager.ts:79) 的 `markMap` 更新操作不是原子的，可能导致状态不一致
3. **竞态条件**：[`ThreadPoolManager`](../sdk/core/execution/managers/thread-pool-manager.ts:24) 的状态转换不是原子的，可能出现竞态条件
4. **缺少健康检查**：执行器可能卡住，缺少健康检查和恢复机制

### 6.3 改进建议优先级

**高优先级**：
1. 为全局共享资源添加并发控制机制（Mutex 或 Semaphore）
2. 使用不可变数据结构确保状态一致性
3. 添加执行器健康检查机制

**中优先级**：
1. 使用状态机模式确保状态转换的正确性
2. 添加可见性变更事件和统计
3. 优化错误处理和恢复机制

**低优先级**：
1. 添加性能监控和指标收集
2. 优化内存使用和垃圾回收
3. 添加更详细的日志和调试信息

### 6.4 结论

当前项目的消息可见范围与作用域管理机制设计良好，通过批次边界机制实现了灵活的消息可见性控制。线程隔离机制避免了大部分并发问题，但全局共享资源仍需要添加并发控制机制以确保线程安全。

建议优先实现高优先级的改进建议，以提高系统的稳定性和可靠性。