# HumanRelay Handler 详细实现规范

## 1. 类型定义

### 1.1 HumanRelay 相关类型 (`sdk/types/human-relay.ts`)

```typescript
/**
 * HumanRelay 操作类型
 */
export enum HumanRelayOperationType {
  /** 单轮对话 */
  SINGLE = 'SINGLE',
  /** 多轮对话 */
  MULTI = 'MULTI'
}

/**
 * HumanRelay 请求
 */
export interface HumanRelayRequest {
  /** 请求ID */
  requestId: ID;
  /** 操作类型 */
  operationType: HumanRelayOperationType;
  /** 消息历史 */
  messages: LLMMessage[];
  /** 超时时间（毫秒） */
  timeout: number;
  /** 前端配置 */
  frontendConfig?: Record<string, any>;
  /** 额外元数据 */
  metadata?: Metadata;
}

/**
 * HumanRelay 上下文
 */
export interface HumanRelayContext {
  /** 线程ID */
  threadId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 节点ID */
  nodeId: ID;
  /** 获取变量值 */
  getVariable(variableName: string, scope?: VariableScope): any;
  /** 设置变量值 */
  setVariable(variableName: string, value: any, scope?: VariableScope): Promise<void>;
  /** 获取所有变量 */
  getVariables(scope?: VariableScope): Record<string, any>;
  /** 超时控制 */
  timeout: number;
  /** 取消令牌 */
  cancelToken: {
    cancelled: boolean;
    cancel(): void;
  };
}

/**
 * HumanRelay 处理器接口
 */
export interface HumanRelayHandler {
  /**
   * 处理 HumanRelay 请求
   * @param request HumanRelay 请求
   * @param context HumanRelay 上下文
   * @returns 用户响应内容
   */
  handle(request: HumanRelayRequest, context: HumanRelayContext): Promise<string>;
}
```

### 1.2 事件类型定义 (`sdk/types/events.ts`)

需要在 `EventType` 枚举中添加：

```typescript
export enum EventType {
  // ... 其他事件类型
  /** HumanRelay 请求 */
  HUMAN_RELAY_REQUESTED = 'HUMAN_RELAY_REQUESTED',
  /** HumanRelay 响应 */
  HUMAN_RELAY_RESPONDED = 'HUMAN_RELAY_RESPONDED',
  /** HumanRelay 失败 */
  HUMAN_RELAY_FAILED = 'HUMAN_RELAY_FAILED'
}
```

对应的事件接口：

```typescript
/**
 * HumanRelay 请求事件类型
 */
export interface HumanRelayRequestedEvent extends BaseEvent {
  type: EventType.HUMAN_RELAY_REQUESTED;
  /** 节点ID */
  nodeId?: ID;
  /** 请求ID */
  requestId: ID;
  /** 操作类型 */
  operationType: HumanRelayOperationType;
  /** 消息历史 */
  messages: LLMMessage[];
  /** 超时时间 */
  timeout: number;
}

/**
 * HumanRelay 响应事件类型
 */
export interface HumanRelayRespondedEvent extends BaseEvent {
  type: EventType.HUMAN_RELAY_RESPONDED;
  /** 请求ID */
  requestId: ID;
  /** 用户响应 */
  response: string;
}

/**
 * HumanRelay 失败事件类型
 */
export interface HumanRelayFailedEvent extends BaseEvent {
  type: EventType.HUMAN_RELAY_FAILED;
  /** 请求ID */
  requestId: ID;
  /** 失败原因 */
  reason: string;
}
```

并在 `Event` 联合类型中添加：

```typescript
export type Event =
  // ... 其他事件类型
  | HumanRelayRequestedEvent
  | HumanRelayRespondedEvent
  | HumanRelayFailedEvent;
```

## 2. API 接口定义 (`sdk/api/core/human-relay-api.ts`)

