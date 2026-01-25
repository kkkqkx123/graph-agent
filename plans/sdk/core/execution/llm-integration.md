# ThreadExecutor 与 LLM 模块集成分析

## LLM 模块组件概览

### 1. LLMWrapper
**职责**：
- 提供统一的 LLM 调用接口
- 管理 LLM Profile 配置
- 协调客户端创建和请求执行
- 处理响应时间统计

**生命周期**：全局单例

### 2. Conversation
**职责**：
- 管理消息历史
- 执行单次 LLM 调用
- 执行工具调用
- Token 统计和压缩事件触发

**生命周期**：每个 thread 一个实例
**线程安全**：Conversation 为单个 thread 设计，thread 串行执行，天然线程安全

### 3. ToolRunner
**职责**：
- 自动处理工具调用循环
- 管理迭代控制
- 缓存优化
- 流式响应处理

**生命周期**：每个 LLM 节点一个实例

### 4. ToolService
**职责**：
- 工具注册和管理
- 工具执行
- 工具更新

**生命周期**：全局单例
**线程安全**：ToolService 是线程安全的，支持并发调用

## 集成架构

### 层次结构

```
ThreadExecutor (全局单例)
    ├── LLMWrapper (全局单例)
    │   ├── ProfileManager
    │   └── ClientFactory
    │
    └── Thread (每个 thread 一个实例)
        ├── Conversation (存储在 thread.contextData 中)
        │   ├── LLMWrapper (引用)
        │   └── ToolService (引用)
        │
        └── NodeExecutor (每个节点类型一个实例)
            └── ToolRunner (每个 LLM 节点执行时创建)
                └── Conversation (引用)
```

### 依赖关系

```
ThreadExecutor
    ├── 依赖 LLMWrapper
    ├── 依赖 ToolService
    └── 管理 Conversation 实例

Conversation
    ├── 依赖 LLMWrapper
    └── 依赖 ToolService

ToolRunner
    └── 依赖 Conversation

LLMNodeExecutor
    └── 依赖 ThreadExecutor (获取 Conversation)
```

## 集成方案

### 1. ThreadExecutor 初始化

```typescript
export class ThreadExecutor {
  private llmWrapper: LLMWrapper;
  private toolService: ToolService;

  constructor() {
    this.llmWrapper = new LLMWrapper();
    this.toolService = new ToolService();
    // ... 其他初始化
  }

  /**
   * 获取 LLMWrapper
   */
  getLLMWrapper(): LLMWrapper {
    return this.llmWrapper;
  }

  /**
   * 获取 ToolService
   */
  getToolService(): ToolService {
    return this.toolService;
  }
}
```

### 2. Conversation 管理

#### 创建 Conversation

在 `createThreadFromWorkflow` 方法中创建 Conversation：

```typescript
private createThreadFromWorkflow(workflow: WorkflowDefinition, options: ThreadOptions = {}): Thread {
  // ... 创建 thread

  // 创建 Conversation 实例
  const conversation = new Conversation(
    this.llmWrapper,
    this.toolService,
    {
      tokenLimit: options.tokenLimit || 4000,
      eventCallbacks: {
        onTokenLimitExceeded: async (tokensUsed, tokenLimit) => {
          // 触发事件
          await this.eventManager.emit({
            type: EventType.TOKEN_LIMIT_EXCEEDED,
            timestamp: Date.now(),
            workflowId: thread.workflowId,
            threadId: thread.id,
            tokensUsed,
            tokenLimit
          });
        }
      }
    }
  );

  // 存储 Conversation 到 thread.contextData
  thread.contextData = {
    conversation
  };

  return thread;
}
```

#### 获取 Conversation

```typescript
/**
 * 获取 thread 的 Conversation 实例
 * @param thread Thread 实例
 * @returns Conversation 实例
 */
getConversation(thread: Thread): Conversation {
  const conversation = thread.contextData?.conversation as Conversation;
  if (!conversation) {
    throw new Error('Conversation not found in thread context data');
  }
  return conversation;
}
```

### 3. LLMNodeExecutor 实现

