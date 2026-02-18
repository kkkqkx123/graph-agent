# DI 迁移分阶段实施方案

## 文档概述

本文档详细描述了将 Modular Agent Framework SDK 从当前的 SingletonRegistry 架构迁移到完整 DI（依赖注入）系统的分阶段实施方案。

**核心原则**：
- 完全移除 SingletonRegistry，使用 DI 容器统一管理服务生命周期
- 建立明确的单向依赖关系，消除循环依赖
- 不保留适配器层，DI 容器直接作为服务管理中心
- 不需要向后兼容，可以完全重构
- **复用 `packages/common-utils/src/di` 的成熟 DI 容器实现**

## 重要说明：复用现有 DI 容器

经过分析，`packages/common-utils/src/di` 已经提供了一个功能完整且成熟的 DI 容器实现，包括：

- ✅ 完整的容器实现（Container、Binding、ResolutionEngine）
- ✅ 支持多种绑定类型（INSTANCE、CONSTANT、FACTORY、DYNAMIC）
- ✅ 支持多种作用域（TRANSIENT、SINGLETON、SCOPED）
- ✅ 流式 API 设计（bind().to().inSingletonScope()）
- ✅ 循环依赖检测
- ✅ 子容器支持
- ✅ 已有完整的测试用例

**因此，本方案将直接复用 common-utils 的 DI 容器，避免重复开发。**

---

## 阶段一：创建 DI 容器基础设施

### 1.1 目标
建立 DI 容器核心基础设施，包括服务标识符系统和配置管理。**直接复用 `packages/common-utils/src/di` 的成熟 DI 容器实现**。

### 1.2 新增文件

#### `sdk/core/di/service-identifiers.ts`
**文件实现方式**：无状态常量导出

**文件职责**：
- 定义所有 SDK 服务的 Symbol 标识符
- 提供类型安全的服务标识符

**主要功能**：
```typescript
// 存储层服务
export const GraphRegistry = Symbol('GraphRegistry');
export const ThreadRegistry = Symbol('ThreadRegistry');
export const GlobalMessageStorage = Symbol('GlobalMessageStorage');

// 业务层服务
export const EventManager = Symbol('EventManager');
export const ToolService = Symbol('ToolService');
export const CodeService = Symbol('CodeService');
export const WorkflowRegistry = Symbol('WorkflowRegistry');
export const WorkflowReferenceManager = Symbol('WorkflowReferenceManager');

// 执行层服务
export const ExecutionContext = Symbol('ExecutionContext');
export const ThreadBuilder = Symbol('ThreadBuilder');
export const ThreadExecutor = Symbol('ThreadExecutor');
export const ThreadLifecycleCoordinator = Symbol('ThreadLifecycleCoordinator');

// API 层服务
export const APIDependencyManager = Symbol('APIDependencyManager');
export const APIFactory = Symbol('APIFactory');
export const SDK = Symbol('SDK');
```

**依赖关系**：
- 无外部依赖
- 被 `container-config.ts` 和所有需要获取服务的模块依赖

**集成方式**：
- 作为类型安全的标识符系统，在容器配置和服务获取时使用

#### `sdk/core/di/container-config.ts`
**文件实现方式**：有状态全局单例配置

**文件职责**：
- 配置 DI 容器的所有服务绑定
- 定义服务间的依赖关系
- 管理服务的生命周期策略
- 提供容器初始化和重置功能

