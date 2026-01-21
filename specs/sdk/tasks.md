# Graph Agent SDK 实施计划

## 概述

本文档将 SDK 设计转换为一系列可执行的编码任务。每个任务都是具体的、可操作的，并且引用了需求文档中的具体需求。

## 实施任务

### 1. 核心类型模块

- [ ] 1.1 创建 SDK 类型定义模块
  - 创建 `src/application/sdk/types/index.ts` 文件
  - 从 Service 层导入并导出所有配置类型（`NodeConfig`、`WorkflowConfigData`、`EdgeConfig` 等）
  - 定义 SDK 特有的类型（`SDKConfig`、`ThreadConfig`）
  - 添加完整的 TypeScript 类型注释和 JSDoc
  - 引用需求：2.1 核心类型系统

- [ ] 1.2 创建 SDK 配置接口
  - 在 `src/application/sdk/types/index.ts` 中定义 `SDKConfig` 接口
  - 包含 `enableLogging`、`defaultTimeout`、`defaultCheckpointInterval` 属性
  - 添加默认值和类型验证
  - 引用需求：2.1 核心类型系统

- [ ] 1.3 创建 Thread 配置接口
  - 在 `src/application/sdk/types/index.ts` 中定义 `ThreadConfig` 接口
  - 包含 `id`、`workflow`、`inputData`、`options` 属性
  - 定义 `options` 的详细类型（`enableCheckpoints`、`checkpointInterval`、`timeout`、`maxSteps`）
  - 引用需求：2.5 Thread 执行 API

### 2. Builder API

- [ ] 2.1 实现 WorkflowBuilder 类
  - 创建 `src/application/sdk/builders/workflow-builder.ts` 文件
  - 实现 `WorkflowBuilder` 类，包含私有属性 `config`、`nodes`、`edges`
  - 实现静态方法 `create(id: string)` 创建构建器实例
  - 实现链式方法：`name()`、`description()`、`type()`、`status()`、`addNode()`、`addEdge()`、`addTag()`、`metadata()`
  - 实现 `build()` 方法返回 `WorkflowConfigData`
  - 添加完整的类型推断和类型安全
  - 引用需求：2.2 Builder API

- [ ] 2.2 实现 NodeBuilder 类
  - 创建 `src/application/sdk/builders/node-builder.ts` 文件
  - 实现 `NodeBuilder` 类，包含私有属性 `config`
  - 实现静态方法：`start()`、`llm()`、`tool()`、`condition()`、`transform()`、`contextProcessor()`、`end()`
  - 实现所有节点的配置方法（`name()`、`description()`、`position()` 等）
  - 实现特定节点的配置方法（如 LLM 节点的 `wrapperConfig()`、`prompt()`、`temperature()` 等）
  - 实现 `build()` 方法返回 `NodeConfig`
  - 添加类型守卫确保类型安全
  - 引用需求：2.2 Builder API

- [ ] 2.3 实现 EdgeBuilder 类
  - 创建 `src/application/sdk/builders/edge-builder.ts` 文件
  - 实现 `EdgeBuilder` 类，包含私有属性 `config`
  - 实现静态方法 `create()` 创建构建器实例
  - 实现链式方法：`from()`、`to()`、`type()`、`condition()`、`weight()`、`properties()`
  - 实现 `build()` 方法返回 `EdgeConfig`
  - 添加边配置的验证逻辑
  - 引用需求：2.2 Builder API

- [ ] 2.4 实现 ThreadBuilder 类
  - 创建 `src/application/sdk/builders/thread-builder.ts` 文件
  - 实现 `ThreadBuilder` 类，包含私有属性 `config`
  - 实现静态方法 `create(id: string)` 创建构建器实例
  - 实现链式方法：`workflow()`、`inputData()`、`options()`
  - 实现 `build()` 方法返回 `ThreadConfig`
  - 添加线程配置的验证逻辑
  - 引用需求：2.5 Thread 执行 API

### 3. 函数式 API

- [ ] 3.1 实现 workflow 函数
  - 创建 `src/application/sdk/functional/workflow.ts` 文件
  - 实现 `workflow()` 函数，接收 `id` 和配置对象
  - 返回 `WorkflowConfigData` 对象
  - 添加参数验证和类型检查
  - 引用需求：2.3 函数式 API

