# Context重构迁移指南

## 已完成的工作

### 1. 实体层（sdk/core/entities）
- ✅ 创建 `execution-state.ts` - 执行状态管理器
- ✅ 创建 `thread-entity.ts` - Thread实体
- ✅ 更新 `entities/index.ts` - 导出新实体

### 2. 管理器层（sdk/core/execution/managers）
- ✅ 创建 `tool-visibility-manager.ts` - 工具可见性管理器
- ✅ 更新 `managers/index.ts` - 导出新管理器

### 3. 协调器层（sdk/core/execution/coordinators）
- ✅ 创建 `thread-execution-coordinator.ts` - Thread执行协调器
- ✅ 更新 `coordinators/index.ts` - 导出新协调器

### 4. 执行器重构
- ✅ 重构 `thread-builder.ts` - 使用ThreadEntity替代ThreadContext
- ✅ 重构 `thread-executor.ts` - 使用ThreadEntity和ThreadExecutionCoordinator

### 5. DI容器配置
- ✅ 更新 `container-config.ts` - 移除ExecutionContext绑定，更新ThreadExecutor和ThreadBuilder绑定
- ✅ 更新 `service-identifiers.ts` - 移除ExecutionContext标识符，添加ToolVisibilityManager标识符

### 6. 导出更新
- ✅ 更新 `execution/index.ts` - 导出ThreadEntity，移除ThreadContext和ExecutionContext

## 剩余工作

### 阶段1：更新核心服务（高优先级）

#### 1.1 更新 ThreadRegistry
**文件**: `sdk/core/services/thread-registry.ts`

**修改内容**:
```typescript
// 修改前
import { ThreadContext } from '../execution/context/thread-context.js';
export class ThreadRegistry {
  private threadContexts: Map<string, ThreadContext> = new Map();
  register(threadContext: ThreadContext): void { ... }
  get(threadId: string): ThreadContext | null { ... }
}

// 修改后
import { ThreadEntity } from '../entities/thread-entity.js';
export class ThreadRegistry {
  private threadEntities: Map<string, ThreadEntity> = new Map();
  register(threadEntity: ThreadEntity): void { ... }
  get(threadId: string): ThreadEntity | null { ... }
}
```

#### 1.2 更新 TaskRegistry
**文件**: `sdk/core/services/task-registry.ts`

**修改内容**:
```typescript
// 修改前
import type { ThreadContext } from '../execution/context/thread-context.js';
register(threadContext: ThreadContext, manager: TaskManager, timeout?: number): string { ... }

// 修改后
import type { ThreadEntity } from '../entities/thread-entity.js';
register(threadEntity: ThreadEntity, manager: TaskManager, timeout?: number): string { ... }
```

#### 1.3 更新 ScriptService
**文件**: `sdk/core/services/script-service.ts`

**修改内容**:
```typescript
// 修改前
import type { ThreadContext } from '../execution/context/thread-context.js';
executeScript(scriptId: string, options: Partial<ScriptExecutionOptions> = {}, threadContext?: ThreadContext): Promise<...>

// 修改后
import type { ThreadEntity } from '../entities/thread-entity.js';
executeScript(scriptId: string, options: Partial<ScriptExecutionOptions> = {}, threadEntity?: ThreadEntity): Promise<...>
```

### 阶段2：更新协调器（中优先级）

#### 2.1 更新 ThreadLifecycleCoordinator
**文件**: `sdk/core/execution/coordinators/thread-lifecycle-coordinator.ts`

**修改内容**:
```typescript
// 修改前
import { ExecutionContext } from '../context/execution-context.js';
export class ThreadLifecycleCoordinator {
  private executionContext: ExecutionContext;
  constructor(executionContext?: ExecutionContext) { ... }
}

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { WorkflowRegistry } from '../../services/workflow-registry.js';
export class ThreadLifecycleCoordinator {
  constructor(
    private readonly threadRegistry: ThreadRegistry,
    private readonly threadLifecycleManager: ThreadLifecycleManager,
    private readonly threadCascadeManager: ThreadCascadeManager,
    private readonly threadExecutor: ThreadExecutor,
    private readonly workflowRegistry: WorkflowRegistry
  ) {}
}
```

