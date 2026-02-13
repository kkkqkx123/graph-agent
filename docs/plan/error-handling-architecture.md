# SDK Core 错误处理架构设计方案

## 1. 当前错误处理机制分析

### 1.1 现有架构概述
当前SDK Core的错误处理采用统一入口模式，主要包含以下组件：

- **ErrorHandler**: 工作流内部错误处理器，负责处理节点失败和全局执行错误
- **ErrorService**: 全局错误处理服务，提供标准化、日志记录和事件触发
- **错误类型体系**: 基于SDKError的类型化错误体系

### 1.2 错误处理流程
1. **错误捕获**: 在ThreadExecutor、NodeExecutionCoordinator等组件中捕获异常
2. **错误标准化**: ErrorService将普通Error转换为对应的SDKError子类
3. **日志记录**: 根据错误类型和上下文确定日志级别
4. **事件触发**: 异步触发错误事件供外部监听
5. **状态更新**: 设置线程状态为FAILED并停止执行

### 1.3 现有错误类型
- `ValidationError`: 验证错误（配置、参数验证）
- `ExecutionError`: 执行错误（运行时逻辑错误）
- `ToolError`: 工具调用错误
- `LLMError`: LLM调用错误
- `NotFoundError`: 资源未找到错误
- `TimeoutError`: 超时错误
- `ConfigurationError`: 配置错误
- `NetworkError`: 网络错误
- `CodeExecutionError`: 脚本执行错误

### 1.4 当前局限性
- **单一处理策略**: 所有错误都采用相同的处理方式（停止执行）
- **缺乏恢复机制**: 没有重试、回退、降级等恢复能力
- **严重程度利用不足**: 虽然ErrorContext支持severity，但未充分利用
- **配置能力有限**: 无法在不同层级配置差异化的错误处理策略

## 2. 分层错误处理架构设计

### 2.1 设计原则
- **保持现有API兼容**: 不修改现有ErrorHandler和ErrorService的公共接口
- **基于现有错误类型**: 充分利用现有的SDKError类型体系
- **配置驱动**: 通过ErrorContext中的配置信息控制错误处理行为
- **策略模式**: 使用策略模式实现不同错误类型的差异化处理

### 2.2 架构分层

#### 第一层：错误检测层 (Error Detection)
- **职责**: 在各个执行组件中捕获异常，保持原始错误信息
- **实现位置**: ThreadExecutor、NodeExecutionCoordinator、LLMExecutionCoordinator等
- **关键改进**: 丰富ErrorContext信息，添加错误处理配置

#### 第二层：错误分类层 (Error Classification)  
- **职责**: 根据错误类型、上下文和配置信息进行分类
- **实现位置**: ErrorService.handleError方法内部
- **关键改进**: 基于错误类型选择不同的处理策略

#### 第三层：错误处理层 (Error Handling)
- **职责**: 执行具体的错误处理逻辑，包括日志记录、事件触发、状态更新
- **实现位置**: ErrorService内部的策略实现
- **关键改进**: 支持可恢复错误的继续执行

#### 第四层：错误恢复层 (Error Recovery)
- **职责**: 实现重试、回退、降级等恢复机制
- **实现位置**: ThreadExecutor中的错误处理逻辑
- **关键改进**: 根据错误处理结果决定是否重试或继续执行

## 3. 具体实现方案

### 3.1 ErrorService增强

#### 3.1.1 错误处理策略接口
```typescript
interface ErrorHandlingResult {
  shouldStop: boolean;
  shouldRetry?: boolean;
  retryDelay?: number;
}

interface ErrorHandlerStrategy {
  canHandle(error: SDKError, context: ErrorContext): boolean;
  handle(error: SDKError, context: ErrorContext): ErrorHandlingResult;
}
```

#### 3.1.2 具体策略实现

**ValidationErrorHandler**
```typescript
class ValidationErrorHandler implements ErrorHandlerStrategy {
  canHandle(error: SDKError): boolean {
    return error instanceof ValidationError;
  }
  
  handle(error: SDKError, context: ErrorContext): ErrorHandlingResult {
    // 验证错误不可恢复，必须停止
    return { shouldStop: true };
  }
}
```

