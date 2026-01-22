# Thread Fork/Join 集成待完成任务

## 概述

本文档记录了Thread Fork/Join与节点集成的待完成任务和实现思路。

## 已完成的工作

### 1. 创建MarkerNode值对象
- ✅ 创建了[`MarkerNode`](src/domain/workflow/value-objects/node/marker-node.ts:1)值对象
- ✅ 支持Fork、Join、SubWorkflow、LoopStart、LoopEnd等标记节点类型
- ✅ 实现了配置验证逻辑
- ✅ 提供了工厂方法创建不同类型的标记节点

### 2. 重构标记节点
- ✅ ForkNode使用MarkerNode存储分支配置
- ✅ JoinNode使用MarkerNode标记join点
- ✅ SubWorkflowNode使用MarkerNode存储子工作流配置
- ✅ 简化了验证逻辑，由MarkerNode负责

### 3. 实现WorkflowExecutionEngine集成
- ✅ 实现了handleForkNode方法
- ✅ 实现了handleJoinNode方法
- ✅ 在节点执行后自动处理ForkNode和JoinNode
- ✅ 实现了getCurrentThread方法
- ✅ 实现了startChildThread方法

### 4. 更新依赖注入
- ✅ 添加了ThreadJoin服务到依赖注入容器
- ✅ 在WorkflowExecutionEngine中注入了ThreadRepository
- ✅ 所有类型检查通过

## 待完成的任务

### 1. ThreadFork的TODO项

#### 1.1 变量快照实现
**位置**: [`src/services/threads/thread-fork.ts:268`](src/services/threads/thread-fork.ts:268)

**当前状态**:
```typescript
// 构建变量快照
// 注意：上下文现在由其他服务管理，这里暂时创建空快照
// TODO: 从上下文服务获取变量快照
const variableSnapshot = new Map<string, unknown>();
```

**实现思路**:
1. 创建ContextSnapshot服务
2. 从ThreadStateManager获取当前线程状态
3. 提取所有变量到快照中
4. 支持选择性快照（根据ForkOptions的contextRetention）

**实现步骤**:
```typescript
// 1. 创建ContextSnapshot服务
export class ContextSnapshot {
  constructor(
    @inject(TYPES.ThreadStateManager) private stateManager: ThreadStateManager
  ) {}

  async captureVariables(threadId: string): Promise<Map<string, unknown>> {
    const state = this.stateManager.getState(threadId);
    return new Map(Object.entries(state.data));
  }

  async captureVariablesSelective(
    threadId: string,
    keys: string[]
  ): Promise<Map<string, unknown>> {
    const state = this.stateManager.getState(threadId);
    const snapshot = new Map<string, unknown>();
    for (const key of keys) {
      snapshot.set(key, state.getData(key));
    }
    return snapshot;
  }
}

// 2. 在ThreadFork中使用
const contextSnapshot = await this.contextSnapshot.captureVariables(
  input.parentThread.threadId.toString()
);
```

#### 1.2 节点状态快照实现
**位置**: [`src/services/threads/thread-fork.ts:273`](src/services/threads/thread-fork.ts:273)

**当前状态**:
```typescript
// 构建节点状态快照
// 注意：节点执行状态现在由其他服务管理，这里暂时创建空快照
// TODO: 从节点执行服务获取节点状态快照
const nodeStateSnapshot = new Map<string, NodeExecutionSnapshot>();
```

**实现思路**:
1. 从ThreadHistoryManager获取节点执行历史
2. 提取每个节点的执行状态
3. 构建节点状态快照

**实现步骤**:
```typescript
// 在ThreadFork中添加
const nodeStateSnapshot = new Map<string, NodeExecutionSnapshot>();
const history = this.historyManager.getThreadHistory(input.parentThread.threadId.toString());
for (const [nodeId, executions] of history.entries()) {
  if (executions.length > 0) {
    const lastExecution = executions[executions.length - 1];
    nodeStateSnapshot.set(nodeId.toString(), {
      nodeId,
      status: lastExecution.status,
      result: lastExecution.result,
      timestamp: lastExecution.timestamp,
    });
  }
}
```

#### 1.3 提示词状态快照实现
**位置**: [`src/services/threads/thread-fork.ts:279`](src/services/threads/thread-fork.ts:279)

**当前状态**:
```typescript
// 获取提示词状态快照
// 注意：提示词状态现在由其他服务管理，这里暂时创建空状态
// TODO: 从上下文服务获取提示词状态快照
const promptStateSnapshot = PromptState.create();
```

**实现思路**:
1. 从PromptState服务获取当前提示词状态
2. 复制提示词状态到快照

**实现步骤**:
```typescript
// 需要创建PromptState服务
const promptStateSnapshot = await this.promptStateService.captureState(
  input.parentThread.threadId.toString()
);
```

### 2. ThreadJoin的TODO项

