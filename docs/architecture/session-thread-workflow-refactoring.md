# Session、Thread、Workflow 架构调整方案

## 📋 目录

1. [当前架构问题分析](#当前架构问题分析)
2. [架构调整原则](#架构调整原则)
3. [新的职责划分](#新的职责划分)
4. [架构调整方案](#架构调整方案)
5. [重构实施步骤](#重构实施步骤)
6. [风险评估与缓解](#风险评估与缓解)

---

## 🔍 当前架构问题分析

### 1. 循环依赖问题

```
workflow-orchestration-service.ts (Application层)
  ↓ 导入
SessionOrchestrationServiceImpl (Application层)
  ↓ 导入
WorkflowExecutionResult (定义在 workflow-orchestration-service.ts)
  ↓ 形成循环依赖 ❌
```

**影响**：
- 违反了分层架构原则
- Application层服务之间相互依赖
- 代码耦合度高，难以维护和测试

### 2. 职责边界不清

#### WorkflowOrchestrationService 的问题
- **定位**：工作流级别的编排服务
- **实际行为**：将所有执行委托给 SessionOrchestrationService
- **问题**：职责空洞，没有实际的工作流执行逻辑

#### SessionOrchestrationService 的问题
- **定位**：会话级别的编排服务
- **实际行为**：承担了工作流执行的职责
- **问题**：职责过重，违反单一职责原则

### 3. 执行逻辑错位

#### EdgeEvaluator 和 NodeRouter 的位置问题

**当前位置**：`src/infrastructure/threads/execution/`

**问题分析**：

| 组件 | 当前位置 | 实际职责 | 问题 |
|------|---------|---------|------|
| EdgeEvaluator | threads/execution | 评估工作流边的条件 | 属于工作流图操作，不应在 threads 中 |
| NodeRouter | threads/execution | 工作流图节点路由逻辑 | 属于工作流图操作，不应在 threads 中 |

**证据**：

1. **EdgeEvaluator 依赖分析**：
   ```typescript
   // edge-evaluator.ts:1
   import { EdgeValueObject } from '../../../domain/workflow/value-objects/edge/edge-value-object';
   import { ExecutionContext } from '../../../domain/threads/value-objects/execution-context';
   ```
   - 主要操作 `EdgeValueObject`（工作流领域对象）
   - 仅使用 `ExecutionContext` 作为上下文容器
   - 核心逻辑是工作流图的条件评估

2. **NodeRouter 依赖分析**：
   ```typescript
   // node-router.ts:1-2
   import { Workflow } from '../../../domain/workflow/entities/workflow';
   import { NodeId } from '../../../domain/workflow/value-objects';
   ```
   - 完全依赖工作流领域对象
   - 提供工作流图的遍历和路由功能
   - 与线程执行逻辑无关

### 4. ThreadCoordinatorService 职责混乱

**当前接口定义**（`thread-coordinator-service.interface.ts`）：
- 线程池管理
- 资源分配
- 线程生命周期控制
- **还包含**：`coordinateExecution(workflowId, context)` - 这应该是工作流的职责

**问题**：
- ThreadCoordinator 应该专注于线程级别的协调
- 不应该关心工作流的执行逻辑
- 工作流执行应该由 Workflow 层负责

---

## 🎯 架构调整原则

### 1. 单一职责原则 (SRP)
- 每个服务只负责一个明确的职责
- 避免职责重叠和混乱

### 2. 依赖倒置原则 (DIP)
- 高层模块不应依赖低层模块
- 两者都应依赖抽象
- Application层服务之间不应相互依赖

### 3. 领域驱动设计 (DDD)
- 按照领域边界划分职责
- Workflow 负责工作流图的操作
- Thread 负责执行层面的协调
- Session 负责会话级别的管理

### 4. 分层架构约束
```
Domain 层（核心业务逻辑）
  ↑
Application 层（业务编排）
  ↑
Infrastructure 层（技术实现）
  ↑
Interface 层（外部接口）
```

---

## 📐 新的职责划分

### 1. Session 层（会话管理）

**职责**：
- 会话生命周期管理
- 会话资源配额管理
- 会话状态同步
- 多线程协调（会话级别）

**服务**：
- `SessionOrchestrationService`：会话级别的编排
- `SessionResourceService`：资源配额管理

**不负责**：
- ❌ 工作流执行逻辑
- ❌ 工作流图操作
- ❌ 节点和边的评估

### 2. Thread 层（执行协调）

**职责**：
- 线程生命周期管理
- 线程池管理
- 资源分配和释放
- 线程级别的协调（并发、并行、串行）

**服务**：
- `ThreadCoordinatorService`：线程协调
- `ThreadLifecycleService`：线程生命周期

**不负责**：
- ❌ 工作流图遍历
- ❌ 边条件评估
- ❌ 节点路由逻辑

### 3. Workflow 层（工作流执行）

**职责**：
- 工作流图操作（验证、拓扑排序、路径查找）
- 工作流执行编排
- 节点和边的评估
- 执行上下文管理

**服务**：
- `WorkflowOrchestrationService`：工作流执行编排
- `WorkflowExecutionService`：工作流执行引擎
- `GraphAlgorithmService`：图算法
- `GraphValidationService`：图验证

**基础设施组件**：
- `EdgeEvaluator`：边条件评估（从 threads 移到 workflow）
- `NodeRouter`：节点路由（从 threads 移到 workflow）
- `NodeExecutor`：节点执行
- `EdgeExecutor`：边执行

---

## 🔄 架构调整方案

### 方案概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Interface Layer                       │
│  (HTTP API, gRPC, CLI)                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Session Service  │  │ Workflow Service │                │
│  │                  │  │                  │                │
│  │ - 会话管理        │  │ - 工作流编排     │                │
│  │ - 资源配额        │  │ - 执行引擎       │                │
│  │ - 状态同步        │  │ - 结果收集       │                │
│  └──────────────────┘  └──────────────────┘                │
│         ↓                        ↓                          │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Thread Service   │  │                  │                │
│  │                  │  │                  │                │
│  │ - 线程协调        │  │                  │                │
│  │ - 资源分配        │  │                  │                │
│  │ - 生命周期        │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Workflow Infrastructure                  │  │
│  │  - EdgeEvaluator (从 threads 移入)                    │  │
│  │  - NodeRouter (从 threads 移入)                       │  │
│  │  - NodeExecutor                                       │  │
│  │  - EdgeExecutor                                       │  │
│  │  - GraphAlgorithmServiceImpl                          │  │
│  │  - GraphValidationServiceImpl                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Thread Infrastructure                   │  │
│  │  - ThreadCoordinatorInfrastructureService             │  │
│  │  - ThreadLifecycleService                             │  │
│  │  - ThreadPoolManager                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Domain Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Workflow    │  │   Thread     │  │   Session    │      │
│  │  Domain      │  │   Domain     │  │   Domain     │      │
│  │              │  │              │  │              │      │
│  │ - Workflow   │  │ - Thread     │  │ - Session    │      │
│  │ - Node       │  │ - ThreadState│  │ - SessionState│     │
│  │ - Edge       │  │ - ExecutionContext│ - Quota    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 调整详情

#### 1. 移动 EdgeEvaluator 和 NodeRouter

**从**：`src/infrastructure/threads/execution/`
**到**：`src/infrastructure/workflow/execution/`

**理由**：
- 这两个组件操作的是工作流图对象
- 它们是工作流执行的基础设施
- 与线程执行逻辑解耦

#### 2. 重新设计 WorkflowOrchestrationService

**当前问题**：
- 职责空洞，委托给 SessionOrchestrationService
- 没有实际的工作流执行逻辑

**新设计**：
```typescript
export class WorkflowOrchestrationService {
  // 工作流图操作
  async validateWorkflow(workflowId: ID): Promise<ValidationResult>
  async getExecutionPath(workflowId: ID): Promise<NodeId[]>
  async calculateComplexity(workflowId: ID): Promise<GraphComplexity>

  // 工作流执行编排
  async executeWorkflow(
    sessionId: ID,
    workflowId: ID,
    input: unknown
  ): Promise<WorkflowExecutionResult>

  // 工作流执行引擎
  private async executeWorkflowGraph(
    workflow: Workflow,
    context: ExecutionContext
  ): Promise<ExecutionResult>
}
```

#### 3. 简化 SessionOrchestrationService

**移除职责**：
- ❌ 工作流执行逻辑
- ❌ 工作流图操作

**保留职责**：
- ✅ 会话生命周期管理
- ✅ 资源配额管理
- ✅ 会话状态同步
- ✅ 多线程协调（会话级别）

#### 4. 明确 ThreadCoordinatorService 职责

**移除方法**：
- ❌ `coordinateExecution(workflowId, context)` - 移到 Workflow 层

**保留方法**：
- ✅ `submitThreadExecution(threadId, workflowId, resourceRequirement, context)`
- ✅ `getThreadPoolStatus()`
- ✅ `cancelThreadExecution(threadId)`
- ✅ `pauseThreadExecution(threadId)`
- ✅ `resumeThreadExecution(threadId)`
- ✅ `allocateResources(threadId, requirements)`
- ✅ `releaseResources(threadId)`
- ✅ `monitorThreadPool(sessionId)`
- ✅ `waitForCompletion(threadId)`

---

## 🛠️ 重构实施步骤

### 阶段 1：准备工作

#### Step 1.1：创建共享类型文件
```bash
# 创建工作流执行相关的共享类型
src/application/workflow/types/workflow-execution.types.ts
```

**内容**：
```typescript
export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime: string;
  duration: number;
  output: Record<string, unknown>;
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
  statistics: {
    executedNodes: number;
    totalNodes: number;
    executedEdges: number;
    totalEdges: number;
    executionPath: string[];
  };
  metadata: Record<string, unknown>;
}

export type ThreadAction = 'start' | 'pause' | 'resume' | 'complete' | 'fail' | 'cancel';
```

#### Step 1.2：更新依赖注入配置
```typescript
// src/di/service-keys.ts
// 更新服务绑定，确保新的依赖关系正确
```

### 阶段 2：移动基础设施组件

#### Step 2.1：移动 EdgeEvaluator
```bash
# 从
src/infrastructure/threads/execution/edge-evaluator.ts

# 移到
src/infrastructure/workflow/execution/edge-evaluator.ts
```

**操作**：
1. 移动文件
2. 更新导入路径
3. 更新依赖注入配置

#### Step 2.2：移动 NodeRouter
```bash
# 从
src/infrastructure/threads/execution/node-router.ts

# 移到
src/infrastructure/workflow/execution/node-router.ts
```

**操作**：
1. 移动文件
2. 更新导入路径
3. 更新依赖注入配置

#### Step 2.3：更新相关导入
```typescript
// 更新所有引用这些组件的文件
// 例如：GraphAlgorithmServiceImpl, WorkflowExecutionService 等
```

### 阶段 3：重构 WorkflowOrchestrationService

#### Step 3.1：添加工作流执行逻辑
```typescript
export class WorkflowOrchestrationService {
  constructor(
    @inject(TYPES.WorkflowRepository) private readonly workflowRepository: WorkflowRepository,
    @inject(TYPES.GraphAlgorithmService) private readonly graphAlgorithm: GraphAlgorithmService,
    @inject(TYPES.GraphValidationService) private readonly graphValidation: GraphValidationService,
    @inject(TYPES.ThreadCoordinatorService) private readonly threadCoordinator: ThreadCoordinatorService,
    @inject(TYPES.EdgeEvaluator) private readonly edgeEvaluator: EdgeEvaluator,
    @inject(TYPES.NodeRouter) private readonly nodeRouter: NodeRouter
  ) {}

  async executeWorkflow(
    sessionId: ID,
    workflowId: ID,
    input: unknown
  ): Promise<WorkflowExecutionResult> {
    // 1. 验证工作流
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId.toString()}`);
    }

    // 2. 验证图结构
    const validationResult = this.graphValidation.validateGraph(workflow);
    if (!validationResult) {
      throw new Error('工作流图结构验证失败');
    }

    // 3. 创建执行上下文
    const context = this.createExecutionContext(workflowId, input);

    // 4. 执行工作流图
    return await this.executeWorkflowGraph(workflow, context);
  }

  private async executeWorkflowGraph(
    workflow: Workflow,
    context: ExecutionContext
  ): Promise<WorkflowExecutionResult> {
    // 使用 NodeRouter 获取起始节点
    const startNodes = this.nodeRouter.getStartNodes(workflow);

    // 使用 EdgeEvaluator 评估边条件
    // 执行节点
    // 收集结果
    // ...
  }
}
```

#### Step 3.2：移除对 SessionOrchestrationService 的依赖
```typescript
// 移除
import { SessionOrchestrationServiceImpl } from '../../sessions/session-orchestration-service';

// 移除构造函数中的注入
@inject(TYPES.SessionOrchestrationServiceImpl) private readonly sessionOrchestration: SessionOrchestrationServiceImpl
```

### 阶段 4：简化 SessionOrchestrationService

#### Step 4.1：移除工作流执行方法
```typescript
// 移除
async orchestrateWorkflowExecution(...)
async orchestrateParallelExecution(...)
```

#### Step 4.2：保留会话管理方法
```typescript
export class SessionOrchestrationServiceImpl {
  // 保留
  async createThread(sessionId: ID, workflowId?: ID): Promise<ID>
  async manageThreadLifecycle(sessionId: ID, threadId: ID, action: ThreadAction): Promise<void>
  async syncSessionState(sessionId: ID): Promise<void>
  async broadcastStateChange(sessionId: ID, change: StateChange): Promise<void>
}
```

### 阶段 5：更新 ThreadCoordinatorService

#### Step 5.1：移除工作流执行方法
```typescript
// 从接口中移除
coordinateExecution(workflowId: ID, context: ThreadExecutionContext): Promise<ID>
```

#### Step 5.2：保留线程协调方法
```typescript
export interface ThreadCoordinatorService {
  // 保留所有线程协调相关方法
  submitThreadExecution(...)
  getThreadPoolStatus()
  cancelThreadExecution(...)
  pauseThreadExecution(...)
  resumeThreadExecution(...)
  allocateResources(...)
  releaseResources(...)
  monitorThreadPool(...)
  waitForCompletion(...)
}
```

### 阶段 6：更新调用链

#### Step 6.1：更新 Interface 层
```typescript
// src/interfaces/http/workflow/controllers/workflow.controller.ts
export class WorkflowController {
  async executeWorkflow(req: Request, res: Response) {
    // 直接调用 WorkflowOrchestrationService
    const result = await this.workflowOrchestrationService.executeWorkflow(
      sessionId,
      workflowId,
      input
    );
    res.json(result);
  }
}
```

#### Step 6.2：更新 Application 层调用
```typescript
// WorkflowOrchestrationService 内部
async executeWorkflow(...) {
  // 1. 执行工作流图
  const result = await this.executeWorkflowGraph(workflow, context);

  // 2. 通过 ThreadCoordinator 提交线程任务
  await this.threadCoordinator.submitThreadExecution(
    threadId,
    workflowId,
    resourceRequirement,
    context
  );

  return result;
}
```

### 阶段 7：测试和验证

#### Step 7.1：单元测试
```bash
# 运行所有单元测试
npm test

# 运行特定模块测试
npm test src/application/workflow/services/workflow-orchestration-service.test.ts
npm test src/application/sessions/session-orchestration-service.test.ts
```

#### Step 7.2：集成测试
```bash
# 运行集成测试
npm test src/tests/integration/workflow-execution.integration.test.ts
```

#### Step 7.3：类型检查
```bash
# 运行类型检查
tsc --noEmit
```

---

## ⚠️ 风险评估与缓解

### 风险 1：破坏现有功能

**风险等级**：🔴 高

**影响**：
- 现有的工作流执行可能失败
- API 接口可能不兼容

**缓解措施**：
1. ✅ 完整的单元测试覆盖
2. ✅ 集成测试验证
3. ✅ 分阶段实施，逐步迁移
4. ✅ 保留旧代码作为回退方案

### 风险 2：循环依赖未完全解决

**风险等级**：🟡 中

**影响**：
- 可能仍有隐藏的循环依赖
- 编译时错误

**缓解措施**：
1. ✅ 使用依赖分析工具
2. ✅ 严格的代码审查
3. ✅ 持续的架构检查

### 风险 3：性能下降

**风险等级**：🟡 中

**影响**：
- 新的调用链可能增加延迟
- 资源使用可能增加

**缓解措施**：
1. ✅ 性能基准测试
2. ✅ 优化关键路径
3. ✅ 监控和调优

### 风险 4：团队理解成本

**风险等级**：🟢 低

**影响**：
- 团队需要学习新的架构
- 开发效率可能暂时下降

**缓解措施**：
1. ✅ 详细的文档
2. ✅ 架构培训
3. ✅ 代码示例

---

## 📊 预期收益

### 1. 架构清晰度
- ✅ 职责边界明确
- ✅ 依赖关系清晰
- ✅ 符合分层架构原则

### 2. 可维护性
- ✅ 代码耦合度降低
- ✅ 单一职责原则
- ✅ 易于理解和修改

### 3. 可测试性
- ✅ 单元测试更容易编写
- ✅ Mock 依赖更简单
- ✅ 测试覆盖率提高

### 4. 可扩展性
- ✅ 新功能更容易添加
- ✅ 模块化设计
- ✅ 插件化支持

---

## 📝 总结

### 核心调整

1. **移动组件**：将 `EdgeEvaluator` 和 `NodeRouter` 从 `threads` 移到 `workflow`
2. **重新设计服务**：`WorkflowOrchestrationService` 承担工作流执行职责
3. **简化服务**：`SessionOrchestrationService` 专注于会话管理
4. **明确职责**：`ThreadCoordinatorService` 专注于线程协调

### 关键原则

- **单一职责**：每个服务只负责一个明确的职责
- **依赖倒置**：Application 层服务之间不相互依赖
- **领域驱动**：按照领域边界划分职责
- **分层架构**：严格遵守分层架构约束

### 实施建议

1. **分阶段实施**：不要一次性重构所有代码
2. **充分测试**：每个阶段都要进行充分的测试
3. **文档先行**：先更新文档，再修改代码
4. **团队协作**：确保团队理解新的架构设计

---

## 📚 参考资料

- [AGENTS.md](../../.roo/rules/AGENTS.md) - Modular Agent Framework Developer Guide
- [DDD 领域驱动设计](https://martinfowler.com/tags/domain%20driven%20design.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID 原则](https://en.wikipedia.org/wiki/SOLID)