**NetworkErrorHandler**
```typescript
class NetworkErrorHandler implements ErrorHandlerStrategy {
  canHandle(error: SDKError): boolean {
    return error instanceof NetworkError || 
           error instanceof LLMError ||
           error instanceof TimeoutError;
  }
  
  handle(error: SDKError, context: ErrorContext): ErrorHandlingResult {
    const retryCount = context['retryCount'] || 0;
    const maxRetries = context['maxRetries'] || 3;
    
    if (retryCount < maxRetries) {
      return { 
        shouldStop: false, 
        shouldRetry: true, 
        retryDelay: this.calculateBackoffDelay(retryCount) 
      };
    }
    
    return { shouldStop: true };
  }
  
  private calculateBackoffDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }
}
```

**ToolErrorHandler**
```typescript
class ToolErrorHandler implements ErrorHandlerStrategy {
  canHandle(error: SDKError): boolean {
    return error instanceof ToolError;
  }
  
  handle(error: SDKError, context: ErrorContext): ErrorHandlingResult {
    const recoveryStrategy = context['recoveryStrategy'] || 'abort';
    
    switch (recoveryStrategy) {
      case 'continue':
        return { shouldStop: false };
      case 'retry':
        const retryCount = context['retryCount'] || 0;
        const maxRetries = context['maxRetries'] || 2;
        if (retryCount < maxRetries) {
          return { 
            shouldStop: false, 
            shouldRetry: true, 
            retryDelay: context['retryDelay'] || 1000 
          };
        }
        return { shouldStop: true };
      default:
        return { shouldStop: true };
    }
  }
}
```

#### 3.1.3 ErrorService改造
```typescript
class ErrorService {
  private strategies: ErrorHandlerStrategy[] = [
    new ValidationErrorHandler(),
    new NetworkErrorHandler(), 
    new ToolErrorHandler(),
    new DefaultErrorHandler()
  ];
  
  async handleError(
    error: Error | SDKError,
    context: ErrorContext
  ): Promise<void> {
    const standardizedError = this.standardizeError(error, context);
    
    // 选择处理策略
    const strategy = this.strategies.find(s => s.canHandle(standardizedError, context));
    const handlingResult = strategy 
      ? strategy.handle(standardizedError, context)
      : { shouldStop: true };
    
    // 记录日志
    this.logError(standardizedError, context, handlingResult.shouldStop);
    
    // 触发事件
    this.emitErrorEvent(standardizedError, context);
    
    // 将处理结果存储到context中，供调用方使用
    context['errorHandlingResult'] = handlingResult;
  }
}
```

### 3.2 ThreadExecutor集成

#### 3.2.1 节点执行错误处理
```typescript
async executeThread(threadContext: ThreadContext): Promise<ThreadResult> {
  try {
    while (true) {
      // ... 执行逻辑
      
      if (nodeResult.status === 'FAILED') {
        const context: ErrorContext = {
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          nodeId: currentNode.id,
          operation: 'node_execution',
          // 从节点配置中获取错误处理配置
          ...this.getNodeErrorHandlingConfig(currentNode)
        };
        
        await errorService.handleError(nodeResult.error!, context);
        
        // 从context中获取处理结果
        const handlingResult = context['errorHandlingResult'] as ErrorHandlingResult;
        
        if (handlingResult.shouldStop) {
          await handleNodeFailure(threadContext, currentNode, nodeResult);
          break;
        } else if (handlingResult.shouldRetry) {
          // 执行重试逻辑
          await this.executeRetry(
            threadContext, 
            currentNode, 
            handlingResult.retryDelay || 1000
          );
          continue;
        } else {
          // 继续执行（如忽略错误的情况）
          this.routeToNextNode(threadContext, currentNode, nodeResult);
        }
      }
    }
  } catch (error) {
    // 全局错误处理保持不变
    await handleExecutionError(threadContext, error);
  }
}
```

#### 3.2.2 节点错误处理配置
```typescript
private getNodeErrorHandlingConfig(node: Node): Record<string, any> {
  const config = node.config as any;
  if (!config?.errorHandling) {
    return {};
  }
  
  return {
    maxRetries: config.errorHandling.maxRetries,
    retryDelay: config.errorHandling.retryDelay,
    recoveryStrategy: config.errorHandling.recoveryStrategy,
    // 其他配置...
  };
}
```

