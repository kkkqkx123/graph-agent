# 统一错误处理器设计方案 V2

## 1. 设计原则

### 1.1 核心原则
1. **错误优先**：所有运行时异常必须抛出错误，不允许静默处理
2. **统一入口**：所有错误通过现有的ErrorHandler类统一处理
3. **日志集成**：ErrorHandler负责所有日志记录，业务代码不直接记录日志
4. **简洁直接**：不追求向后兼容，直接重构，保证长期可维护性

### 1.2 错误处理流程

```
业务代码抛出错误
    ↓
ErrorHandler.handle() 捕获
    ↓
1. 标准化错误对象
    ↓
2. 记录日志（根据错误级别）
    ↓
3. 触发错误事件
    ↓
4. 应用错误处理策略
    ↓
返回处理结果
```

## 2. 扩展ErrorHandler类

### 2.1 新增类型定义

```typescript
/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 节点ID */
  nodeId?: string;
  /** 操作名称 */
  operation?: string;
  /** 额外上下文信息 */
  [key: string]: any;
}

/**
 * 错误处理结果
 */
export interface ErrorHandlingResult {
  /** 是否应该停止执行 */
  shouldStop: boolean;
  /** 标准化的错误对象 */
  error: SDKError;
}
```

### 2.2 扩展error-handler.ts