**主要功能**：
```typescript
import { Container } from '@modular-agent/common-utils';
import * as Identifiers from './service-identifiers.js';
import { GraphRegistry } from '../services/graph-registry.js';
import { ThreadRegistry } from '../services/thread-registry.js';
// ... 其他服务导入

let container: Container | null = null;

export function initializeContainer(): Container {
  if (container) {
    return container;
  }

  container = new Container();

  // 存储层服务（无依赖）
  container.bind(Identifiers.GraphRegistry)
    .to(GraphRegistry)
    .inSingletonScope();

  container.bind(Identifiers.ThreadRegistry)
    .to(ThreadRegistry)
    .inSingletonScope();

  // 业务层服务（依赖存储层）
  container.bind(Identifiers.EventManager)
    .to(EventManager)
    .inSingletonScope();

  container.bind(Identifiers.WorkflowReferenceManager)
    .to(WorkflowReferenceManager)
    .inSingletonScope();

  container.bind(Identifiers.WorkflowRegistry)
    .to(WorkflowRegistry)
    .inSingletonScope();

  // 执行层服务（依赖业务层）
  container.bind(Identifiers.ExecutionContext)
    .to(ExecutionContext)
    .inSingletonScope();

  container.bind(Identifiers.ThreadBuilder)
    .to(ThreadBuilder)
    .inSingletonScope();

  // API 层服务（依赖执行层）
  container.bind(Identifiers.APIDependencyManager)
    .to(APIDependencyManager)
    .inSingletonScope();

  container.bind(Identifiers.APIFactory)
    .to(APIFactory)
    .inSingletonScope();

  container.bind(Identifiers.SDK)
    .to(SDK)
    .inSingletonScope();

  return container;
}

export function getContainer(): Container {
  if (!container) {
    throw new Error('Container not initialized. Call initializeContainer() first.');
  }
  return container;
}

export function resetContainer(): void {
  if (container) {
    container.clearAllCaches();
    container = null;
  }
}
```

**依赖关系**：
- 依赖 `@modular-agent/common-utils` 的 `Container`
- 依赖 `service-identifiers.ts`（服务标识符）
- 依赖所有服务类定义（用于类型绑定）

**集成方式**：
- 作为 DI 系统的配置中心，在应用启动时调用
- 被 SDK 入口点调用以初始化整个系统

#### `sdk/core/di/index.ts`
**文件实现方式**：纯函数导出

**文件职责**：
- 导出 DI 模块的所有公共 API
- 重新导出 common-utils 的 DI 类型

**主要功能**：
```typescript
// 重新导出 common-utils 的 DI 类型
export {
  Container,
  ServiceIdentifier,
  BindingScope,
  BindingType,
  Injectable,
  Constructor,
  Factory,
  DynamicValue,
} from '@modular-agent/common-utils';

// 导出 SDK 服务标识符
export * as ServiceIdentifiers from './service-identifiers.js';

// 导出容器配置函数
export {
  initializeContainer,
  getContainer,
  resetContainer,
} from './container-config.js';
```

**依赖关系**：
- 依赖 `@modular-agent/common-utils`
- 依赖 `service-identifiers.ts`、`container-config.ts`

**集成方式**：
- 作为 DI 模块的统一导出入口

### 1.3 调用链

```
应用启动
  │
  ▼
调用 initializeContainer()
  │
  ▼
创建 Container 实例
  │
  ▼
按依赖顺序配置服务绑定
  │
  ├──→ 绑定存储层服务（无依赖）
  │
  ├──→ 绑定业务层服务（依赖存储层）
  │
  └──→ 绑定执行层服务（依赖业务层）
  │
  ▼
返回已配置的容器实例
  │
  ▼
通过 getContainer() 获取容器
  │
  ▼
通过 container.get(ServiceIdentifier) 获取服务
```

---

## 阶段二：迁移存储层服务

### 2.1 目标
将无依赖的存储层服务迁移到 DI 容器管理，这些服务只负责数据存储，不包含业务逻辑。

### 2.2 修改文件

#### `sdk/core/services/graph-registry.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理预处理后的图的存储和检索
- 提供图的 CRUD 操作
- 纯存储职责，无业务逻辑

**主要功能**：
- `register(graph: PreprocessedGraph): void` - 注册预处理后的图
- `get(workflowId: ID): PreprocessedGraph | undefined` - 获取图
- `has(workflowId: ID): boolean` - 检查图是否存在
- `unregister(workflowId: ID): void` - 移除图
- `clear(): void` - 清空所有图

**依赖关系**：
- 无外部依赖
- 被 `WorkflowRegistry` 依赖（存储预处理结果）
- 被 `ThreadBuilder` 依赖（获取预处理图）

**集成方式**：
- 通过 DI 容器注入到 `WorkflowRegistry` 和 `ThreadBuilder`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除所有 `SingletonRegistry` 相关代码
- 构造函数不再需要任何参数
- 通过 DI 容器获取实例

#### `sdk/core/services/thread-registry.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理 ThreadContext 的内存存储
- 提供线程的基本查询功能
- 纯存储职责，不负责状态转换