- [ ] 3.2 实现 node 函数集合
  - 创建 `src/application/sdk/functional/node.ts` 文件
  - 实现 `node` 对象，包含所有节点类型的创建函数
  - 实现 `start()`、`llm()`、`tool()`、`condition()`、`transform()`、`contextProcessor()`、`end()` 函数
  - 每个函数接收 `id` 和可选的配置对象
  - 返回对应的 `NodeConfig` 对象
  - 添加类型守卫确保类型安全
  - 引用需求：2.3 函数式 API

- [ ] 3.3 实现 edge 函数
  - 创建 `src/application/sdk/functional/edge.ts` 文件
  - 实现 `edge()` 函数，接收 `from`、`to` 和可选配置
  - 返回 `EdgeConfig` 对象
  - 添加参数验证
  - 引用需求：2.3 函数式 API

- [ ] 3.4 实现 pipe 函数
  - 创建 `src/application/sdk/functional/operators.ts` 文件
  - 实现 `pipe()` 函数，接收多个节点配置
  - 自动创建线性工作流，连接所有节点
  - 返回 `WorkflowConfigData` 对象
  - 添加节点连接的验证逻辑
  - 引用需求：2.3 函数式 API

- [ ] 3.5 实现高阶函数
  - 在 `src/application/sdk/functional/operators.ts` 中实现高阶函数
  - 实现 `map()` 函数，对数组进行映射
  - 实现 `filter()` 函数，对数组进行过滤
  - 实现 `reduce()` 函数，对数组进行归约
  - 添加类型推断和类型安全
  - 引用需求：2.3 函数式 API

- [ ] 3.6 创建函数式 API 统一导出
  - 创建 `src/application/sdk/functional/index.ts` 文件
  - 导出所有函数式 API（`workflow`、`node`、`edge`、`pipe`、`map`、`filter`、`reduce`）
  - 添加完整的类型导出
  - 引用需求：2.3 函数式 API

### 4. 对象创建 API

- [ ] 4.1 实现 createWorkflow 函数
  - 创建 `src/application/sdk/creators/workflow.ts` 文件
  - 实现 `createWorkflow()` 函数，接收 `WorkflowConfigData`
  - 返回配置对象的深拷贝
  - 添加配置验证
  - 引用需求：2.4 对象创建 API

- [ ] 4.2 实现 createNode 函数集合
  - 创建 `src/application/sdk/creators/node.ts` 文件
  - 实现 `createNode` 对象，包含所有节点类型的创建函数
  - 实现 `start()`、`llm()`、`tool()`、`condition()`、`transform()`、`contextProcessor()`、`end()` 函数
  - 实现快速创建方法：`quickLLM()`、`quickTool()`、`quickBranch()`
  - 添加参数验证和默认值处理
  - 引用需求：2.4 对象创建 API

- [ ] 4.3 实现 createEdge 函数
  - 创建 `src/application/sdk/creators/edge.ts` 文件
  - 实现 `createEdge()` 函数，接收 `from`、`to` 和可选配置
  - 返回 `EdgeConfig` 对象
  - 添加参数验证
  - 引用需求：2.4 对象创建 API

- [ ] 4.4 创建对象创建 API 统一导出
  - 创建 `src/application/sdk/creators/index.ts` 文件
  - 导出所有对象创建 API（`createWorkflow`、`createNode`、`createEdge`）
  - 添加完整的类型导出
  - 引用需求：2.4 对象创建 API

### 5. 执行器模块

- [ ] 5.1 实现 SDKExecutor 类
  - 创建 `src/application/sdk/executor/sdk-executor.ts` 文件
  - 实现 `SDKExecutor` 类，通过依赖注入接收 `WorkflowBuilder`、`WorkflowExecutionEngine`、`ThreadExecution`、`Logger`
  - 实现 `executeWorkflow()` 方法，接收 `WorkflowConfigData` 和输入数据
  - 实现 `executeThread()` 方法，接收 `ThreadConfig`
  - 添加错误处理和日志记录
  - 添加执行超时控制
  - 引用需求：2.7 执行器

- [ ] 5.2 实现 ExecutionContext 类
  - 创建 `src/application/sdk/executor/execution-context.ts` 文件
  - 实现 `ExecutionContext` 类，管理执行上下文
  - 实现 `create()` 静态方法创建上下文实例
  - 实现 `getVariable()`、`setVariable()`、`getVariables()` 方法
  - 实现 `getExecutionId()`、`getWorkflowId()` 方法
  - 添加变量作用域管理
  - 引用需求：2.7 执行器

