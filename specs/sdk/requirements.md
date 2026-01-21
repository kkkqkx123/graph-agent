# Graph Agent SDK 需求文档

## 1. 简介

Graph Agent SDK 是一个为 Graph Agent 框架提供的编程式 API，旨在简化工作流的创建、配置和执行。SDK 提供三种不同的 API 风格（Builder API、函数式 API、对象创建 API），以满足不同场景下的开发需求。SDK 作为 Application 层的外部接口，严格遵循项目的分层架构，只依赖 Services 层，与现有的配置驱动系统完全兼容。

## 2. 功能需求

### 2.1 核心类型系统

**用户故事**: 作为开发者，我希望 SDK 提供完整的 TypeScript 类型定义，以便在开发时获得类型安全和智能提示。

**验收标准**:
1. 系统应当提供 SDKConfig 接口，包含 enableLogging、defaultTimeout、defaultCheckpointInterval 等配置选项
2. 系统应当提供 WrapperConfig 接口，支持 pool、group、direct 三种类型
3. 系统应当提供 PromptConfig 接口，支持 direct、template、reference 三种类型
4. 系统应当提供 BaseNodeConfig 接口作为所有节点配置的基类
5. 系统应当提供 LLMNodeConfig、ToolNodeConfig、ConditionNodeConfig、TransformNodeConfig 等具体节点配置接口
6. 系统应当提供 NodeConfig 联合类型，包含所有节点类型
7. 系统应当提供 EdgeConfig 接口，包含 from、to、condition、weight 等属性
8. 系统应当提供 WorkflowConfig 接口，包含 id、name、nodes、edges 等属性
9. 系统应当提供 ThreadConfig 接口，包含 workflow、inputData、options 等属性
10. 系统应当确保所有类型定义与 Domain 层的类型保持兼容

### 2.2 Builder API

**用户故事**: 作为开发者，我希望使用流式 API 构建工作流，以便通过链式调用创建复杂的工作流结构。

**验收标准**:
1. 系统应当提供 WorkflowBuilder.create() 静态方法创建工作流构建器
2. 系统应当支持 WorkflowBuilder.name() 方法设置工作流名称
3. 系统应当支持 WorkflowBuilder.description() 方法设置工作流描述
4. 系统应当支持 WorkflowBuilder.addNode() 方法添加节点
5. 系统应当支持 WorkflowBuilder.addEdge() 方法添加边
6. 系统应当支持 WorkflowBuilder.build() 方法构建最终的工作流对象
7. 系统应当提供 NodeBuilder.start() 静态方法创建开始节点
8. 系统应当提供 NodeBuilder.llm() 静态方法创建 LLM 节点
9. 系统应当提供 NodeBuilder.tool() 静态方法创建工具节点
10. 系统应当提供 NodeBuilder.condition() 静态方法创建条件节点
11. 系统应当提供 NodeBuilder.transform() 静态方法创建数据转换节点
12. 系统应当提供 NodeBuilder.end() 静态方法创建结束节点
13. 系统应当支持所有节点的链式配置方法（如 wrapper()、prompt()、temperature() 等）
14. 系统应当提供 EdgeBuilder.create() 静态方法创建边构建器
15. 系统应当支持 EdgeBuilder.from() 和 EdgeBuilder.to() 方法设置边的连接
16. 系统应当支持 EdgeBuilder.condition() 方法设置边的条件
17. 系统应当支持 EdgeBuilder.weight() 方法设置边的权重
18. 系统应当支持所有 Builder 方法的类型推断

### 2.3 函数式 API

**用户故事**: 作为开发者，我希望使用函数式 API 构建工作流，以便通过函数组合和高阶函数创建灵活的工作流。

**验收标准**:
1. 系统应当提供 workflow() 函数创建工作流
2. 系统应当提供 node.start()、node.llm()、node.tool()、node.condition()、node.transform()、node.end() 等函数创建节点
3. 系统应当提供 edge() 函数创建边
4. 系统应当提供 pipe() 函数支持管道操作
5. 系统应当提供 map() 高阶函数对节点集合进行映射
6. 系统应当提供 filter() 高阶函数对节点集合进行过滤
7. 系统应当提供 reduce() 高阶函数对节点集合进行归约
8. 系统应当支持函数式 API 的类型推断
9. 系统应当支持通过 pipe() 组合多个节点形成线性工作流
10. 系统应当支持通过高阶函数动态处理节点集合

