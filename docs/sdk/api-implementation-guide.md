# SDK API层实现建议

## 一、实现优先级

### 第一阶段：核心执行能力（必须实现）

#### 1. ThreadExecutorAPI（主执行入口）
**实现要点：**
- 封装ThreadExecutor，提供简洁的执行接口
- 支持workflowId和workflowDefinition两种执行方式
- 提供执行选项配置（timeout、maxSteps等）
- 返回ThreadResult或Thread对象

**核心方法：**
```typescript
executeWorkflow(workflowId: string, options?: ExecuteOptions): Promise<ThreadResult>
executeWorkflowFromDefinition(workflow: WorkflowDefinition, options?: ExecuteOptions): Promise<ThreadResult>
executeThread(threadId: string): Promise<ThreadResult>
```

**实现建议：**
- 使用ThreadExecutor作为底层执行引擎
- 提供执行进度回调
- 支持执行取消机制

---

#### 2. WorkflowRegistryAPI（工作流管理）
**实现要点：**
- 封装WorkflowRegistry，提供CRUD操作
- 支持版本管理（可选）
- 提供查询和统计功能

**核心方法：**
```typescript
registerWorkflow(workflow: WorkflowDefinition): Promise<void>
registerWorkflows(workflows: WorkflowDefinition[]): Promise<void>
getWorkflow(workflowId: string): Promise<WorkflowDefinition | null>
getWorkflows(filter?: WorkflowFilter): Promise<WorkflowDefinition[]>
updateWorkflow(workflowId: string, workflow: WorkflowDefinition): Promise<void>
deleteWorkflow(workflowId: string): Promise<void>
```

**实现建议：**
- 使用内存存储作为默认实现
- 提供批量注册优化
- 支持工作流定义缓存

---

#### 3. ThreadRegistryAPI（线程管理）
**实现要点：**
- 封装ThreadRegistry，提供线程查询
- 支持状态过滤和分页
- 提供线程统计功能

**核心方法：**
```typescript
getThread(threadId: string): Promise<Thread | null>
getThreads(filter?: ThreadFilter): Promise<Thread[]>
getThreadStatus(threadId: string): Promise<ThreadStatus | null>
getThreadResult(threadId: string): Promise<ThreadResult | null>
deleteThread(threadId: string): Promise<void>
```

**实现建议：**
- 提供线程状态监控
- 支持线程清理机制
- 提供线程执行历史查询

---

#### 4. WorkflowValidatorAPI（验证管理）
**实现要点：**
- 封装WorkflowValidator和NodeValidator
- 提供工作流和节点验证接口
- 返回详细的验证结果

**核心方法：**
```typescript
validateWorkflow(workflow: WorkflowDefinition): Promise<ValidationResult>
validateWorkflowById(workflowId: string): Promise<ValidationResult>
validateNode(node: Node): Promise<ValidationResult>
validateNodes(nodes: Node[]): Promise<ValidationResult>
```

**实现建议：**
- 在注册工作流时自动验证
- 提供验证错误详细信息
- 支持部分验证（仅节点或仅边）

---

### 第二阶段：功能增强（推荐实现）

#### 5. ToolServiceAPI（工具管理）
**实现要点：**
- 封装ToolService和ToolRegistry
- 支持多种工具类型（builtin、native、REST、MCP）
- 提供工具执行和测试接口

**核心方法：**
```typescript
registerTool(tool: Tool): Promise<void>
registerTools(tools: Tool[]): Promise<void>
getTool(toolName: string): Promise<Tool | null>
getTools(filter?: ToolFilter): Promise<Tool[]>
executeTool(toolName: string, parameters: any, options?: ToolOptions): Promise<ToolExecutionResult>
testTool(toolName: string, parameters: any): Promise<ToolTestResult>
```

**实现建议：**
- 提供工具参数验证
- 支持工具执行超时控制
- 提供工具执行日志

---

#### 6. LLMWrapperAPI（LLM调用）
**实现要点：**
- 封装LLMWrapper，提供统一调用接口
- 支持流式和非流式调用
- 提供批量调用能力

**核心方法：**
```typescript
generate(request: LLMRequest): Promise<LLMResult>
generateStream(request: LLMRequest): Promise<AsyncIterable<LLMStreamEvent>>
generateBatch(requests: LLMRequest[]): Promise<LLMResult[]>
```

**实现建议：**
- 支持自动重试机制
- 提供调用统计和监控
- 支持响应缓存

---

#### 7. ProfileManagerAPI（Profile管理）
**实现要点：**
- 封装ProfileManager，提供Profile管理
- 支持多提供商配置
- 提供默认Profile设置

**核心方法：**
```typescript
registerProfile(profile: LLMProfile): Promise<void>
registerProfiles(profiles: LLMProfile[]): Promise<void>
getProfile(profileId: string): Promise<LLMProfile | null>
getProfiles(): Promise<LLMProfile[]>
setDefaultProfile(profileId: string): Promise<void>
getDefaultProfile(): Promise<LLMProfile | null>
```