#### 2.2 更新 VariableCoordinator
**文件**: `sdk/core/execution/coordinators/variable-coordinator.ts`

**修改内容**:
```typescript
// 修改前
import type { ThreadContext } from '../context/thread-context.js';
getVariable(threadContext: ThreadContext, name: string): any { ... }

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
getVariable(threadEntity: ThreadEntity, name: string): any { ... }
```

#### 2.3 更新 ToolVisibilityCoordinator
**文件**: `sdk/core/execution/coordinators/tool-visibility-coordinator.ts`

**修改内容**:
```typescript
// 修改前
import type { ThreadContext } from '../context/thread-context.js';
async updateVisibilityOnScopeChange(threadContext: ThreadContext, ...): Promise<void> { ... }

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
async updateVisibilityOnScopeChange(threadEntity: ThreadEntity, ...): Promise<void> { ... }
```

#### 2.4 更新 NodeExecutionCoordinator
**文件**: `sdk/core/execution/coordinators/node-execution-coordinator.ts`

**修改内容**:
```typescript
// 修改前
import { ThreadContext } from '../context/thread-context.js';
async executeNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> { ... }

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
async executeNode(threadEntity: ThreadEntity, node: Node): Promise<NodeExecutionResult> { ... }
```

### 阶段3：更新管理器（中优先级）

#### 3.1 更新 TriggeredSubworkflowManager
**文件**: `sdk/core/execution/managers/triggered-subworkflow-manager.ts`

**修改内容**:
```typescript
// 修改前
import { ThreadContext } from '../context/thread-context.js';
import { ExecutionContext } from '../context/execution-context.js';
constructor(executionContext: ExecutionContext, config?: SubworkflowManagerConfig) { ... }

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
constructor(
  private readonly threadRegistry: ThreadRegistry,
  private readonly threadBuilder: ThreadBuilder,
  private readonly taskQueueManager: TaskQueueManager,
  config?: SubworkflowManagerConfig
) { ... }
```

#### 3.2 更新 DynamicThreadManager
**文件**: `sdk/core/execution/managers/dynamic-thread-manager.ts`

**修改内容**:
```typescript
// 修改前
import { ThreadContext } from '../context/thread-context.js';
import { ExecutionContext } from '../context/execution-context.js';
constructor(executionContext: ExecutionContext, taskRegistry: TaskRegistry, ...) { ... }

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
constructor(
  private readonly threadRegistry: ThreadRegistry,
  private readonly threadBuilder: ThreadBuilder,
  private readonly taskRegistry: TaskRegistry,
  private readonly taskQueueManager: TaskQueueManager,
  private readonly eventManager: EventManager,
  ...
) { ... }
```

#### 3.3 更新 TaskQueueManager
**文件**: `sdk/core/execution/managers/task-queue-manager.ts`

**修改内容**:
```typescript
// 修改前
import type { ThreadContext } from '../context/thread-context.js';
async submitSync(taskId: string, threadContext: ThreadContext, timeout?: number): Promise<...> { ... }

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
async submitSync(taskId: string, threadEntity: ThreadEntity, timeout?: number): Promise<...> { ... }
```

### 阶段4：更新处理器（低优先级）

#### 4.1 更新所有处理器文件
需要更新的处理器文件列表：
- `handlers/triggered-subgraph-handler.ts`
- `handlers/subgraph-handler.ts`
- `handlers/human-relay-handler.ts`
- `handlers/error-handler.ts`
- `handlers/node-handlers/add-tool-handler.ts`
- `handlers/node-handlers/continue-from-trigger-handler.ts`
- `handlers/node-handlers/llm-handler.ts`
- `handlers/trigger-handlers/set-variable-handler.ts`
- `handlers/trigger-handlers/stop-thread-handler.ts`
- `handlers/trigger-handlers/skip-node-handler.ts`
- `handlers/trigger-handlers/resume-thread-handler.ts`
- `handlers/trigger-handlers/pause-thread-handler.ts`
- `handlers/trigger-handlers/execute-triggered-subgraph-handler.ts`
- `handlers/tool-handlers/create-thread-handler.ts`

