# 事件操作分析报告

## 概述

本报告分析了当前项目中使用的事件操作模式，识别了可以复用 `EventWaiter` 的场景，以及可以提取为工具类的方法。

## 当前事件操作模式

### 1. 事件等待操作

#### 1.1 使用 EventWaiter 的场景

**文件**: `sdk/core/execution/coordinators/thread-lifecycle-coordinator.ts`

```typescript
// 等待线程暂停
await this.eventWaiter.waitForThreadPaused(threadId, 5000);

// 等待线程取消
await this.eventWaiter.waitForThreadCancelled(threadId, 5000);
```

**优点**:
- 封装了事件等待逻辑
- 提供超时控制
- 简化了调用方式

#### 1.2 使用轮询等待的场景

**文件**: `sdk/core/execution/utils/thread-operations.ts`

```typescript
async function waitForCompletion(
  childThreadIds: string[],
  joinStrategy: JoinStrategy,
  threadRegistry: ThreadRegistry,
  timeout: number,
  parentThreadId?: string,
  eventManager?: EventManager
): Promise<{ completedThreads: Thread[]; failedThreads: Thread[] }> {
  // 使用轮询方式检查线程状态
  while (pendingThreads.size > 0) {
    // 检查超时
    const elapsedTime = diffTimestamp(startTime, now());
    if (elapsedTime > timeout) {
      throw new TimeoutError('Join operation timeout', timeout);
    }

    // 检查子 thread 状态
    for (const threadId of Array.from(pendingThreads)) {
      const threadContext = threadRegistry.get(threadId);
      if (!threadContext) {
        continue;
      }

      const thread = threadContext.thread;
      if (thread.status === 'COMPLETED') {
        completedThreads.push(thread);
        pendingThreads.delete(threadId);
      } else if (thread.status === 'FAILED' || thread.status === 'CANCELLED') {
        failedThreads.push(thread);
        pendingThreads.delete(threadId);
      }
    }

    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

**问题**:
- 使用轮询方式，效率较低
- 每100ms检查一次状态
- 没有利用事件驱动机制

### 2. 事件触发操作

#### 2.1 ThreadLifecycleManager 中的事件触发

**文件**: `sdk/core/execution/managers/thread-lifecycle-manager.ts`

```typescript
private async emitThreadStartedEvent(thread: Thread): Promise<void> {
  const event: ThreadStartedEvent = {
    type: EventType.THREAD_STARTED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    input: thread.input
  };
  await this.eventManager.emit(event);
}

private async emitThreadCompletedEvent(thread: Thread, result: ThreadResult): Promise<void> {
  const event: ThreadCompletedEvent = {
    type: EventType.THREAD_COMPLETED,
    timestamp: now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    output: result.output,
    executionTime: result.executionTime
  };
  await this.eventManager.emit(event);
}
```

**模式**:
- 每个事件类型都有独立的 `emit*Event` 方法
- 重复的事件构建逻辑
- 缺少统一的错误处理

#### 2.2 NodeExecutionCoordinator 中的事件触发

**文件**: `sdk/core/execution/coordinators/node-execution-coordinator.ts`

```typescript
const nodeStartedEvent: NodeStartedEvent = {
  type: EventType.NODE_STARTED,
  threadId: threadContext.getThreadId(),
  workflowId: threadContext.getWorkflowId(),
  nodeId,
  nodeType,
  timestamp: now()
};
await this.eventManager.emit(nodeStartedEvent);
```

**模式**:
- 直接在业务逻辑中构建事件对象
- 事件构建逻辑分散

#### 2.3 LLMExecutionCoordinator 中的事件触发

**文件**: `sdk/core/execution/coordinators/llm-execution-coordinator.ts`

```typescript
if (this.eventManager) {
  await this.eventManager.emit({
    type: EventType.MESSAGE_ADDED,
    timestamp: now(),
    workflowId: threadContext.getWorkflowId(),
    threadId: threadContext.getThreadId(),
    message
  });
}
```

**模式**:
- 每次触发前检查 `eventManager` 是否存在
- 重复的检查逻辑

## 可以复用 EventWaiter 的场景

### 场景 1: Join 操作等待子线程完成

**当前实现**: 使用轮询方式

**建议改进**: 使用 EventWaiter 等待线程完成事件

```typescript
// 在 EventWaiter 中添加新方法
async waitForThreadCompleted(threadId: string, timeout: number = 30000): Promise<void> {
  await this.eventManager.waitFor(EventType.THREAD_COMPLETED, timeout);
}