### 6. 工具函数模块

- [ ] 6.1 实现 Validators 类
  - 创建 `src/application/sdk/utils/validators.ts` 文件
  - 实现 `Validators` 类，提供配置验证功能
  - 实现 `validateWorkflowConfig()` 方法，验证工作流配置
  - 实现 `validateNodeConfig()` 方法，验证节点配置
  - 实现 `validateEdgeConfig()` 方法，验证边配置
  - 返回详细的验证结果和错误信息
  - 引用需求：2.13 错误处理

- [ ] 6.2 实现 Helpers 类
  - 创建 `src/application/sdk/utils/helpers.ts` 文件
  - 实现 `Helpers` 类，提供辅助功能
  - 实现 `generateId()` 方法，生成唯一 ID
  - 实现 `deepClone()` 方法，深拷贝对象
  - 实现 `mergeDeep()` 方法，深度合并对象
  - 添加完整的类型支持
  - 引用需求：2.7 执行器

- [ ] 6.3 创建工具函数统一导出
  - 创建 `src/application/sdk/utils/index.ts` 文件
  - 导出所有工具函数（`Validators`、`Helpers`）
  - 添加完整的类型导出
  - 引用需求：2.7 执行器

### 7. 错误处理

- [ ] 7.1 实现 SDK 错误类
  - 创建 `src/application/sdk/errors.ts` 文件
  - 实现 `SDKError` 基类，继承自 `Error`
  - 实现 `ValidationError` 类，用于验证错误
  - 实现 `BuildError` 类，用于构建错误
  - 实现 `ExecutionError` 类，用于执行错误
  - 添加错误代码和详细信息支持
  - 引用需求：2.13 错误处理

### 8. SDK 主入口

- [ ] 8.1 创建 SDK 主入口文件
  - 创建 `src/application/sdk/index.ts` 文件
  - 导出所有 Builder API（`WorkflowBuilder`、`NodeBuilder`、`EdgeBuilder`、`ThreadBuilder`）
  - 导出所有函数式 API（`workflow`、`node`、`edge`、`pipe`、`map`、`filter`、`reduce`）
  - 导出所有对象创建 API（`createWorkflow`、`createNode`、`createEdge`）
  - 导出执行器（`SDKExecutor`、`ExecutionContext`）
  - 导出所有类型（从 `types/index.ts`）
  - 导出工具函数（`Validators`、`Helpers`）
  - 导出错误类（`SDKError`、`ValidationError`、`BuildError`、`ExecutionError`）
  - 添加完整的 JSDoc 注释和使用示例
  - 引用需求：2.8 SDK 主入口

### 9. 单元测试

- [ ] 9.1 编写 WorkflowBuilder 单元测试
  - 创建 `src/application/sdk/builders/__tests__/workflow-builder.test.ts` 文件
  - 测试基本工作流创建
  - 测试链式方法调用
  - 测试节点和边的添加
  - 测试标签和元数据设置
  - 测试错误处理
  - 确保测试覆盖率 ≥ 80%
  - 引用需求：2.2 Builder API

- [ ] 9.2 编写 NodeBuilder 单元测试
  - 创建 `src/application/sdk/builders/__tests__/node-builder.test.ts` 文件
  - 测试所有节点类型的创建
  - 测试所有配置方法
  - 测试类型安全
  - 测试错误处理
  - 确保测试覆盖率 ≥ 80%
  - 引用需求：2.2 Builder API

- [ ] 9.3 编写 EdgeBuilder 单元测试
  - 创建 `src/application/sdk/builders/__tests__/edge-builder.test.ts` 文件
  - 测试边的创建
  - 测试所有配置方法
  - 测试条件边和权重边
  - 测试错误处理
  - 确保测试覆盖率 ≥ 80%
  - 引用需求：2.2 Builder API

- [ ] 9.4 编写函数式 API 单元测试
  - 创建 `src/application/sdk/functional/__tests__/index.test.ts` 文件
  - 测试 `workflow()` 函数
  - 测试 `node` 函数集合
  - 测试 `edge()` 函数
  - 测试 `pipe()` 函数
  - 测试高阶函数（`map`、`filter`、`reduce`）
  - 确保测试覆盖率 ≥ 80%
  - 引用需求：2.3 函数式 API

