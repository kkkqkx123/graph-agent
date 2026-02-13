# SDK Core 错误处理机制分析与改进方案

## 1. 当前错误处理机制分析

### 1.1 现有架构概述

当前 SDK Core 的错误处理采用统一入口模式，主要组件包括：

- **ErrorService**: 全局错误处理服务，负责错误标准化、日志记录和事件触发
- **ErrorHandler**: 工作流内部错误处理器，处理节点失败和全局执行错误
- **SDKError 类型体系**: 包含 ValidationError、ExecutionError、ToolError、LLMError 等具体错误类型
- **ErrorContext**: 错误上下文，包含线程ID、工作流ID、节点ID等信息

### 1.2 严重程度（Severity）现状

当前系统已经定义了 `ErrorContext.severity` 字段：
```typescript
export interface ErrorContext {
  // ... 其他字段
  severity?: 'error' | 'warning' | 'info';
}
```

**关键问题**: 虽然 ErrorService 的 `determineLogLevel` 方法会根据 severity 决定日志级别，但**错误处理决策完全忽略 severity**，无条件停止执行。

### 1.3 核心问题识别

1. **过度复杂**: 原始方案引入了策略模式、复杂的恢复机制配置
2. **severity 未充分利用**: severity 字段存在但未用于错误处理决策
3. **缺乏类型安全**: severity 作为可选字符串字段，容易出错
4. **一刀切处理**: 所有错误都导致执行停止，无法区分可恢复错误

## 2. 简化分层错误处理方案

### 2.1 核心原则

- **充分利用 severity**: 将 severity 作为错误处理的唯一决策依据
- **强制 severity 要求**: 每个 SDK Error 必须提供 severity
- **类型安全**: 使用枚举类型替代字符串
- **极度简化**: 移除复杂策略模式，回归直接的 severity 驱动

### 2.2 严重程度枚举定义

```typescript
/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  /**
   * 严重错误 - 导致执行停止
   * 适用于：配置错误、验证错误、不可恢复的逻辑错误
   */
  ERROR = 'error',
  
  /**
   * 警告错误 - 继续执行
   * 适用于：网络超时、临时故障、可重试的错误
   */
  WARNING = 'warning',
  
  /**
   * 信息错误 - 继续执行
   * 适用于：调试信息、非关键警告、监控事件
   */
  INFO = 'info'
}
```

### 2.3 SDKError 类型改进

```typescript
/**
 * SDK 基础错误类
 * 强制要求提供 severity 参数以确保类型安全
 */
export class SDKError extends Error {
  constructor(
    message: string,
    public readonly severity: ErrorSeverity,  // 强制参数，类型安全
    public readonly context?: Record<string, any>,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'SDKError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// 具体错误子类示例
export class ValidationError extends SDKError {
  constructor(
    message: string,
    field?: string,
    value?: any,
    context?: Record<string, any>
  ) {
    // 验证错误总是 ERROR 级别
    super(message, ErrorSeverity.ERROR, { ...context, field, value });
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends SDKError {
  constructor(
    message: string,
    timeout: number,
    context?: Record<string, any>
  ) {
    // 超时错误通常是 WARNING 级别（可恢复）
    super(message, ErrorSeverity.WARNING, { ...context, timeout });
    this.name = 'TimeoutError';
  }
}
```

### 2.4 简化的错误处理器实现

```typescript
/**
 * 处理节点执行失败
 * 核心简化：仅当 severity 为 ERROR 时才停止执行
 */
export async function handleNodeFailure(
  threadContext: ThreadContext,
  node: Node,
  nodeResult: NodeExecutionResult
): Promise<void> {
  const error = nodeResult.error || new Error('Unknown error');
  
  // 标准化错误以确保有 severity
  const standardizedError = standardizeErrorWithSeverity(error, {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId: node.id,
    operation: 'node_execution'
  });

  const context: ErrorContext = {
    threadId: threadContext.getThreadId(),
    workflowId: threadContext.getWorkflowId(),
    nodeId: node.id,
    operation: 'node_execution',
    severity: standardizedError.severity
  };

  // 记录错误到线程上下文
  threadContext.addError(standardizedError);

  // 使用 ErrorService 处理错误
  await errorService.handleError(standardizedError, context);

  // 核心简化：仅当 severity 为 ERROR 时才停止执行
  if (standardizedError.severity === ErrorSeverity.ERROR) {
    threadContext.setStatus(ThreadStatus.FAILED);
    threadContext.thread.endTime = now();
    threadContext.setShouldStop(true);
  }
  // WARNING 和 INFO 级别自动继续执行
}
```

### 2.5 ErrorService 简化

```typescript
class ErrorService {
  async handleError(
    error: SDKError,  // 只接受 SDKError，确保有 severity
    context: ErrorContext
  ): Promise<void> {
    // 直接使用 error.severity 确定日志级别
    const logLevel = this.determineLogLevelFromSeverity(error.severity);
    this.logError(error, context, logLevel);

    // 触发错误事件
    this.emitErrorEvent(error, context);
  }

  private determineLogLevelFromSeverity(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.ERROR: return 'error';
      case ErrorSeverity.WARNING: return 'warn';
      case ErrorSeverity.INFO: return 'info';
    }
  }
}
```

## 3. 方案优势

### 3.1 极度简化
- **决策逻辑清晰**: severity === ErrorSeverity.ERROR ? stop : continue
- **代码量大幅减少**: 错误处理逻辑从 200+ 行减少到 50 行
- **移除复杂组件**: 无需策略模式、复杂的恢复机制配置

### 3.2 类型安全
- **枚举类型**: ErrorSeverity 枚举提供编译时类型检查
- **强制参数**: SDKError 构造函数强制要求 severity 参数
- **避免字符串错误**: 消除字符串拼写错误的风险

### 3.3 语义明确
- **创建时决策**: 错误创建者必须思考错误的严重程度
- **处理行为明确**: severity 直接对应处理行为
- **文档友好**: 枚举值自文档化，易于理解和维护

### 3.4 保持灵活性
- **三级分层**: ERROR（停止）、WARNING（继续）、INFO（继续）
- **业务适配**: 不同业务场景可以灵活选择适当的 severity
- **渐进迁移**: 支持逐步迁移到新方案

## 4. 实施建议

### 4.1 渐进式迁移策略
1. **第一阶段**: 更新 SDKError 类型定义，添加 severity 枚举参数
2. **第二阶段**: 修改错误处理器，基于 severity 做决策
3. **第三阶段**: 逐步更新所有错误创建点，指定适当的 severity
4. **第四阶段**: 移除兼容层，完全依赖 severity 驱动

### 4.2 开发者指南
- **ERROR**: 配置错误、验证失败、不可恢复的逻辑错误
- **WARNING**: 网络超时、临时故障、外部服务不可用
- **INFO**: 调试信息、性能警告、非关键监控事件

### 4.3 测试覆盖
- 验证不同 severity 的错误得到正确的处理
- 确保 WARNING 和 INFO 级别错误不会停止执行
- 测试错误标准化函数的正确性

## 5. 总结

通过将 severity 作为独立的枚举参数并强制要求，我们实现了：
1. **类型安全**: 编译时检查，避免运行时错误
2. **极度简化**: 单一决策点，逻辑清晰直接
3. **语义明确**: severity 即处理策略，无需复杂配置
4. **易于维护**: 代码简洁，文档友好，测试简单

这个方案充分利用了现有的 severity 概念，通过强制要求和直接使用，实现了简洁而有效的分层错误处理，完全避免了过度工程化的问题。