async waitForThreadFailed(threadId: string, timeout: number = 30000): Promise<void> {
  await this.eventManager.waitFor(EventType.THREAD_FAILED, timeout);
}

async waitForAnyThreadCompletion(
  threadIds: string[],
  timeout: number = 30000
): Promise<{ threadId: string; status: 'COMPLETED' | 'FAILED' }> {
  const events = [
    EventType.THREAD_COMPLETED,
    EventType.THREAD_FAILED
  ];

  const promises = events.map(eventType =>
    this.eventManager.waitFor(eventType, timeout)
  );

  const result = await Promise.race(promises);
  return result;
}
```

**优势**:
- 事件驱动，无需轮询
- 响应更快
- 代码更简洁

### 场景 2: 等待节点执行完成

**当前实现**: 没有明确的等待机制

**建议改进**: 添加节点事件等待

```typescript
// 在 EventWaiter 中添加
async waitForNodeCompleted(threadId: string, nodeId: string, timeout: number = 30000): Promise<void> {
  await this.eventManager.waitFor(EventType.NODE_COMPLETED, timeout);
}

async waitForNodeFailed(threadId: string, nodeId: string, timeout: number = 30000): Promise<void> {
  await this.eventManager.waitFor(EventType.NODE_FAILED, timeout);
}
```

## 可以提取为工具类的方法

### 1. 事件构建工具类

**文件**: `sdk/core/execution/utils/event-builder.ts`

```typescript
/**
 * EventBuilder - 事件构建工具类
 * 提供统一的事件构建方法
 */

import { now } from '../../../utils';
import type { Thread, ThreadResult, Node, NodeExecutionResult } from '../../../types/thread';
import type {
  ThreadStartedEvent,
  ThreadCompletedEvent,
  ThreadFailedEvent,
  ThreadPausedEvent,
  ThreadResumedEvent,
  ThreadCancelledEvent,
  ThreadStateChangedEvent,
  NodeStartedEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  SubgraphStartedEvent,
  SubgraphCompletedEvent,
  VariableChangedEvent,
  MessageAddedEvent,
  TokenUsageWarningEvent,
  ConversationStateChangedEvent,
  ToolCallStartedEvent,
  ToolCallCompletedEvent,
  ToolCallFailedEvent
} from '../../../types/events';
import { EventType } from '../../../types/events';

export class EventBuilder {
  /**
   * 构建线程开始事件
   */
  static buildThreadStartedEvent(thread: Thread): ThreadStartedEvent {
    return {
      type: EventType.THREAD_STARTED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      input: thread.input
    };
  }

  /**
   * 构建线程完成事件
   */
  static buildThreadCompletedEvent(thread: Thread, result: ThreadResult): ThreadCompletedEvent {
    return {
      type: EventType.THREAD_COMPLETED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      output: result.output,
      executionTime: result.executionTime
    };
  }

  /**
   * 构建线程失败事件
   */
  static buildThreadFailedEvent(thread: Thread, error: Error): ThreadFailedEvent {
    return {
      type: EventType.THREAD_FAILED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      error: error.message
    };
  }

  /**
   * 构建线程暂停事件
   */
  static buildThreadPausedEvent(thread: Thread): ThreadPausedEvent {
    return {
      type: EventType.THREAD_PAUSED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id
    };
  }

  /**
   * 构建线程恢复事件
   */
  static buildThreadResumedEvent(thread: Thread): ThreadResumedEvent {
    return {
      type: EventType.THREAD_RESUMED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id
    };
  }

  /**
   * 构建线程取消事件
   */
  static buildThreadCancelledEvent(thread: Thread, reason?: string): ThreadCancelledEvent {
    return {
      type: EventType.THREAD_CANCELLED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      reason
    };
  }