**主要功能**：
- `register(threadContext: ThreadContext): void` - 注册线程上下文
- `get(threadId: string): ThreadContext | null` - 获取线程上下文
- `delete(threadId: string): void` - 删除线程上下文
- `getAll(): ThreadContext[]` - 获取所有线程上下文
- `isWorkflowActive(workflowId: string): boolean` - 检查工作流是否活跃

**依赖关系**：
- 无外部依赖
- 被 `WorkflowReferenceManager` 依赖（检查活跃线程）
- 被 `ThreadContext` 依赖（注册自己）
- 被 `ThreadLifecycleCoordinator` 依赖（管理线程生命周期）

**集成方式**：
- 通过 DI 容器注入到 `WorkflowReferenceManager` 和 `ThreadLifecycleCoordinator`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除所有 `SingletonRegistry` 相关代码
- 构造函数不再需要任何参数
- 通过 DI 容器获取实例

#### `sdk/core/services/global-message-storage.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理全局消息存储
- 提供消息的 CRUD 操作
- 纯存储职责

**主要功能**：
- `addMessage(message: Message): void` - 添加消息
- `getMessages(threadId: string): Message[]` - 获取线程消息
- `clearMessages(threadId: string): void` - 清空线程消息

**依赖关系**：
- 无外部依赖
- 被 `ConversationManager` 依赖（存储对话消息）

**集成方式**：
- 通过 DI 容器注入到 `ConversationManager`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除所有 `SingletonRegistry` 相关代码
- 构造函数不再需要任何参数
- 通过 DI 容器获取实例

### 2.3 调用链

```
容器初始化
  │
  ▼
创建 GraphRegistry 实例（无依赖）
  │
  ▼
创建 ThreadRegistry 实例（无依赖）
  │
  ▼
创建 GlobalMessageStorage 实例（无依赖）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
其他服务通过容器获取这些存储服务
```

---

## 阶段三：迁移业务层服务

### 3.1 目标
将包含业务逻辑的服务迁移到 DI 容器管理，这些服务依赖存储层服务。

### 3.2 修改文件

#### `sdk/core/services/event-manager.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理全局事件的发布和订阅
- 提供事件路由和分发功能
- 支持事件过滤和优先级

**主要功能**：
- `on<T>(eventType: EventType, listener: EventListener<T>): () => void` - 注册事件监听器
- `off<T>(eventType: EventType, listener: EventListener<T>): boolean` - 注销事件监听器
- `emit<T>(event: T): Promise<void>` - 触发事件
- `once<T>(eventType: EventType, listener: EventListener<T>): () => void` - 注册一次性监听器
- `waitFor<T>(eventType: EventType, timeout?: number, filter?: (event: T) => boolean): Promise<T>` - 等待事件

**依赖关系**：
- 无外部依赖
- 被几乎所有业务模块依赖（用于事件通知）
- 被 `ThreadLifecycleManager` 依赖（触发生命周期事件）
- 被 `NodeExecutionCoordinator` 依赖（触发节点事件）

**集成方式**：
- 通过 DI 容器注入到所有需要事件功能的模块
- 在容器配置中注册为单例服务

**修改内容**：
- 移除所有 `SingletonRegistry` 相关代码
- 构造函数不再需要任何参数
- 通过 DI 容器获取实例

#### `sdk/core/services/tool-service.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理工具的注册和执行
- 提供工具的静态验证和运行时验证
- 协调不同类型的工具执行器

**主要功能**：
- `registerTool(tool: Tool): void` - 注册工具
- `getTool(toolId: string): Tool` - 获取工具定义
- `execute(toolId: string, parameters: Record<string, any>, options: ToolExecutionOptions, threadId?: string): Promise<Result<ToolExecutionResult, ToolError>>` - 执行工具
- `validateParameters(toolId: string, parameters: Record<string, any>): { valid: boolean; errors: string[] }` - 验证工具参数

**依赖关系**：
- 无外部依赖（内部使用 ToolRegistry 和各种 Executor）
- 被 `NodeExecutionCoordinator` 依赖（执行工具节点）
- 被 `ConversationManager` 依赖（工具调用）

**集成方式**：
- 通过 DI 容器注入到 `NodeExecutionCoordinator` 和 `ConversationManager`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除所有 `SingletonRegistry` 相关代码
- 构造函数不再需要任何参数
- 通过 DI 容器获取实例

#### `sdk/core/services/code-service.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理脚本的注册和执行
- 提供脚本的验证功能
- 协调不同类型的脚本执行器

