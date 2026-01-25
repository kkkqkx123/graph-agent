# SDK模块分析文档

## 分析目标
基于旧项目代码分析，确定哪些模块应该作为SDK核心功能，哪些应该作为应用层专属功能。

---

## 一、src/services目录模块分析

### 1.1 Thread相关模块

#### ✅ 应该属于SDK核心
- **ThreadWorkflowExecutor** - 工作流执行引擎核心
  - 负责workflow的实际执行逻辑
  - 节点遍历、边路由、状态转换
  - 是SDK最核心的执行引擎

- **ThreadStateManager** - 线程状态管理
  - 管理workflow执行过程中的状态
  - 节点执行结果、变量、上下文
  - SDK执行过程中必需的状态管理

- **FunctionExecutionEngine** - 函数执行引擎
  - 执行单个节点的函数逻辑
  - 支持顺序、并行、条件执行策略
  - 节点级别执行的核心组件

#### ❌ 应该作为应用层专属
- **ThreadManagement** - 线程管理
  - 查询、列表、存在性检查
  - 应用层的管理功能，非核心执行

- **ThreadLifecycle** - 线程生命周期
  - 创建、启动、暂停、恢复、完成、取消
  - 涉及会话管理和多线程协调，应用层逻辑

- **ThreadHistoryManager** - 线程历史管理
  - 历史记录查询和管理
  - 应用层功能，非核心执行必需

- **ThreadMaintenance** - 线程维护
  - 清理、归档、健康检查
  - 应用层维护功能

- **ThreadMonitoring** - 线程监控
  - 性能指标、健康状态、告警
  - 应用层监控功能

- **ThreadCommunication** - 线程通信
  - 线程间通信机制
  - 应用层多线程协调功能

- **ThreadFork/ThreadJoin** - 线程分叉/合并
  - 并行执行支持
  - 应用层高级功能

- **ThreadCopy** - 线程复制
  - 应用层功能

- **ThreadConditionalRouter** - 条件路由
  - 应用层路由逻辑

---

### 1.2 Workflow相关模块

#### ✅ 应该属于SDK核心
- **ContextManagement** - 上下文管理
  - 工作流上下文的生命周期管理
  - 执行过程中的数据传递
  - SDK执行必需的核心功能

- **WorkflowStructureValidator** - 工作流结构验证
  - 验证workflow的图结构合法性
  - 节点、边、引用的完整性
  - SDK执行前的必要验证

#### ❌ 应该作为应用层专属
- **FunctionManagement** - 函数管理
  - CRUD操作、版本管理、配置管理
  - 应用层的管理功能

- **WorkflowMonitoring** - 工作流监控
  - 执行监控、性能分析、指标收集
  - 应用层监控功能

- **SubworkflowValidator** - 子工作流验证
  - 应用层高级功能

---

### 1.3 LLM相关模块

#### ✅ 应该属于SDK核心
- **Wrapper** - LLM包装器
  - 统一的LLM调用接口
  - 提供商抽象、模型管理
  - SDK与LLM交互的核心

- **LLMWrapperManager** - 包装器管理器
  - 多提供商管理、负载均衡
  - SDK支持多LLM的核心组件

- **LLMClientFactory** - LLM客户端工厂
  - 创建具体LLM客户端实例
  - OpenAI、Anthropic、Gemini等
  - SDK必需的多提供商支持

#### ❌ 应该作为应用层专属
- **PoolManager** - 连接池管理
  - LLM连接池管理
  - 应用层性能优化

- **TaskGroupManager** - 任务组管理
  - 批量任务管理
  - 应用层高级功能

- **HumanRelay** - 人工中继
  - 人工介入机制
  - 应用层交互功能

---

### 1.4 Tools相关模块

#### ✅ 应该属于SDK核心
- **ToolService** - 工具服务
  - 工具查找、执行、结果处理
  - SDK扩展能力的核心

- **ToolExecutorBase** - 工具执行器基类
  - 统一的工具执行接口
  - 所有执行器的基础

- **BuiltinExecutor** - 内置工具执行器
  - 执行SDK内置工具
  - SDK自带工具支持

