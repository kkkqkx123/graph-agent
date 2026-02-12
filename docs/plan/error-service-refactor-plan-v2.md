# ErrorService 重构计划 (V2)

## 概述

根据用户反馈，调整重构策略：
- 工作流内部错误处理保持函数式导出模式
- 创建 ErrorService 作为统一协调层
- 不需要向后兼容，可以移除旧的函数

## 架构设计

### 双层架构模式

```
┌─────────────────────────────────┐
│        ErrorService             │ ← 全局单例服务
│  (统一协调、全局错误处理)       │
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│    error-handler.ts            │ ← 函数式模块
│  (工作流内部错误处理逻辑)      │
└─────────────────────────────────┘
```

### 职责分离

#### ErrorService (全局服务层)
- **职责**：全局错误处理、事件协调、日志管理
- **使用场景**：SDK 外部调用、全局异常处理
- **接口**：
  ```typescript
  handleError(error: Error | SDKError, context: ErrorContext): Promise<ErrorHandlingResult>
  ```

#### error-handler.ts (工作流内部层)
- **职责**：工作流特定的错误处理逻辑
- **使用场景**：ThreadExecutor 内部调用
- **接口**：
  ```typescript
  handleNodeFailure(threadContext: ThreadContext, node: Node, nodeResult: NodeExecutionResult): Promise<void>
  handleExecutionError(threadContext: ThreadContext, error: any): Promise<void>
  ```

## 详细实施步骤

### 阶段 1：简化 error-handler.ts

**目标**：移除不必要的参数，简化接口

**修改内容**：
```typescript
// 移除 eventManager 参数，改为从 ExecutionContext 获取
export async function handleNodeFailure(
  threadContext: ThreadContext,
  node: Node,
  nodeResult: NodeExecutionResult
): Promise<void> {
  // 从 threadContext 或全局上下文获取 eventManager
  const eventManager = getGlobalEventManager();
  // ... 现有逻辑
}

export async function handleExecutionError(
  threadContext: ThreadContext,
  error: any
): Promise<void> {
  const eventManager = getGlobalEventManager();
  // ... 现有逻辑  
}
```

### 阶段 2：创建 ErrorService

**文件**：`sdk/core/services/error-service.ts`

**实现**：
```typescript
export class ErrorService {
  constructor(private eventManager: EventManager) {}
  
  async handleError(
    error: Error | SDKError,
    context: ErrorContext,
    strategy: ErrorHandlingStrategy = ErrorHandlingStrategy.STOP_ON_ERROR
  ): Promise<ErrorHandlingResult> {
    // 直接使用现有的 handleError 逻辑
    return handleError(error, context, this.eventManager, strategy);
  }
}
```

### 阶段 3：集成到全局架构

**修改**：
- `singleton-registry.ts`：注册 ErrorService
- `execution-context.ts`：添加 getErrorService 方法

### 阶段 4：更新 ThreadExecutor

**修改**：
- 移除 eventManager 参数传递
- 直接调用简化后的函数

### 阶段 5：清理旧代码

**移除**：
- 原有的 handleError 函数导出（如果不需要外部调用）
- 所有向后兼容的代码

## 关键决策点

### 1. 全局 EventManager 获取方式
- **选项A**：通过 SingletonRegistry 获取
- **选项B**：通过 ExecutionContext 传递
- **推荐**：选项A，更简单直接

### 2. 错误处理策略配置
- **选项A**：ErrorService 接受策略参数
- **选项B**：策略在 ErrorService 内部配置
- **推荐**：选项A，保持灵活性

### 3. 日志记录方式
- **选项A**：继续使用现有的 logger
- **选项B**：通过 ErrorService 注入 Logger
- **推荐**：选项A，避免过度工程化

## 最终架构

### 文件结构
```
sdk/core/
├── services/
│   └── error-service.ts          # 全局 ErrorService
├── execution/
│   ├── handlers/
│   │   └── error-handler.ts      # 工作流内部错误处理函数
│   └── thread-executor.ts        # 使用简化后的错误处理函数
```

### 调用关系
- **ThreadExecutor** → **error-handler.ts** (函数调用)
- **外部代码** → **ErrorService** (服务调用)
- **error-handler.ts** → **ErrorService.handleError** (内部调用)

## 优势

1. **职责清晰**：工作流内部 vs 全局错误处理分离
2. **架构一致**：ErrorService 符合项目的服务化模式
3. **简化使用**：工作流内部调用无需传递 eventManager
4. **无兼容负担**：可以完全移除旧的复杂接口
5. **易于维护**：核心逻辑集中在一处，接口简洁

## 验收标准

- [ ] ThreadExecutor 能正常处理节点失败和执行错误
- [ ] ErrorService 提供完整的全局错误处理能力
- [ ] 代码更加简洁，移除了不必要的参数传递
- [ ] 架构符合项目的整体设计风格
- [ ] 测试覆盖所有关键路径