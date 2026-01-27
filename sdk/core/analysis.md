现在我已经收集了足够的信息来分析sdk/core/execution目录中各个模块的依赖关系和依赖获取方式。让我整理一下分析结果：

模块依赖关系分析
1. 核心执行模块
ThreadExecutor (thread-executor.ts)

依赖获取方式：构造函数参数 + 内部创建
依赖：WorkflowRegistry(可选参数)、ThreadRegistry(内部创建)、ThreadBuilder(内部创建)、Router(内部创建)、EventManager(内部创建)、ThreadLifecycleManager(内部创建)、ThreadCoordinator(内部创建)、TriggerManager(内部创建)
问题：循环依赖 - ThreadCoordinator依赖ThreadExecutor，而ThreadExecutor又创建ThreadCoordinator
ThreadCoordinator (thread-coordinator.ts)

依赖获取方式：构造函数注入
依赖：ThreadRegistry、ThreadBuilder、ThreadExecutor、EventManager
问题：与ThreadExecutor形成循环依赖
ThreadBuilder (thread-builder.ts)

依赖获取方式：构造函数注入 + 内部创建
依赖：WorkflowRegistry(构造函数)、VariableManager(内部创建)
问题：在build方法中创建ConversationManager和LLMExecutor，耦合度高
ThreadContext (thread-context.ts)

依赖获取方式：构造函数注入
依赖：Thread、WorkflowContext、LLMExecutor
问题：持有LLMExecutor实例，但LLMExecutor又依赖ConversationManager
2. 管理器模块
WorkflowRegistry (workflow-registry.ts)

依赖获取方式：内部创建
依赖：WorkflowValidator(内部创建)
问题：无
ThreadRegistry (thread-registry.ts)

依赖获取方式：无依赖
问题：无
EventManager (event-manager.ts)

依赖获取方式：无依赖
问题：无
VariableManager (variable-manager.ts)

依赖获取方式：无依赖
问题：无
Router (router.ts)

依赖获取方式：无依赖
问题：无
TriggerManager (trigger-manager.ts)

依赖获取方式：构造函数注入
依赖：EventManager、ThreadExecutor、ThreadBuilder
问题：依赖ThreadExecutor导致耦合
ThreadLifecycleManager (thread-lifecycle-manager.ts)

依赖获取方式：构造函数注入
依赖：EventManager
问题：无
ConversationManager (conversation-manager.ts)

依赖获取方式：构造函数参数
依赖：无(仅配置选项)
问题：无
LLMExecutor (llm-executor.ts)

依赖获取方式：构造函数注入 + 内部创建
依赖：ConversationManager(构造函数)、LLMWrapper(内部创建)、ToolService(内部创建)
问题：内部创建LLMWrapper和ToolService，难以测试和配置
CheckpointManager (checkpoint/checkpoint-manager.ts)

依赖获取方式：构造函数参数 + 内部创建
依赖：CheckpointStorage(可选参数)、ThreadRegistry(可选参数)、ThreadBuilder(可选参数)、WorkflowRegistry(可选参数)、VariableManager(内部创建)
问题：依赖过多，且很多是可选参数导致内部创建
3. 执行器模块
NodeExecutorFactory (executors/node-executor-factory.ts)

依赖获取方式：静态方法 + 静态映射
依赖：各种NodeExecutor类(静态导入)
问题：使用静态映射，难以扩展和测试
BaseNodeExecutor (executors/node/base-node-executor.ts)

依赖获取方式：无依赖
问题：无
LLMNodeExecutor (executors/node/llm-node-executor.ts)

依赖获取方式：继承
依赖：NodeExecutor
问题：无
主要问题和风险点
循环依赖：ThreadExecutor ↔ ThreadCoordinator
过度耦合：ThreadExecutor知道并创建太多组件
内部创建依赖：很多组件在内部创建依赖，不符合依赖注入原则
静态工厂：NodeExecutorFactory使用静态映射，难以测试和扩展
依赖链路过长：ThreadExecutor → ThreadCoordinator → ThreadExecutor
可选参数导致内部创建：CheckpointManager的构造函数参数都是可选的，导致内部创建依赖
让我继续完成分析并生成报告。