### 2.4 对象创建 API

**用户故事**: 作为开发者，我希望使用简化的对象创建 API 快速构建工作流，以便在简单场景下快速原型开发。

**验收标准**:
1. 系统应当提供 createWorkflow() 函数创建工作流对象
2. 系统应当提供 createNode.start()、createNode.llm()、createNode.tool() 等函数创建节点
3. 系统应当提供 createEdge() 函数创建边
4. 系统应当提供 createNode.quickLLM() 快速创建 LLM 节点
5. 系统应当提供 createNode.quickTool() 快速创建工具节点
6. 系统应当提供 createNode.quickBranch() 快速创建条件分支
7. 系统应当支持对象创建 API 的类型安全
8. 系统应当支持通过配置对象动态构建工作流

### 2.5 Thread 执行 API

**用户故事**: 作为开发者，我希望使用 Thread API 执行工作流，以便管理工作流的执行生命周期和状态。

**验收标准**:
1. 系统应当提供 ThreadBuilder.create() 静态方法创建线程构建器
2. 系统应当支持 ThreadBuilder.workflow() 方法设置工作流
3. 系统应当支持 ThreadBuilder.inputData() 方法设置输入数据
4. 系统应当支持 ThreadBuilder.options() 方法设置执行选项
5. 系统应当支持 ThreadBuilder.build() 方法构建线程对象
6. 系统应当支持 thread.execute() 方法执行线程
7. 系统应当支持 thread.resumeFromCheckpoint() 方法从检查点恢复执行
8. 系统应当支持 thread.getCheckpoints() 方法获取检查点列表
9. 系统应当支持 thread.getStatus() 方法获取执行状态
10. 系统应当支持 thread.cancel() 方法取消执行
11. 系统应当支持 enableCheckpoints 选项启用检查点
12. 系统应当支持 checkpointInterval 选项设置检查点间隔
13. 系统应当支持 timeout 选项设置执行超时
14. 系统应当支持 maxSteps 选项设置最大执行步数

### 2.6 适配器系统

**用户故事**: 作为开发者，我希望 SDK 能够与现有的 Domain 层对象无缝转换，以便在 SDK 和配置系统之间自由切换。

**验收标准**:
1. 系统应当提供 WorkflowAdapter.toDomain() 方法将 SDK 配置转换为 Domain 对象
2. 系统应当提供 WorkflowAdapter.fromDomain() 方法将 Domain 对象转换为 SDK 配置
3. 系统应当提供 NodeAdapter.toDomain() 方法将 SDK 节点配置转换为 Domain 节点
4. 系统应当提供 NodeAdapter.fromDomain() 方法将 Domain 节点转换为 SDK 配置
5. 系统应当提供 EdgeAdapter.toDomain() 方法将 SDK 边配置转换为 Domain 边
6. 系统应当提供 EdgeAdapter.fromDomain() 方法将 Domain 边转换为 SDK 配置
7. 系统应当提供 ThreadAdapter.toDomain() 方法将 SDK 线程配置转换为 Domain 线程
8. 系统应当提供 ThreadAdapter.fromDomain() 方法将 Domain 线程转换为 SDK 配置
9. 系统应当确保适配器转换不丢失任何配置信息
10. 系统应当确保适配器转换保持类型安全

### 2.7 执行器

**用户故事**: 作为开发者，我希望使用 SDK 执行器执行工作流，以便简化执行流程并获得一致的执行结果。

**验收标准**:
1. 系统应当提供 SDKExecutor 类作为执行器
2. 系统应当支持 SDKExecutor.executeWorkflow() 方法执行工作流
3. 系统应当支持 SDKExecutor.executeThread() 方法执行线程
4. 系统应当支持通过依赖注入获取 Services 层的服务
5. 系统应当支持 WorkflowExecutionEngine 集成
6. 系统应当支持 ThreadExecution 集成
7. 系统应当支持 NodeFactory 集成
8. 系统应当返回 WorkflowExecutionResult 结果对象
9. 系统应当返回 ThreadExecutionResult 结果对象
10. 系统应当支持执行结果的错误处理

### 2.8 SDK 主入口

