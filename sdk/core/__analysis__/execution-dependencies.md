# SDK Core Execution 模块依赖关系文档

## 概述

本文档详细说明 `sdk/core/execution` 模块中各个文件的职责、依赖关系和依赖方向。

## 架构原则

1. **单向依赖**：依赖关系应该是单向的，避免循环依赖
2. **分层清晰**：按照职责分层，上层依赖下层
3. **接口隔离**：通过接口和类型定义隔离依赖
4. **依赖注入**：使用构造函数注入依赖，便于测试和替换

## 核心组件

### 1. ThreadContext (thread-context.ts)

**职责**：
- 封装 Thread 执行所需的所有运行时组件
- 提供统一的访问接口，避免直接访问底层实现

**依赖**：
- `types/thread.ts` - Thread 类型定义
- `workflow-context.ts` - WorkflowContext
- `llm-executor.ts` - LLMExecutor

**被依赖**：
- `thread-executor.ts`
- `thread-registry.ts`
- `thread-coordinator.ts`
- `checkpoint/checkpoint-manager.ts`

**设计要点**：
- 只持有 `LLMExecutor`，通过它访问 `ConversationManager`
- 避免重复持有同一个实例
- 提供便捷方法访问 Thread 属性

---

### 2. ThreadBuilder (thread-builder.ts)

**职责**：
- 从 WorkflowDefinition 创建 ThreadContext
- 提供 Thread 模板缓存和深拷贝支持
- 创建 Fork 子 ThreadContext

**依赖**：
- `types/workflow.ts` - WorkflowDefinition 类型
- `types/thread.ts` - Thread 类型
- `workflow-context.ts` - WorkflowContext
- `conversation-manager.ts` - ConversationManager
- `llm-executor.ts` - LLMExecutor
- `thread-context.ts` - ThreadContext
- `variable-manager.ts` - VariableManager

**被依赖**：
- `thread-executor.ts`
- `thread-coordinator.ts`
- `trigger-manager.ts`
- `checkpoint/checkpoint-manager.ts`

**设计要点**：
- 只创建 `ConversationManager`，`LLMWrapper` 和 `ToolService` 由 `LLMExecutor` 内部管理
- 缓存 WorkflowContext 和 ThreadContext 模板
- 支持深拷贝和 Fork 操作

---

### 3. ThreadExecutor (thread-executor.ts)

**职责**：
- 执行单个 ThreadContext 实例
- 管理 Thread 的完整执行生命周期
- 协调节点执行和路由

**依赖**：
- `types/thread.ts` - Thread 类型
- `types/node.ts` - Node 类型
- `thread-registry.ts` - ThreadRegistry
- `thread-builder.ts` - ThreadBuilder
- `thread-lifecycle-manager.ts` - ThreadLifecycleManager
- `thread-context.ts` - ThreadContext
- `router.ts` - Router
- `executors/node-executor-factory.ts` - NodeExecutorFactory
- `event-manager.ts` - EventManager
- `thread-coordinator.ts` - ThreadCoordinator
- `trigger-manager.ts` - TriggerManager

**被依赖**：
- `thread-coordinator.ts`
- `trigger-manager.ts`
- API 层（如果有）

**设计要点**：
- 只接受 `ThreadContext`，不接受 `WorkflowDefinition`
- 不持有 `LLMWrapper` 和 `ToolService`
- 通过 `ThreadContext` 访问所有运行时组件

---

### 4. ThreadRegistry (thread-registry.ts)

**职责**：
- 负责 ThreadContext 的内存存储和基本查询
- 不负责状态转换、持久化、序列化

**依赖**：
- `thread-context.ts` - ThreadContext

**被依赖**：
- `thread-executor.ts`
- `thread-coordinator.ts`
- `checkpoint/checkpoint-manager.ts`

**设计要点**：
- 只管理 `ThreadContext`，不管理 `Thread`
- 提供基本的 CRUD 操作
- 纯内存存储，不涉及持久化

---

### 5. ThreadLifecycleManager (thread-lifecycle-manager.ts)

**职责**：
- 负责 Thread 状态转换管理
- 独立于执行逻辑
- 触发生命周期事件

**依赖**：
- `types/thread.ts` - Thread 类型
- `event-manager.ts` - EventManager
- `types/events.ts` - 事件类型