- **NativeExecutor** - 本地工具执行器
  - 执行本地函数/脚本
  - SDK本地扩展支持

- **RestExecutor** - REST工具执行器
  - 调用REST API
  - SDK外部服务集成

- **McpExecutor** - MCP工具执行器
  - Model Context Protocol支持
  - 现代工具协议支持

#### ❌ 应该作为应用层专属
- 无特别应用层专属，工具执行框架应该完整保留

---

### 1.5 Checkpoints相关模块

#### ⚠️ 可选（根据SDK定位）
- **CheckpointCreation** - 检查点创建
  - 线程状态快照
  - 如果SDK需要支持状态恢复则保留

- **CheckpointRestore** - 检查点恢复
  - 从检查点恢复执行
  - 如果SDK需要支持状态恢复则保留

- **CheckpointQuery** - 检查点查询
  - 查询历史检查点
  - 应用层功能

- **CheckpointCleanup** - 检查点清理
  - 清理过期检查点
  - 应用层维护功能

- **CheckpointBackup** - 检查点备份
  - 备份检查点数据
  - 应用层功能

- **CheckpointAnalysis** - 检查点分析
  - 分析检查点数据
  - 应用层分析功能

- **CheckpointManagement** - 检查点管理
  - 综合检查点操作
  - 如果SDK需要完整检查点功能则保留

**建议**：SDK应该保留轻量级检查点功能，支持基本的创建和恢复，但复杂的清理、备份、分析交给应用层。

---

### 1.6 Sessions相关模块

#### ❌ 应该作为应用层专属
- **SessionManagement** - 会话管理
  - 会话的查询、列表、配置更新
  - 应用层用户会话管理

- **SessionLifecycle** - 会话生命周期
  - 创建、启动、终止会话
  - 应用层生命周期管理

- **SessionMaintenance** - 会话维护
  - 清理、健康检查
  - 应用层维护功能

- **SessionMonitoring** - 会话监控
  - 性能监控、资源使用
  - 应用层监控功能

- **SessionOrchestration** - 会话编排
  - 多会话协调
  - 应用层编排功能

- **SessionResource** - 会话资源
  - 资源分配、限制
  - 应用层资源管理

- **SessionCheckpointManagement** - 会话检查点管理
  - 会话级别的检查点
  - 应用层功能

**理由**：Session是多线程协调和应用层用户会话的概念，SDK应该专注于单线程执行，Session管理交给应用层。

---

### 1.7 State相关模块

#### ⚠️ 可选（根据SDK定位）
- **StateManagement** - 状态管理
  - 状态CRUD、验证、转换
  - SDK执行过程中需要状态管理

- **StateHistory** - 状态历史
  - 状态变更历史记录
  - 如果SDK需要审计则保留

- **StateRecovery** - 状态恢复
  - 从错误中恢复状态
  - 如果SDK需要容错则保留

**建议**：SDK应该保留核心的StateManagement，但历史记录和恢复机制可以简化。

---

### 1.8 Interaction相关模块

#### ❌ 应该作为应用层专属
- **InteractionEngine** - 交互引擎
  - 协调消息、工具调用、LLM调用
  - 应用层交互逻辑

- **AgentLoop** - Agent循环
  - LLM-工具交互循环
  - 应用层Agent逻辑

- **MessageSummarizer** - 消息摘要
  - 消息摘要生成
  - 应用层优化功能

- **LLMExecutor** - LLM执行器
  - LLM调用执行
  - 应用层封装

- **ToolExecutor** - 工具执行器
  - 工具调用执行
  - 应用层封装

- **UserInteractionHandler** - 用户交互处理器
  - 处理用户输入
  - 应用层交互功能

- **MessageManager** - 消息管理器
  - 消息存储、检索
  - 应用层消息管理

- **ToolCallManager** - 工具调用管理器
  - 工具调用跟踪
  - 应用层管理功能

- **LLMCallManager** - LLM调用管理器
  - LLM调用跟踪
  - 应用层管理功能

- **TokenManager** - Token管理器
  - Token使用跟踪
  - 应用层监控功能