**用户故事**: 作为开发者，我希望通过统一的入口导入所有 SDK 功能，以便简化导入语句。

**验收标准**:
1. 系统应当提供 @graph-agent/sdk 主入口模块
2. 系统应当统一导出所有 Builder API
3. 系统应当统一导出所有函数式 API
4. 系统应当统一导出所有对象创建 API
5. 系统应当统一导出所有核心类型
6. 系统应当统一导出 SDKExecutor
7. 系统应当提供 @graph-agent/sdk/builders 子模块导出 Builder API
8. 系统应当提供 @graph-agent/sdk/functional 子模块导出函数式 API
9. 系统应当提供 @graph-agent/sdk/creators 子模块导出对象创建 API
10. 系统应当提供 @graph-agent/sdk/types 子模块导出类型定义

### 2.9 节点类型支持

**用户故事**: 作为开发者，我希望 SDK 支持所有类型的节点，以便构建各种复杂的工作流。

**验收标准**:
1. 系统应当支持 Start 节点，包含 initialVariables 配置
2. 系统应当支持 End 节点，包含 returnVariables 和 collectResults 配置
3. 系统应当支持 LLM 节点，包含 wrapper、prompt、systemPrompt、temperature、maxTokens、stream 配置
4. 系统应当支持 Tool 节点，包含 toolName、parameters、timeout 配置
5. 系统应当支持 Condition 节点，包含 condition、variables 配置
6. 系统应当支持 Transform 节点，包含 transformType、sourceData、targetVariable、transformConfig 配置
7. 系统应当支持 Fork 节点用于并行执行
8. 系统应当支持 Join 节点用于合并并行结果
9. 系统应当支持 Subworkflow 节点用于引用子工作流
10. 系统应当支持所有节点的 name、description、position 配置

### 2.10 Wrapper 配置支持

**用户故事**: 作为开发者，我希望 SDK 支持所有类型的 Wrapper 配置，以便灵活使用不同的 LLM 资源。

**验收标准**:
1. 系统应当支持 pool 类型 Wrapper，通过 name 引用预定义的 LLM 池
2. 系统应当支持 group 类型 Wrapper，通过 name 引用预定义的 LLM 组
3. 系统应当支持 direct 类型 Wrapper，通过 provider 和 model 直接指定 LLM
4. 系统应当确保 Wrapper 配置与现有配置系统兼容
5. 系统应当支持 Wrapper 配置的类型验证
6. 系统应当支持 Wrapper 配置的错误提示

### 2.11 边类型支持

**用户故事**: 作为开发者，我希望 SDK 支持不同类型的边，以便构建复杂的控制流。

**验收标准**:
1. 系统应当支持简单边，仅包含 from 和 to 节点
2. 系统应当支持条件边，包含 condition 配置
3. 系统应当支持带权重的边，包含 weight 配置
4. 系统应当支持 function 类型的条件边
5. 系统应当支持条件边的 functionId 和 config 配置
6. 系统应当确保边的配置与现有系统兼容

### 2.12 数据转换支持

**用户故事**: 作为开发者，我希望 SDK 支持各种数据转换操作，以便在工作流中处理和转换数据。

**验收标准**:
1. 系统应当支持 map 转换类型
2. 系统应当支持 filter 转换类型
3. 系统应当支持 reduce 转换类型
4. 系统应当支持 sort 转换类型
5. 系统应当支持 group 转换类型
6. 系统应当支持 transformConfig 配置转换参数
7. 系统应当支持 sourceData 和 targetVariable 配置
8. 系统应当确保数据转换与现有系统兼容

### 2.13 错误处理

**用户故事**: 作为开发者，我希望 SDK 提供完善的错误处理机制，以便能够捕获和处理执行过程中的错误。

**验收标准**:
1. 系统应当在执行失败时返回包含错误信息的结果对象
2. 系统应当支持 try-catch 捕获执行异常
3. 系统应当提供清晰的错误消息
4. 系统应当支持错误堆栈跟踪
5. 系统应当支持超时错误的特殊处理
6. 系统应当支持验证错误的特殊处理
7. 系统应当支持执行错误的特殊处理

### 2.14 类型安全

**用户故事**: 作为开发者，我希望 SDK 提供完整的类型安全支持，以便在编译时捕获错误。