**主要功能**：
- `registerScript(script: Script): void` - 注册脚本
- `getScript(scriptName: string): Script` - 获取脚本定义
- `execute(scriptName: string, options: Partial<ScriptExecutionOptions>, threadContext?: ThreadContext): Promise<Result<ScriptExecutionResult, CodeExecutionError>>` - 执行脚本
- `validateScript(scriptName: string): { valid: boolean; errors: string[] }` - 验证脚本

**依赖关系**：
- 依赖 `@modular-agent/script-executors` 包（使用 IScriptExecutor 接口）
- 被 `CodeHandler` 依赖（执行代码节点）

**集成方式**：
- 通过 DI 容器注入到 `CodeHandler`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除所有 `SingletonRegistry` 相关代码
- 构造函数不再需要任何参数
- 通过 DI 容器获取实例

#### `sdk/core/services/workflow-registry.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理工作流定义的完整生命周期
- 协调工作流的预处理和验证
- 管理工作流间的引用关系

**主要功能**：
- `register(workflow: WorkflowDefinition): void` - 注册工作流
- `get(workflowId: string): WorkflowDefinition | undefined` - 获取工作流定义
- `unregister(workflowId: string, options?: { force?: boolean; checkReferences?: boolean }): void` - 移除工作流
- `checkWorkflowReferences(workflowId: string): WorkflowReferenceInfo` - 检查工作流引用
- `preprocessWorkflow(workflow: WorkflowDefinition): Promise<void>` - 预处理工作流

**依赖关系**：
- 依赖 `GraphRegistry`（存储预处理结果）
- 依赖 `WorkflowReferenceManager`（管理引用关系）
- 被 `ThreadBuilder` 依赖（获取工作流定义）
- 被 `WorkflowReferenceManager` 依赖（检查引用）

**集成方式**：
- 通过构造函数注入 `GraphRegistry` 和 `WorkflowReferenceManager`
- 通过 DI 容器注入到 `ThreadBuilder` 和 `WorkflowReferenceManager`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除所有 `SingletonRegistry` 相关代码
- 构造函数接收 `GraphRegistry` 和 `WorkflowReferenceManager` 作为参数
- 移除 `getGraphRegistry()` 方法，直接使用注入的实例
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 WorkflowReferenceManager 实例（依赖 WorkflowRegistry）
  │
  ▼
创建 WorkflowRegistry 实例（依赖 GraphRegistry 和 WorkflowReferenceManager）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
其他服务通过容器获取 WorkflowRegistry
```

#### `sdk/core/execution/managers/workflow-reference-manager.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理工作流间的引用关系
- 提供引用检查和安全删除功能
- 协调静态引用和运行时引用

**主要功能**：
- `addReferenceRelation(relation: WorkflowReferenceRelation): void` - 添加引用关系
- `removeReferenceRelation(sourceWorkflowId: string, targetWorkflowId: string, referenceType: WorkflowReferenceType): void` - 移除引用关系
- `checkWorkflowReferences(workflowId: string): WorkflowReferenceInfo` - 检查工作流引用
- `canSafelyDelete(workflowId: string, options?: { force?: boolean }): { canDelete: boolean; details: string }` - 检查是否可以安全删除
- `cleanupWorkflowReferences(workflowId: string): void` - 清理工作流引用

**依赖关系**：
- 依赖 `WorkflowRegistry`（获取工作流信息）
- 依赖 `ThreadRegistry`（检查活跃线程）
- 被 `WorkflowRegistry` 依赖（管理引用关系）

**集成方式**：
- 通过构造函数注入 `WorkflowRegistry` 和 `ThreadRegistry`
- 通过 DI 容器注入到 `WorkflowRegistry`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除所有 `SingletonRegistry` 相关代码
- 构造函数接收 `WorkflowRegistry` 和 `ThreadRegistry` 作为参数
- 移除 `getThreadRegistry()` 方法，直接使用注入的实例
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 WorkflowReferenceManager 实例（依赖 WorkflowRegistry 和 ThreadRegistry）
  │
  ▼
创建 WorkflowRegistry 实例（依赖 GraphRegistry 和 WorkflowReferenceManager）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
WorkflowRegistry 通过构造函数持有 WorkflowReferenceManager
```

### 3.3 调用链

```
容器初始化
  │
  ▼