**被依赖**：
- `thread-executor.ts`

**设计要点**：
- 只管理状态转换，不执行业务逻辑
- 验证状态转换的合法性
- 触发相应的生命周期事件

---

### 6. ThreadCoordinator (thread-coordinator.ts)

**职责**：
- 负责 Fork/Join 操作
- 协调子 Thread 的执行和合并
- 管理 Thread 复制

**依赖**：
- `types/thread.ts` - Thread 类型
- `thread-registry.ts` - ThreadRegistry
- `thread-builder.ts` - ThreadBuilder
- `thread-executor.ts` - ThreadExecutor
- `thread-context.ts` - ThreadContext
- `event-manager.ts` - EventManager

**被依赖**：
- `thread-executor.ts`

**设计要点**：
- 接受 `ThreadContext` 而不是 `Thread`
- 使用 `ThreadBuilder` 创建子 ThreadContext
- 支持多种 Join 策略

---

### 7. LLMExecutor (llm-executor.ts)

**职责**：
- 协调 LLM 调用和工具执行的循环
- 管理 ConversationManager 的状态更新
- 执行非流式和流式 LLM 调用
- 内部管理 LLMWrapper 和 ToolService

**依赖**：
- `types/llm.ts` - LLM 类型
- `tools/executor-base.ts` - ToolExecutionResult
- `llm/wrapper.ts` - LLMWrapper
- `tools/tool-service.ts` - ToolService
- `conversation-manager.ts` - ConversationManager

**被依赖**：
- `thread-context.ts`
- `thread-builder.ts`

**设计要点**：
- 内部创建和管理 `LLMWrapper` 和 `ToolService`，不依赖外部注入
- 持有 `ConversationManager`，提供 `getConversationManager()` 方法
- 实现异步迭代器接口
- 支持工具调用循环

---

### 8. ConversationManager (conversation-manager.ts)

**职责**：
- 管理对话历史
- 控制 Token 使用
- 支持消息压缩

**依赖**：
- `types/llm.ts` - LLM 类型
- `types/common.ts` - 通用类型

**被依赖**：
- `llm-executor.ts`
- `thread-builder.ts`

**设计要点**：
- 独立的对话管理，不依赖其他执行组件
- 提供 clone 方法支持 Fork 操作
- 支持 Token 限制和压缩

---

### 9. WorkflowContext (workflow-context.ts)

**职责**：
- 封装 Workflow 的节点和边信息
- 提供节点和边的查询接口

**依赖**：
- `types/workflow.ts` - Workflow 类型
- `types/node.ts` - Node 类型
- `types/edge.ts` - Edge 类型

**被依赖**：
- `thread-context.ts`
- `thread-builder.ts`

**设计要点**：
- 纯数据访问层，不包含执行逻辑
- 提供高效的节点和边查询
- 支持缓存优化

---

### 10. Router (router.ts)

**职责**：
- 根据节点类型和边配置选择下一个节点
- 支持条件路由和默认路由

**依赖**：
- `types/node.ts` - Node 类型
- `types/edge.ts` - Edge 类型
- `types/thread.ts` - Thread 类型

**被依赖**：
- `thread-executor.ts`

**设计要点**：
- 纯路由逻辑，不涉及执行
- 支持多种路由策略
- 可扩展的路由规则

---

### 11. EventManager (event-manager.ts)

**职责**：
- 管理事件的发布和订阅
- 支持异步事件处理

**依赖**：
- `types/events.ts` - 事件类型

**被依赖**：
- `thread-executor.ts`
- `thread-lifecycle-manager.ts`
- `thread-coordinator.ts`
- `trigger-manager.ts`

**设计要点**：
- 事件驱动架构的核心
- 支持事件过滤和转换
- 异步事件处理

---

### 12. TriggerManager (trigger-manager.ts)

**职责**：
- 管理触发器的注册和注销
- 监听事件并执行触发动作
- 协调触发器执行

**依赖**：
- `types/trigger.ts` - Trigger 类型
- `types/events.ts` - 事件类型
- `event-manager.ts` - EventManager
- `thread-executor.ts` - ThreadExecutor
- `thread-builder.ts` - ThreadBuilder
- `executors/trigger/` - 触发器执行器

