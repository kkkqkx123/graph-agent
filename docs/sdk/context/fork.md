现在我需要理解Fork和Join操作中提示词上下文（prompt context）是如何处理的。根据前面的代码分析，我已经找到了关键的实现。让我总结一下：

## Thread的Fork、Join操作过程中提示词上下文的处理机制

### 1. Fork操作中的提示词上下文处理

在Fork操作中，提示词上下文主要通过以下方式处理：

#### Conversation Manager的克隆
- 在[thread-builder.ts](file:///d:/项目/agent/graph-agent/sdk/core/execution/thread-builder.ts:366)的`createFork`方法中，关键步骤是：
  ```typescript
  // 复制 ConversationManager 实例
  const forkConversationManager = parentThreadContext.conversationManager.clone();
  ```

#### ConversationManager的clone方法
在[conversation-manager.ts](file:///d:/项目/agent/graph-agent/sdk/core/execution/managers/conversation-manager.ts:333)中：
```typescript
/**
 * 克隆 ConversationManager 实例
 * 创建一个包含相同消息历史和配置的新 ConversationManager 实例
 * @returns 克隆的 ConversationManager 实例
 */
clone(): ConversationManager {
  // 创建新的 ConversationManager 实例
  const clonedManager = new ConversationManager({
    tokenLimit: this.tokenUsageTracker['tokenLimit'],
    eventManager: this.eventManager,
    workflowId: this.workflowId,
    threadId: this.threadId
  });

  // 复制所有消息历史
  clonedManager.messages = this.messages.map(msg => ({ ...msg }));

  // 复制 token 使用统计
  clonedManager.tokenUsageTracker = this.tokenUsageTracker.clone();

  // 复制索引管理器
  clonedManager.indexManager = this.indexManager.clone();

  return clonedManager;
}
```

### 2. Join操作中的提示词上下文处理

Join操作的上下文处理更加复杂，因为它需要合并多个子线程的结果：

#### Join结果合并
在[thread-operations.ts](file:///d:/项目/agent/graph-agent/sdk/core/execution/utils/thread-operations.ts:474)的`mergeResults`函数中：
```typescript
function mergeResults(completedThreads: Thread[], joinStrategy: JoinStrategy): any {
  if (completedThreads.length === 0) {
    return {};
  }

  if (completedThreads.length === 1) {
    return completedThreads[0]!.output;
  }

  // 合并多个 thread 的输出
  const mergedOutput: any = {};
  for (const thread of completedThreads) {
    mergedOutput[thread.id] = thread.output;
  }

  return mergedOutput;
}
```

### 3. 提示词上下文管理的关键特点

#### 四级变量作用域
在Fork操作中，变量处理遵循四级作用域规则：
- **Global**：通过引用共享（所有线程共享）
- **Thread**：深拷贝到子线程（每个线程独立）
- **Subgraph**：清空（在子线程中按需初始化）
- **Loop**：清空（在子线程中按需初始化）

如[thread-builder.ts](file:///d:/项目/agent/graph-agent/sdk/core/execution/thread-builder.ts:341)所示：
```typescript
// 四级作用域：global 通过引用共享，thread 深拷贝，subgraph 和 loop 清空
variableScopes: {
  global: parentThread.variableScopes.global,  // 引用共享
  thread: { ...parentThread.variableScopes.thread },  // 深拷贝
  subgraph: [],
  loop: []
},
```

### 4. 上下文处理器（Context Processor）

Context Processor节点专门处理对话消息的各种操作：
- 截断（truncate）
- 插入（insert）
- 替换（replace）
- 清空（clear）
- 过滤（filter）

这些操作直接影响提示词上下文的内容，在[context-processor-handler.ts](file:///d:/项目/agent/graph-agent/sdk/core/execution/handlers/node-handlers/context-processor-handler.ts)中有详细的实现。

### 5. Fork/Join操作流程

1. **Fork操作**：
   - 父线程执行到FORK节点时，创建一个或多个子线程
   - 每个子线程获得父线程的ConversationManager副本
   - 消息历史被完全复制到子线程
   - 各子线程独立执行后续节点

2. **Join操作**：
   - 等待所有关联的子线程完成（根据Join策略）
   - 合并各子线程的执行结果
   - 根据Join策略决定是否继续执行

### 6. 提示词上下文的一致性保证

- 在Fork时，子线程继承父线程的完整对话历史
- 各子线程在执行期间可以独立修改自己的对话历史
- Join时不合并对话历史，只合并执行结果
- 这种设计确保了各线程间提示词上下文的隔离性

这种设计使得每个分叉的线程都有相同的起始提示词上下文，但在执行过程中可以发展出各自独立的对话历史，最终Join时只合并执行结果而不合并对话历史，保持了良好的上下文隔离。
