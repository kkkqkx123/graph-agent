# SDK API层用户交互和Human Relay设计分析

## 1. 概述

本文档分析了如何在SDK的API层向应用层提供`human-relay`（人工输入代替LLM响应）和`user_interaction`（让用户介入工作流执行过程）功能。基于对现有core层、types层和api层架构的深入分析，提出了清晰的接口设计和封装边界。

## 2. 现状分析

### 2.1 Core层实现现状

**User Interaction**:
- 已有完整的处理器实现（`userInteractionHandler`）
- 支持两种操作类型：`UPDATE_VARIABLES`（更新工作流变量）和`ADD_MESSAGE`（添加用户消息到对话）
- 通过`UserInteractionHandlerContext`接收处理器和对话管理器
- 完整的超时控制和取消机制

**Human Relay**:
- 已有完整的处理器实现（`executeHumanRelay`函数）
- 作为LLM Client的替代品，以人工输入代替LLM API调用
- 通过`HumanRelayHandler`接口与应用层交互
- 完整的事件系统支持

**事件系统**:
- 已定义完整的用户交互事件：`USER_INTERACTION_REQUESTED`、`USER_INTERACTION_RESPONDED`、`USER_INTERACTION_PROCESSED`、`USER_INTERACTION_FAILED`
- 已定义完整的Human Relay事件：`HUMAN_RELAY_REQUESTED`、`HUMAN_RELAY_RESPONDED`、`HUMAN_RELAY_PROCESSED`、`HUMAN_RELAY_FAILED`

### 2.2 Types层接口定义

**User Interaction接口体系**:
- `UserInteractionRequest`: 包含`operationType`、`variables`/`message`配置、`prompt`、`timeout`等
- `UserInteractionResponse`: 包含`interactionId`和`inputData`
- `UserInteractionHandler`: 应用层必须实现的处理器接口
- `UserInteractionContext`: SDK提供给处理器的执行上下文

**Human Relay接口体系**:
- `HumanRelayRequest`: 包含`messages`、`prompt`、`timeout`等
- `HumanRelayResponse`: 包含`requestId`、`content`、`timestamp`
- `HumanRelayHandler`: 应用层必须实现的处理器接口  
- `HumanRelayContext`: SDK提供给处理器的执行上下文

### 2.3 API层架构模式

- 使用`GenericResourceAPI`基类提供统一的CRUD接口
- 通过`APIFactory`管理所有API实例的创建和配置
- 采用单例模式确保全局一致性
- 支持事件订阅和处理器注册

## 3. 封装边界设计

### 3.1 SDK应该封装的部分

1. **执行协调逻辑**
   - 用户交互请求的创建和处理流程
   - Human Relay请求的创建和处理流程
   - 超时控制和取消机制的实现
   - 事件触发和生命周期管理

2. **资源管理**
   - 处理器的注册、获取和管理
   - 状态管理和配置验证
   - 统一的错误处理机制

3. **工具函数**
   - 占位符替换（`{{input}}`）
   - 表达式求值和变量更新
   - 消息格式化和对话管理

4. **验证和安全**
   - 配置参数验证
   - 输入数据验证
   - 边界条件处理

### 3.2 应用层应该实现的部分

1. **用户界面交互**
   - 前端弹窗、命令行输入等具体交互方式
   - 用户输入的收集、验证和展示
   - 与具体UI框架的集成

2. **处理器实现**
   - `UserInteractionHandler.handle()`方法的具体业务逻辑
   - `HumanRelayHandler.handle()`方法的具体业务逻辑
   - 超时和取消的用户反馈处理

3. **业务逻辑定制**
   - 如何展示提示信息（`prompt`字段的使用）
   - 特定业务场景的交互流程
   - 与外部系统的集成（如通知系统、审批系统等）

4. **自定义扩展**
   - 自定义的交互类型和操作
   - 特定领域的业务规则实现
   - 性能优化和缓存策略

## 4. API接口设计

### 4.1 资源管理器设计

#### UserInteractionResourceAPI
```typescript
class UserInteractionResourceAPI extends GenericResourceAPI<UserInteractionConfig, string, UserInteractionFilter> {
  // 处理器管理
  registerHandler(handler: UserInteractionHandler): void;
  getHandler(): UserInteractionHandler | undefined;
  
  // 交互处理
  handleInteraction(request: UserInteractionRequest): Promise<any>;
  
  // 事件订阅
  onInteractionRequested(listener: (event: UserInteractionRequestedEvent) => void): void;
  onInteractionResponded(listener: (event: UserInteractionRespondedEvent) => void): void;
  onInteractionProcessed(listener: (event: UserInteractionProcessedEvent) => void): void;
  onInteractionFailed(listener: (event: UserInteractionFailedEvent) => void): void;
  
  // 事件取消订阅
  offInteractionRequested(listener: (event: UserInteractionRequestedEvent) => void): void;
  // ... 其他off方法
}
```

#### HumanRelayResourceAPI
```typescript
class HumanRelayResourceAPI extends GenericResourceAPI<HumanRelayConfig, string, HumanRelayFilter> {
  // 处理器管理
  registerHandler(handler: HumanRelayHandler): void;
  getHandler(): HumanRelayHandler | undefined;
  
  // Relay处理
  handleRequest(request: HumanRelayRequest): Promise<HumanRelayResponse>;
  
  // 事件订阅
  onRelayRequested(listener: (event: HumanRelayRequestedEvent) => void): void;
  onRelayResponded(listener: (event: HumanRelayRespondedEvent) => void): void;
  onRelayProcessed(listener: (event: HumanRelayProcessedEvent) => void): void;
  onRelayFailed(listener: (event: HumanRelayFailedEvent) => void): void;
  
  // 事件取消订阅
  offRelayRequested(listener: (event: HumanRelayRequestedEvent) => void): void;
  // ... 其他off方法
}
```