- [ ] 9.5 编写对象创建 API 单元测试
  - 创建 `src/application/sdk/creators/__tests__/index.test.ts` 文件
  - 测试 `createWorkflow()` 函数
  - 测试 `createNode` 函数集合
  - 测试 `createEdge()` 函数
  - 测试快速创建方法
  - 确保测试覆盖率 ≥ 80%
  - 引用需求：2.4 对象创建 API

- [ ] 9.6 编写 SDKExecutor 单元测试
  - 创建 `src/application/sdk/executor/__tests__/sdk-executor.test.ts` 文件
  - 测试工作流执行
  - 测试线程执行
  - 测试错误处理
  - 测试超时控制
  - 使用 mock 对象模拟依赖
  - 确保测试覆盖率 ≥ 80%
  - 引用需求：2.7 执行器

- [ ] 9.7 编写工具函数单元测试
  - 创建 `src/application/sdk/utils/__tests__/index.test.ts` 文件
  - 测试 `Validators` 类的所有方法
  - 测试 `Helpers` 类的所有方法
  - 测试边界情况和错误处理
  - 确保测试覆盖率 ≥ 80%
  - 引用需求：2.7 执行器

### 10. 集成测试

- [ ] 10.1 编写 SDK 集成测试
  - 创建 `src/application/sdk/__tests__/integration.test.ts` 文件
  - 测试使用 Builder API 创建和执行完整工作流
  - 测试使用函数式 API 创建和执行完整工作流
  - 测试使用对象创建 API 创建和执行完整工作流
  - 测试复杂工作流（包含条件分支、循环等）
  - 测试错误处理和恢复
  - 确保测试覆盖率 ≥ 60%
  - 引用需求：2.15 与配置系统集成

- [ ] 10.2 编写与配置文件集成的测试
  - 创建 `src/application/sdk/__tests__/config-integration.test.ts` 文件
  - 测试从配置文件加载工作流
  - 测试使用 SDK 修改配置文件加载的工作流
  - 测试将 SDK 创建的工作流保存为配置文件
  - 测试混合使用配置文件和 SDK
  - 确保测试覆盖率 ≥ 60%
  - 引用需求：2.15 与配置系统集成

### 11. 文档和示例

- [ ] 11.1 编写 API 文档
  - 在 `src/application/sdk/` 目录下创建 `README.md` 文件
  - 编写完整的 API 文档，包括所有公共接口
  - 添加使用示例和最佳实践
  - 添加类型定义说明
  - 引用需求：3.5 文档

- [ ] 11.2 创建快速开始示例
  - 创建 `examples/sdk/quick-start.ts` 文件
  - 展示如何初始化 SDK
  - 展示如何创建简单工作流
  - 展示如何执行工作流
  - 添加详细的注释
  - 引用需求：3.5 文档

- [ ] 11.3 创建 Builder API 示例
  - 创建 `examples/sdk/builder-api.ts` 文件
  - 展示简单对话工作流
  - 展示带工具调用的工作流
  - 展示数据转换工作流
  - 展示使用 Pool 和 Group 的工作流
  - 添加详细的注释
  - 引用需求：3.5 文档

- [ ] 11.4 创建函数式 API 示例
  - 创建 `examples/sdk/functional-api.ts` 文件
  - 展示基础函数式工作流
  - 展示使用管道操作符
  - 展示高阶函数组合
  - 展示条件分支函数式实现
  - 添加详细的注释
  - 引用需求：3.5 文档

- [ ] 11.5 创建对象创建 API 示例
  - 创建 `examples/sdk/creators-api.ts` 文件
  - 展示简单对象创建
  - 展示快速创建常用节点
  - 展示动态构建工作流
  - 添加详细的注释
  - 引用需求：3.5 文档

- [ ] 11.6 创建 Thread 执行示例
  - 创建 `examples/sdk/thread-execution.ts` 文件
  - 展示基本 Thread 执行
  - 展示从检查点恢复
  - 展示监控执行进度
  - 展示取消执行
  - 添加详细的注释
  - 引用需求：2.5 Thread 执行 API