**验收标准**:
1. 系统应当为所有 API 提供完整的 TypeScript 类型定义
2. 系统应当支持泛型类型参数
3. 系统应当支持类型推断
4. 系统应当在类型错误时提供清晰的编译错误消息
5. 系统应当支持可选属性的类型检查
6. 系统应当支持联合类型的类型检查
7. 系统应当确保类型定义与实现一致

### 2.15 与配置系统集成

**用户故事**: 作为开发者，我希望 SDK 能够与现有的配置文件系统无缝集成，以便在 SDK 和配置文件之间自由切换。

**验收标准**:
1. 系统应当支持从配置文件加载工作流并转换为 SDK 格式
2. 系统应当支持将 SDK 创建的工作流保存为配置文件
3. 系统应当支持使用 SDK 修改从配置文件加载的工作流
4. 系统应当确保转换过程不丢失配置信息
5. 系统应当确保转换过程保持配置语义
6. 系统应当支持混合使用 SDK 和配置文件

## 3. 非功能需求

### 3.1 性能

**用户故事**: 作为开发者，我希望 SDK 具有良好的性能，以便不会影响工作流的执行效率。

**验收标准**:
1. 系统应当避免不必要的对象转换开销
2. 系统应当支持工作流配置的缓存
3. 系统应当确保适配器转换的性能开销最小化
4. 系统应当支持批量操作优化

### 3.2 可维护性

**用户故事**: 作为开发者，我希望 SDK 代码易于维护和扩展，以便能够快速添加新功能。

**验收标准**:
1. 系统应当遵循项目的分层架构
2. 系统应当遵循项目的代码规范
3. 系统应当提供清晰的代码注释
4. 系统应当使用有意义的命名
5. 系统应当保持代码结构清晰

### 3.3 可测试性

**用户故事**: 作为开发者，我希望 SDK 易于测试，以便能够编写单元测试和集成测试。

**验收标准**:
1. 系统应当支持依赖注入
2. 系统应当提供可模拟的接口
3. 系统应当避免全局状态
4. 系统应当支持测试工具集成
5. 系统应当提供测试辅助函数

### 3.4 兼容性

**用户故事**: 作为开发者，我希望 SDK 与现有系统完全兼容，以便不会破坏现有功能。

**验收标准**:
1. 系统应当与 Domain 层类型兼容
2. 系统应当与 Services 层服务兼容
3. 系统应当与现有配置系统兼容
4. 系统应当支持向后兼容
5. 系统应当不影响现有 API

### 3.5 文档

**用户故事**: 作为开发者，我希望 SDK 提供完整的文档，以便能够快速上手和使用。

**验收标准**:
1. 系统应当提供 API 文档
2. 系统应当提供使用示例
3. 系统应当提供最佳实践指南
4. 系统应当提供类型定义文档
5. 系统应当提供迁移指南

## 4. 约束条件

### 4.1 架构约束

1. SDK 必须位于 Application 层
2. SDK 只能依赖 Services 层
3. SDK 不能直接依赖 Domain 层或 Infrastructure 层
4. 所有领域对象必须通过 Services 层获取或创建

### 4.2 技术约束

1. SDK 必须使用 TypeScript 实现
2. SDK 必须支持 Node.js v22.14.0
3. SDK 必须遵循项目的代码规范
4. SDK 必须通过类型检查

### 4.3 兼容性约束

1. SDK 必须与现有配置系统兼容
2. SDK 必须支持向后兼容
3. SDK 不能破坏现有功能
4. SDK 必须支持渐进式迁移

## 5. 依赖关系

### 5.1 内部依赖

1. Services 层的 WorkflowExecutionEngine
2. Services 层的 ThreadExecution
3. Services 层的 NodeFactory
4. Services 层的 WorkflowManagement
5. Domain 层的类型定义

### 5.2 外部依赖

1. TypeScript 类型系统
2. Node.js 运行时环境

## 6. 成功标准

1. 开发者能够使用 SDK 创建所有类型的工作流
2. SDK 支持三种 API 风格（Builder、函数式、对象创建）
3. SDK 与现有配置系统完全兼容
4. SDK 提供完整的类型安全支持
5. SDK 通过所有单元测试和集成测试
6. SDK 提供完整的文档和示例
7. SDK 不影响现有功能的正常运行