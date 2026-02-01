# 协调器与管理器实现规范

## 文件结构

```
sdk/core/execution/
├── managers/
│   ├── conversation-state-manager.ts    # 新增
│   └── index.ts                         # 更新导出
└── coordinators/
    ├── llm-execution-coordinator.ts     # 新增
    ├── thread-lifecycle-coordinator.ts  # 新增  
    ├── thread-operation-coordinator.ts  # 新增
    ├── thread-variable-coordinator.ts   # 新增
    └── index.ts                         # 更新导出
```

## ConversationStateManager 实现规范

### 职责
- 管理单个 Thread 的对话运行时状态
- 提供状态的快照和恢复功能
- 支持检查点持久化

### 接口设计
```typescript
interface ConversationState {
  messages: LLMMessage[];
  tokenUsage: TokenUsageStats | null;
  currentRequestUsage: TokenUsageStats | null;
}

class ConversationStateManager {
  constructor(threadId: string);
  
  // 状态访问
  getState(): ConversationState;
  getMessages(): LLMMessage[];
  getTokenUsage(): TokenUsageStats | null;
  
  // 状态修改  
  addMessage(message: LLMMessage): void;
  updateTokenUsage(usage: LLMUsage): void;
  accumulateStreamUsage(usage: LLMUsage): void;
  finalizeCurrentRequest(): void;
  
  // 快照功能
  createSnapshot(): ConversationState;
  restoreFromSnapshot(snapshot: ConversationState): void;
}
```

### 设计要点
- 每个 ThreadContext 拥有独立的 ConversationStateManager 实例
- 内部使用 ConversationManager 进行实际的消息管理和 Token 统计
- 对外提供简化的状态接口，隐藏内部实现细节

## LLMExecutionCoordinator 实现规范

### 职责  
- 协调 LLM 调用和工具调用的完整执行流程
- 处理多轮对话循环（LLM → 工具 → LLM）
- 返回最终执行结果

### 接口设计
```typescript
interface LLMExecutionParams {
  threadId: string;
  nodeId: string; 
  prompt: string;
  profileId?: string;
  parameters?: Record<string, any>;
  tools?: any[];
}

interface LLMExecutionResponse {
  success: boolean;
  content?: string;
  error?: Error;
  messages?: LLMMessage[];
}

class LLMExecutionCoordinator {
  constructor(
    private llmExecutor: LLMExecutor,
    private toolService: ToolService
  );
  
  async executeLLM(
    params: LLMExecutionParams,
    conversationState: ConversationStateManager
  ): Promise<LLMExecutionResponse>;
}
```

### 设计要点
- 完全无状态，不持有任何实例变量
- 所有状态通过 conversationState 参数传入
- 工具调用直接委托给 ToolService
- 错误处理统一返回 LLMExecutionResponse

## ThreadLifecycleCoordinator 实现规范

### 职责
- 协调 Thread 的完整生命周期管理
- 处理 Thread 的创建、执行、暂停、恢复、停止等操作
- 管理 Thread 状态转换

### 接口设计
```typescript
class ThreadLifecycleCoordinator {
  constructor(
    private threadRegistry: ThreadRegistry,
    private threadBuilder: ThreadBuilder,
    private threadExecutor: ThreadExecutor,
    private lifecycleManager: ThreadLifecycleManager,
    private eventManager: EventManager
  );
  
  async executeThread(workflowId: string, options: ThreadOptions): Promise<ThreadResult>;
  async pauseThread(threadId: string): Promise<void>;
  async resumeThread(threadId: string): Promise<ThreadResult>;
  async stopThread(threadId: string): Promise<void>;
}
```

### 设计要点
- 高层协调器，组合其他组件完成复杂操作
- 状态管理委托给 ThreadLifecycleManager
- 执行逻辑委托给 ThreadExecutor
- 事件发布通过 EventManager

## ThreadOperationCoordinator 实现规范

### 职责
- 协调 Thread 的结构操作（Fork/Join/Copy）
- 处理 Thread 之间的关系管理
- 触发相关事件