- [ ] 11.7 创建高级用法示例
  - 创建 `examples/sdk/advanced-usage.ts` 文件
  - 展示并行执行
  - 展示错误处理
  - 展示循环执行
  - 展示子工作流引用
  - 添加详细的注释
  - 引用需求：2.9 节点类型支持

### 12. 类型检查和代码质量

- [ ] 12.1 运行 TypeScript 类型检查
  - 运行 `tsc --noEmit` 检查所有类型错误
  - 修复所有类型错误
  - 确保类型覆盖率 100%
  - 引用需求：2.14 类型安全

- [ ] 12.2 运行 ESLint 检查
  - 运行 ESLint 检查代码质量
  - 修复所有 ESLint 错误和警告
  - 确保代码符合项目规范
  - 引用需求：3.2 可维护性

- [ ] 12.3 运行所有测试
  - 运行所有单元测试
  - 运行所有集成测试
  - 确保所有测试通过
  - 确保测试覆盖率达标
  - 引用需求：3.3 可测试性

### 13. 依赖注入配置

- [ ] 13.1 配置 SDKExecutor 的依赖注入
  - 在 `src/di/` 目录下更新依赖注入配置
  - 注册 `SDKExecutor` 为可注入的服务
  - 配置所有依赖项（`WorkflowBuilder`、`WorkflowExecutionEngine`、`ThreadExecution`、`Logger`）
  - 添加生命周期管理
  - 引用需求：2.7 执行器

### 14. 性能优化

- [ ] 14.1 实现配置缓存
  - 在 `SDKExecutor` 中实现配置缓存机制
  - 缓存已构建的工作流
  - 添加缓存失效策略
  - 添加性能监控
  - 引用需求：3.1 性能

- [ ] 14.2 优化类型推断
  - 优化 TypeScript 类型推断性能
  - 减少不必要的类型计算
  - 添加类型缓存
  - 引用需求：3.1 性能

### 15. 最终验证

- [ ] 15.1 验证所有需求已实现
  - 对照需求文档检查所有需求是否已实现
  - 确保所有验收标准都已满足
  - 记录任何未实现的需求
  - 引用需求：所有需求

- [ ] 15.2 验证架构一致性
  - 检查 SDK 是否严格遵循分层架构
  - 确保只依赖 Services 层
  - 确保不直接依赖 Domain 层或 Infrastructure 层
  - 引用需求：4.1 架构约束

- [ ] 15.3 验证类型安全
  - 检查所有公共 API 是否有完整的类型定义
  - 确保类型推断正常工作
  - 确保没有 `any` 类型滥用
  - 引用需求：2.14 类型安全

- [ ] 15.4 验证兼容性
  - 测试与现有配置系统的兼容性
  - 测试与现有 Service 层的兼容性
  - 确保不影响现有功能
  - 引用需求：2.15 与配置系统集成

## 任务统计

- 总任务数：60
- 核心功能任务：30
- 测试任务：10
- 文档任务：7
- 质量保证任务：13

## 实施顺序建议

1. **阶段一**：核心类型模块（任务 1.1-1.3）
2. **阶段二**：Builder API（任务 2.1-2.4）
3. **阶段三**：函数式 API（任务 3.1-3.6）
4. **阶段四**：对象创建 API（任务 4.1-4.4）
5. **阶段五**：执行器模块（任务 5.1-5.2）
6. **阶段六**：工具函数和错误处理（任务 6.1-6.3, 7.1）
7. **阶段七**：SDK 主入口（任务 8.1）
8. **阶段八**：单元测试（任务 9.1-9.7）
9. **阶段九**：集成测试（任务 10.1-10.2）
10. **阶段十**：文档和示例（任务 11.1-11.7）
11. **阶段十一**：类型检查和代码质量（任务 12.1-12.3）
12. **阶段十二**：依赖注入配置（任务 13.1）
13. **阶段十三**：性能优化（任务 14.1-14.2）
14. **阶段十四**：最终验证（任务 15.1-15.4）

## 注意事项

1. **增量开发**：每个阶段完成后都应该可以运行和测试
2. **测试驱动**：在实现功能之前先编写测试
3. **类型安全**：确保所有代码都有完整的类型定义
4. **文档同步**：在实现功能的同时更新文档
5. **性能监控**：在开发过程中关注性能指标
6. **错误处理**：确保所有错误都有适当的处理和日志记录