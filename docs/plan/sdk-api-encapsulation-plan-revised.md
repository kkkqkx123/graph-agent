# SDK API 封装改进计划（修订版）

## 重要说明

经过深入分析应用层需求，重新评估了哪些功能真正应该暴露给API层。

## 核心原则

**API层应该暴露的是"用户需要的功能"，而不是"SDK内部有的功能"**

## 应用层需求分析

### 已有API覆盖的功能

当前SDK API层已经完整覆盖了应用层的核心需求：

1. **执行工作流** - [`ThreadExecutorAPI`](../api/core/thread-executor-api.ts:15)
2. **管理工作流** - [`WorkflowRegistryAPI`](../api/registry/workflow-registry-api.ts:13)
3. **管理线程** - [`ThreadRegistryAPI`](../api/registry/thread-registry-api.ts)
4. **验证工作流** - [`WorkflowValidatorAPI`](../api/validation/workflow-validator-api.ts:16)
5. **管理工具** - [`ToolServiceAPI`](../api/tools/tool-service-api.ts:14)
6. **调用LLM** - [`LLMWrapperAPI`](../api/llm/llm-wrapper-api.ts:29)
7. **管理Profile** - [`ProfileManagerAPI`](../api/llm/profile-manager-api.ts)
8. **监听事件** - [`EventManagerAPI`](../api/management/event-manager-api.ts:30)
9. **管理检查点** - [`CheckpointManagerAPI`](../api/management/checkpoint-manager-api.ts:15)
10. **管理变量** - [`VariableManagerAPI`](../api/management/variable-manager-api.ts)
11. **管理节点模板** - [`NodeRegistryAPI`](../api/registry/node-registry-api.ts)
12. **管理触发器模板** - [`TriggerTemplateRegistryAPI`](../api/registry/trigger-template-registry-api.ts)
13. **管理触发器** - [`TriggerManagerAPI`](../api/management/trigger-manager-api.ts)
14. **LangGraph兼容** - [`StateGraph API`](../api/langgraph-compatible/stategraph-api.ts:149)

### 不需要封装的模块（内部实现细节）

#### 1. HTTP模块
**原因**：
- HTTP模块主要是为了支持REST工具执行，是内部实现细节
- 用户应该通过[`ToolServiceAPI`](../api/tools/tool-service-api.ts:14)来使用工具，而不是直接调用HTTP客户端
- 如果用户需要HTTP功能，应该使用专门的HTTP库（如axios、fetch等）
- SDK专注于工作流执行，不提供通用HTTP客户端功能

**结论**：不需要封装HttpClientAPI

#### 2. Graph模块
**原因**：
- Graph模块主要是为[`WorkflowValidator`](../core/validation/workflow-validator.ts:83)服务的内部实现
- 用户需要的是"验证工作流"，而不是"分析图结构"
- 如果用户需要图分析，应该通过WorkflowValidatorAPI提供验证结果，而不是独立的GraphAnalyzerAPI

**结论**：不需要封装GraphAnalyzerAPI

#### 3. Token统计
**原因**：
- [`TokenUsageTracker`](../core/execution/token-usage-tracker.ts:51)是内部实现，服务于LLM调用和成本控制
- 用户需要的是"查看执行成本"，而不是"管理Token统计器"
- 可以通过ThreadExecutorAPI的执行结果返回Token统计信息

**结论**：不需要封装TokenUsageTrackerAPI

#### 4. Hook系统
**原因**：
- Hook是workflow定义的一部分，通过节点配置定义
- 用户通过WorkflowValidatorAPI验证Hook配置
- Hook的执行是内部机制，不需要用户直接管理

**结论**：不需要封装HookManagerAPI

#### 5. Subgraph功能
**原因**：
- Subgraph是workflow定义的一部分，通过节点类型定义
- 用户通过WorkflowValidatorAPI验证Subgraph配置
- Subgraph的执行是内部机制

**结论**：不需要独立的Subgraph API

#### 6. Execution Context
**原因**：
- ExecutionContext是内部执行上下文，不应该直接暴露
- 用户通过ThreadExecutorAPI间接访问线程状态
- 直接暴露会破坏封装性

**结论**：不需要封装ExecutionContextAPI

### 需要封装的模块

#### MessageManagerAPI - 消息管理API

**原因**：
- 用户需要查看对话历史，用于调试和分析
- 用户需要搜索和过滤消息
- 用户需要导出消息数据
- 这是应用层的真实需求

**建议API设计**：

```typescript
// MessageManagerAPI - 消息管理API
export class MessageManagerAPI {
  // 消息查询
  async getMessages(threadId: string, options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'asc' | 'desc';
  }): Promise<Message[]>
  
  async searchMessages(threadId: string, query: string): Promise<Message[]>
  
  async filterMessages(threadId: string, filter: {
    role?: 'user' | 'assistant' | 'system';
    startTime?: number;
    endTime?: number;
  }): Promise<Message[]>
  
  // 消息统计
  async getMessageStats(threadId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    systemMessages: number;
  }>
  
  async getTokenUsage(threadId: string): Promise<{
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  }>
  
  // 消息导出
  async exportMessages(threadId: string, format: 'json' | 'csv'): Promise<string>
  
  // 消息管理
  async deleteMessages(threadId: string, messageIds: string[]): Promise<void>
  async clearMessages(threadId: string): Promise<void>
}
```

## 实施建议

### 开发顺序
1. **第一阶段**：实现MessageManagerAPI

### 设计原则
- **最小化原则**：只暴露用户真正需要的功能
- **职责清晰**：每个API都有明确的职责边界
- **向后兼容**：新API不应破坏现有功能
- **易用性**：提供简洁、直观的接口

### 技术考虑
- **依赖注入**：MessageManagerAPI应该支持依赖注入，便于测试
- **错误处理**：统一的错误处理机制，使用现有的SDKError体系
- **性能优化**：消息查询应该支持分页和索引
- **文档完整性**：完整的TypeScript类型定义和文档注释

## 预期收益

1. **完善功能**：提供消息管理功能，满足用户调试和分析需求
2. **保持简洁**：避免API膨胀，降低学习成本
3. **职责清晰**：SDK专注于工作流执行核心功能
4. **易于维护**：减少API数量，降低维护成本

## 结论

经过重新分析，**只有一个模块真正需要封装API**：MessageManagerAPI。

其他所有模块都是内部实现细节，不应该暴露给API层。SDK的API层已经完整覆盖了应用层的核心需求，只需要补充消息管理功能即可。

这个修订后的计划更加务实，避免了过度设计，符合"最小化原则"和"职责清晰"的设计理念。