# SDK事件设计原则与实现总结

## 事件设计原则

### 核心原则
**事件仅用于需要统一由执行引擎处理的场合，不是用来表示错误的**

### 具体规则

1. **底层模块不应该关心调用者的上下文**
   - 底层模块（如ToolService、LLMWrapper）不应该知道workflowId、threadId、nodeId
   - 这些模块应该保持独立性，不依赖上层调用者
   - 通过依赖注入传递上下文是错误的设计

2. **错误由各自模块处理，不需要统一的事件**
   - 工具执行错误由ToolService处理
   - LLM调用错误由LLMWrapper处理
   - 节点执行错误由NodeExecutor处理
   - 不需要通过事件系统统一处理错误

3. **事件用于执行引擎层面的协调**
   - 线程生命周期管理（开始、完成、失败、暂停、恢复）
   - 节点执行状态追踪（开始、完成、失败）
   - 特殊情况处理（Token超限、检查点创建）
   - 全局错误通知（ERROR事件）

## 当前事件实现

### 已实现事件（11种）

#### 线程事件（8种）✓
- `THREAD_STARTED` - 线程开始
- `THREAD_COMPLETED` - 线程完成
- `THREAD_FAILED` - 线程失败
- `THREAD_PAUSED` - 线程暂停
- `THREAD_RESUMED` - 线程恢复
- `THREAD_FORKED` - 线程分叉
- `THREAD_JOINED` - 线程合并
- `THREAD_COPIED` - 线程复制

**实现位置**: [`sdk/core/execution/thread-executor.ts`](sdk/core/execution/thread-executor.ts)

#### 节点事件（3种）✓
- `NODE_STARTED` - 节点开始
- `NODE_COMPLETED` - 节点完成
- `NODE_FAILED` - 节点失败

**实现位置**: [`sdk/core/execution/thread-executor.ts`](sdk/core/execution/thread-executor.ts:365-420)

#### 其他事件（2种）
- `TOKEN_LIMIT_EXCEEDED` - Token超过限制
  - **用途**: 需要执行引擎统一处理Token超限情况
  - **实现位置**: [`sdk/core/execution/thread-executor.ts`](sdk/core/execution/thread-executor.ts:137-149)（通过Conversation回调）
  
- `ERROR` - 全局错误事件
  - **用途**: 执行引擎层面的错误通知，用于监控和告警
  - **实现位置**: [`sdk/core/execution/thread-executor.ts`](sdk/core/execution/thread-executor.ts:226-234, 408-417)

### 未实现事件（1种）
- `CHECKPOINT_CREATED` - 检查点创建
  - **状态**: 事件类型已定义，但检查点模块未实现
  - **用途**: 需要执行引擎统一处理检查点创建

## 错误的设计（已移除）

### 工具事件（已移除）✗
- ~~`TOOL_CALLED`~~ - 工具调用
- ~~`TOOL_COMPLETED`~~ - 工具完成
- ~~`TOOL_FAILED`~~ - 工具失败

**移除原因**:
- ToolService是底层模块，不应该关心调用者上下文
- 工具执行错误由ToolService内部处理
- 不需要通过事件系统追踪工具调用

### LLM事件（已移除）✗
- ~~`LLM_CALL_STARTED`~~ - LLM调用开始
- ~~`LLM_CALL_COMPLETED`~~ - LLM调用完成
- ~~`LLM_CALL_FAILED`~~ - LLM调用失败
- ~~`LLM_STREAM_STARTED`~~ - LLM流式调用开始
- ~~`LLM_STREAM_CHUNK`~~ - LLM流式数据块
- ~~`LLM_STREAM_COMPLETED`~~ - LLM流式调用完成

**移除原因**:
- LLMWrapper是底层模块，不应该关心调用者上下文
- LLM调用错误由LLMWrapper内部处理
- 不需要通过事件系统追踪LLM调用
- LLM有自己的MessageStream事件系统用于流式处理

## 事件使用场景

### 1. 线程生命周期管理
```typescript
// 监听线程状态变化
eventManager.on(EventType.THREAD_STARTED, (event) => {
  console.log(`Thread ${event.threadId} started`);
});

eventManager.on(EventType.THREAD_COMPLETED, (event) => {
  console.log(`Thread ${event.threadId} completed in ${event.executionTime}ms`);
});

eventManager.on(EventType.THREAD_FAILED, (event) => {
  console.error(`Thread ${event.threadId} failed:`, event.error);
});
```

### 2. 节点执行追踪
```typescript
// 监听节点执行状态
eventManager.on(EventType.NODE_STARTED, (event) => {
  console.log(`Node ${event.nodeId} (${event.nodeType}) started`);
});

eventManager.on(EventType.NODE_COMPLETED, (event) => {
  console.log(`Node ${event.nodeId} completed in ${event.executionTime}ms`);
});
```

### 3. Token监控
```typescript
// 监听Token使用情况
eventManager.on(EventType.TOKEN_LIMIT_EXCEEDED, (event) => {
  console.warn(`Token limit exceeded: ${event.tokensUsed}/${event.tokenLimit}`);
  // 可以触发告警或自动切换模型
});
```

### 4. 全局错误监控
```typescript
// 监听全局错误
eventManager.on(EventType.ERROR, (event) => {
  console.error(`Error in workflow ${event.workflowId}:`, event.error);
  // 可以发送到监控系统
  if (event.nodeId) {
    console.error(`Node: ${event.nodeId}`);
  }
  if (event.stackTrace) {
    console.error('Stack:', event.stackTrace);
  }
});
```

## 架构层次

```
┌─────────────────────────────────────────┐
│         执行引擎层 (ThreadExecutor)       │
│  - 触发线程事件                          │
│  - 触发节点事件                          │
│  - 触发ERROR事件                         │
│  - 处理TOKEN_LIMIT_EXCEEDED              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         节点执行层 (NodeExecutor)         │
│  - 执行节点逻辑                          │
│  - 处理节点错误                          │
│  - 不触发事件                            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         服务层 (ToolService, LLMWrapper)  │
│  - 执行工具/LLM调用                      │
│  - 处理执行错误                          │
│  - 不触发事件                            │
│  - 不关心调用者上下文                     │
└─────────────────────────────────────────┘
```

## 设计优势

1. **清晰的职责分离**
   - 执行引擎负责事件触发
   - 底层模块专注于功能实现
   - 各层独立，互不干扰

2. **更好的可维护性**
   - 底层模块不需要传递上下文
   - 修改底层模块不影响事件系统
   - 事件系统独立于业务逻辑

3. **更好的性能**
   - 减少不必要的事件触发
   - 降低事件系统的负载
   - 避免上下文传递的开销

4. **更好的可测试性**
   - 底层模块可以独立测试
   - 不需要模拟事件系统
   - 测试更加简单直接

## 总结

当前SDK事件系统遵循以下原则：
- ✅ 事件仅用于执行引擎层面的协调
- ✅ 底层模块保持独立性，不关心调用者
- ✅ 错误由各自模块处理，不通过事件统一
- ✅ 事件数据包含必要的上下文信息

**事件实现率**: 11/12 (91.7%)
- 已实现: 11种
- 未实现: 1种（CHECKPOINT_CREATED，需要检查点模块）

这种设计确保了系统的清晰性、可维护性和性能。