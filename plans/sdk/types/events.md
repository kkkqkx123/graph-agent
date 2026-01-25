# Events类型需求分析与设计

## 需求分析

### 核心需求
1. 定义工作流执行过程中的事件类型
2. 支持事件监听和处理
3. 定义事件回调函数签名
4. 支持事件元数据

### 功能需求
1. 事件包括节点执行、工具调用、错误等
2. 事件包含时间戳和上下文信息
3. 支持同步和异步事件处理
4. 事件可序列化

### 非功能需求
1. 类型安全的事件定义
2. 易于扩展新的事件类型
3. 事件处理性能优化

## 设计说明

### 核心类型

#### EventType
事件类型枚举。

**类型值**：
- THREAD_STARTED: 线程开始
- THREAD_COMPLETED: 线程完成
- THREAD_FAILED: 线程失败
- THREAD_PAUSED: 线程暂停
- THREAD_RESUMED: 线程恢复
- THREAD_FORKED: 线程分叉
- THREAD_JOINED: 线程合并
- NODE_STARTED: 节点开始
- NODE_COMPLETED: 节点完成
- NODE_FAILED: 节点失败
- TOOL_CALLED: 工具调用
- TOOL_COMPLETED: 工具完成
- TOOL_FAILED: 工具失败
- ERROR: 错误事件
- CHECKPOINT_CREATED: 检查点创建

#### BaseEvent
基础事件类型。

**属性**：
- type: 事件类型
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- metadata: 事件元数据

#### ThreadStartedEvent
线程开始事件类型。

**属性**：
- type: 事件类型（THREAD_STARTED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- input: 输入数据
- metadata: 事件元数据

#### ThreadCompletedEvent
线程完成事件类型。

**属性**：
- type: 事件类型（THREAD_COMPLETED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- output: 输出数据
- executionTime: 执行时间
- metadata: 事件元数据

#### ThreadFailedEvent
线程失败事件类型。

**属性**：
- type: 事件类型（THREAD_FAILED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- error: 错误信息
- metadata: 事件元数据

#### ThreadForkedEvent
线程分叉事件类型。

**属性**：
- type: 事件类型（THREAD_FORKED）
- timestamp: 时间戳
- workflowId: 工作流ID
- parentThreadId: 父线程ID
- childThreadIds: 子线程ID数组
- metadata: 事件元数据

#### ThreadJoinedEvent
线程合并事件类型。

**属性**：
- type: 事件类型（THREAD_JOINED）
- timestamp: 时间戳
- workflowId: 工作流ID
- parentThreadId: 父线程ID
- childThreadIds: 子线程ID数组
- joinStrategy: 合并策略
- metadata: 事件元数据

#### NodeStartedEvent
节点开始事件类型。

**属性**：
- type: 事件类型（NODE_STARTED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- nodeId: 节点ID
- nodeType: 节点类型
- metadata: 事件元数据

#### NodeCompletedEvent
节点完成事件类型。

**属性**：
- type: 事件类型（NODE_COMPLETED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- nodeId: 节点ID
- output: 输出数据
- executionTime: 执行时间
- metadata: 事件元数据

#### NodeFailedEvent
节点失败事件类型。

**属性**：
- type: 事件类型（NODE_FAILED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- nodeId: 节点ID
- error: 错误信息
- metadata: 事件元数据

#### ToolCalledEvent
工具调用事件类型。

**属性**：
- type: 事件类型（TOOL_CALLED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- nodeId: 节点ID
- toolId: 工具ID
- parameters: 工具参数
- metadata: 事件元数据

#### ToolCompletedEvent
工具完成事件类型。

**属性**：
- type: 事件类型（TOOL_COMPLETED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- nodeId: 节点ID
- toolId: 工具ID
- output: 输出数据
- executionTime: 执行时间
- metadata: 事件元数据

#### ToolFailedEvent
工具失败事件类型。

**属性**：
- type: 事件类型（TOOL_FAILED）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- nodeId: 节点ID
- toolId: 工具ID
- error: 错误信息
- metadata: 事件元数据

#### ErrorEvent
错误事件类型。

**属性**：
- type: 事件类型（ERROR）
- timestamp: 时间戳
- workflowId: 工作流ID
- threadId: 线程ID
- nodeId: 节点ID（可选）
- error: 错误信息
- stackTrace: 堆栈跟踪
- metadata: 事件元数据

#### EventListener
事件监听器类型。

**类型**：
```typescript
type EventListener<T extends BaseEvent> = (event: T) => void | Promise<void>;
```

#### EventHandler
事件处理器类型。

**类型**：
```typescript
type EventHandler = {
  eventType: EventType;
  listener: EventListener<BaseEvent>;
};
```

### 设计原则

1. **类型安全**：每个事件类型都有明确的定义
2. **可扩展**：易于添加新的事件类型
3. **异步支持**：支持异步事件处理
4. **元数据**：支持自定义元数据
5. **线程中心**：所有事件都关联到threadId

### 与Thread的集成

#### 事件触发时机
1. **THREAD_STARTED**: Thread创建时触发
2. **THREAD_COMPLETED**: Thread完成时触发
3. **THREAD_FAILED**: Thread失败时触发
4. **THREAD_PAUSED**: Thread暂停时触发
5. **THREAD_RESUMED**: Thread恢复时触发
6. **THREAD_FORKED**: Thread Fork时触发
7. **THREAD_JOINED**: Thread Join时触发
8. **NODE_STARTED**: 节点开始执行时触发
9. **NODE_COMPLETED**: 节点执行完成时触发
10. **NODE_FAILED**: 节点执行失败时触发
11. **TOOL_CALLED**: 工具调用时触发
12. **TOOL_COMPLETED**: 工具完成时触发
13. **TOOL_FAILED**: 工具失败时触发
14. **ERROR**: 错误发生时触发
15. **CHECKPOINT_CREATED**: 检查点创建时触发

#### 事件数据
- 所有事件包含threadId和workflowId
- Fork/Join事件包含parentThreadId和childThreadIds
- 节点事件包含nodeId
- 工具事件包含toolId
- 错误事件包含错误信息和堆栈跟踪

### 依赖关系

- 依赖common类型定义基础类型
- 依赖workflow类型（通过workflowId）
- 依赖node类型（通过nodeId）
- 依赖tool类型（通过toolId）
- 依赖thread类型（通过threadId）
- 被core/execution模块引用