**被依赖**：
- `thread-executor.ts`

**设计要点**：
- 事件驱动的触发机制
- 支持多种触发器类型
- 异步触发执行

---

### 13. VariableManager (variable-manager.ts)

**职责**：
- 管理 Thread 变量的初始化和访问
- 提供变量管理方法

**依赖**：
- `types/thread.ts` - Thread 类型

**被依赖**：
- `thread-builder.ts`
- `checkpoint/checkpoint-manager.ts`

**设计要点**：
- 纯变量管理，不涉及执行逻辑
- 支持变量作用域和类型
- 提供便捷的变量访问方法

---

### 14. CheckpointManager (checkpoint/checkpoint-manager.ts)

**职责**：
- 创建和管理检查点
- 支持从检查点恢复 ThreadContext 状态
- 支持定期检查点和节点级别检查点

**依赖**：
- `types/thread.ts` - Thread 类型
- `types/checkpoint.ts` - Checkpoint 类型
- `thread-registry.ts` - ThreadRegistry
- `thread-context.ts` - ThreadContext
- `workflow-context.ts` - WorkflowContext
- `variable-manager.ts` - VariableManager
- `conversation-manager.ts` - ConversationManager
- `llm-executor.ts` - LLMExecutor
- `storage.ts` - CheckpointStorage
- `singletons.ts` - ExecutionSingletons（获取 WorkflowRegistry）

**被依赖**：
- API 层（如果有）

**设计要点**：
- 保存和恢复完整的 ThreadContext 状态
- 包括对话历史的保存和恢复
- 直接创建 ConversationManager、LLMExecutor、WorkflowContext，不依赖 ThreadBuilder
- 从 WorkflowRegistry 获取 WorkflowDefinition 进行恢复
- 职责分离：CheckpointManager 负责状态恢复，ThreadBuilder 负责构建新实例

---

## 依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                        ThreadExecutor                        │
│  (执行 ThreadContext，管理生命周期)                          │
└─────────────────────────────────────────────────────────────┘
                                │
                                ├──→ ThreadRegistry (管理 ThreadContext)
                                ├──→ ThreadBuilder (创建 ThreadContext)
                                ├──→ ThreadLifecycleManager (状态管理)
                                ├──→ Router (路由)
                                ├──→ EventManager (事件)
                                ├──→ ThreadCoordinator (Fork/Join)
                                └──→ TriggerManager (触发器)
                                        │
                                        └──→ ThreadBuilder
                                                │
                                                ├──→ ThreadContext
                                                │       │
                                                │       ├──→ Thread
                                                │       ├──→ WorkflowContext
                                                │       └──→ LLMExecutor
                                                │               │
                                                │               ├──→ ConversationManager
                                                │               ├──→ LLMWrapper (内部创建)
                                                │               └──→ ToolService (内部创建)
                                                │
                                                └──→ VariableManager

┌─────────────────────────────────────────────────────────────┐
│                      CheckpointManager                       │
│  (保存和恢复 ThreadContext 状态)                              │
└─────────────────────────────────────────────────────────────┘
                                │
                                ├──→ ThreadRegistry (注册恢复的 ThreadContext)
                                ├──→ WorkflowRegistry (获取 WorkflowDefinition)
                                ├──→ VariableManager (初始化变量)
                                ├──→ ConversationManager (内部创建，恢复对话历史)
                                ├──→ LLMExecutor (内部创建)
                                ├──→ WorkflowContext (内部创建)
                                └──→ ThreadContext (内部创建)