创建 EventManager 实例（无依赖）
  │
  ▼
创建 ToolService 实例（无依赖）
  │
  ▼
创建 CodeService 实例（无依赖）
  │
  ▼
创建 WorkflowReferenceManager 实例（依赖 WorkflowRegistry 和 ThreadRegistry）
  │
  ▼
创建 WorkflowRegistry 实例（依赖 GraphRegistry 和 WorkflowReferenceManager）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
其他服务通过容器获取这些业务服务
```

---

## 阶段四：迁移执行层组件

### 4.1 目标
将执行层的协调器、管理器和处理器迁移到 DI 容器管理，这些组件依赖业务层服务。

### 4.2 修改文件

#### `sdk/core/execution/context/execution-context.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理执行组件的创建和访问
- 确保组件的正确初始化顺序
- 提供测试时的隔离功能

**主要功能**：
- `initialize(): void` - 初始化上下文
- `getWorkflowRegistry(): WorkflowRegistry` - 获取工作流注册表
- `getThreadRegistry(): ThreadRegistry` - 获取线程注册表
- `getEventManager(): EventManager` - 获取事件管理器
- `getToolService(): ToolService` - 获取工具服务
- `getLlmExecutor(): LLMExecutor` - 获取 LLM 执行器
- `destroy(): Promise<void>` - 销毁上下文

**依赖关系**：
- 依赖 DI 容器（获取所有服务）
- 被 `APIDependencyManager` 依赖（获取执行组件）
- 被 `ThreadBuilder` 依赖（获取执行服务）

**集成方式**：
- 通过构造函数注入 DI 容器
- 通过 DI 容器注入到 `APIDependencyManager` 和 `ThreadBuilder`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除 `SingletonRegistry` 和 `ComponentRegistry` 的使用
- 构造函数接收 `Container` 作为参数
- 所有 `get*()` 方法改为从容器获取服务
- 移除 `initialize()` 方法中的手动初始化逻辑
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 ExecutionContext 实例（依赖 Container）
  │
  ▼
从容器获取所有需要的服务
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
其他模块通过容器获取 ExecutionContext
```

#### `sdk/core/execution/thread-builder.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 从工作流定义构建 ThreadContext 实例
- 管理线程模板和深拷贝
- 初始化线程的变量和触发器

**主要功能**：
- `build(workflowId: string, options: ThreadOptions): Promise<ThreadContext>` - 构建线程上下文
- `buildFromTemplate(templateId: string, options: ThreadOptions): Promise<ThreadContext>` - 从模板构建线程
- `createCopy(sourceThreadContext: ThreadContext): Promise<ThreadContext>` - 创建线程副本
- `createFork(parentThreadContext: ThreadContext, forkConfig: any): Promise<ThreadContext>` - 创建 Fork 子线程

**依赖关系**：
- 依赖 `WorkflowRegistry`（获取工作流定义）
- 依赖 `GraphRegistry`（获取预处理图）
- 依赖 `ThreadRegistry`（注册线程）
- 依赖 `EventManager`（触发事件）
- 依赖 `ToolService`（工具执行）
- 依赖 `LLMExecutor`（LLM 执行）
- 被 `ThreadLifecycleCoordinator` 依赖（创建线程）

**集成方式**：
- 通过构造函数注入所有依赖服务
- 通过 DI 容器注入到 `ThreadLifecycleCoordinator`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除 `SingletonRegistry` 的使用
- 构造函数接收所有依赖服务作为参数
- 移除 `getGraphRegistry()` 等方法，直接使用注入的实例
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 ThreadBuilder 实例（依赖 WorkflowRegistry、GraphRegistry、ThreadRegistry、EventManager、ToolService、LLMExecutor）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
ThreadLifecycleCoordinator 通过容器获取 ThreadBuilder
```

#### `sdk/core/execution/thread-executor.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 执行单个 ThreadContext 实例
- 管理节点的导航和路由
- 协调各个执行组件

**主要功能**：
- `executeThread(threadContext: ThreadContext): Promise<ThreadResult>` - 执行线程
- `checkInterruption(threadContext: ThreadContext): Promise<void>` - 检查中断状态

