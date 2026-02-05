# SDK API 改造分阶段执行方案

## 总体目标

采用Command模式改造SDK API，提供更简洁、统一、易用的接口。

## 分阶段执行计划

### 阶段1：Command模式基础设施（当前阶段）

**目标**：建立Command模式的基础设施，为后续API改造提供支持

**任务清单**：
- [x] 创建统一的执行结果类型 (`ExecutionResult<T>`)
- [x] 创建统一的执行选项类型 (`ExecutionOptions`)
- [ ] 创建Command接口和基础实现
- [ ] 创建CommandExecutor执行器
- [ ] 创建CommandMiddleware中间件系统
- [ ] 创建常用Command实现（日志、验证、缓存等中间件）

**交付物**：
- `sdk/api/types/execution-result.ts` ✓
- `sdk/api/types/execution-options.ts` ✓
- `sdk/api/core/command.ts`
- `sdk/api/core/command-executor.ts`
- `sdk/api/core/command-middleware.ts`

### 阶段2：核心API改造（高优先级）

**目标**：使用Command模式重构核心执行API

**任务清单**：
- [ ] 重构ThreadExecutorAPI，使用Command模式
- [ ] 重构LLMAPI，使用Command模式
- [ ] 重构ToolAPI，使用Command模式
- [ ] 更新ScriptAPI，使用Command模式
- [ ] 创建对应的Command类

**交付物**：
- `sdk/api/operations/core/execution/thread-executor-api.ts` (新版本)
- `sdk/api/operations/core/llm/llm-api.ts` (新版本)
- `sdk/api/operations/core/tools/tool-api.ts` (新版本)
- `sdk/api/operations/core/scripts/script-api.ts` (新版本)
- `sdk/api/operations/core/commands/` (Command类目录)

### 阶段3：监控API改造（中优先级）

**目标**：使用Command模式重构监控查询API

**任务清单**：
- [ ] 重构MessageAPI，简化查询选项
- [ ] 分离EventAPI和EventHistoryAPI
- [ ] 创建只读StateAPI
- [ ] 创建对应的Command类

**交付物**：
- `sdk/api/operations/monitoring/messages/message-api.ts` (新版本)
- `sdk/api/operations/monitoring/events/event-api.ts` (新版本)
- `sdk/api/operations/monitoring/events/event-history-api.ts` (新版本)
- `sdk/api/operations/monitoring/state/state-api.ts` (新版本)

### 阶段4：管理API改造（低优先级）

**目标**：使用Command模式重构管理API

**任务清单**：
- [ ] 简化CheckpointAPI
- [ ] 简化TriggerAPI
- [ ] 创建对应的Command类

**交付物**：
- `sdk/api/operations/management/checkpoints/checkpoint-api.ts` (新版本)
- `sdk/api/operations/management/triggers/trigger-api.ts` (新版本)

### 阶段5：集成和测试

**目标**：集成所有新API，更新SDK主类，完成测试

**任务清单**：
- [ ] 更新`sdk/api/index.ts`导出
- [ ] 更新`sdk/api/core/sdk.ts`主类
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新文档和示例

**交付物**：
- 更新的`sdk/api/index.ts`
- 更新的`sdk/api/core/sdk.ts`
- 完整的测试套件
- 更新的文档

### 阶段6：向后兼容和迁移

**目标**：保持向后兼容，提供迁移指南

**任务清单**：
- [ ] 保留旧API文件，标记为`@deprecated`
- [ ] 创建兼容层，旧API内部调用新API
- [ ] 编写迁移指南
- [ ] 提供迁移工具（可选）

**交付物**：
- 标记为deprecated的旧API文件
- 迁移指南文档
- 迁移工具（可选）

## Command模式设计

### 核心接口

```typescript
// Command接口
interface Command<T> {
  execute(): Promise<ExecutionResult<T>>;
  undo?(): Promise<ExecutionResult<void>>;
  validate(): ValidationResult;
  getMetadata(): CommandMetadata;
}

// Command元数据
interface CommandMetadata {
  name: string;
  description: string;
  category: 'execution' | 'monitoring' | 'management';
  requiresAuth: boolean;
}

// 验证结果
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### CommandExecutor

```typescript
class CommandExecutor {
  private middleware: CommandMiddleware[] = [];
  
  addMiddleware(middleware: CommandMiddleware): void;
  async execute<T>(command: Command<T>): Promise<ExecutionResult<T>>;
}
```

### CommandMiddleware

```typescript
interface CommandMiddleware {
  beforeExecute<T>(command: Command<T>): Promise<void>;
  afterExecute<T>(command: Command<T>, result: ExecutionResult<T>): Promise<void>;
  onError<T>(command: Command<T>, error: Error): Promise<void>;
}
```

### 内置中间件

1. **LoggingMiddleware**: 记录命令执行日志
2. **ValidationMiddleware**: 验证命令参数
3. **CacheMiddleware**: 缓存命令结果
4. **MetricsMiddleware**: 收集执行指标
5. **RetryMiddleware**: 自动重试失败命令

## 使用示例

### 旧API方式
```typescript
const executor = new ThreadExecutorAPI();
const result = await executor.executeWorkflow(workflowId, options);
```

### 新API方式（Command模式）
```typescript
const executor = new CommandExecutor();
const command = new ExecuteWorkflowCommand(workflowId, options);
const result = await executor.execute(command);
```

### 简化的API方式（封装Command）
```typescript
const api = new ThreadExecutorAPI();
const result = await api.executeWorkflow(workflowId, options);
// 内部使用Command模式，但对外保持简洁接口
```

## 预期收益

1. **统一的执行模式**：所有操作都通过Command执行
2. **更好的可扩展性**：通过中间件系统轻松添加功能
3. **更好的可测试性**：Command可以独立测试
4. **更好的可维护性**：清晰的职责分离
5. **向后兼容**：通过封装保持简洁的API接口

## 风险和缓解措施

### 风险1：过度设计
**缓解措施**：保持API接口简洁，Command模式在内部使用

### 风险2：性能开销
**缓解措施**：中间件可选，默认只启用必要的中间件

### 风险3：迁移成本
**缓解措施**：保持向后兼容，提供迁移指南

## 时间估算

- 阶段1：2-3天
- 阶段2：5-7天
- 阶段3：3-4天
- 阶段4：2-3天
- 阶段5：3-4天
- 阶段6：2-3天

**总计**：17-24天