**实现建议：**
- 提供Profile模板
- 支持Profile导入导出
- 提供Profile验证

---

#### 8. EventManagerAPI（事件监听）
**实现要点：**
- 封装EventManager，仅暴露全局事件
- 提供便捷的事件订阅方法
- 支持事件历史查询

**核心方法：**
```typescript
on(eventType: EventType, listener: EventListener): () => void
onThreadStarted(listener: (event: ThreadStartedEvent) => void): () => void
onThreadCompleted(listener: (event: ThreadCompletedEvent) => void): () => void
onNodeStarted(listener: (event: NodeStartedEvent) => void): () => void
onNodeCompleted(listener: (event: NodeCompletedEvent) => void): () => void
getEvents(filter?: EventFilter): Promise<BaseEvent[]>
```

**实现建议：**
- 提供事件监听器管理
- 支持事件持久化（可选）
- 提供事件统计分析

---

### 第三阶段：状态管理（按需实现）

#### 9. CheckpointManagerAPI（检查点管理）
**实现要点：**
- 封装CheckpointManager，提供状态管理
- 支持多种存储后端
- 提供自动检查点机制

**核心方法：**
```typescript
createCheckpoint(threadId: string, metadata?: CheckpointMetadata): Promise<Checkpoint>
restoreFromCheckpoint(checkpointId: string): Promise<Thread>
getCheckpoint(checkpointId: string): Promise<Checkpoint | null>
getCheckpoints(filter?: CheckpointFilter): Promise<Checkpoint[]>
deleteCheckpoint(checkpointId: string): Promise<void>
enablePeriodicCheckpoints(threadId: string, interval: number): Promise<void>
```

**实现建议：**
- 默认使用内存存储
- 提供文件存储实现
- 支持自定义存储后端

---

#### 10. VariableManagerAPI（变量管理）
**实现要点：**
- 封装VariableManager，提供变量操作
- 支持变量作用域（local、global）
- 提供变量类型验证

**核心方法：**
```typescript
setVariable(threadId: string, variable: ThreadVariable): Promise<void>
setVariables(threadId: string, variables: ThreadVariable[]): Promise<void>
getVariable(threadId: string, name: string): Promise<any>
getVariables(threadId: string): Promise<Record<string, any>>
deleteVariable(threadId: string, name: string): Promise<void>
```

**实现建议：**
- 提供变量变更事件
- 支持变量持久化
- 提供变量导入导出

---

## 二、API组合策略

### 1. 主SDK类（推荐）
```typescript
class SDK {
  // 核心模块
  executor: ThreadExecutorAPI
  workflows: WorkflowRegistryAPI
  threads: ThreadRegistryAPI
  validator: WorkflowValidatorAPI
  
  // 功能模块
  tools: ToolServiceAPI
  llm: LLMWrapperAPI
  profiles: ProfileManagerAPI
  events: EventManagerAPI
  
  // 状态模块
  checkpoints?: CheckpointManagerAPI
  variables?: VariableManagerAPI
  
  constructor(options?: SDKOptions) {
    // 初始化所有模块
  }
}
```

**使用示例：**
```typescript
const sdk = new SDK();

// 注册工作流
await sdk.workflows.registerWorkflow(myWorkflow);

// 执行工作流
const result = await sdk.executor.executeWorkflow('my-workflow');

// 监听事件
sdk.events.onThreadCompleted((event) => {
  console.log(`Thread completed: ${event.threadId}`);
});
```

---

### 2. 独立模块（可选）
```typescript
// 独立使用各模块
const workflowRegistry = new WorkflowRegistryAPI();
const threadExecutor = new ThreadExecutorAPI();
const toolService = new ToolServiceAPI();
```

---

## 三、错误处理策略

### 1. 错误类型定义
```typescript
class SDKError extends Error {
  code: string
  details?: any
}

class ValidationError extends SDKError {
  // 验证错误
}

class ExecutionError extends SDKError {
  // 执行错误
}

class NotFoundError extends SDKError {
  // 资源未找到
}

class TimeoutError extends SDKError {
  // 超时错误
}
```

### 2. 错误处理模式
```typescript
try {
  const result = await sdk.executor.executeWorkflow('workflow-id');
} catch (error) {
  if (error instanceof ValidationError) {
    // 处理验证错误
    console.error('Validation failed:', error.details);
  } else if (error instanceof ExecutionError) {
    // 处理执行错误
    console.error('Execution failed:', error.message);
  } else {
    // 处理其他错误
    console.error('Unexpected error:', error);
  }
}
```

---

## 四、性能优化建议

### 1. 缓存机制
**工作流定义缓存：**
```typescript
class WorkflowRegistryAPI {
  private cache = new Map<string, WorkflowDefinition>();
  
  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    if (this.cache.has(workflowId)) {
      return this.cache.get(workflowId)!;
    }
    
    const workflow = await this.registry.get(workflowId);
    if (workflow) {
      this.cache.set(workflowId, workflow);
    }
    
    return workflow;
  }
}
```

