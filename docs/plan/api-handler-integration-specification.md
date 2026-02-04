# API Handler 集成规范

## 概述

本文档定义了 Human-Relay 和 User-Interaction 模块在 SDK 中的正确集成模式。根据架构原则，这些模块的完整功能应当在应用层实现，SDK 模块只提供模块集成框架，并在 API 层提供接口来规范应用层的使用。

## 架构原则

### 职责分离
- **SDK Types 层**: 定义 Handler 接口规范
- **SDK Core 层**: 调用 Handler 接口，不实现具体逻辑
- **SDK API 层**: 提供 Handler 注入机制和高层接口
- **应用层**: 实现具体的 Handler 逻辑

### 依赖方向
严格遵循 `Types ← Utils ← Core ← API` 的依赖方向，确保架构清晰性和可维护性。

## 接口定义

### HumanRelayHandler 接口
```typescript
// sdk/types/human-relay.ts
export interface HumanRelayContext {
  threadId: ID;
  workflowId: ID;
  nodeId: ID;
  getVariable(variableName: string, scope?: VariableScope): any;
  setVariable(variableName: string, value: any, scope?: VariableScope): Promise<void>;
  getVariables(scope?: VariableScope): Record<string, any>;
  timeout: number;
  cancelToken: {
    cancelled: boolean;
    cancel(): void;
  };
}

export interface HumanRelayHandler {
  handle(request: HumanRelayRequest, context: HumanRelayContext): Promise<HumanRelayResponse>;
}
```

### UserInteractionHandler 接口
```typescript
// sdk/types/interaction.ts
export interface UserInteractionContext {
  threadId: ID;
  workflowId: ID;
  nodeId: ID;
  getVariable(variableName: string, scope?: VariableScope): any;
  setVariable(variableName: string, value: any, scope?: VariableScope): Promise<void>;
  getVariables(scope?: VariableScope): Record<string, any>;
  timeout: number;
  cancelToken: {
    cancelled: boolean;
    cancel(): void;
  };
}

export interface UserInteractionHandler {
  handle(request: UserInteractionRequest, context: UserInteractionContext): Promise<any>;
}
```

## ExecutionContext 扩展

### Handler 管理方法
在 `sdk/core/execution/context/execution-context.ts` 中添加以下方法：

```typescript
/**
 * 设置 HumanRelayHandler
 * @param handler HumanRelayHandler 实例
 */
setHumanRelayHandler(handler: HumanRelayHandler): void {
  this.register('humanRelayHandler', handler);
}

/**
 * 获取 HumanRelayHandler
 * @returns HumanRelayHandler 实例，如果未设置则返回 undefined
 */
getHumanRelayHandler(): HumanRelayHandler | undefined {
  return this.components.get('humanRelayHandler');
}

/**
 * 设置 UserInteractionHandler
 * @param handler UserInteractionHandler 实例
 */
setUserInteractionHandler(handler: UserInteractionHandler): void {
  this.register('userInteractionHandler', handler);
}

/**
 * 获取 UserInteractionHandler
 * @returns UserInteractionHandler 实例，如果未设置则返回 undefined
 */
getUserInteractionHandler(): UserInteractionHandler | undefined {
  return this.components.get('userInteractionHandler');
}
```

## API 层集成

### ThreadExecutorAPI 选项接口
```typescript
// sdk/api/core/thread-executor-api.ts
export interface ThreadExecutorOptions {
  /** HumanRelay 处理器 */
  humanRelayHandler?: HumanRelayHandler;
  /** 用户交互处理器 */
  userInteractionHandler?: UserInteractionHandler;
}
```

### ThreadExecutorAPI 构造函数
```typescript
constructor(
  workflowRegistryParam?: WorkflowRegistry, 
  executionContextParam?: ExecutionContext,
  options?: ThreadExecutorOptions
) {
  this.workflowRegistry = workflowRegistryParam || workflowRegistry;
  this.executionContext = executionContextParam || ExecutionContext.createDefault();
  
  // 注入外部 Handler
  if (options?.humanRelayHandler) {
    this.executionContext.setHumanRelayHandler(options.humanRelayHandler);
  }
  if (options?.userInteractionHandler) {
    this.executionContext.setUserInteractionHandler(options.userInteractionHandler);
  }
  
  // 初始化协调器
  this.lifecycleCoordinator = new ThreadLifecycleCoordinator(this.executionContext);
  this.operationCoordinator = new ThreadOperationCoordinator(this.executionContext);
  this.variableCoordinator = new VariableCoordinator(
    new VariableStateManager(),
    this.executionContext.getEventManager()
  );
}
```

## Core 层使用模式

### ThreadExecutor 获取 Handler
```typescript
// sdk/core/execution/thread-executor.ts
const userInteractionHandler = this.executionContext.getUserInteractionHandler();
if (!userInteractionHandler) {
  throw new ExecutionError('UserInteractionHandler is not provided', node.id);
}
```