**依赖关系**：
- 依赖 `EventManager`（触发事件）
- 依赖 `WorkflowRegistry`（获取工作流信息）
- 依赖 `NodeExecutionCoordinator`（执行节点）
- 依赖 `LLMExecutionCoordinator`（LLM 执行）
- 依赖 `InterruptionDetector`（中断检测）
- 被 `ThreadLifecycleCoordinator` 依赖（执行线程）

**集成方式**：
- 通过构造函数注入所有依赖服务
- 通过 DI 容器注入到 `ThreadLifecycleCoordinator`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除 `ExecutionContext` 的使用
- 构造函数接收所有依赖服务作为参数
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 ThreadExecutor 实例（依赖 EventManager、WorkflowRegistry、NodeExecutionCoordinator、LLMExecutionCoordinator、InterruptionDetector）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
ThreadLifecycleCoordinator 通过容器获取 ThreadExecutor
```

#### `sdk/core/execution/coordinators/thread-lifecycle-coordinator.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 管理线程的完整生命周期
- 协调线程的创建、执行、暂停、恢复、停止
- 处理线程的级联关系

**主要功能**：
- `createThread(workflowId: string, options: ThreadOptions): Promise<ThreadContext>` - 创建线程
- `startThread(threadId: string): Promise<ThreadResult>` - 启动线程
- `pauseThread(threadId: string): void` - 暂停线程
- `resumeThread(threadId: string): void` - 恢复线程
- `stopThread(threadId: string): void` - 停止线程
- `destroyThread(threadId: string): Promise<void>` - 销毁线程

**依赖关系**：
- 依赖 `ThreadBuilder`（创建线程）
- 依赖 `ThreadExecutor`（执行线程）
- 依赖 `ThreadRegistry`（管理线程）
- 依赖 `EventManager`（触发事件）
- 依赖 `ThreadCascadeManager`（管理级联关系）
- 被 API 层依赖（线程管理）

**集成方式**：
- 通过构造函数注入所有依赖服务
- 通过 DI 容器注入到 API 层
- 在容器配置中注册为单例服务

**修改内容**：
- 移除 `ExecutionContext` 的使用
- 构造函数接收所有依赖服务作为参数
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 ThreadLifecycleCoordinator 实例（依赖 ThreadBuilder、ThreadExecutor、ThreadRegistry、EventManager、ThreadCascadeManager）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
API 层通过容器获取 ThreadLifecycleCoordinator
```

### 4.3 调用链

```
容器初始化
  │
  ▼
创建 ExecutionContext 实例（依赖 Container）
  │
  ▼
创建 ThreadBuilder 实例（依赖多个服务）
  │
  ▼
创建 ThreadExecutor 实例（依赖多个服务）
  │
  ▼
创建 ThreadLifecycleCoordinator 实例（依赖 ThreadBuilder、ThreadExecutor 等）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
API 层通过容器获取这些执行组件
```

---

## 阶段五：迁移 API 层

### 5.1 目标
将 API 层迁移到使用 DI 容器获取服务，移除对 SingletonRegistry 和 ExecutionContext 的直接依赖。

### 5.2 修改文件

#### `sdk/api/core/sdk-dependencies.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 统一管理 API 层所需的所有 Core 层依赖
- 提供类型安全的依赖访问方法

**主要功能**：
- `getWorkflowRegistry(): WorkflowRegistry` - 获取工作流注册表
- `getThreadRegistry(): ThreadRegistry` - 获取线程注册表
- `getEventManager(): EventManager` - 获取事件管理器
- `getToolService(): ToolService` - 获取工具服务
- `getLlmExecutor(): LLMExecutor` - 获取 LLM 执行器
- `getCodeService(): CodeService` - 获取代码服务
- `getThreadLifecycleCoordinator(): Promise<ThreadLifecycleCoordinator>` - 获取线程生命周期协调器

**依赖关系**：
- 依赖 DI 容器（获取所有服务）
- 被 `APIFactory` 依赖（获取依赖）

**集成方式**：
- 通过构造函数注入 DI 容器
- 通过 DI 容器注入到 `APIFactory`
- 在容器配置中注册为单例服务

**修改内容**：
- 移除 `ExecutionContext` 的使用
- 构造函数接收 `Container` 作为参数
- 所有 `get*()` 方法改为从容器获取服务
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 APIDependencyManager 实例（依赖 Container）
  │
  ▼