**理由**：Interaction是应用层与用户的交互逻辑，SDK应该提供底层执行能力，交互模式由应用层决定。

---

### 1.9 Prompts相关模块

#### ❌ 应该作为应用层专属
- **PromptBuilder** - 提示词构建器
  - 构建LLM提示词
  - 应用层提示词工程

- **TemplateProcessor** - 模板处理器
  - 处理提示词模板
  - 应用层模板功能

- **PromptReferenceParser** - 提示词引用解析器
  - 解析提示词引用
  - 应用层功能

- **PromptReferenceValidator** - 提示词引用验证器
  - 验证提示词引用
  - 应用层功能

**理由**：Prompt工程是应用层的关注点，SDK应该接收原始prompt，不关心构建过程。

---

### 1.10 Common模块

#### ✅ 应该属于SDK核心
- **BaseService** - 基础服务
  - 服务基类、错误处理
  - SDK服务基础

---

## 二、src/infrastructure目录模块分析

### 2.1 Persistence模块

#### ❌ 应该作为应用层专属
- **ConnectionManager** - 数据库连接管理
  - TypeORM连接管理
  - 应用层持久化选择

- **所有Repository实现** - 仓储实现
  - ThreadRepository、WorkflowRepository等
  - 应用层持久化策略

- **所有Mapper** - 对象映射
  - 领域实体到数据库模型
  - 应用层持久化细节

- **所有Model** - 数据库模型
  - TypeORM实体定义
  - 应用层数据库设计

**理由**：SDK不应该强制特定的持久化方案，应该由应用层决定如何存储。

---

### 2.2 Logging模块

#### ❌ 应该作为应用层专属
- **Logger** - 日志记录器
  - Winston实现
  - 应用层日志策略

- **LoggerFactory** - 日志工厂
  - 创建日志记录器
  - 应用层日志配置

- **LoggerConfig** - 日志配置
  - 日志级别、格式、输出
  - 应用层日志配置

- **Formatters** - 格式化器
  - JSON、文本格式化
  - 应用层日志格式

- **Transports** - 传输方式
  - 控制台、文件传输
  - 应用层日志输出

**理由**：SDK应该使用简单的日志接口，具体实现由应用层注入。

---

### 2.3 Config模块

#### ❌ 应该作为应用层专属
- **ConfigLoadingModule** - 配置加载模块
  - TOML配置加载
  - 环境变量处理
  - 应用层配置管理

- **ConfigCacheManager** - 配置缓存管理
  - 配置缓存
  - 应用层性能优化

- **ConfigFileService** - 配置文件服务
  - 文件读写
  - 应用层文件操作

- **ConfigValidator** - 配置验证器
  - 配置模式验证
  - 应用层配置验证

- **所有Processor** - 配置处理器
  - 环境变量、继承处理
  - 应用层配置处理

**理由**：SDK应该通过API参数接收配置，不应该强制特定的配置管理方式。

---

### 2.4 LLM模块

#### ✅ 应该属于SDK核心
- **LLMClientFactory** - LLM客户端工厂
  - 创建LLM客户端
  - SDK多提供商支持

- **所有LLMClient实现** - LLM客户端
  - OpenAIChatClient、AnthropicClient等
  - SDK与LLM交互的核心

- **HumanRelayClient** - 人工中继客户端
  - 人工介入支持
  - SDK交互能力

#### ❌ 应该作为应用层专属
- **RateLimiters** - 速率限制器
  - 滑动窗口、令牌桶
  - 应用层流量控制

- **Retry模块** - 重试机制
  - LLM重试配置
  - 应用层容错策略

- **TokenCalculators** - Token计算器
  - API响应、本地Token计算
  - 应用层监控和优化

**理由**：速率限制和重试是应用层的运维关注点，SDK应该提供基础LLM调用能力。

---

## 三、src/domain目录模块分析

### 3.1 核心领域模型

#### ✅ 应该属于SDK核心
- **Workflow** - 工作流实体
  - 工作流定义、图结构
  - SDK核心模型

- **Thread** - 线程实体
  - 执行线程、状态管理
  - SDK核心模型