**通用修改模式**:
```typescript
// 修改前
import type { ThreadContext } from '../context/thread-context.js';
import { ExecutionContext } from '../context/execution-context.js';

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
// 移除 ExecutionContext 依赖，通过构造函数注入所需服务
```

### 阶段5：更新工具函数（低优先级）

#### 5.1 更新工具函数文件
需要更新的工具函数文件列表：
- `utils/workflow-reference-checker.ts`
- `utils/variable-accessor.ts`
- `utils/thread-operations.ts`

**通用修改模式**:
```typescript
// 修改前
import type { ThreadContext } from '../context/thread-context.js';

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
```

### 阶段6：更新类型定义（低优先级）

#### 6.1 更新类型定义文件
需要更新的类型定义文件列表：
- `types/triggered-subgraph.types.ts`
- `types/task.types.ts`
- `types/dynamic-thread.types.ts`

**通用修改模式**:
```typescript
// 修改前
import type { ThreadContext } from '../context/thread-context.js';

// 修改后
import type { ThreadEntity } from '../../entities/thread-entity.js';
```

### 阶段7：删除旧代码

#### 7.1 删除context目录
```bash
rm -rf sdk/core/execution/context/
```

#### 7.2 删除context导出
从 `sdk/core/execution/context/index.ts` 中删除所有导出（该文件将被删除）

### 阶段8：更新测试

#### 8.1 更新测试文件
需要更新的测试文件列表：
- `execution/__tests__/thread-executor.test.ts`
- `execution/utils/__tests__/workflow-reference-checker.test.ts`
- `execution/utils/__tests__/variable-accessor.test.ts`
- `execution/utils/__tests__/thread-operations.test.ts`
- `execution/utils/__tests__/hook-creators.test.ts`
- `execution/utils/event/__tests__/event-builder.test.ts`

**通用修改模式**:
```typescript
// 修改前
import { ThreadContext } from '../context/thread-context.js';
import { ExecutionContext } from '../context/execution-context.js';

// 修改后
import { ThreadEntity } from '../../entities/thread-entity.js';
// 使用 mock ThreadEntity 替代 mock ThreadContext
```

## 迁移策略

### 推荐的迁移顺序
1. **阶段1**: 更新核心服务（ThreadRegistry, TaskRegistry, ScriptService）
2. **阶段2**: 更新协调器（ThreadLifecycleCoordinator, VariableCoordinator等）
3. **阶段3**: 更新管理器（TriggeredSubworkflowManager, DynamicThreadManager等）
4. **阶段4**: 更新处理器（所有handler文件）
5. **阶段5**: 更新工具函数（workflow-reference-checker等）
6. **阶段6**: 更新类型定义（所有types文件）
7. **阶段7**: 删除旧代码（context目录）
8. **阶段8**: 更新测试（所有test文件）

### 测试策略
1. 每完成一个阶段，运行相关测试确保功能正常
2. 使用 `pnpm typecheck` 检查类型错误
3. 使用 `pnpm test <path>` 运行特定测试

### 回滚策略
1. 使用Git版本控制，每个阶段提交一次
2. 如果出现问题，可以回滚到上一个稳定版本
3. 保留旧的context目录直到所有测试通过

## 注意事项

1. **类型安全**: 确保所有类型引用都从ThreadContext更新为ThreadEntity
2. **依赖注入**: 移除ExecutionContext依赖，通过构造函数注入所需服务
3. **向后兼容**: 如果需要，可以保留ThreadContext作为ThreadEntity的别名（临时方案）
4. **测试覆盖**: 确保所有修改都有对应的测试更新
5. **文档更新**: 更新所有相关的文档和注释

## 预期收益

完成迁移后，系统将获得以下改进：
1. **降低耦合度**: 组件之间依赖更清晰，通过显式依赖注入
2. **提高可测试性**: 每个组件可以独立测试，无需模拟整个上下文
3. **增强可维护性**: 职责分离，变更影响范围小
4. **提升可扩展性**: 新增功能更容易集成
5. **减少代码量**: ThreadContext从1000+行分解为多个小类
6. **提高可读性**: 每个类职责明确，代码更易理解