```typescript
import { ThreadContext } from '../context/thread-context';
import type { Node } from '@modular-agent/types/node';
import type { NodeExecutionResult } from '@modular-agent/types/thread';
import { ErrorHandlingStrategy } from '@modular-agent/types/thread';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '@modular-agent/types/events';
import type { ErrorEvent } from '@modular-agent/types/events';
import { now } from '@modular-agent/common-utils';
import { SDKError, ErrorCode } from '@modular-agent/types/errors';
import { ExecutionError, ValidationError, ToolError, NotFoundError } from '@modular-agent/types/errors';
import { logger } from '../../logger';

/**
 * 统一错误处理函数
 * 处理所有类型的错误，包括日志记录、事件触发和策略应用
 * 
 * @param error 错误对象（可以是Error或SDKError）
 * @param context 错误上下文
 * @param eventManager 事件管理器
 * @param strategy 错误处理策略（可选，默认STOP_ON_ERROR）
 * @returns 错误处理结果
 */
export async function handleError(
  error: Error | SDKError,
  context: ErrorContext,
  eventManager: EventManager,
  strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.STOP_ON_ERROR
): Promise<ErrorHandlingResult> {
  // 步骤1：标准化错误对象
  const standardizedError = standardizeError(error, context);
  
  // 步骤2：记录日志
  logError(standardizedError, context);
  
  // 步骤3：触发错误事件
  await emitErrorEvent(standardizedError, context, eventManager);
  
  // 步骤4：应用错误处理策略
  return applyHandlingStrategy(standardizedError, strategy);
}

/**
 * 标准化错误对象
 * 将普通Error转换为SDKError，确保所有错误都有统一的格式
 */
function standardizeError(
  error: Error | SDKError,
  context: ErrorContext
): SDKError {
  // 如果已经是SDKError，直接返回
  if (error instanceof SDKError) {
    return error;
  }
  
  // 否则根据上下文包装为合适的SDKError子类
  if (context.operation?.includes('tool')) {
    return new ToolError(
      error.message,
      context.toolName,
      context.toolType,
      context,
      error
    );
  }
  
  if (context.operation?.includes('validation')) {
    return new ValidationError(
      error.message,
      context.field,
      context.value,
      context
    );
  }
  
  if (context.operation?.includes('find') || context.operation?.includes('get')) {
    return new NotFoundError(
      error.message,
      context.resourceType || 'unknown',
      context.resourceId || 'unknown',
      context
    );
  }
  
  // 默认包装为ExecutionError
  return new ExecutionError(
    error.message,
    context.nodeId,
    context.workflowId,
    context,
    error
  );
}

/**
 * 记录错误日志
 * 根据错误类型和严重程度选择合适的日志级别
 */
function logError(error: SDKError, context: ErrorContext): void {
  const logLevel = determineLogLevel(error);
  const logData = {
    errorCode: error.code,
    errorMessage: error.message,
    context: {
      ...context,
      errorContext: error.context
    }
  };
  
  switch (logLevel) {
    case 'error':
      logger.error(error.message, logData);
      break;
    case 'warn':
      logger.warn(error.message, logData);
      break;
    case 'info':
      logger.info(error.message, logData);
      break;
  }
}

/**
 * 确定日志级别
 * 根据错误类型和上下文确定日志级别
 */
function determineLogLevel(error: SDKError): 'error' | 'warn' | 'info' {
  // 检查上下文中的严重程度标记
  if (error.context?.severity === 'warning') {
    return 'warn';
  }
  
  if (error.context?.severity === 'info') {
    return 'info';
  }
  
  // 根据错误类型确定日志级别
  switch (error.code) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.CONFIGURATION_ERROR:
      return 'error';
    
    case ErrorCode.TOOL_ERROR:
    case ErrorCode.CODE_EXECUTION_ERROR:
    case ErrorCode.EXECUTION_ERROR:
      return 'error';
    
    case ErrorCode.NOT_FOUND_ERROR:
      return 'warn';
    
    case ErrorCode.TIMEOUT_ERROR:
      return 'warn';
    
    default:
      return 'error';
  }
}

/**
 * 触发错误事件
 */
async function emitErrorEvent(
  error: SDKError,
  context: ErrorContext,
  eventManager: EventManager
): Promise<void> {
  const errorEvent: ErrorEvent = {
    type: EventType.ERROR,
    threadId: context.threadId,
    workflowId: context.workflowId,
    error,
    timestamp: now()
  };
  
  await eventManager.emit(errorEvent);
}

/**
 * 应用错误处理策略
 */
function applyHandlingStrategy(
  error: SDKError,
  strategy: ErrorHandlingStrategy
): ErrorHandlingResult {
  switch (strategy) {
    case ErrorHandlingStrategy.STOP_ON_ERROR:
      return { shouldStop: true, error };
    
    case ErrorHandlingStrategy.CONTINUE_ON_ERROR:
      return { shouldStop: false, error };
    
    default:
      return { shouldStop: true, error };
  }
}

// ============================================================================
// 保留原有的函数，但内部使用新的handleError
// ============================================================================

/**
 * 处理节点执行失败
 * @param threadContext 线程上下文
 * @param node 节点定义
 * @param nodeResult 节点执行结果
 * @param eventManager 事件管理器
 */
export async function handleNodeFailure(
  threadContext: ThreadContext,
  node: Node,
  nodeResult: NodeExecutionResult,
  eventManager: EventManager
): Promise<void> {
  const error = nodeResult.error || new Error('Unknown error');
  
  const context: ErrorContext = {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId: node.id,
    operation: 'node_execution'
  };
  
  const result = await handleError(error, context, eventManager, threadContext.thread.errorHandling?.strategy);
  
  // 如果需要停止执行，状态由外部管理
  if (result.shouldStop) {
    return;
  }
  
  // 如果继续执行，路由到下一个节点
  if (threadContext.thread.errorHandling?.strategy === ErrorHandlingStrategy.CONTINUE_ON_ERROR) {
    const navigator = threadContext.getNavigator();
    const currentNodeId = node.id;
    const lastResult = threadContext.getNodeResults()[threadContext.getNodeResults().length - 1];
    const nextNodeId = navigator.selectNextNodeWithContext(
      currentNodeId,
      threadContext.thread,
      node.type,
      lastResult
    );
    if (nextNodeId) {
      threadContext.setCurrentNodeId(nextNodeId);
    }
  }
}

/**
 * 处理执行错误
 * @param threadContext 线程上下文
 * @param error 错误信息
 * @param eventManager 事件管理器
 */
export async function handleExecutionError(
  threadContext: ThreadContext,
  error: any,
  eventManager: EventManager
): Promise<void> {
  const context: ErrorContext = {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    operation: 'execution'
  };
  
  await handleError(error, context, eventManager);
  // 状态由外部管理
}
```