### 接口设计
```typescript
class ThreadOperationCoordinator {
  constructor(
    private threadRegistry: ThreadRegistry,
    private threadBuilder: ThreadBuilder,
    private eventManager: EventManager
  );
  
  async fork(parentThreadId: string, forkConfig: ForkConfig): Promise<string[]>;
  async join(
    parentThreadId: string, 
    childThreadIds: string[], 
    joinStrategy: JoinStrategy, 
    timeout: number
  ): Promise<JoinResult>;
  async copy(sourceThreadId: string): Promise<string>;
}
```

### 设计要点
- 专门处理 Thread 结构变更操作
- 使用现有的 ThreadOperations 工具函数
- 事件触发通过 EventManager 统一处理

## ThreadVariableCoordinator 实现规范

### 职责
- 协调 Thread 变量的设置和查询操作
- 处理变量作用域管理
- 提供统一的变量访问接口

### 接口设计
```typescript
class ThreadVariableCoordinator {
  constructor(private variableManager: VariableManager);
  
  async setVariables(threadContext: ThreadContext, variables: Record<string, any>): Promise<void>;
  getVariables(threadContext: ThreadContext): Record<string, any>;
}
```

### 设计要点
- 封装 VariableManager 的复杂操作
- 提供简化的变量操作接口
- 作用域管理由 VariableManager 内部处理

## ThreadContext 集成规范

### 更新内容
```typescript
class ThreadContext {
  // 新增组件
  public readonly conversationStateManager: ConversationStateManager;
  public readonly llmExecutionCoordinator: LLMExecutionCoordinator;
  public readonly threadLifecycleCoordinator: ThreadLifecycleCoordinator;
  public readonly threadOperationCoordinator: ThreadOperationCoordinator;
  public readonly threadVariableCoordinator: ThreadVariableCoordinator;
  
  constructor(
    thread: Thread,
    threadRegistry: ThreadRegistry,
    workflowRegistry: WorkflowRegistry
  ) {
    // 初始化状态管理器
    this.conversationStateManager = new ConversationStateManager(thread.id);
    this.triggerStateManager = new TriggerStateManager(thread.id);
    
    // 初始化协调器
    this.llmExecutionCoordinator = new LLMExecutionCoordinator(
      LLMExecutor.getInstance(),
      toolService
    );
    
    this.threadLifecycleCoordinator = new ThreadLifecycleCoordinator(
      threadRegistry,
      new ThreadBuilder(workflowRegistry),
      new ThreadExecutor(eventManager, workflowRegistry),
      new ThreadLifecycleManager(eventManager),
      eventManager
    );
    
    // ... 其他协调器初始化
  }
}
```

### 设计要点
- 所有状态管理器和协调器在构造时初始化
- 依赖注入确保组件间的正确依赖关系
- 每个 ThreadContext 拥有完整的执行环境

## 废弃组件清理

### 删除文件
- `sdk/core/execution/llm-coordinator.ts`
- `sdk/core/execution/thread-coordinator.ts`

### 更新引用
- 所有对旧协调器的引用更新为新协调器
- ThreadContext 中移除对旧协调器的依赖
- 相关测试文件更新为使用新架构

## 测试策略

### 单元测试
- 每个管理器和协调器都有独立的单元测试
- 测试覆盖所有公共接口和边界条件
- 使用模拟依赖进行隔离测试

### 集成测试  
- ThreadContext 集成测试验证组件协作
- 端到端测试验证完整执行流程
- 检查点恢复测试验证状态持久化

## 实施优先级

1. **ConversationStateManager** - 基础状态管理组件
2. **LLMExecutionCoordinator** - 核心 LLM 执行逻辑  
3. **ThreadLifecycleCoordinator** - 主要执行入口
4. **ThreadOperationCoordinator** - Thread 结构操作
5. **ThreadVariableCoordinator** - 变量管理
6. **ThreadContext 集成** - 组件组装
7. **废弃组件清理** - 代码清理
8. **测试更新** - 验证实现正确性