```

## 依赖层次

### 第一层：基础类型和工具
- `types/` - 所有类型定义
- `llm/wrapper.ts` - LLM 包装器
- `tools/tool-service.ts` - 工具服务

### 第二层：核心组件
- `conversation-manager.ts` - 对话管理
- `workflow-context.ts` - 工作流上下文
- `variable-manager.ts` - 变量管理
- `router.ts` - 路由
- `event-manager.ts` - 事件管理

### 第三层：执行组件
- `llm-executor.ts` - LLM 执行器
- `thread-lifecycle-manager.ts` - 生命周期管理

### 第四层：构建和管理
- `thread-context.ts` - Thread 上下文
- `thread-builder.ts` - Thread 构建器
- `thread-registry.ts` - Thread 注册表

### 第五层：协调和执行
- `thread-coordinator.ts` - Thread 协调器
- `trigger-manager.ts` - 触发器管理器
- `thread-executor.ts` - Thread 执行器

### 第六层：持久化
- `checkpoint/checkpoint-manager.ts` - 检查点管理器

### 第七层：单例管理
- `singletons.ts` - ExecutionSingletons（管理全局单例组件）

## 设计模式

### 1. 依赖注入
- `ThreadExecutor` 通过构造函数注入 `ThreadBuilder`
- `LLMExecutor` 内部创建 `LLMWrapper` 和 `ToolService`
- `ThreadBuilder` 只创建 `ConversationManager` 并注入 `LLMExecutor`
- `ThreadCoordinator` 通过构造函数注入 `ThreadRegistry`、`ThreadBuilder`、`ThreadExecutor`
- `CheckpointManager` 通过构造函数注入 `ThreadRegistry`、`WorkflowRegistry`
- `ExecutionSingletons` 管理全局单例组件的创建和访问

### 2. 工厂模式
- `NodeExecutorFactory` 创建节点执行器
- `ThreadBuilder` 创建 `ThreadContext`

### 3. 策略模式
- `Router` 支持多种路由策略
- `ThreadCoordinator` 支持多种 Join 策略

### 4. 观察者模式
- `EventManager` 实现事件发布订阅
- `TriggerManager` 监听事件并执行动作

### 5. 建造者模式
- `ThreadBuilder` 构建 `ThreadContext`

### 6. 单例模式
- `ExecutionSingletons` 管理全局单例组件
- `WorkflowRegistry`、`ThreadRegistry`、`EventManager`、`CheckpointManager` 作为单例
- 提供统一的初始化和访问接口
- 支持测试时的重置功能

## 注意事项

1. **避免循环依赖**：当前设计没有循环依赖
2. **单一职责**：每个类只负责一个明确的职责
3. **接口隔离**：通过类型定义隔离依赖
4. **依赖倒置**：高层模块依赖抽象，不依赖具体实现

## 待完善项

1. ~~**CheckpointManager 恢复逻辑**：需要保存和恢复 WorkflowDefinition~~ ✅ 已完成
   - CheckpointManager 现在从 WorkflowRegistry 获取 WorkflowDefinition
   - 直接创建所需的组件，不依赖 ThreadBuilder
2. ~~**WorkflowRegistry**：可能需要添加 Workflow 注册表来管理 WorkflowDefinition~~ ✅ 已完成
   - WorkflowRegistry 已作为单例组件实现
   - CheckpointManager 通过 ExecutionSingletons 访问
3. **持久化层**：ThreadContext 的持久化需要进一步设计
   - 当前 CheckpointManager 支持内存存储和文件存储
   - 可以考虑添加数据库存储支持

## 单例管理说明

### ExecutionSingletons 职责

`ExecutionSingletons` 负责管理全局共享的执行组件实例：

1. **WorkflowRegistry**：工作流注册器，全局共享工作流定义
2. **ThreadRegistry**：线程注册表，全局跟踪所有线程
3. **EventManager**：事件管理器，全局事件总线
4. **CheckpointManager**：检查点管理器，默认单例

### 初始化顺序

单例组件按依赖顺序初始化：

1. EventManager（无依赖）
2. WorkflowRegistry（无依赖）
3. ThreadRegistry（无依赖）
4. CheckpointManager（依赖 ThreadRegistry 和 WorkflowRegistry）

### 使用方式

```typescript
// 初始化（可选，首次访问时自动初始化）
ExecutionSingletons.initialize();

// 获取单例实例
const workflowRegistry = ExecutionSingletons.getWorkflowRegistry();
const threadRegistry = ExecutionSingletons.getThreadRegistry();
const eventManager = ExecutionSingletons.getEventManager();
const checkpointManager = ExecutionSingletons.getCheckpointManager();

// 测试时重置
ExecutionSingletons.reset();
```

### 设计原则

1. **懒加载**：首次访问时自动初始化
2. **线程安全**：Node.js 单线程环境，无需额外同步
3. **测试友好**：提供 `reset()` 方法用于测试
4. **依赖注入**：支持通过构造函数注入自定义实例