#### 2.1 线程执行状态验证
**位置**: [`src/services/threads/thread-join.ts:186`](src/services/threads/thread-join.ts:186)

**当前状态**:
```typescript
// 验证子线程状态
// 注意：线程执行状态现在由其他服务管理，这里暂时跳过验证
// TODO: 从线程执行服务获取线程执行状态进行验证
```

**实现思路**:
1. 从ThreadRepository获取子线程状态
2. 验证所有子线程是否已完成
3. 检查是否有失败的线程

**实现步骤**:
```typescript
// 在validateJoin方法中添加
for (const threadId of input.childThreadIds) {
  const thread = await this.threadRepository.findById(threadId);
  if (!thread) {
    errors.push(`子线程 ${threadId.toString()} 不存在`);
    continue;
  }
  
  if (!thread.isCompleted() && !thread.isFailed()) {
    warnings.push(`子线程 ${threadId.toString()} 尚未完成`);
  }
  
  if (thread.isFailed()) {
    warnings.push(`子线程 ${threadId.toString()} 执行失败`);
  }
}
```

#### 2.2 等待线程完成的超时处理
**位置**: [`src/services/threads/thread-join.ts:199`](src/services/threads/thread-join.ts:199)

**当前状态**:
```typescript
private async waitForCompletion(input: JoinInput): Promise<Thread[]> {
  const completedThreads: Thread[] = [];

  for (const threadId of input.childThreadIds) {
    const thread = await this.threadRepository.findById(threadId);
    if (thread) {
      completedThreads.push(thread);
    }
  }

  return completedThreads;
}
```

**实现思路**:
1. 添加超时参数
2. 轮询线程状态直到完成或超时
3. 支持异步等待

**实现步骤**:
```typescript
private async waitForCompletion(
  input: JoinInput,
  timeout: number = 30000
): Promise<Thread[]> {
  const completedThreads: Thread[] = [];
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    let allCompleted = true;

    for (const threadId of input.childThreadIds) {
      const thread = await this.threadRepository.findById(threadId);
      if (!thread) {
        throw new Error(`子线程 ${threadId.toString()} 不存在`);
      }

      if (thread.isCompleted() || thread.isFailed()) {
        completedThreads.push(thread);
      } else {
        allCompleted = false;
      }
    }

    if (allCompleted) {
      return completedThreads;
    }

    // 等待一段时间后重试
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`等待子线程完成超时（${timeout}ms）`);
}
```

#### 2.3 分支结果收集优化
**位置**: [`src/services/threads/thread-join.ts:215`](src/services/threads/thread-join.ts:215)

**当前状态**:
```typescript
private collectBranchResults(threads: Thread[]): any[] {
  return threads.map(thread => ({
    threadId: thread.threadId.toString(),
    status: thread.status.toString(),
    state: thread.state,
  }));
}
```

**实现思路**:
1. 从ThreadStateManager获取线程状态
2. 从ThreadHistoryManager获取节点执行结果
3. 构建详细的分支结果

**实现步骤**:
```typescript
private collectBranchResults(
  threads: Thread[],
  stateManager: ThreadStateManager,
  historyManager: ThreadHistoryManager
): any[] {
  return threads.map(thread => {
    const state = stateManager.getState(thread.threadId.toString());
    const history = historyManager.getThreadHistory(thread.threadId.toString());
    
    return {
      threadId: thread.threadId.toString(),
      status: thread.status.toString(),
      state: state?.data || {},
      executionCount: history.size,
      lastExecutionTime: Array.from(history.values())
        .flat()
        .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp,
    };
  });
}
```

### 3. WorkflowExecutionEngine的优化

#### 3.1 子线程并发控制
**位置**: [`src/services/threads/workflow-execution-engine.ts:537`](src/services/threads/workflow-execution-engine.ts:537)

**当前状态**:
```typescript
// 启动子线程
for (const childThreadId of forkResult.result?.forkedThreadIds || []) {
  await this.startChildThread(childThreadId.toString(), workflow, state);
}
```

**实现思路**:
1. 支持并发启动子线程
2. 控制最大并发数
3. 支持并发策略（全部并发、分批并发）

**实现步骤**:
```typescript
// 添加并发控制参数
interface ForkOptions {
  maxConcurrency?: number;
  concurrencyStrategy?: 'all' | 'batch' | 'sequential';
}

// 实现并发启动
private async startChildThreads(
  childThreadIds: string[],
  workflow: Workflow,
  parentState: ThreadWorkflowState,
  options: ForkOptions = {}
): Promise<void> {
  const maxConcurrency = options.maxConcurrency || 5;
  const strategy = options.concurrencyStrategy || 'batch';

  if (strategy === 'all') {
    // 全部并发
    await Promise.all(
      childThreadIds.map(threadId =>
        this.startChildThread(threadId, workflow, parentState)
      )
    );
  } else if (strategy === 'batch') {
    // 分批并发
    for (let i = 0; i < childThreadIds.length; i += maxConcurrency) {
      const batch = childThreadIds.slice(i, i + maxConcurrency);
      await Promise.all(
        batch.map(threadId =>
          this.startChildThread(threadId, workflow, parentState)
        )
      );
    }
  } else {
    // 顺序执行
    for (const threadId of childThreadIds) {
      await this.startChildThread(threadId, workflow, parentState);
    }
  }
}
```