```typescript
/**
 * HumanRelay API
 * 提供 HumanRelay 相关的接口定义
 */

import type { ID, VariableScope } from '../../types/common';
import type { HumanRelayRequest } from '../../types/human-relay';

/**
 * HumanRelay 上下文
 * SDK 提供给应用层的执行上下文
 */
export interface HumanRelayContext {
  /** 线程ID */
  threadId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 节点ID */
  nodeId: ID;
  /** 获取变量值 */
  getVariable(variableName: string, scope?: VariableScope): any;
  /** 设置变量值 */
  setVariable(variableName: string, value: any, scope?: VariableScope): Promise<void>;
  /** 获取所有变量 */
  getVariables(scope?: VariableScope): Record<string, any>;
  /** 超时控制 */
  timeout: number;
  /** 取消令牌 */
  cancelToken: {
    cancelled: boolean;
    cancel(): void;
  };
}

/**
 * HumanRelay 处理器接口
 * 应用层必须实现的接口，用于获取用户输入
 */
export interface HumanRelayHandler {
  /**
   * 处理 HumanRelay 请求
   * @param request HumanRelay 请求
   * @param context HumanRelay 上下文
   * @returns 用户响应内容
   */
  handle(request: HumanRelayRequest, context: HumanRelayContext): Promise<string>;
}
```

## 3. Handler 实现 (`sdk/core/execution/handlers/human-relay-handler.ts`)

### 3.1 核心接口和类型

```typescript
/**
 * HumanRelay 任务接口
 */
export interface HumanRelayTask {
  /** LLM 请求 */
  request: LLMRequest;
  /** LLM Profile */
  profile: LLMProfile;
  /** 线程上下文 */
  threadContext: ThreadContext;
  /** 请求ID */
  requestId: string;
}
```

### 3.2 辅助函数

#### 创建 HumanRelay 请求

```typescript
/**
 * 创建 HumanRelay 请求
 * @param task HumanRelay 任务
 * @returns HumanRelay 请求
 */
export function createHumanRelayRequest(task: HumanRelayTask): HumanRelayRequest {
  const config = task.profile.metadata?.['humanRelayConfig'] || {};
  
  return {
    requestId: task.requestId,
    operationType: config.mode === 'MULTI' ? HumanRelayOperationType.MULTI : HumanRelayOperationType.SINGLE,
    messages: task.request.messages,
    timeout: config.defaultTimeout || 300000,
    frontendConfig: config.frontendConfig,
    metadata: task.profile.metadata
  };
}
```

#### 创建 HumanRelay 上下文

```typescript
/**
 * 创建 HumanRelay 上下文
 * @param task HumanRelay 任务
 * @param eventManager 事件管理器
 * @returns HumanRelay 上下文
 */
export function createHumanRelayContext(
  task: HumanRelayTask,
  eventManager: EventManager
): HumanRelayContext {
  const cancelToken = {
    cancelled: false,
    cancel: () => { cancelToken.cancelled = true; }
  };

  return {
    threadId: task.threadContext.getThreadId(),
    workflowId: task.threadContext.getWorkflowId(),
    nodeId: task.threadContext.getCurrentNodeId() || '',
    getVariable: (variableName: string, scope?: any) => {
      return task.threadContext.getVariable(variableName);
    },
    setVariable: async (variableName: string, value: any, scope?: any) => {
      await task.threadContext.updateVariable(variableName, value, scope);
    },
    getVariables: (scope?: any) => {
      return task.threadContext.getAllVariables();
    },
    timeout: task.profile.metadata?.['humanRelayConfig']?.defaultTimeout || 300000,
    cancelToken
  };
}
```

#### 事件触发函数