- **Tool** - 工具实体
  - 工具定义、执行
  - SDK核心模型

- **Node** - 节点实体
  - 各种节点类型（开始、结束、条件、函数等）
  - SDK核心模型

- **Edge** - 边实体
  - 边定义、路由
  - SDK核心模型

- **WorkflowContext** - 工作流上下文
  - 执行上下文、变量管理
  - SDK执行必需

- **ThreadWorkflowState** - 线程工作流状态
  - 执行状态、当前节点
  - SDK执行必需

- **ToolExecution/ToolResult** - 工具执行/结果
  - 工具调用和结果
  - SDK工具支持必需

#### ❌ 应该作为应用层专属
- **Session** - 会话实体
  - 用户会话、多线程管理
  - 应用层概念

- **Prompt相关** - 提示词实体
  - LLM请求/响应、提示词历史
  - 应用层LLM交互

- **Checkpoint** - 检查点实体
  - 状态快照
  - 可选，根据SDK定位

- **State** - 状态实体
  - 通用状态管理
  - 可选，根据SDK定位

---

### 3.2 值对象

#### ✅ 应该属于SDK核心
- **ID** - 标识符
  - 实体ID
  - SDK基础

- **Timestamp** - 时间戳
  - 创建/更新时间
  - SDK基础

- **Version** - 版本
  - 实体版本
  - SDK基础

- **NodeId/NodeType** - 节点ID/类型
  - 节点标识和类型
  - SDK核心

- **EdgeId/EdgeType** - 边ID/类型
  - 边标识和类型
  - SDK核心

- **ToolType/ToolStatus** - 工具类型/状态
  - 工具元数据
  - SDK工具支持

- **WorkflowStatus/WorkflowType** - 工作流状态/类型
  - 工作流元数据
  - SDK核心

- **ThreadStatus** - 线程状态
  - 线程状态管理
  - SDK核心

#### ❌ 应该作为应用层专属
- **UserId** - 用户ID
  - 应用层用户概念

- **Metadata** - 元数据
  - 通用元数据
  - 应用层扩展

- **DeletionStatus** - 删除状态
  - 软删除支持
  - 应用层数据管理

---

### 3.3 仓储接口

#### ✅ 应该属于SDK核心（简化版）
- **IWorkflowRepository** - 工作流仓储接口
  - 工作流持久化契约
  - SDK需要定义契约

- **IThreadRepository** - 线程仓储接口
  - 线程持久化契约
  - SDK需要定义契约

- **IToolRepository** - 工具仓储接口
  - 工具持久化契约
  - SDK需要定义契约

#### ❌ 应该作为应用层专属
- **ISessionRepository** - 会话仓储接口
  - 应用层会话管理

- **ICheckpointRepository** - 检查点仓储接口
  - 可选，根据SDK定位

- **IStateRepository** - 状态仓储接口
  - 可选，根据SDK定位

- **Prompt相关仓储** - 提示词仓储
  - 应用层LLM交互

**理由**：SDK应该定义仓储接口，但具体实现由应用层提供。

---

### 3.4 异常和类型

#### ✅ 应该属于SDK核心
- **所有领域异常** - 验证错误、执行错误、实体未找到等
  - SDK错误处理
  - 统一的错误类型

- **ILogger接口** - 日志接口
  - SDK日志抽象
  - 应用层实现

---

## 四、SDK核心功能边界总结

### 4.1 必须属于SDK核心

1. **工作流执行引擎**
   - ThreadWorkflowExecutor
   - FunctionExecutionEngine
   - 节点执行处理器

2. **状态管理**
   - ThreadStateManager
   - WorkflowContext
   - ThreadWorkflowState

3. **LLM集成**
   - Wrapper/LLMWrapperManager
   - LLMClientFactory + 各种LLMClient
   - 统一的LLM调用接口

4. **工具执行框架**
   - ToolService
   - ToolExecutorBase + 各种Executor
   - 工具定义和执行

5. **核心领域模型**
   - Workflow、Thread、Node、Edge、Tool
   - 相关值对象（ID、Status、Type等）
   - 仓储接口（IWorkflowRepository、IThreadRepository、IToolRepository）