### 4.2 API工厂扩展

```typescript
// APIFactory.ts
export class APIFactory {
  // ... existing methods
  
  public createUserInteractionAPI(): UserInteractionResourceAPI {
    if (!this.apiInstances.userInteraction) {
      this.apiInstances.userInteraction = new UserInteractionResourceAPI();
    }
    return this.apiInstances.userInteraction;
  }

  public createHumanRelayAPI(): HumanRelayResourceAPI {
    if (!this.apiInstances.humanRelay) {
      this.apiInstances.humanRelay = new HumanRelayResourceAPI();
    }
    return this.apiInstances.humanRelay;
  }
}
```

### 4.3 SDK主类扩展

```typescript
// sdk/api/core/sdk.ts
class SDK {
  // ... existing properties
  
  /**
   * 获取用户交互API
   */
  get userInteractions() {
    return this.factory.createUserInteractionAPI();
  }

  /**
   * 获取HumanRelay API
   */
  get humanRelay() {
    return this.factory.createHumanRelayAPI();
  }
}
```

## 5. 应用层使用示例

### 5.1 基本使用

```typescript
import { sdk } from '@modular-agent/sdk';

// 注册用户交互处理器
sdk.userInteractions.registerHandler({
  async handle(request, context) {
    // 应用层实现具体的用户交互逻辑
    const userInput = await showUserDialog(request.prompt);
    return userInput;
  }
});

// 注册human relay处理器  
sdk.humanRelay.registerHandler({
  async handle(request, context) {
    // 应用层实现具体的人工输入逻辑
    const humanInput = await getHumanInput(request.prompt);
    return { 
      requestId: request.requestId, 
      content: humanInput, 
      timestamp: Date.now() 
    };
  }
});
```

### 5.2 事件监听

```typescript
// 监听用户交互事件
sdk.userInteractions.onInteractionRequested((event) => {
  console.log('收到用户交互请求:', event.prompt);
  // 可以在这里记录日志、发送通知等
});

sdk.userInteractions.onInteractionProcessed((event) => {
  console.log('用户交互处理完成:', event.results);
  // 可以在这里进行后续处理
});

// 监听human relay事件
sdk.humanRelay.onRelayRequested((event) => {
  console.log('需要人工输入:', event.prompt);
});

sdk.humanRelay.onRelayProcessed((event) => {
  console.log('人工输入处理完成:', event.message.content);
});
```

### 5.3 高级使用场景

```typescript
// 动态切换处理器
function switchToCommandLineMode() {
  sdk.userInteractions.registerHandler({
    async handle(request, context) {
      const input = await prompt(`[CLI] ${request.prompt}: `);
      return input;
    }
  });
}

function switchToWebUIMode() {
  sdk.userInteractions.registerHandler({
    async handle(request, context) {
      const input = await showWebModal(request.prompt);
      return input;
    }
  });
}

// 条件性处理器
sdk.userInteractions.registerHandler({
  async handle(request, context) {
    // 根据metadata决定处理方式
    if (request.metadata?.urgent) {
      return await showUrgentDialog(request.prompt);
    } else {
      return await showNormalDialog(request.prompt);
    }
  }
});
```

## 6. 实现方案

### 6.1 目录结构

```
sdk/api/resources/
├── user-interaction/
│   ├── user-interaction-resource-api.ts
│   └── __tests__/
│       └── user-interaction-resource-api.test.ts
├── human-relay/
│   ├── human-relay-resource-api.ts
│   └── __tests__/
│       └── human-relay-resource-api.test.ts
└── index.ts (更新导出)
```

### 6.2 依赖注入策略

采用**延迟初始化**策略：
- 构造函数中不立即初始化依赖
- 在首次使用时通过单例获取`EventManager`和`ExecutionContext`
- 符合现有资源管理器的实现模式
- 保持简单性和一致性

### 6.3 错误处理

- **ValidationError**: 配置参数无效
- **ExecutionError**: 处理器未注册或执行失败  
- **TimeoutError**: 交互超时
- **CancellationError**: 用户取消交互
- 统一的错误格式和处理机制

### 6.4 测试策略

**单元测试**:
- 处理器注册和获取
- 交互处理流程
- 事件订阅和取消
- 错误处理场景

**集成测试**:
- 端到端流程验证
- 事件流完整性
- 超时和取消机制
- 与core层的集成

## 7. 向后兼容性

- **非破坏性变更**: 新API不会影响现有功能
- **可选使用**: 应用层可以选择使用新API或继续使用现有方式
- **渐进式迁移**: 提供清晰的迁移路径和文档
- **版本兼容**: 保持与现有core层和types层的兼容性

## 8. 总结

通过在API层提供专门的`UserInteractionResourceAPI`和`HumanRelayResourceAPI`，可以：

1. **简化应用层集成**: 提供清晰、一致的API接口
2. **保持职责分离**: SDK处理执行逻辑，应用层处理UI交互
3. **增强可测试性**: 接口设计便于单元测试和mock
4. **提高可维护性**: 统一的错误处理和事件管理
5. **支持灵活扩展**: 应用层可以根据需要自定义处理器实现

这种设计既保持了SDK的内部复杂性封装，又为应用层提供了足够的灵活性来实现各种用户交互场景。