```typescript
/**
 * 触发 HUMAN_RELAY_REQUESTED 事件
 * @param task HumanRelay 任务
 * @param request HumanRelay 请求
 * @param eventManager 事件管理器
 */
export async function emitRequestedEvent(
  task: HumanRelayTask,
  request: HumanRelayRequest,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.HUMAN_RELAY_REQUESTED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    nodeId: task.threadContext.getCurrentNodeId() || '',
    requestId: request.requestId,
    operationType: request.operationType,
    messages: request.messages,
    timeout: request.timeout
  });
}

/**
 * 触发 HUMAN_RELAY_RESPONDED 事件
 * @param task HumanRelay 任务
 * @param response 用户响应
 * @param eventManager 事件管理器
 */
export async function emitRespondedEvent(
  task: HumanRelayTask,
  response: string,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.HUMAN_RELAY_RESPONDED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    requestId: task.requestId,
    response
  });
}

/**
 * 触发 HUMAN_RELAY_FAILED 事件
 * @param task HumanRelay 任务
 * @param error 错误信息
 * @param eventManager 事件管理器
 */
export async function emitFailedEvent(
  task: HumanRelayTask,
  error: Error | string,
  eventManager: EventManager
): Promise<void> {
  await eventManager.emit({
    type: EventType.HUMAN_RELAY_FAILED,
    timestamp: now(),
    workflowId: task.threadContext.getWorkflowId(),
    threadId: task.threadContext.getThreadId(),
    requestId: task.requestId,
    reason: error instanceof Error ? error.message : error
  });
}
```

#### 用户输入获取

```typescript
/**
 * 获取用户输入
 * @param task HumanRelay 任务
 * @param request HumanRelay 请求
 * @param context HumanRelay 上下文
 * @param handler HumanRelay 处理器
 * @returns 用户响应内容
 */
export async function getUserInput(
  task: HumanRelayTask,
  request: HumanRelayRequest,
  context: HumanRelayContext,
  handler: HumanRelayHandler
): Promise<string> {
  // 实现超时控制
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`HumanRelay timeout after ${request.timeout}ms`));
    }, request.timeout);
  });

  // 取消控制
  const cancelPromise = new Promise<string>((_, reject) => {
    const checkCancel = setInterval(() => {
      if (context.cancelToken.cancelled) {
        clearInterval(checkCancel);
        reject(new Error('HumanRelay cancelled'));
      }
    }, 100);
  });

  try {
    // 竞争：用户输入、超时、取消
    return await Promise.race([
      handler.handle(request, context),
      timeoutPromise,
      cancelPromise
    ]);
  } finally {
    // 清理取消检查
    context.cancelToken.cancel();
  }
}
```

#### 构建 LLM 结果

```typescript
/**
 * 构建 LLM 结果
 * @param task HumanRelay 任务
 * @param response 用户响应
 * @returns LLM 结果
 */
export function buildLLMResult(
  task: HumanRelayTask,
  response: string
): LLMResult {
  return {
    id: task.requestId,
    model: task.profile.model,
    content: response,
    message: {
      role: 'assistant',
      content: response
    },
    finishReason: 'stop',
    duration: 0,
    metadata: {
      humanRelay: true,
      timestamp: now()
    }
  };
}
```

### 3.3 主执行函数

```typescript
/**
 * 执行 HumanRelay
 * @param request LLM 请求
 * @param profile LLM Profile
 * @param threadContext 线程上下文
 * @param eventManager 事件管理器
 * @param humanRelayHandler HumanRelay 处理器
 * @returns LLM 结果
 */
export async function executeHumanRelay(
  request: LLMRequest,
  profile: LLMProfile,
  threadContext: ThreadContext,
  eventManager: EventManager,
  humanRelayHandler: HumanRelayHandler
): Promise<LLMResult> {
  const requestId = generateId();
  const startTime = Date.now();

  const task: HumanRelayTask = {
    request,
    profile,
    threadContext,
    requestId
  };

  try {
    // 1. 创建 HumanRelay 请求
    const humanRelayRequest = createHumanRelayRequest(task);

    // 2. 触发 HUMAN_RELAY_REQUESTED 事件
    await emitRequestedEvent(task, humanRelayRequest, eventManager);

    // 3. 创建 HumanRelay 上下文
    const context = createHumanRelayContext(task, eventManager);

    // 4. 调用应用层处理器获取用户输入
    const response = await getUserInput(task, humanRelayRequest, context, humanRelayHandler);

    // 5. 触发 HUMAN_RELAY_RESPONDED 事件
    await emitRespondedEvent(task, response, eventManager);

    // 6. 构建 LLM 结果
    const result = buildLLMResult(task, response);
    result.duration = Date.now() - startTime;

    return result;
  } catch (error) {
    // 触发 HUMAN_RELAY_FAILED 事件
    await emitFailedEvent(
      task,
      error instanceof Error ? error : new Error(String(error)),
      eventManager
    );
    throw error;
  }
}
```