从容器获取所有需要的服务
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
APIFactory 通过容器获取 APIDependencyManager
```

#### `sdk/api/core/api-factory.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 统一管理所有资源 API 实例的创建
- 提供 API 实例的缓存

**主要功能**：
- `createWorkflowAPI(): WorkflowRegistryAPI` - 创建工作流 API
- `createThreadAPI(): ThreadRegistryAPI` - 创建线程 API
- `createToolAPI(): ToolRegistryAPI` - 创建工具 API
- `createAllAPIs(): AllAPIs` - 创建所有 API

**依赖关系**：
- 依赖 `APIDependencyManager`（获取依赖）
- 被 `SDK` 依赖（获取 API）

**集成方式**：
- 通过构造函数注入 `APIDependencyManager`
- 通过 DI 容器注入到 `SDK`
- 在容器配置中注册为单例服务

**修改内容**：
- 构造函数接收 `APIDependencyManager` 作为参数
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 APIFactory 实例（依赖 APIDependencyManager）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
SDK 通过容器获取 APIFactory
```

#### `sdk/api/core/sdk.ts`
**文件实现方式**：有状态全局单例（通过 DI 容器管理）

**文件职责**：
- 提供统一的 API 入口
- 整合所有功能模块

**主要功能**：
- `get workflows` - 获取工作流 API
- `get threads` - 获取线程 API
- `get tools` - 获取工具 API
- `reset(): void` - 重置 SDK
- `healthCheck(): Promise<{ status: string; details: Record<string, any> }>` - 健康检查
- `destroy(): Promise<void>` - 销毁 SDK

**依赖关系**：
- 依赖 `APIFactory`（获取 API）
- 被 `sdk/index.ts` 依赖（导出全局实例）

**集成方式**：
- 通过构造函数注入 `APIFactory`
- 通过 DI 容器注入到 `sdk/index.ts`
- 在容器配置中注册为单例服务

**修改内容**：
- 构造函数接收 `APIFactory` 作为参数
- 通过 DI 容器获取实例

**调用链**：
```
容器初始化
  │
  ▼
创建 SDK 实例（依赖 APIFactory）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
sdk/index.ts 通过容器获取 SDK 实例
```

#### `sdk/index.ts`
**文件实现方式**：纯函数导出

**文件职责**：
- 导出 SDK 的所有公共 API
- 管理全局实例

**主要功能**：
- 导出 `sdk` 实例
- 导出所有 API 类型
- 导出工具函数

**依赖关系**：
- 依赖 DI 容器（获取 SDK 实例）

**集成方式**：
- 在模块加载时初始化容器
- 从容器获取 SDK 实例并导出

**修改内容**：
- 在模块加载时调用 `initializeContainer()`
- 从容器获取 SDK 实例
- 导出 SDK 实例

**调用链**：
```
模块加载
  │
  ▼
调用 initializeContainer()
  │
  ▼
从容器获取 SDK 实例
  │
  ▼
导出 SDK 实例
```

### 5.3 调用链

```
模块加载
  │
  ▼
初始化 DI 容器
  │
  ▼
创建 APIDependencyManager 实例（依赖 Container）
  │
  ▼
创建 APIFactory 实例（依赖 APIDependencyManager）
  │
  ▼
创建 SDK 实例（依赖 APIFactory）
  │
  ▼
注册到容器（单例生命周期）
  │
  ▼
从容器获取 SDK 实例并导出
  │
  ▼
