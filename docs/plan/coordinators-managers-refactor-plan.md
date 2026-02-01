# 协调器与管理器重构方案

## 设计原则

1. **严格分离**：协调器（Coordinators）负责无状态的协调逻辑，管理器（Managers）负责有状态的运行时状态管理
2. **单一职责**：每个组件只负责一个明确的职责
3. **依赖注入**：通过构造函数注入依赖，避免单例模式
4. **线程隔离**：每个 ThreadContext 拥有独立的状态管理器实例

## 新架构设计

### 管理器层（Managers）

#### 1. ConversationStateManager
- **职责**：管理对话相关的运行时状态
- **状态内容**：消息历史、Token使用统计、消息索引等
- **特点**：每个 ThreadContext 拥有独立实例，支持快照和恢复

#### 2. Existing Managers
- **VariableManager**：已存在，管理变量状态
- **TriggerStateManager**：已存在，管理触发器运行时状态  
- **CheckpointManager**：已改造为无状态，只负责快照/恢复

### 协调器层（Coordinators）

#### 1. LLMExecutionCoordinator
- **职责**：协调 LLM 调用和工具调用的完整流程
- **依赖**：LLMExecutor、ToolService、ConversationStateManager
- **特点**：无状态，所有状态通过参数传入

#### 2. ThreadLifecycleCoordinator  
- **职责**：协调 Thread 的完整生命周期（创建、执行、暂停、恢复、停止）
- **依赖**：ThreadBuilder、ThreadExecutor、ThreadLifecycleManager
- **特点**：高层协调器，组合其他协调器

#### 3. ThreadOperationCoordinator
- **职责**：协调 Fork/Join/Copy 等 Thread 操作
- **依赖**：ThreadOperations、ThreadBuilder
- **特点**：专门处理 Thread 结构操作

#### 4. ThreadVariableCoordinator
- **职责**：协调 Thread 变量的设置和查询
- **依赖**：VariableManager
- **特点**：专门处理变量相关操作

#### 5. Existing Coordinators
- **NodeExecutionCoordinator**：已存在，协调节点执行
- **EventCoordinator**：已存在，协调事件处理  
- **TriggerCoordinator**：已存在，协调触发器处理

### ThreadContext 集成

ThreadContext 将包含以下组件：
- **conversationStateManager**：对话状态管理器
- **variableManager**：变量管理器  
- **triggerStateManager**：触发器状态管理器
- **llmExecutionCoordinator**：LLM执行协调器
- **threadLifecycleCoordinator**：线程生命周期协调器

## 废弃的组件

- **LLMCoordinator**（原文件）：废弃，功能由 LLMExecutionCoordinator 替代
- **ThreadCoordinator**（原文件）：废弃，功能拆分为多个专门的协调器

## 依赖关系

```
ThreadContext
├── ConversationStateManager (状态)
├── VariableManager (状态)  
├── TriggerStateManager (状态)
├── LLMExecutionCoordinator (协调)
│   ├── LLMExecutor
│   └── ToolService
└── ThreadLifecycleCoordinator (协调)
    ├── ThreadOperationCoordinator
    ├── ThreadExecutor  
    └── ThreadLifecycleManager
```

## 实现顺序

1. 创建 ConversationStateManager 管理器
2. 实现 LLMExecutionCoordinator 协调器  
3. 实现 ThreadLifecycleCoordinator 协调器
4. 实现 ThreadOperationCoordinator 协调器
5. 实现 ThreadVariableCoordinator 协调器
6. 更新 ThreadContext 集成新组件
7. 删除废弃的 LLMCoordinator 和 ThreadCoordinator
8. 更新相关测试和文档