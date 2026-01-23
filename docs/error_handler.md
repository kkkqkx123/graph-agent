# 错误处理模块设计

## 架构分析

### 现状
- 旧的错误处理器 [`src/infrastructure/common/error-handlers/error-handler.ts`](../src/infrastructure/common/error-handlers/error-handler.ts) 已被删除
- 领域层各模块已有完整的错误定义（workflow、node、state、thread、tool、session、prompt、llm）
- [`ErrorHandlingStrategy`](../src/domain/workflow/value-objects/error-handling-strategy.ts) 作为值对象在 workflow 中发挥作用

### 关键结论
**领域层错误定义不是多余的，而是必要的**：
- 各模块都有基类错误和具体子类错误
- 错误包含 code 字段和详细上下文信息
- 是领域模型的重要组成部分

**不需要在 domain/common/types 添加错误定义**：
- 现有错误定义已满足需求
- 层次结构清晰，符合 DDD 原则

## 架构设计

### 领域层（Domain Layer）
保持现状，无需修改。各模块的错误定义已完善。

### 服务层（Services Layer）

**核心服务**：[`src/services/error-processing.ts`](../src/services/error-processing.ts)

```typescript
export class ErrorProcessing {
  async handleError(
    error: Error,
    context: {
      component: string;
      operation: string;
      entityId?: string;
      metadata?: Record<string, any>;
      retryable?: boolean;
    }
  ): Promise<ErrorHandlingDecision>

  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: { component: string; operation: string; entityId?: string; metadata?: Record<string, any> },
    options?: { maxRetries?: number; retryDelay?: number; fallbackValue?: T }
  ): Promise<T | undefined>
}
```

**恢复策略接口**：[`src/services/error-recovery.ts`](../src/services/error-recovery.ts)

```typescript
export interface ErrorRecoveryStrategy {
  canHandle(error: Error, context: any): boolean;
  handle(error: Error, context: any): Promise<ErrorHandlingDecision>;
}

export interface ErrorHandlingDecision {
  action: 'retry' | 'fallback' | 'continue' | 'throw';
  error?: Error;
  retryCount?: number;
  retryDelay?: number;
  fallbackValue?: any;
}
```

### 基础设施层（Infrastructure Layer）

**错误日志**：[`src/infrastructure/logging/error-logger.ts`](../src/infrastructure/logging/error-logger.ts)

```typescript
export class ErrorLogger {
  logError(error: Error, context: {
    component: string;
    operation: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }): void
}
```

**错误监控**：[`src/infrastructure/monitoring/error-monitor.ts`](../src/infrastructure/monitoring/error-monitor.ts)

```typescript
export interface ErrorMonitor {
  onError(error: Error, context: any): Promise<void>;
}
```

### 应用层（Application Layer）

**统一响应格式**：[`src/application/middleware/error-handler.ts`](../src/application/middleware/error-handler.ts)

```typescript
export class ErrorResponseFormatter {
  static format(error: Error, requestId: string): ErrorResponse
}

export interface ErrorResponse {
  requestId: string;
  timestamp: string;
  error: {
    code: string;
    message: string;
    type: string;
    details?: Record<string, any>;
    entityId?: string;
  };
}
```

## 目录结构

```
src/
├── domain/                    # 领域层 - 保持现有错误定义
│   ├── workflow/exceptions/
│   ├── state/exceptions/
│   └── ...
├── services/                  # 服务层 - 错误处理协调
│   ├── error-processing.ts
│   ├── error-recovery.ts
│   └── recovery-strategies/
│       ├── retry-strategy.ts
│       ├── fallback-strategy.ts
│       └── circuit-breaker-strategy.ts
├── infrastructure/            # 基础设施层 - 技术支持
│   ├── logging/error-logger.ts
│   └── monitoring/error-monitor.ts
└── application/               # 应用层 - 统一响应
    ├── middleware/error-handler.ts
    └── formatters/error-response.ts
```

## 使用示例

```typescript
// 在服务中使用
export class WorkflowExecution {
  constructor(private readonly errorProcessing: ErrorProcessing) {}

  async executeNode(node: Node, context: ExecutionContext): Promise<NodeResult> {
    return this.errorProcessing.executeWithErrorHandling(
      async () => await this.runNode(node, context),
      {
        component: 'workflow',
        operation: 'executeNode',
        entityId: node.id,
        metadata: { workflowId: context.workflowId },
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
        fallbackValue: { success: false, error: '节点执行失败' },
      }
    );
  }
}
```

## 实施优先级

1. 实现 [`ErrorProcessing`](../src/services/error-processing.ts) 服务和 [`ErrorResponseFormatter`](../src/application/formatters/error-response.ts)
2. 添加基础设施层的日志和监控支持
3. 实现具体的恢复策略（重试、熔断等）
4. 在现有服务中逐步集成错误处理