
# DI 迁移最终架构设计文档

## 文档概述

本文档描述 Modular Agent Framework SDK 完全迁移到依赖注入（DI）系统后的最终架构设计。该设计旨在解决当前注册表间的循环依赖问题，建立清晰的分层架构，并提供现代化的服务管理方案。

**核心原则**：
- 完全移除 SingletonRegistry，使用 DI 容器统一管理服务生命周期
- 建立明确的单向依赖关系，消除循环依赖
- 保持与现有 API 的兼容性，确保平滑迁移
- 提供优秀的可测试性和可维护性

---

## 一、架构总览

### 1.1 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                   应用层 (Application Layer)                 │
│  • SDK 客户端入口点                                         │
│  • 配置管理和环境适配                                       │
│  • 类型化服务访问接口                                       │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   业务层 (Business Layer)                    │
│  • 工作流定义管理 (WorkflowRegistry)                        │
│  • 线程执行管理 (ThreadRegistry)                            │
│  • 图结构管理 (GraphRegistry)                               │
│  • 事件系统 (EventManager)                                  │
│  • 工具服务 (ToolService, CodeService)                      │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   存储层 (Storage Layer)                     │
│  • 内存存储 (Map/Set 数据结构)                              │
│  • 数据模型实体                                             │
│  • 纯数据操作，无业务逻辑                                   │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   基础设施层 (Infrastructure Layer)          │
│  • DI 容器 (Dependency Container)                           │
│  • 配置解析                                                 │
│  • 日志记录                                                 │
│  • 错误处理                                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计决策

1. **不保留适配器层**：DI 容器直接作为服务管理中心，避免不必要的抽象层
2. **渐进式类型迁移**：使用 Symbol 作为服务标识符，保持类型安全
3. **环境感知配置**：支持开发、测试、生产环境的不同配置
4. **测试友好设计**：每个测试用例使用独立的容器实例

---

## 二、目录结构设计

### 2.1 核心目录布局

```
sdk/
├── core/
│   ├── di/                          # DI 容器配置
│   │   ├── container-config.ts      # 容器配置主文件
│   │   ├── service-identifiers.ts   # 服务标识符定义
│   │   └── index.ts                 # DI 模块导出
│   │
│   ├── services/                    # 核心服务实现
│   │   ├── graph-registry.ts        # 图注册表（存储层）
│   │   ├── thread-registry.ts       # 线程注册表（存储层）
│   │   ├── workflow-registry.ts     # 工作流注册表（业务层）
│   │   ├── event-manager.ts         # 事件管理器（业务层）
│   │   ├── tool-service.ts          # 工具服务（业务层）
│   │   └── index.ts                 # 服务模块导出
│   │
│   ├── execution/                   # 执行引擎
│   │   ├── context/                 # 执行上下文
│   │   ├── coordinators/            # 协调器
│   │   ├── handlers/                # 处理器
│   │   └── managers/                # 管理器
│   │
│   └── graph/                       # 图处理模块
│       ├── workflow-processor.ts    # 工作流处理器
│       ├── graph-builder.ts         # 图构建器
│       └── validation/              # 验证模块
│
├── api/                             # 公共 API 层
│   ├── builders/                    # 构建器模式
│   ├── resources/                   # REST 资源
│   └── operations/                  # 操作命令
│
└── index.ts                         # SDK 主入口点
```

### 2.2 关键文件职责

#### 2.2.1 DI 配置模块 (`sdk/core/di/`)
- **container-config.ts**：有状态全局单例配置，负责初始化 DI 容器，定义所有服务的绑定关系
- **service-identifiers.ts**：无状态常量定义，导出所有服务标识符的 Symbol
- **index.ts**：纯函数导出，提供容器创建和配置的便捷方法

#### 2.2.2 核心服务模块 (`sdk/core/services/`)
- **graph-registry.ts**：有状态全局单例，负责预处理图的存储和检索，纯存储职责
- **thread-registry.ts**：有状态全局单例，负责线程上下文的存储和基本查询
- **workflow-registry.ts**：有状态全局单例，负责工作流定义的完整生命周期管理
- **event-manager.ts**：有状态全局单例，负责事件发布/订阅和事件路由