## 4. 与现有架构的集成

### 4.1 LLMWrapper 集成

需要修改 `LLMWrapper` 类，在调用 HumanRelayClient 之前注入必要的依赖：

```typescript
// 在 LLMWrapper.generate() 和 generateStream() 方法中
if (profile.provider === LLMProvider.HUMAN_RELAY) {
  const humanRelayClient = client as HumanRelayClient;
  humanRelayClient.setHumanRelayHandler(this.humanRelayHandler);
  humanRelayClient.setEventManager(eventManager); // 需要传递 eventManager
  humanRelayClient.setThreadContext(threadContext); // 需要传递 threadContext
}
```

### 4.2 NodeExecutionCoordinator 集成

由于 HumanRelay 是通过 LLM 节点使用的，不需要修改 `NodeExecutionCoordinator`，因为 LLM 节点已经通过 `LLMExecutionCoordinator` 调用 `LLMWrapper`。

## 5. 向后兼容性处理

### 5.1 保留旧方法

在 `HumanRelayClient` 中保留 `submitHumanResponse` 和 `submitHumanError` 方法，但标记为 deprecated：

```typescript
/**
 * 提交人工响应（已废弃）
 * @deprecated 使用 HumanRelayHandler 替代
 */
submitHumanResponse(requestId: string, response: string): void {
  console.warn('[HumanRelay] submitHumanResponse is deprecated. Use HumanRelayHandler instead.');
  // 实现向后兼容逻辑
}

/**
 * 提交人工错误（已废弃）
 * @deprecated 使用 HumanRelayHandler 替代
 */
submitHumanError(requestId: string, error: string): void {
  console.warn('[HumanRelay] submitHumanError is deprecated. Use HumanRelayHandler instead.');
  // 实现向后兼容逻辑
}
```

### 5.2 配置兼容性

现有的 HumanRelay 配置格式保持不变：

```typescript
{
  provider: 'HUMAN_RELAY',
  model: 'human-relay',
  metadata: {
    humanRelayConfig: {
      mode: 'SINGLE', // or 'MULTI'
      maxHistoryLength: 50,
      defaultTimeout: 300000,
      frontendConfig: {}
    }
  }
}
```

## 6. 测试策略

### 6.1 单元测试

- 测试 `createHumanRelayRequest` 函数
- 测试 `createHumanRelayContext` 函数
- 测试 `getUserInput` 函数（包括超时和取消场景）
- 测试 `executeHumanRelay` 函数

### 6.2 集成测试

- 测试完整的 HumanRelay 执行流程
- 测试事件触发
- 测试错误处理

### 6.3 向后兼容性测试

- 测试旧的 `submitHumanResponse` 方法
- 测试配置兼容性

## 7. 文档更新

### 7.1 API 文档

- 更新 HumanRelay 相关的 API 文档
- 添加新的 HumanRelayHandler 使用示例

### 7.2 迁移指南

- 提供从旧 API 迁移到新 API 的指南
- 说明 deprecated 方法的替代方案

## 8. 实施优先级

1. **高优先级**：类型定义、API 接口、Handler 实现
2. **中优先级**：HumanRelayClient 重构、LLMWrapper 集成
3. **低优先级**：测试、文档、向后兼容性处理

这个规范确保了 HumanRelay Handler 的实现与现有的 UserInteractionHandler 保持一致的设计模式，同时保证了向后兼容性和良好的可维护性。