  /**
   * 构建线程状态变更事件
   */
  static buildThreadStateChangedEvent(
    thread: Thread,
    previousStatus: string,
    newStatus: string
  ): ThreadStateChangedEvent {
    return {
      type: EventType.THREAD_STATE_CHANGED,
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      previousStatus,
      newStatus
    };
  }

  /**
   * 构建节点开始事件
   */
  static buildNodeStartedEvent(threadContext: any, node: Node): NodeStartedEvent {
    return {
      type: EventType.NODE_STARTED,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      nodeId: node.id,
      nodeType: node.type,
      timestamp: now()
    };
  }

  /**
   * 构建节点完成事件
   */
  static buildNodeCompletedEvent(
    threadContext: any,
    node: Node,
    result: NodeExecutionResult
  ): NodeCompletedEvent {
    return {
      type: EventType.NODE_COMPLETED,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      nodeId: node.id,
      nodeType: node.type,
      output: result.output,
      executionTime: result.executionTime,
      timestamp: now()
    };
  }

  /**
   * 构建节点失败事件
   */
  static buildNodeFailedEvent(
    threadContext: any,
    node: Node,
    error: Error
  ): NodeFailedEvent {
    return {
      type: EventType.NODE_FAILED,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      nodeId: node.id,
      nodeType: node.type,
      error: error.message,
      timestamp: now()
    };
  }

  /**
   * 构建变量变更事件
   */
  static buildVariableChangedEvent(
    threadContext: any,
    name: string,
    value: any,
    scope: string
  ): VariableChangedEvent {
    return {
      type: EventType.VARIABLE_CHANGED,
      timestamp: now(),
      workflowId: threadContext.getWorkflowId(),
      threadId: threadContext.getThreadId(),
      variableName: name,
      variableValue: value,
      variableScope: scope
    };
  }
}
```

### 2. 事件触发工具类

**文件**: `sdk/core/execution/utils/event-emitter.ts`

```typescript
/**
 * EventEmitter - 事件触发工具类
 * 提供统一的事件触发方法，包含错误处理
 */

import type { EventManager } from '../../services/event-manager';
import type { Event } from '../../../types/events';

export class EventEmitter {
  /**
   * 安全触发事件
   * 如果事件管理器不存在或触发失败，不会抛出异常
   */
  static async safeEmit(
    eventManager: EventManager | undefined,
    event: Event
  ): Promise<void> {
    if (!eventManager) {
      return;
    }

    try {
      await eventManager.emit(event);
    } catch (error) {
      // 静默处理事件触发错误，避免影响主流程
      console.error(`Failed to emit event ${event.type}:`, error);
    }
  }

  /**
   * 触发事件（如果失败会抛出异常）
   */
  static async emit(
    eventManager: EventManager | undefined,
    event: Event
  ): Promise<void> {
    if (!eventManager) {
      throw new Error('EventManager is not available');
    }

    await eventManager.emit(event);
  }

  /**
   * 批量触发事件
   */
  static async emitBatch(
    eventManager: EventManager | undefined,
    events: Event[]
  ): Promise<void> {
    if (!eventManager) {
      return;
    }

    for (const event of events) {
      await this.safeEmit(eventManager, event);
    }
  }
}
```

### 3. 事件等待工具类扩展

**文件**: `sdk/core/execution/utils/event-waiter.ts` (扩展现有文件)

```typescript
/**
 * EventWaiter - 事件等待器（扩展版）
 * 
 * 新增功能：
 * - 等待多个线程完成
 * - 等待节点事件
 * - 等待条件满足
 */

export class EventWaiter {
  constructor(private eventManager: EventManager) { }

  // ... 现有方法 ...

  /**
   * 等待多个线程完成
   * 
   * @param threadIds 线程ID数组
   * @param timeout 超时时间（毫秒）
   * @returns Promise，所有线程完成或超时时解析
   */
  async waitForMultipleThreadsCompleted(
    threadIds: string[],
    timeout: number = 30000
  ): Promise<void> {
    const promises = threadIds.map(threadId =>
      this.waitForThreadCompleted(threadId, timeout)
    );

    await Promise.all(promises);
  }