6. **验证和错误处理**
   - WorkflowStructureValidator
   - 领域异常
   - ILogger接口

### 4.2 应该作为应用层专属

1. **会话管理** - Session相关所有功能
2. **持久化** - Repository实现、数据库连接
3. **配置管理** - 配置加载、验证、缓存
4. **日志实现** - 具体日志记录器
5. **交互引擎** - Interaction、AgentLoop
6. **Prompt工程** - Prompt构建、模板处理
7. **监控和维护** - 监控、清理、备份、分析
8. **高级路由** - 条件路由、分叉/合并
9. **速率限制和重试** - 应用层运维策略

### 4.3 可选功能（根据SDK定位）

1. **检查点功能**
   - 轻量级：保留创建和恢复
   - 完整版：保留所有检查点功能

2. **状态历史**
   - 轻量级：基本状态管理
   - 完整版：完整历史记录和恢复

3. **工作流验证**
   - 基础：结构验证
   - 完整：完整验证器

---

## 五、SDK设计原则

### 5.1 核心原则

1. **专注执行**：SDK专注于工作流执行，不关心管理、监控、维护
2. **轻量级**：最小依赖，不强制特定技术栈
3. **可扩展**：通过接口和插件机制支持扩展
4. **无状态**：SDK本身无状态，状态由应用层管理
5. **配置即代码**：通过API参数配置，不依赖配置文件

### 5.2 接口设计

1. **简单API**：提供简洁的执行API
   ```typescript
   const result = await sdk.executeWorkflow(workflow, input, options);
   ```

2. **插件机制**：支持自定义节点执行器、工具执行器
   ```typescript
   sdk.registerNodeExecutor(type, executor);
   sdk.registerToolExecutor(type, executor);
   ```

3. **事件驱动**：提供执行事件监听
   ```typescript
   sdk.on('nodeExecuted', (event) => { ... });
   ```

4. **仓储注入**：允许应用层注入持久化实现
   ```typescript
   sdk.setWorkflowRepository(repository);
   sdk.setThreadRepository(repository);
   ```

### 5.3 依赖管理

1. **最小依赖**：只保留必需依赖
2. **可选依赖**：LLM客户端、工具执行器按需加载
3. **接口抽象**：所有外部依赖通过接口抽象
4. **无框架绑定**：不依赖特定框架（如Express、TypeORM）

---

## 六、SDK模块划分建议

### 6.1 核心模块（core）

```
sdk/
├── core/
│   ├── execution/          # 执行引擎
│   │   ├── workflow-executor.ts
│   │   ├── function-executor.ts
│   │   └── node-executor.ts
│   ├── state/              # 状态管理
│   │   ├── thread-state.ts
│   │   └── workflow-context.ts
│   ├── validation/         # 验证
│   │   └── workflow-validator.ts
│   └── events/             # 事件
│       └── execution-events.ts
```

### 6.2 LLM模块（llm）

```
sdk/
├── llm/
│   ├── wrapper.ts          # LLM包装器
│   ├── wrapper-manager.ts  # 包装器管理器
│   ├── client-factory.ts   # 客户端工厂
│   ├── clients/            # LLM客户端
│   │   ├── openai-client.ts
│   │   ├── anthropic-client.ts
│   │   ├── gemini-client.ts
│   │   └── mock-client.ts
│   └── types/              # LLM类型
│       ├── request.ts
│       └── response.ts
```

### 6.3 Tools模块（tools）

```
sdk/
├── tools/
│   ├── tool-service.ts     # 工具服务
│   ├── executor-base.ts    # 执行器基类
│   ├── executors/          # 具体执行器
│   │   ├── builtin-executor.ts
│   │   ├── native-executor.ts
│   │   ├── rest-executor.ts
│   │   └── mcp-executor.ts
│   └── types/              # 工具类型
│       ├── tool.ts
│       ├── execution.ts
│       └── result.ts
```

### 6.4 Domain模块（domain）