## 3. 业务代码使用方式

### 3.1 基本原则
- **抛出错误**：所有运行时异常必须抛出错误
- **提供上下文**：尽可能提供完整的上下文信息
- **选择合适的错误类型**：根据实际情况选择SDKError子类

### 3.2 使用示例

#### 3.2.1 API层 - 资源清理

```typescript
// sdk/api/core/sdk.ts
import { handleError } from '../../core/execution/handlers/error-handler';
import { ExecutionError } from '@modular-agent/types/errors';
import { logger } from '../index';

async destroy(): Promise<void> {
  const eventManager = this.factory.getEventManager();
  
  // 清理workflows
  try {
    await this.workflows.clear();
  } catch (error) {
    await handleError(
      error instanceof Error ? error : new Error(String(error)),
      {
        operation: 'cleanup',
        resourceType: 'workflows'
      },
      eventManager
    );
  }
  
  // 清理threads
  try {
    await this.threads.clear();
  } catch (error) {
    await handleError(
      error instanceof Error ? error : new Error(String(error)),
      {
        operation: 'cleanup',
        resourceType: 'threads'
      },
      eventManager
    );
  }
  
  // ... 其他资源清理
  
  logger.info('SDK instance destroyed');
}
```

#### 3.2.2 事件系统 - 事件监听器错误

```typescript
// sdk/api/common/api-event-system.ts
import { handleError } from '../../core/execution/handlers/error-handler';
import { ExecutionError } from '@modular-agent/types/errors';

public async emit(event: APIEventData): Promise<void> {
  const listeners = this.listeners.get(event.type);
  if (!listeners || listeners.length === 0) {
    return;
  }

  for (const listener of [...listeners]) {
    try {
      await listener(event);
    } catch (error) {
      // 抛出错误，由调用方决定如何处理
      throw new ExecutionError(
        'Event listener execution failed',
        undefined,
        undefined,
        {
          eventType: event.type,
          operation: 'event_listener'
        },
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
```

#### 3.2.3 Hook处理器 - 条件评估失败