#### 3.2 子线程错误处理
**位置**: [`src/services/threads/workflow-execution-engine.ts:629`](src/services/threads/workflow-execution-engine.ts:629)

**当前状态**:
```typescript
private async startChildThread(
  childThreadId: string,
  workflow: Workflow,
  parentState: ThreadWorkflowState
): Promise<void> {
  try {
    // ... 实现逻辑
  } catch (error) {
    console.error(`启动子线程 ${childThreadId} 失败:`, error);
    throw error;
  }
}
```

**实现思路**:
1. 捕获子线程执行错误
2. 记录错误到父线程状态
3. 支持错误恢复策略

**实现步骤**:
```typescript
private async startChildThread(
  childThreadId: string,
  workflow: Workflow,
  parentState: ThreadWorkflowState,
  errorHandling: 'fail' | 'continue' | 'retry' = 'fail'
): Promise<void> {
  try {
    // ... 实现逻辑
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // 记录错误到父线程状态
    const errors = parentState.getData('child_thread_errors') || [];
    errors.push({
      threadId: childThreadId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    this.stateManager.updateState(
      parentState.threadId.toString(),
      { child_thread_errors: errors }
    );

    if (errorHandling === 'fail') {
      throw error;
    } else if (errorHandling === 'retry') {
      // 重试逻辑
      await this.startChildThread(childThreadId, workflow, parentState, 'fail');
    }
    // continue: 忽略错误，继续执行
  }
}
```

#### 3.3 子线程状态监控
**实现思路**:
1. 实时监控子线程执行状态
2. 提供进度回调
3. 支持取消子线程执行

**实现步骤**:
```typescript
interface ThreadMonitor {
  onProgress?: (threadId: string, progress: number) => void;
  onComplete?: (threadId: string, result: any) => void;
  onError?: (threadId: string, error: Error) => void;
}

private async monitorChildThreads(
  childThreadIds: string[],
  monitor: ThreadMonitor
): Promise<void> {
  const interval = setInterval(async () => {
    for (const threadId of childThreadIds) {
      const thread = await this.threadRepository.findById(ID.fromString(threadId));
      if (!thread) continue;

      if (thread.isCompleted()) {
        const state = this.stateManager.getState(threadId);
        monitor.onComplete?.(threadId, state?.data);
      } else if (thread.isFailed()) {
        monitor.onError?.(threadId, new Error('Thread execution failed'));
      } else {
        // 计算进度
        const progress = this.calculateProgress(threadId);
        monitor.onProgress?.(threadId, progress);
      }
    }
  }, 1000);

  // 清理监控
  return () => clearInterval(interval);
}
```

## 技术细节

### 依赖注入配置
需要在依赖注入容器中注册以下服务：
```typescript
// ContextSnapshot服务
container.bind<ContextSnapshot>(TYPES.ContextSnapshot).to(ContextSnapshot).inSingletonScope();

// PromptState服务
container.bind<PromptStateService>(TYPES.PromptStateService).to(PromptStateService).inSingletonScope();
```

### 配置参数
需要在配置文件中添加以下参数：
```toml
[thread.fork]
max_concurrency = 5
concurrency_strategy = "batch"
context_retention = "full"

[thread.join]
timeout = 30000
error_handling = "fail"
```

## 注意事项

1. **线程安全**: 确保所有线程操作都是线程安全的
2. **资源清理**: 子线程完成后需要清理相关资源
3. **错误传播**: 子线程错误需要正确传播到父线程
4. **状态一致性**: 确保父子线程状态的一致性
5. **性能优化**: 避免不必要的线程创建和销毁
6. **超时处理**: 所有长时间操作都需要超时处理
7. **日志记录**: 记录所有关键操作和错误
8. **测试覆盖**: 确保所有功能都有对应的测试

## 优先级

### 高优先级
1. ThreadFork的变量快照实现
2. ThreadJoin的线程执行状态验证
3. 子线程错误处理

### 中优先级
1. ThreadFork的节点状态快照实现
2. ThreadJoin的等待超时处理
3. 子线程并发控制

### 低优先级
1. ThreadFork的提示词状态快照实现
2. ThreadJoin的分支结果收集优化
3. 子线程状态监控

## 相关文档

- [Thread Fork/Join 集成分析](../workflow/thread-fork-join-integration.md)
- [标记节点设计](../workflow/marker-node-design.md)
- [工作流执行引擎](../workflow/workflow-execution-engine.md)