用户使用 SDK API
```

---

## 阶段六：清理旧代码

### 6.1 目标
删除所有不再需要的旧代码，包括 SingletonRegistry、ComponentRegistry、LifecycleManager 等。

### 6.2 删除文件

#### `sdk/core/execution/context/singleton-registry.ts`
**删除原因**：
- 所有服务现在通过 DI 容器管理
- 不再需要全局单例注册表

#### `sdk/core/execution/context/component-registry.ts`
**删除原因**：
- ExecutionContext 现在直接使用 DI 容器
- 不再需要组件注册表

#### `sdk/core/execution/context/lifecycle-manager.ts`
**删除原因**：
- 生命周期管理现在由 DI 容器负责
- 不再需要单独的生命周期管理器

### 6.3 修改文件

#### `sdk/core/services/index.ts`
**修改内容**：
- 更新注释，说明服务通过 DI 容器管理
- 移除所有关于 SingletonRegistry 的引用

#### `sdk/core/execution/context/index.ts`
**修改内容**：
- 移除 SingletonRegistry、ComponentRegistry、LifecycleManager 的导出
- 只导出 ExecutionContext

---

## 复用 common-utils DI 容器的优势

### 为什么选择复用而非重新实现

1. **功能完整性**
   - common-utils 的 DI 容器已经实现了完整的依赖注入功能
   - 支持多种绑定类型（INSTANCE、CONSTANT、FACTORY、DYNAMIC）
   - 支持多种作用域（TRANSIENT、SINGLETON、SCOPED）
   - 提供流式 API 设计，使用体验优秀

2. **代码质量保证**
   - 已有完整的测试用例覆盖
   - 经过实际项目验证，稳定性高
   - 代码质量经过审查和维护

3. **架构一致性**
   - 符合 monorepo 的代码复用原则
   - 统一整个项目的 DI 容器实现
   - 避免多个 DI 容器实现带来的混乱

4. **减少维护成本**
   - 避免重复实现约 500+ 行的 DI 容器代码
   - DI 容器的维护集中在 common-utils
   - 减少潜在的 bug 和安全漏洞

5. **降低迁移风险**
   - 使用成熟的实现，减少新引入的问题
   - 可以专注于业务逻辑的迁移，而非基础设施
   - 加快迁移进度

### 复用带来的具体好处

1. **减少代码量**
   - 不需要创建 `sdk/core/di/container.ts`（约 280 行）
   - 不需要创建 `sdk/core/di/binding.ts`（约 170 行）
   - 不需要创建 `sdk/core/di/resolver.ts`（约 167 行）
   - 只需要创建 `service-identifiers.ts` 和 `container-config.ts`

2. **提高开发效率**
   - 直接使用现成的 API
   - 无需学习和调试新的 DI 容器实现
   - 可以立即开始业务逻辑迁移

3. **统一技术栈**
   - 整个项目使用同一个 DI 容器
   - 开发者只需要学习一套 API
   - 代码风格和模式保持一致

### 如何使用 common-utils 的 DI 容器

```typescript
import { Container } from '@modular-agent/common-utils';
import * as Identifiers from './service-identifiers.js';

// 创建容器
const container = new Container();

// 绑定服务
container.bind(Identifiers.WorkflowRegistry)
  .to(WorkflowRegistry)
  .inSingletonScope();

// 获取服务
const workflowRegistry = container.get(Identifiers.WorkflowRegistry);

// 重置容器（用于测试）
container.clearAllCaches();
```

---

## 总结

### 迁移后的架构优势

1. **依赖管理清晰化**
   - 所有依赖通过构造函数明确声明
   - DI 容器自动处理依赖解析和生命周期
   - 编译时类型检查防止运行时错误

2. **可测试性大幅提升**
   - 每个测试用例使用独立的容器实例
   - 轻松替换真实服务为 Mock 服务
   - 无全局状态污染，测试隔离性好

3. **配置灵活性增强**
   - 支持环境特定的服务配置
   - 运行时动态配置覆盖
   - 条件绑定支持复杂场景

4. **代码可维护性提升**
   - 服务依赖关系一目了然
   - 配置集中管理，便于理解和修改
   - 类型系统提供良好的文档支持

### 关键设计决策

1. **不保留适配器层**
   - DI 容器直接作为服务管理中心
   - 避免不必要的抽象层
   - 简化代码结构

2. **使用 Symbol 作为服务标识符**
   - 提供类型安全
   - 避免字符串标识符的拼写错误
   - 支持编译时类型检查

3. **单例生命周期**
   - 所有服务默认为单例
   - 确保全局唯一性
   - 提高性能和资源利用率

4. **构造函数注入**
   - 所有依赖通过构造函数注入
   - 明确声明依赖关系
   - 便于测试和替换

### 迁移顺序说明

1. **阶段一**：建立 DI 容器基础设施，为后续迁移做准备
2. **阶段二**：迁移无依赖的存储层服务，风险最低
3. **阶段三**：迁移有依赖的业务层服务，建立核心业务逻辑
4. **阶段四**：迁移执行层组件，完成核心功能
5. **阶段五**：迁移 API 层，完成对外接口
6. **阶段六**：清理旧代码，完成迁移

每个阶段都可以独立测试和验证，确保迁移过程的稳定性和可控性。