```typescript
// sdk/core/execution/handlers/hook-handlers/hook-handler.ts
import { handleError } from '../error-handler';
import { ValidationError } from '@modular-agent/types/errors';

// 条件评估
if (hook.condition) {
  try {
    result = conditionEvaluator.evaluate(
      hook.condition,
      convertToEvaluationContext(evalContext)
    );
  } catch (error) {
    // 抛出验证错误，标记为警告级别
    throw new ValidationError(
      `Hook condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      'hook.condition',
      hook.condition,
      {
        eventName: hook.eventName,
        nodeId: context.node.id,
        operation: 'hook_condition_evaluation',
        severity: 'warning' // 标记为警告级别
      }
    );
  }
}
```

#### 3.2.4 Hook处理器 - 检查点创建失败

```typescript
// 检查点创建
if (hook.createCheckpoint && context.checkpointDependencies) {
  try {
    await createCheckpoint(
      {
        threadId: context.thread.id,
        nodeId: context.node.id,
        description: hook.checkpointDescription || `Hook: ${hook.eventName}`
      },
      context.checkpointDependencies
    );
  } catch (error) {
    // 抛出执行错误，标记为信息级别（不影响主流程）
    throw new ExecutionError(
      'Failed to create checkpoint for hook',
      context.node.id,
      context.thread.workflowId,
      {
        eventName: hook.eventName,
        nodeId: context.node.id,
        operation: 'checkpoint_creation',
        severity: 'info' // 标记为信息级别
      },
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
```

#### 3.2.5 工作流注册器 - 预处理失败

```typescript
// sdk/core/services/workflow-registry.ts
import { handleError } from '../execution/handlers/error-handler';
import { ValidationError } from '@modular-agent/types/errors';

// 预处理工作流
try {
  const processed = await processWorkflow(workflow, processOptions);
  this.processedWorkflows.set(workflow.id, processed);
} catch (error) {
  // 抛出验证错误
  throw new ValidationError(
    `Workflow preprocessing failed: ${error instanceof Error ? error.message : String(error)}`,
    'workflow.definition',
    workflow,
    {
      workflowId: workflow.id,
      operation: 'workflow_preprocessing'
    },
    error instanceof Error ? error : new Error(String(error))
  );
}
```

## 4. 迁移策略

### 4.1 迁移步骤

#### 第一步：扩展ErrorHandler
1. 在`error-handler.ts`中添加新的函数和类型定义
2. 编写单元测试

#### 第二步：迁移业务代码
1. 将所有`logger.error/warn/info`调用改为抛出错误
2. 在适当的位置调用`handleError`
3. 提供完整的上下文信息

#### 第三步：清理和优化
1. 删除不再需要的logger调用
2. 统一错误类型的使用
3. 完善测试覆盖

### 4.2 迁移清单

#### API层
- [ ] `sdk/api/core/sdk.ts` - 资源清理错误
- [ ] `sdk/api/common/api-event-system.ts` - 事件监听器错误
- [ ] `sdk/api/builders/execution-builder.ts` - 错误回调失败

#### 核心服务层
- [ ] `sdk/core/services/workflow-registry.ts` - 预处理失败、引用警告
- [ ] `sdk/core/services/event-manager.ts` - 事件监听器错误

#### 执行层
- [ ] `sdk/core/execution/handlers/hook-handlers/hook-handler.ts` - Hook相关错误
- [ ] `sdk/core/execution/utils/event/event-emitter.ts` - 事件发射错误
- [ ] `sdk/core/execution/thread-builder.ts` - 触发器注册错误
- [ ] `sdk/core/execution/managers/*` - 各种管理器错误
- [ ] `sdk/core/execution/executors/*` - 执行器错误
- [ ] `sdk/core/execution/coordinators/*` - 协调器错误

## 5. 优势

### 5.1 架构优势
1. **统一入口**：所有错误通过ErrorHandler统一处理
2. **职责清晰**：业务代码只负责抛出错误，ErrorHandler负责处理
3. **易于维护**：错误处理逻辑集中，易于修改和扩展
4. **可测试性**：ErrorHandler可以独立测试

### 5.2 日志优势
1. **格式统一**：所有日志格式一致
2. **上下文完整**：自动包含完整的上下文信息
3. **级别合理**：根据错误类型自动选择日志级别
4. **易于追踪**：保留完整的错误链

### 5.3 开发优势
1. **代码简洁**：业务代码不需要关心日志记录
2. **错误明确**：通过错误类型明确表达错误性质
3. **上下文丰富**：通过ErrorContext提供丰富的上下文信息
4. **策略灵活**：支持不同的错误处理策略

## 6. 注意事项

### 6.1 错误类型选择
- **ValidationError**：验证失败、配置错误
- **ExecutionError**：执行失败、节点执行错误
- **ToolError**：工具调用失败
- **NotFoundError**：资源未找到
- **TimeoutError**：超时错误
- **NetworkError**：网络错误
- **LLMError**：LLM调用错误

### 6.2 严重程度标记
- **error**：严重错误，需要停止执行
- **warning**：警告错误，可以继续执行
- **info**：信息性错误，仅记录

### 6.3 上下文信息
尽可能提供以下信息：
- `threadId`：线程ID
- `workflowId`：工作流ID
- `nodeId`：节点ID
- `operation`：操作名称
- `resourceType`：资源类型
- `resourceId`：资源ID
- 其他相关上下文信息

## 7. 总结

通过直接扩展现有的ErrorHandler类，实现了一个简洁、统一、可维护的错误处理架构：

1. **所有错误都通过ErrorHandler处理**：保证一致性
2. **业务代码只负责抛出错误**：职责清晰
3. **ErrorHandler负责日志记录**：格式统一
4. **支持不同的错误处理策略**：灵活可配置
5. **不追求向后兼容**：直接重构，保证长期可维护性

这个方案简洁直接，易于实施，能够有效提升代码的可维护性和可追踪性。