### NodeExecutionCoordinator 获取 Handler
```typescript
// sdk/core/execution/coordinators/node-execution-coordinator.ts
const userInteractionHandler = threadContext.getExecutionContext().getUserInteractionHandler();
const humanRelayHandler = threadContext.getExecutionContext().getHumanRelayHandler();
```

### Handler 文件使用 ExecutionContext
```typescript
// sdk/core/execution/handlers/node-handlers/user-interaction-handler.ts
const userInteractionHandler = context.executionContext.getUserInteractionHandler();
if (!userInteractionHandler) {
  throw new ExecutionError('UserInteractionHandler is not provided', node.id);
}
```

## 使用示例

### 应用层 Handler 实现
```typescript
// 应用层实现 HumanRelayHandler
class MyAppHumanRelayHandler implements HumanRelayHandler {
  async handle(request: HumanRelayRequest, context: HumanRelayContext): Promise<HumanRelayResponse> {
    // 具体实现逻辑
    console.log(`Processing human relay request for thread ${context.threadId}`);
    
    // 可以访问变量
    const userInput = await context.getVariable('userInput');
    
    // 可以设置变量
    await context.setVariable('processedInput', 'processed_value');
    
    // 返回响应
    return {
      requestId: request.requestId,
      content: '人工处理的响应内容',
      timestamp: Date.now()
    };
  }
}

// 应用层实现 UserInteractionHandler
class MyAppUserInteractionHandler implements UserInteractionHandler {
  async handle(request: UserInteractionRequest, context: UserInteractionContext): Promise<any> {
    // 具体实现逻辑
    console.log(`Processing user interaction for thread ${context.threadId}`);
    
    // 根据请求类型处理不同逻辑
    switch (request.operationType) {
      case UserInteractionOperationType.UPDATE_VARIABLES:
        // 处理变量更新
        return { userInput: '用户输入的数据' };
      case UserInteractionOperationType.ADD_MESSAGE:
        // 处理消息添加
        return { messageContent: '用户的消息内容' };
      default:
        throw new Error('Unsupported operation type');
    }
  }
}
```

### API 层使用方式
```typescript
// 创建 ThreadExecutorAPI 实例并注入 Handler
const executor = new ThreadExecutorAPI(undefined, undefined, {
  humanRelayHandler: new MyAppHumanRelayHandler(),
  userInteractionHandler: new MyAppUserInteractionHandler()
});

// 执行工作流
const result = await executor.executeWorkflow('my-workflow-id', {
  input: { initialData: 'test' }
});
```

### 动态 Handler 注入
```typescript
// 也可以在运行时动态注入 Handler
const executionContext = ExecutionContext.createDefault();
executionContext.setHumanRelayHandler(new MyAppHumanRelayHandler());
executionContext.setUserInteractionHandler(new MyAppUserInteractionHandler());

const executor = new ThreadExecutorAPI(undefined, executionContext);
```

## 最佳实践

### 1. Handler 实现原则
- **单一职责**: 每个 Handler 只负责一种类型的交互
- **错误处理**: 妥善处理异常情况，提供有意义的错误信息
- **超时控制**: 尊重 context 中的 timeout 设置
- **取消支持**: 支持 cancelToken 的取消操作

### 2. 性能考虑
- **异步操作**: Handler 方法应该是异步的，避免阻塞执行流程
- **资源管理**: 及时释放使用的资源
- **缓存策略**: 对于重复的操作可以考虑缓存结果

### 3. 安全性
- **输入验证**: 验证从用户获取的输入数据
- **权限检查**: 根据上下文进行必要的权限验证
- **敏感数据**: 避免在日志中记录敏感信息

### 4. 测试策略
- **单元测试**: 为 Handler 实现编写单元测试
- **集成测试**: 测试 Handler 与 SDK 的集成
- **模拟测试**: 使用模拟的 ExecutionContext 进行测试

## 向后兼容性

- **可选参数**: Handler 是可选的，不影响现有功能
- **默认行为**: 当 Handler 未提供时，相关节点会抛出明确的错误
- **渐进式采用**: 可以逐步为现有项目添加 Handler 支持

## 扩展性

### 添加新的 Handler 类型
1. 在 Types 层定义新的 Handler 接口
2. 在 ExecutionContext 中添加相应的管理方法
3. 在 ThreadExecutorOptions 中添加新的选项
4. 在 Core 层组件中添加对新 Handler 的支持

### 自定义 Context 扩展
可以通过扩展 Context 接口来提供更多的上下文信息，但需要保持向后兼容性。

## 总结

本规范确保了 Human-Relay 和 User-Interaction 模块的正确集成，实现了 SDK 与应用层的清晰职责分离。SDK 提供了完整的集成框架和接口规范，而具体的功能实现在应用层完成，这符合模块化设计和分层架构的最佳实践。