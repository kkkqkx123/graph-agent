# SDK实现计划

## 实现阶段

### 第一阶段：Types层（必须）

#### 任务1：基础类型
- [ ] common.ts - ID、Timestamp、Version、Metadata

#### 任务2：核心实体类型
- [ ] workflow.ts - WorkflowDefinition、WorkflowConfig、WorkflowStatus
- [ ] node.ts - Node、NodeType、NodeConfig、NodeStatus
- [ ] edge.ts - Edge、EdgeType、EdgeCondition

#### 任务3：执行相关类型
- [ ] thread.ts - Thread、ThreadStatus、ThreadOptions、ThreadResult
- [ ] execution.ts - ExecutionOptions、ExecutionResult、NodeExecutionResult
- [ ] events.ts - EventType、BaseEvent、各种具体事件类型
- [ ] errors.ts - SDKError、各种具体错误类型

#### 任务4：集成类型
- [ ] tool.ts - Tool、ToolType、ToolParameters、ToolSchema
- [ ] llm.ts - LLMProvider、LLMProfile、LLMRequest、LLMResult、LLMClient
- [ ] checkpoint.ts - Checkpoint、ThreadStateSnapshot

### 第二阶段：Core层 - 执行引擎（必须）

#### 任务5：状态管理
- [ ] state/thread-state.ts - Thread状态管理
- [ ] state/workflow-context.ts - 工作流上下文

#### 任务6：执行引擎
- [ ] execution/workflow-executor.ts - 工作流执行器
- [ ] execution/node-executor.ts - 节点执行器
- [ ] execution/router.ts - 条件路由

#### 任务7：验证
- [ ] validation/workflow-validator.ts - 工作流结构验证

### 第三阶段：Core层 - LLM集成（必须）

#### 任务8：LLM核心
- [ ] llm/wrapper.ts - LLM包装器
- [ ] llm/client-factory.ts - 客户端工厂
- [ ] llm/base-client.ts - LLM客户端基类

#### 任务9：LLM客户端
- [ ] llm/clients/openai.ts - OpenAI客户端
- [ ] llm/clients/anthropic.ts - Anthropic客户端
- [ ] llm/clients/gemini.ts - Gemini客户端
- [ ] llm/clients/mock.ts - Mock客户端

### 第四阶段：Core层 - 工具框架（必须）

#### 任务10：工具核心
- [ ] tools/tool-service.ts - 工具服务
- [ ] tools/executor-base.ts - 执行器基类

#### 任务11：工具执行器
- [ ] tools/executors/builtin.ts - 内置执行器
- [ ] tools/executors/native.ts - 本地执行器
- [ ] tools/executors/rest.ts - REST执行器
- [ ] tools/executors/mcp.ts - MCP执行器

### 第五阶段：API层（必须）

#### 任务12：SDK主类
- [ ] api/sdk.ts - SDK主类
- [ ] api/options.ts - API选项类型
- [ ] api/result.ts - API结果类型

### 第六阶段：Utils层（必须）

#### 任务13：工具函数
- [ ] utils/id-generator.ts - ID生成器
- [ ] utils/error-handler.ts - 错误处理器

### 第七阶段：可选功能（按需）

#### 任务14：检查点
- [ ] core/checkpoint/creation.ts - 检查点创建
- [ ] core/checkpoint/restore.ts - 检查点恢复

## 实现优先级

### P0（必须）
- Types层所有类型
- Core层执行引擎
- Core层LLM集成
- Core层工具框架
- API层SDK主类
- Utils层工具函数

### P1（重要）
- 检查点功能
- 事件系统完善

### P2（可选）
- 高级路由策略
- 性能优化

## 实现顺序建议

1. 先实现Types层，建立类型基础
2. 再实现Core层的状态管理和执行引擎
3. 然后实现LLM和工具集成
4. 最后实现API层和工具函数
5. 可选功能按需实现

## 测试策略

### 单元测试
- 每个类型定义后立即编写测试
- 每个core模块实现后立即编写测试

### 集成测试
- Types层完成后测试类型兼容性
- Core层完成后测试执行流程
- API层完成后测试端到端功能

### 测试覆盖
- 核心执行流程：100%
- LLM集成：80%
- 工具执行：80%
- 边界情况：60%

## 注意事项

1. **类型安全**：充分利用TypeScript类型系统
2. **避免循环依赖**：使用ID引用，不持有对象
3. **职责分离**：SDK专注执行，应用层负责持久化
4. **配置复用**：使用Profile概念避免重复配置
5. **事件驱动**：通过事件提供扩展点
6. **文档完善**：每个模块都要有清晰的文档

## 完成标准

- [ ] 所有类型定义完成并通过类型检查
- [ ] 所有核心功能实现并通过测试
- [ ] API接口简洁易用
- [ ] 文档完整清晰
- [ ] 示例代码可用