### 3.3 节点配置扩展

为了支持分层错误处理，需要在节点配置中添加错误处理选项：

```typescript
interface NodeConfig {
  // ... 现有配置
  
  /**
   * 错误处理配置
   */
  errorHandling?: {
    /**
     * 最大重试次数，默认为0（不重试）
     */
    maxRetries?: number;
    
    /**
     * 重试延迟（毫秒），默认为1000
     */
    retryDelay?: number;
    
    /**
     * 恢复策略：
     * - 'abort': 停止执行（默认）
     * - 'retry': 重试执行
     * - 'continue': 忽略错误，继续执行
     */
    recoveryStrategy?: 'abort' | 'retry' | 'continue';
  };
}
```

## 4. 错误处理策略映射表

| 错误类型 | 默认策略 | 可配置策略 | 说明 |
|---------|---------|-----------|------|
| ValidationError | abort | abort | 验证错误不可恢复 |
| ConfigurationError | abort | abort | 配置错误不可恢复 |
| NotFoundError | abort | abort | 资源不存在不可恢复 |
| ExecutionError | abort | retry, continue | 通用执行错误，可配置 |
| ToolError | abort | retry, continue | 工具错误，支持重试和忽略 |
| LLMError | retry | retry, continue | LLM错误，支持重试 |
| NetworkError | retry | retry, continue | 网络错误，支持重试 |
| TimeoutError | retry | retry, continue | 超时错误，支持重试 |

## 5. 使用示例

### 5.1 工作流配置
```yaml
nodes:
  - id: robust-llm-node
    type: LLM
    config:
      prompt: "{{input}}"
      profileId: "gpt-4"
      errorHandling:
        maxRetries: 3
        retryDelay: 2000
        recoveryStrategy: retry

  - id: optional-tool-node  
    type: TOOL_CALL
    config:
      toolName: "optional-service"
      errorHandling:
        recoveryStrategy: continue  # 工具失败不影响整体流程
```

### 5.2 自定义错误处理
```typescript
// 在ErrorContext中添加自定义配置
const context: ErrorContext = {
  threadId: "thread-123",
  workflowId: "workflow-456", 
  operation: "custom_operation",
  // 自定义错误处理配置
  maxRetries: 5,
  recoveryStrategy: "retry"
};

await errorService.handleError(error, context);
```

## 6. 监控和可观测性

### 6.1 错误指标
- 错误类型分布统计
- 错误恢复成功率
- 平均重试次数
- 错误解决时间

### 6.2 日志增强
- 在错误日志中包含处理策略信息
- 记录重试次数和恢复动作
- 区分可恢复和不可恢复错误

## 7. 实施计划

### 7.1 第一阶段：核心改造
- 修改ErrorService以支持策略模式
- 实现基本的错误处理策略
- 更新ThreadExecutor集成

### 7.2 第二阶段：配置支持  
- 扩展节点配置以支持错误处理选项
- 实现配置解析和验证
- 更新文档和示例

### 7.3 第三阶段：监控增强
- 添加错误指标收集
- 增强日志记录
- 提供错误分析工具

## 8. 风险评估和缓解

### 8.1 潜在风险
- **性能影响**: 策略选择和处理可能增加开销
- **复杂性增加**: 错误处理逻辑变得更加复杂
- **向后兼容性**: 现有代码可能依赖特定的错误处理行为

### 8.2 缓解措施
- **性能优化**: 策略选择使用简单的类型检查，避免复杂计算
- **渐进式启用**: 默认保持现有行为，通过配置启用新功能
- **充分测试**: 全面的单元测试和集成测试确保正确性

## 9. 总结

本设计方案在保持现有错误处理架构的基础上，通过引入策略模式和配置驱动的方式，实现了分层的错误处理能力。方案充分利用了现有的SDKError类型体系和ErrorContext机制，无需重大架构改动即可显著提升系统的错误恢复能力和灵活性。

通过该方案，SDK Core将能够：
- 根据错误类型自动选择合适的处理策略
- 支持配置化的错误恢复行为
- 提供更好的可观测性和监控能力
- 保持向后兼容性，平滑迁移

这将为构建高可用、高韧性的工作流执行引擎奠定坚实基础。