```typescript
export class LLMNodeExecutor extends NodeExecutor {
  constructor(private threadExecutor: ThreadExecutor) {
    super();
  }

  protected async doExecute(thread: Thread, node: Node): Promise<any> {
    // 获取 Conversation
    const conversation = this.threadExecutor.getConversation(thread);

    // 获取节点配置
    const config = node.config as LLMNodeConfig;

    // 添加用户消息
    if (config.prompt) {
      conversation.addMessage({
        role: 'user',
        content: config.prompt
      });
    }

    // 创建 ToolRunner
    const toolRunner = new ToolRunner(conversation, {
      onToolCall: (toolCall) => {
        // 触发工具调用事件
        this.threadExecutor.getEventManager().emit({
          type: EventType.TOOL_CALLED,
          timestamp: Date.now(),
          workflowId: thread.workflowId,
          threadId: thread.id,
          nodeId: node.id,
          toolId: toolCall.function.name,
          parameters: JSON.parse(toolCall.function.arguments)
        });
      },
      onToolResult: (result) => {
        // 触发工具完成事件
        this.threadExecutor.getEventManager().emit({
          type: EventType.TOOL_COMPLETED,
          timestamp: Date.now(),
          workflowId: thread.workflowId,
          threadId: thread.id,
          nodeId: node.id,
          toolId: result.toolCallId,
          output: result.result,
          executionTime: 0
        });
      }
    });

    // 设置最大迭代次数
    if (config.maxIterations) {
      toolRunner.updateMaxIterations(config.maxIterations);
    }

    // 执行工具调用循环
    const finalMessage = await toolRunner.runUntilDone();

    // 返回结果
    return {
      content: finalMessage.content,
      toolCalls: finalMessage.toolCalls,
      usage: conversation.getTokenUsage()
    };
  }
}
```

### 4. ToolNodeExecutor 实现

```typescript
export class ToolNodeExecutor extends NodeExecutor {
  constructor(private threadExecutor: ThreadExecutor) {
    super();
  }

  protected async doExecute(thread: Thread, node: Node): Promise<any> {
    // 获取 ToolService
    const toolService = this.threadExecutor.getToolService();

    // 获取节点配置
    const config = node.config as ToolNodeConfig;

    // 执行工具
    const result = await toolService.execute(config.toolName, config.parameters);

    // 触发工具调用事件
    await this.threadExecutor.getEventManager().emit({
      type: EventType.TOOL_CALLED,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      nodeId: node.id,
      toolId: config.toolName,
      parameters: config.parameters
    });

    // 触发工具完成事件
    await this.threadExecutor.getEventManager().emit({
      type: EventType.TOOL_COMPLETED,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      nodeId: node.id,
      toolId: config.toolName,
      output: result.result,
      executionTime: result.executionTime
    });

    return result.result;
  }
}
```

## 关键设计决策

### 1. Conversation 存储位置
**决策**：存储在 `thread.contextData` 中
**理由**：
- Conversation 与 thread 生命周期绑定
- 便于跨节点共享对话历史
- 支持暂停/恢复时保持对话状态

### 2. LLMWrapper 生命周期
**决策**：全局单例，由 ThreadExecutor 持有
**理由**：
- Profile 配置是全局的
- 客户端缓存可以复用
- 减少资源消耗

### 3. ToolRunner 生命周期
**决策**：每次 LLM 节点执行时创建新实例
**理由**：
- ToolRunner 是一次性的（只能消费一次）
- 每个节点可能有不同的配置
- 避免状态污染

### 4. 事件触发
**决策**：通过 ThreadExecutor 的 EventManager 触发
**理由**：
- 统一的事件管理
- 事件与 thread 绑定
- 便于事件监听和过滤

## 数据流

### LLM 节点执行流程

```
1. ThreadExecutor.executeNode()
   ↓
2. LLMNodeExecutor.doExecute()
   ↓
3. 获取 Conversation (从 thread.contextData)
   ↓
4. 添加用户消息到 Conversation
   ↓
5. 创建 ToolRunner
   ↓
6. ToolRunner.runUntilDone()
   ↓
7. Conversation.executeLLMCallStream()
   ↓
8. LLMWrapper.generateStream()
   ↓
9. Client.generateStream()
   ↓
10. 返回 LLM 响应
   ↓
11. Conversation 添加助手消息
   ↓
12. ToolRunner 检查工具调用
   ↓
13. Conversation.executeToolCall()
   ↓
14. ToolService.execute()
   ↓
15. 返回工具结果
   ↓
16. Conversation 添加工具消息
   ↓
17. 重复步骤 7-16 直到完成
   ↓
18. 返回最终结果
```

## 注意事项

1. **线程安全**：Conversation 不是线程安全的，确保同一时间只有一个线程访问
2. **内存管理**：及时清理不再需要的 Conversation 实例
3. **错误处理**：妥善处理 LLM 调用和工具调用的错误
4. **事件触发**：所有关键操作都要触发事件
5. **状态一致性**：确保 Conversation 的状态与 thread 状态一致

## 扩展点

1. **自定义 LLM 客户端**：通过 LLMWrapper.registerProfile() 注册
2. **自定义工具**：通过 ToolService.registerTool() 注册
3. **自定义事件处理**：通过 EventManager.on() 注册监听器
4. **自定义节点执行器**：通过 ThreadExecutor.registerNodeExecutor() 注册