```
sdk/
├── domain/
│   ├── workflow/           # 工作流
│   │   ├── workflow.ts
│   │   ├── node.ts
│   │   └── edge.ts
│   ├── thread/             # 线程
│   │   └── thread.ts
│   ├── tool/               # 工具
│   │   └── tool.ts
│   ├── value-objects/      # 值对象
│   │   ├── id.ts
│   │   ├── timestamp.ts
│   │   └── status.ts
│   └── repositories/       # 仓储接口
│       ├── workflow-repository.ts
│       ├── thread-repository.ts
│       └── tool-repository.ts
```

### 6.5 API模块（api）

```
sdk/
├── api/
│   ├── sdk.ts              # SDK主类
│   ├── types/              # API类型
│   │   ├── execution-options.ts
│   │   └── execution-result.ts
│   └── events/             # 事件类型
│       └── sdk-events.ts
```

---

## 七、实现优先级建议

### 7.1 第一阶段：核心执行引擎

1. **Domain层**：核心领域模型和值对象
2. **Core层**：工作流执行引擎、函数执行引擎
3. **State层**：线程状态管理、工作流上下文
4. **Validation层**：工作流结构验证
5. **API层**：基础执行API

### 7.2 第二阶段：LLM集成

1. **LLM模块**：包装器、管理器、客户端工厂
2. **LLM客户端**：OpenAI、Anthropic、Gemini实现
3. **集成测试**：LLM调用集成

### 7.3 第三阶段：工具框架

1. **Tools模块**：工具服务、执行器基类
2. **执行器**：Builtin、Native、REST执行器
3. **集成测试**：工具执行集成

### 7.4 第四阶段：可选功能

1. **检查点**：轻量级检查点创建和恢复
2. **事件系统**：执行事件监听
3. **插件机制**：自定义执行器注册
4. **完善测试**：全面测试覆盖

---

## 八、迁移策略

### 8.1 参考旧代码但不直接复用

1. **理解逻辑**：深入理解旧代码的业务逻辑
2. **重新设计**：根据SDK定位重新设计接口
3. **简化实现**：移除应用层功能，保持核心逻辑
4. **优化结构**：改进代码结构，提高可维护性

### 8.2 代码复用原则

1. **领域模型**：可以参考旧代码的领域模型设计
2. **执行逻辑**：可以参考旧代码的执行引擎逻辑
3. **错误处理**：可以参考旧代码的异常设计
4. **测试用例**：可以参考旧代码的测试场景

### 8.3 避免的问题

1. **不要复制粘贴**：避免直接复制旧代码
2. **不要过度设计**：保持SDK简单专注
3. **不要强制技术栈**：避免依赖特定框架
4. **不要包含应用逻辑**：保持SDK纯粹

---

## 九、风险和收益评估

### 9.1 收益

1. **更清晰的边界**：SDK专注于执行，应用层专注于管理
2. **更好的复用性**：SDK可以在不同应用中复用
3. **更简单的维护**：SDK代码量大幅减少，易于维护
4. **更灵活的应用**：应用层可以自由选择技术栈
5. **更好的测试**：SDK可以独立测试，测试覆盖更容易

### 9.2 风险

1. **迁移成本**：需要重新实现核心功能
2. **学习曲线**：开发团队需要理解新架构
3. **兼容性问题**：旧项目可能需要适配
4. **功能缺失**：初期可能缺少一些高级功能

### 9.3 缓解措施

1. **渐进式迁移**：分阶段实现，逐步替换
2. **充分测试**：确保SDK功能正确性
3. **文档完善**：提供详细的使用文档
4. **示例项目**：提供完整的示例应用

---

## 十、结论

基于以上分析，建议将项目改造为纯粹的SDK，专注于工作流执行核心功能。旧项目的`src`目录作为参考，新SDK在`sdk`目录重新实现，保持简单、专注、可扩展的设计原则。

SDK应该包含：
- 工作流执行引擎
- 状态管理
- LLM集成
- 工具执行框架
- 核心领域模型

应用层应该负责：
- 会话管理
- 持久化
- 配置管理
- 日志记录
- 交互逻辑
- 监控维护

这样的架构更清晰，职责更明确，复用性更好。