**Profile配置缓存：**
```typescript
class ProfileManagerAPI {
  private cache = new Map<string, LLMProfile>();
  
  getProfile(profileId: string): Promise<LLMProfile | null> {
    if (this.cache.has(profileId)) {
      return Promise.resolve(this.cache.get(profileId)!);
    }
    
    const profile = this.manager.get(profileId);
    if (profile) {
      this.cache.set(profileId, profile);
    }
    
    return Promise.resolve(profile);
  }
}
```

### 2. 批量操作优化
**批量注册优化：**
```typescript
async registerWorkflows(workflows: WorkflowDefinition[]): Promise<void> {
  // 使用Promise.all并行注册
  await Promise.all(
    workflows.map(workflow => this.registerWorkflow(workflow))
  );
}
```

**批量执行优化：**
```typescript
async executeWorkflows(workflowIds: string[]): Promise<ThreadResult[]> {
  // 并行执行多个工作流
  return Promise.all(
    workflowIds.map(id => this.executeWorkflow(id))
  );
}
```

### 3. 连接池管理
**HTTP连接池：**
```typescript
class ToolServiceAPI {
  private httpClient: HttpClient;
  
  constructor() {
    this.httpClient = new HttpClient({
      maxConnections: 10,
      keepAlive: true
    });
  }
}
```

**LLM客户端连接池：**
```typescript
class LLMWrapperAPI {
  private clientPool = new Map<string, LLMClient>();
  
  async generate(request: LLMRequest): Promise<LLMResult> {
    const profile = await this.profiles.getProfile(request.profileId);
    if (!profile) {
      throw new NotFoundError(`Profile not found: ${request.profileId}`);
    }
    
    const clientKey = `${profile.provider}-${profile.model}`;
    if (!this.clientPool.has(clientKey)) {
      this.clientPool.set(clientKey, this.createClient(profile));
    }
    
    const client = this.clientPool.get(clientKey)!;
    return client.generate(request);
  }
}
```

---

## 五、测试策略

### 1. 单元测试
```typescript
describe('ThreadExecutorAPI', () => {
  test('should execute workflow successfully', async () => {
    const api = new ThreadExecutorAPI();
    const result = await api.executeWorkflow('test-workflow');
    
    expect(result.status).toBe('COMPLETED');
    expect(result.output).toBeDefined();
  });
  
  test('should throw ValidationError for invalid workflow', async () => {
    const api = new ThreadExecutorAPI();
    
    await expect(
      api.executeWorkflow('invalid-workflow')
    ).rejects.toThrow(ValidationError);
  });
});
```

### 2. 集成测试
```typescript
describe('SDK Integration', () => {
  test('should complete full workflow execution', async () => {
    const sdk = new SDK();
    
    // 注册工作流
    await sdk.workflows.registerWorkflow(testWorkflow);
    
    // 执行工作流
    const result = await sdk.executor.executeWorkflow('test-workflow');
    
    // 验证结果
    expect(result.status).toBe('COMPLETED');
    expect(result.output).toEqual(expectedOutput);
  });
});
```

### 3. 性能测试
```typescript
describe('Performance Tests', () => {
  test('should handle concurrent workflow execution', async () => {
    const sdk = new SDK();
    const workflowIds = Array.from({ length: 100 }, (_, i) => `workflow-${i}`);
    
    const startTime = Date.now();
    
    await Promise.all(
      workflowIds.map(id => sdk.executor.executeWorkflow(id))
    );
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(10000); // 10秒内完成
  });
});
```

---

## 六、文档要求

### 1. API文档
- 完整的JSDoc注释
- 参数说明和类型定义
- 返回值说明
- 错误类型说明

### 2. 使用指南
- 快速开始教程
- 核心功能示例
- 高级功能教程
- 最佳实践

### 3. 示例代码
- 基础示例（工作流执行）
- 进阶示例（工具调用、LLM调用）
- 高级示例（并行执行、检查点恢复）
- 完整项目示例

---

## 七、部署建议

### 1. 包结构
```
sdk/
├── api/                      # API层
│   ├── sdk.ts               # 主SDK类
│   ├── executor.ts          # 执行API
│   ├── registry.ts          # 注册API
│   ├── tools.ts             # 工具API
│   ├── llm.ts               # LLM API
│   ├── events.ts            # 事件API
│   └── state.ts             # 状态API
├── core/                     # Core层
├── types/                    # 类型定义
└── utils/                    # 工具函数
```

### 2. 发布策略
- 使用语义化版本
- 提供CHANGELOG
- 维护迁移指南
- 提供beta版本

### 3. 兼容性
- 保持向后兼容
- 提供弃用警告
- 支持渐进式升级
- 提供兼容性层