  /**
   * 等待任意一个线程完成
   * 
   * @param threadIds 线程ID数组
   * @param timeout 超时时间（毫秒）
   * @returns Promise，任意线程完成或超时时解析
   */
  async waitForAnyThreadCompleted(
    threadIds: string[],
    timeout: number = 30000
  ): Promise<string> {
    const promises = threadIds.map(threadId =>
      this.waitForThreadCompleted(threadId, timeout)
    );

    const index = await Promise.race(
      promises.map((promise, index) =>
        promise.then(() => index)
      )
    );

    return threadIds[index];
  }

  /**
   * 等待节点完成
   * 
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param timeout 超时时间（毫秒）
   * @returns Promise，超时或事件触发时解析
   */
  async waitForNodeCompleted(
    threadId: string,
    nodeId: string,
    timeout: number = 30000
  ): Promise<void> {
    await this.eventManager.waitFor(EventType.NODE_COMPLETED, timeout);
  }

  /**
   * 等待节点失败
   * 
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param timeout 超时时间（毫秒）
   * @returns Promise，超时或事件触发时解析
   */
  async waitForNodeFailed(
    threadId: string,
    nodeId: string,
    timeout: number = 30000
  ): Promise<void> {
    await this.eventManager.waitFor(EventType.NODE_FAILED, timeout);
  }

  /**
   * 等待条件满足
   * 
   * @param condition 条件函数
   * @param checkInterval 检查间隔（毫秒）
   * @param timeout 超时时间（毫秒）
   * @returns Promise，条件满足或超时时解析
   */
  async waitForCondition(
    condition: () => boolean,
    checkInterval: number = 100,
    timeout: number = 30000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }
}
```

## 重构建议

### 优先级 1: 高优先级

1. **创建 EventBuilder 工具类**
   - 统一事件构建逻辑
   - 减少重复代码
   - 提高代码可维护性

2. **创建 EventEmitter 工具类**
   - 统一事件触发逻辑
   - 提供错误处理
   - 简化调用方式

3. **扩展 EventWaiter**
   - 添加多线程等待方法
   - 添加节点事件等待方法
   - 添加条件等待方法

### 优先级 2: 中优先级

4. **重构 thread-operations.ts 中的 waitForCompletion**
   - 使用 EventWaiter 替代轮询
   - 提高效率
   - 简化代码

5. **重构 ThreadLifecycleManager 中的事件触发**
   - 使用 EventBuilder 构建事件
   - 使用 EventEmitter 触发事件
   - 减少重复代码

### 优先级 3: 低优先级

6. **重构其他协调器中的事件触发**
   - NodeExecutionCoordinator
   - LLMExecutionCoordinator
   - VariableCoordinator

## 实施计划

### 阶段 1: 创建工具类

1. 创建 `sdk/core/execution/utils/event-builder.ts`
2. 创建 `sdk/core/execution/utils/event-emitter.ts`
3. 扩展 `sdk/core/execution/utils/event-waiter.ts`

### 阶段 2: 重构核心模块

4. 重构 `ThreadLifecycleManager`
5. 重构 `thread-operations.ts`

### 阶段 3: 重构其他模块

6. 重构 `NodeExecutionCoordinator`
7. 重构 `LLMExecutionCoordinator`
8. 重构 `VariableCoordinator`

### 阶段 4: 测试和验证

9. 运行现有测试
10. 更新测试用例
11. 性能测试

## 预期收益

1. **代码质量提升**
   - 减少重复代码
   - 提高代码可读性
   - 提高代码可维护性

2. **性能提升**
   - 使用事件驱动替代轮询
   - 减少不必要的检查
   - 提高响应速度

3. **开发效率提升**
   - 统一的事件操作接口
   - 简化事件处理逻辑
   - 减少开发时间

4. **错误处理改进**
   - 统一的错误处理机制
   - 更好的错误日志
   - 更稳定的系统

## 总结

通过创建 `EventBuilder`、`EventEmitter` 和扩展 `EventWaiter`，我们可以：

1. 统一事件操作模式
2. 减少重复代码
3. 提高代码质量
4. 提升系统性能
5. 简化开发流程

建议按照优先级逐步实施重构，确保每个阶段都经过充分测试。