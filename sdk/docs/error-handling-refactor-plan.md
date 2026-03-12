# 错误处理重构方案

## 背景

在分析 `sdk/graph/execution/handlers/error-handler.ts` 是否多余时，发现了当前错误处理架构的问题。

## 1. error-handler.ts 分析结论

### 状态：已删除

**文件**：`sdk/graph/execution/handlers/error-handler.ts`

**分析结果**：
- 该文件导出 `handleNodeFailure` 和 `handleExecutionError` 两个函数
- 这两个函数**从未被实际代码使用**，仅在测试文件 `thread-executor.test.ts` 中被 mock
- 测试用例也是不完整的，只是 mock 了调用但未验证实际行为

**已完成的修改**：
- ✅ 删除了 `error-handler.ts` 文件
- ✅ 删除了测试文件中的相关 mock 代码
- ✅ 删除了不完整的错误处理测试用例

## 2. 当前错误处理架构问题

### 2.1 混合使用两种方式

**Agent 模块**：
- 使用 `agent-error-handler.ts` 统一处理错误
- 通过 ErrorService 记录日志和触发事件
- 支持 severity 驱动的错误处理

**Graph 模块**：
- 多处直接使用 `logger.error/warn` 记录错误
- 未使用 ErrorService 进行统一处理
- 缺少统一的 ERROR 事件触发机制

### 2.2 代码重复

`agent-error-handler.ts` 和已删除的 `error-handler.ts` 有高度相似的逻辑：
- 错误标准化为 SDKError
- 调用 ErrorService 处理
- 基于 severity 判断是否停止执行

### 2.3 无效注释

代码中有大量注释：
```
// 抛出 X 错误，由 ErrorService 统一处理
```

但实际上只是抛出错误，并未调用 ErrorService，导致这些注释误导开发者。

## 3. 统一错误处理建议

### 3.1 核心目标

所有错误通过 ErrorService 统一处理，不再直接调用 `logger.error`。

### 3.2 优势

1. **架构一致性**：ErrorService 已在 DI 容器中注册，设计目标就是统一错误处理
2. **避免重复日志**：防止既调用 `logger.error` 又通过 ErrorService 记录造成重复
3. **统一事件触发**：ErrorService 会触发统一的 ERROR 事件，便于全局监控和处理
4. **Severity 驱动**：支持基于 severity 的错误处理策略（ERROR 停止，WARNING/INFO 继续）
5. **已有良好实践**：Agent 模块的 `agent-error-handler.ts` 已经证明了可行性

### 3.3 实施建议

1. 在 Graph 模块的关键位置使用 ErrorService
2. 所有错误通过 ErrorService 处理，不再直接调用 `logger.error`
3. 保留 `logger.warn/info` 用于非错误级别的日志记录
4. 移除无效的注释 `// 抛出 X 错误，由 ErrorService 统一处理`

## 4. 架构优化建议：在 core 提供通用错误处理

### 4.1 当前问题

- `agent-error-handler.ts` 和已删除的 `error-handler.ts` 有大量重复代码
- 错误标准化、ErrorService 调用、severity 判断等逻辑在多个模块重复
- 违反 DRY 原则

### 4.2 推荐方案

在 `sdk/core/utils/` 创建通用错误处理工具，提取公共逻辑。

#### 4.2.1 文件结构

```
sdk/core/
├── services/
│   └── error-service.ts (已有)
└── utils/
    └── error-handler.ts (新建) - 通用错误处理工具
```

#### 4.2.2 通用工具函数

```typescript
/**
 * 标准化错误为 SDKError
 * 如果已经是 SDKError，直接返回；否则包装为 SDKError
 */
export function standardizeError(error: Error, context: ErrorContext): SDKError

/**
 * 判断是否为可恢复错误
 * WARNING 和 INFO 级别可恢复，ERROR 级别不可恢复
 */
export function isRecoverableError(error: SDKError): boolean

/**
 * 使用 ErrorService 处理错误
 * 记录日志并触发错误事件
 */
export async function handleErrorWithService(error: SDKError, context: ErrorContext): Promise<void>

/**
 * 处理中断错误
 * 检测并处理 AbortSignal 中断
 */
export async function handleInterruption(signal: AbortSignal, context: ErrorContext): Promise<boolean>
```

#### 4.2.3 模块使用方式

```typescript
// agent-error-handler.ts
import { standardizeError, handleErrorWithService } from '@modular-agent/core/utils/error-handler';

// 模块特定的上下文构建
function buildContext(entity: AgentLoopEntity, operation: string): ErrorContext {
  return {
    threadId: entity.id,
    nodeId: entity.nodeId,
    operation,
    iteration: entity.state.currentIteration,
    toolCallCount: entity.state.toolCallCount
  };
}

// 使用通用工具
export async function handleAgentError(
  entity: AgentLoopEntity,
  error: Error,
  operation: string,
  additionalContext?: Partial<ErrorContext>
): Promise<SDKError> {
  const context = buildContext(entity, operation, additionalContext);
  const standardizedError = standardizeError(error, context);
  await handleErrorWithService(standardizedError, context);

  // 模块特定的状态管理
  if (standardizedError.severity === 'error') {
    entity.state.fail(standardizedError);
  }
  return standardizedError;
}
```

### 4.3 优势

1. ✅ 避免代码重复
2. ✅ 统一错误处理逻辑
3. ✅ 易于维护和测试
4. ✅ 各模块只需要关注特定的上下文和状态管理
5. ✅ 符合单一职责原则

## 5. 后续实施步骤

### 阶段一：创建通用错误处理工具（推荐优先）

1. 创建 `sdk/core/utils/error-handler.ts`
2. 提取公共函数：`standardizeError`, `isRecoverableError`, `handleErrorWithService`, `handleInterruption`
3. 编写单元测试
4. 更新 `sdk/core/utils/index.ts` 导出

### 阶段二：重构 Agent 模块

1. 修改 `agent-error-handler.ts` 使用通用工具
2. 保留模块特定的上下文构建和状态管理
3. 更新测试用例
4. 验证功能正常

### 阶段三：重构 Graph 模块

1. 在关键位置使用 ErrorService 处理错误
2. 移除直接调用 `logger.error` 的代码
3. 触发统一的 ERROR 事件
4. 更新测试用例
5. 验证功能正常

### 阶段四：清理和验证

1. 移除所有无效的 ErrorService 注释
2. 运行完整的测试套件
3. 进行类型检查：`pnpm typecheck`
4. 检查是否有遗漏的错误处理点

## 6. 注意事项

1. **向后兼容**：确保重构不破坏现有 API
2. **测试覆盖**：每个改动都需要有对应的测试
3. **渐进式重构**：可以分阶段进行，每阶段验证后再继续
4. **文档更新**：更新相关文档说明错误处理机制

## 7. 相关文件

- `sdk/core/services/error-service.ts` - ErrorService 实现
- `sdk/agent/execution/handlers/agent-error-handler.ts` - Agent 错误处理
- `sdk/graph/execution/coordinators/node-execution-coordinator.ts` - 节点执行协调器（需要重构）
- `sdk/graph/execution/coordinators/llm-execution-coordinator.ts` - LLM 执行协调器（需要重构）