#### 2.2.3 执行引擎模块 (`sdk/core/execution/`)
- **context/***：有状态多实例，每个执行线程拥有独立的上下文实例
- **coordinators/***：有状态全局单例，负责跨模块的协调工作
- **handlers/***：无状态或有状态单例，负责特定类型节点的处理逻辑

---

## 三、文件间关系与依赖

### 3.1 依赖关系图

```
                    ┌─────────────────┐
                    │   SDK 入口点    │
                    │  (sdk/index.ts) │
                    └─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │   DI 容器配置   │
                    │ (core/di/*.ts)  │
                    └─────────────────┘
         ┌─────────────┼─────────────┼─────────────┐
         │             │             │             │
         ▼             ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ GraphRegistry│ │ThreadRegistry│ │EventManager │ │ToolService  │
│ (存储层)     │ │ (存储层)     │ │ (业务层)    │ │ (业务层)    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
         │             │             │             │
         └─────────────┼─────────────┼─────────────┘
                       │             │
                       ▼             ▼
               ┌─────────────┐ ┌─────────────┐
               │Workflow     │ │Workflow     │
               │Reference    │ │Registry     │
               │Manager      │ │ (业务层)    │
               └─────────────┘ └─────────────┘
                       │             │
                       └──────┬──────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   执行引擎      │
                    │ (execution/*)   │
                    └─────────────────┘
```

### 3.2 关键依赖关系说明

#### 3.2.1 存储层服务（无外部依赖）
- **GraphRegistry**：无依赖，纯数据存储
- **ThreadRegistry**：无依赖，纯数据存储
- **GlobalMessageStorage**：无依赖，纯数据存储

#### 3.2.2 业务层服务（依赖存储层）
- **WorkflowRegistry**：依赖 GraphRegistry、ThreadRegistry、WorkflowReferenceManager
  - 持有关系：强持有 GraphRegistry 和 ThreadRegistry 实例
  - 被持有关系：被执行引擎、API 层、测试框架持有
- **EventManager**：无依赖，但被几乎所有业务模块依赖
- **ToolService**：无依赖，提供工具执行能力

#### 3.2.3 协调层服务（依赖业务层）
- **WorkflowReferenceManager**：无构造函数依赖，方法参数注入
- **各种 Coordinator**：依赖 EventManager、WorkflowRegistry 等业务服务

#### 3.2.4 执行层服务（依赖协调层）
- **ThreadBuilder**：依赖 WorkflowRegistry、GraphRegistry
- **各种 Handler**：依赖 ToolService、CodeService 等

---

## 四、业务逻辑设计与调用链

### 4.1 核心业务流程

#### 4.1.1 工作流注册流程
```
用户调用 SDK.workflowRegistry.register(workflow)
    │
    ▼
WorkflowRegistry.validate(workflow) → 基础验证
    │
    ▼
WorkflowRegistry.preprocessWorkflow(workflow)
    │
    ├──→ 调用 GraphRegistry 检查是否已预处理
    │
    ├──→ 调用 workflow-processor 进行完整预处理
    │
    └──→ 将预处理结果存储到 GraphRegistry
    │
    ▼
WorkflowRegistry.workflows.set(workflow.id, workflow)
    │
    ▼
触发 EventManager.emit('workflow:registered', {workflowId})
```

#### 4.1.2 线程执行流程
```
用户调用 SDK.threadBuilder.build(workflowId)
    │
    ▼
ThreadBuilder 从 WorkflowRegistry 获取工作流定义
    │
    ▼
ThreadBuilder 从 GraphRegistry 获取预处理图
    │
    ▼
创建 ThreadContext（持有执行状态）
    │
    ▼
注册到 ThreadRegistry（记录活跃线程）
    │
    ▼
触发 EventManager.emit('thread:started', {threadId})
    │
    ▼
执行引擎按拓扑顺序处理节点
    │
    ├──→ 每个节点调用对应的 Handler
    │
    ├──→ Handler 可能调用 ToolService、CodeService
    │
    └──→ 状态更新通过 EventManager 广播
    │
    ▼
线程完成/中断时从 ThreadRegistry 注销
```

#### 4.1.3 工作流删除流程
```
用户调用 SDK.workflowRegistry.unregister(workflowId)
    │
    ▼
WorkflowRegistry 调用 WorkflowReferenceManager.checkReferences()
    │
    ├──→ 检查 ThreadRegistry 中是否有活跃线程
    │
    ├──→ 检查其他工作流是否有引用关系
    │
    └──→ 返回引用检查结果
    │
    ▼
如果有引用且未设置 force 选项 → 抛出错误
    │
    ▼
从 WorkflowRegistry.workflows 中删除定义
    │
    ▼
从 GraphRegistry 中删除预处理图
    │
    ▼
通过 WorkflowReferenceManager 清理引用关系
    │
    ▼
触发 EventManager.emit('workflow:deleted', {workflowId})
```

### 4.2 状态机设计

#### 4.2.1 工作流状态机
```
[未注册] → (register) → [已注册] → (unregister) → [未注册]
      │                     │
      └──→ (preprocess) → [已预处理]
```

#### 4.2.2 线程状态机
```
[未创建] → (build) → [就绪] → (start) → [运行中]
      │                     │              │
      │                     ├──→ (pause) → [已暂停]
      │                     │              │
      │                     ├──→ (resume) ←─┘
      │                     │
      │                     └──→ (complete) → [已完成]
      │                     │
      │                     └──→ (error) → [错误]
      │
      └──→ (destroy) → [已销毁]
```

---

## 五、模块集成方式

### 5.1 服务发现与依赖注入

#### 5.1.1 服务标识符系统
- 每个服务使用唯一的 Symbol 作为标识符
- 类型系统确保编译时类型安全
- 支持字符串标识符向后兼容

#### 5.1.2 依赖解析流程
```
容器收到解析请求 (container.get('WorkflowRegistry'))
    │
    ▼
查找绑定配置，发现依赖 [GraphRegistry, ThreadRegistry, WorkflowReferenceManager]
    │
    ▼
递归解析每个依赖
    │
    ├──→ GraphRegistry（无依赖，直接实例化）
    │
    ├──→ ThreadRegistry（无依赖，直接实例化）
    │
    └──→ WorkflowReferenceManager（无依赖，直接实例化）
    │
    ▼
所有依赖就绪，实例化 WorkflowRegistry
    │
    ▼
返回实例，单例模式下缓存实例
```

### 5.2 模块间通信模式

#### 5.2.1 直接方法调用（同步）
- 用于紧密耦合的模块间通信
- 示例：WorkflowRegistry 直接调用 GraphRegistry 存储预处理图
- 特点：简单直接，但增加耦合度

#### 5.2.2 事件驱动（异步）
- 用于松散耦合的模块间通信
- 示例：线程状态变化通过 EventManager 广播
- 特点：解耦，支持多订阅者，但调试复杂

#### 5.2.3 回调/观察者模式
- 用于需要响应状态变化的场景
- 示例：工作流注册完成后的回调通知
- 特点：灵活，但可能产生回调地狱

### 5.3 配置管理集成

#### 5.3.1 环境感知配置
```
容器初始化时读取环境变量
    │
    ▼
根据 NODE_ENV 选择配置预设
    │
    ├──→ development：使用 ConsoleLogger，启用详细日志
    │
    ├──→ test：使用 MockLogger，禁用外部依赖
    │
    └──→ production：使用 FileLogger，优化性能配置
    │
    ▼
应用配置到相应服务绑定
```

#### 5.3.2 运行时配置覆盖
- 支持通过容器 API 动态覆盖配置
- 示例：测试时替换真实服务为 Mock 服务
- 实现：容器的 `bind().toConstantValue()` 方法

---

## 六、关键业务逻辑实现

### 6.1 工作流预处理逻辑

#### 6.1.1 预处理阶段
1. **验证阶段**：检查工作流定义的基本有效性
2. **展开阶段**：处理 SUBGRAPH 节点，展开嵌套工作流
3. **优化阶段**：计算拓扑排序，检测循环依赖
4. **缓存阶段**：将预处理结果存储到 GraphRegistry

#### 6.1.2 引用关系管理
- **静态引用**：工作流定义中的 SUBGRAPH 节点引用
- **动态引用**：运行时通过触发器激活的引用
- **运行时引用**：活跃线程对工作流的引用

### 6.2 线程执行管理

#### 6.2.1 线程生命周期
1. **构建阶段**：创建工作流实例，初始化上下文
2. **准备阶段**：注册到 ThreadRegistry，分配资源
3. **执行阶段**：按节点顺序执行，处理分支和合并
4. **完成阶段**：清理资源，更新状态，触发事件

#### 6.2.2 错误处理策略
- **节点级错误**：由节点 Handler 捕获并转换为标准错误格式
- **工作流级错误**：由执行引擎捕获，可能触发重试或回滚
- **系统级错误**：由 ErrorService 统一处理，记录日志并触发告警

### 6.3 事件系统设计

#### 6.3.1 事件分类
- **生命周期事件**：workflow:registered, thread:started, thread:completed
- **状态变更事件**：workflow:updated, thread:paused, thread:resumed
- **业务事件**：node:executed, tool:invoked, error:occurred

#### 6.3.2 事件处理流程
```
事件发布者调用 EventManager.emit(eventType, payload)
    │
    ▼
EventManager 查找该事件类型的所有订阅者
    │
    ▼
同步或异步调用每个订阅者的处理函数
    │
    ├──→ 日志记录器：记录事件到日志系统
    │
    ├──→ 监控系统：更新监控指标
    │
    └──→ 业务处理器：执行业务逻辑
```

---

## 七、迁移后的优势与考量

### 7.1 架构优势

#### 7.1.1 依赖管理清晰化
- 所有依赖通过构造函数明确声明
- DI 容器自动处理依赖解析和生命周期
- 编译时类型检查防止运行时错误

#### 7.1.2 可测试性大幅提升
- 每个测试用例使用独立的容器实例
- 轻松替换真实服务为 Mock 服务
- 无全局状态污染，测试隔离性好

#### 7.1.3 配置灵活性增强
- 支持环境特定的服务配置
- 运行时动态配置覆盖
- 条件绑定支持复杂场景

### 7.2 性能考量

#### 7.2.1 启动性能
- **首次初始化**：需要解析所有依赖关系，有一定开销
- **后续访问**：单例服务从缓存获取，性能接近直接访问
- **优化策略**：延迟初始化，按需创建服务实例

#### 7.2.2 运行时性能
- **依赖解析**：主要在启动时完成，运行时开销可忽略
- **内存占用**：单例模式减少重复实例创建
- **GC 压力**：明确的生命周期管理有助于垃圾回收

### 7.3 维护性考量

#### 7.3.1 代码可读性
- 服务依赖关系一目了然
- 配置集中管理，便于理解和修改
- 类型系统提供良好的文档支持

#### 7.3.2 扩展性
-