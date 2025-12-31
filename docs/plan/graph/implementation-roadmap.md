# 图工作流改进简洁执行方案

## 核心问题总结

基于深度分析，当前项目工作流实现存在3个核心问题：

1. **缺少执行引擎**：没有统一协调工作流执行的引擎
2. **状态管理混乱**：Thread职责过重，检查点逻辑耦合
3. **路由控制不足**：缺少表达式评估和通用路由器

## 简洁执行方案

### 阶段一：基础设施（2周）

#### 1.1 创建状态管理器（3天）

**文件**：`src/domain/workflow/services/state-manager.ts`

```typescript
export class StateManager {
  private states = new Map<string, WorkflowState>();
  
  async initialize(threadId: string, initialState: Record<string, any>): Promise<void> {
    this.states.set(threadId, WorkflowState.create(initialState));
  }
  
  async getState(threadId: string): Promise<WorkflowState> {
    return this.states.get(threadId);
  }
  
  async updateState(threadId: string, updates: Record<string, any>): Promise<void> {
    const state = this.states.get(threadId);
    this.states.set(threadId, state.update(updates));
  }
}
```

**任务**：
- [ ] 创建 StateManager 类
- [ ] 实现基本的状态操作
- [ ] 编写单元测试

#### 1.2 创建检查点管理器（3天）

**文件**：`src/domain/workflow/services/checkpoint-manager.ts`

```typescript
export class CheckpointManager {
  private checkpoints = new Map<string, Checkpoint>();
  
  async create(threadId: string, nodeId: string, state: WorkflowState): Promise<string> {
    const checkpoint = {
      id: `cp-${Date.now()}`,
      threadId,
      nodeId,
      state: state.toJSON(),
      timestamp: Date.now()
    };
    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint.id;
  }
  
  async restore(checkpointId: string): Promise<Checkpoint | null> {
    return this.checkpoints.get(checkpointId) || null;
  }
}
```

**任务**：
- [ ] 创建 CheckpointManager 类
- [ ] 实现检查点创建和恢复
- [ ] 编写单元测试

#### 1.3 创建表达式评估器（4天）

**文件**：`src/domain/workflow/services/expression-evaluator.ts`

```typescript
export class ExpressionEvaluator {
  evaluate(expression: string, context: Record<string, any>): boolean {
    // 使用 expr-eval 库
    const parser = new Parser();
    const expr = parser.parse(expression);
    return expr.evaluate(context);
  }
}
```

**依赖**：`npm install expr-eval`

**任务**：
- [ ] 安装 expr-eval 库
- [ ] 创建 ExpressionEvaluator 类
- [ ] 测试常见表达式

### 阶段二：执行引擎（2周）

#### 2.1 创建通用路由器（3天）

**文件**：`src/domain/workflow/services/conditional-router.ts`

```typescript
export class ConditionalRouter {
  constructor(
    private evaluator: ExpressionEvaluator
  ) {}
  
  async route(
    edges: EdgeValueObject[],
    state: WorkflowState
  ): Promise<string | null> {
    const context = { state: state.toJSON() };
    
    for (const edge of edges) {
      if (!edge.condition) {
        return edge.toNodeId.value; // 无条件边直接返回
      }
      
      if (this.evaluator.evaluate(edge.condition, context)) {
        return edge.toNodeId.value;
      }
    }
    
    return null;
  }
}
```

**任务**：
- [ ] 创建 ConditionalRouter 类
- [ ] 集成 ExpressionEvaluator
- [ ] 编写单元测试

#### 2.2 创建工作流引擎（5天）

**文件**：`src/domain/workflow/services/workflow-engine.ts`

```typescript
export class WorkflowEngine {
  constructor(
    private stateManager: StateManager,
    private checkpointManager: CheckpointManager,
    private router: ConditionalRouter,
    private nodeExecutor: INodeExecutor
  ) {}
  
  async execute(
    workflow: Workflow,
    thread: Thread,
    initialState: Record<string, any>
  ): Promise<void> {
    // 初始化状态
    await this.stateManager.initialize(thread.threadId.value, initialState);
    
    // 执行循环
    let currentNodeId = this.findStartNode(workflow);
    
    while (currentNodeId) {
      // 创建检查点
      const state = await this.stateManager.getState(thread.threadId.value);
      await this.checkpointManager.create(thread.threadId.value, currentNodeId, state);
      
      // 执行节点
      const node = workflow.getNode(NodeId.from(currentNodeId));
      const result = await this.nodeExecutor.execute(node, {});
      
      // 更新状态
      await this.stateManager.updateState(thread.threadId.value, result.output || {});
      
      // 路由决策
      const edges = workflow.getOutgoingEdges(NodeId.from(currentNodeId));
      const nextNodeId = await this.router.route(edges, state);
      
      currentNodeId = nextNodeId;
    }
    
    thread.complete();
  }
  
  private findStartNode(workflow: Workflow): string {
    const nodes = workflow.getNodes();
    const startNode = Array.from(nodes.values()).find(n => n.type.isStart());
    return startNode?.nodeId.value || Array.from(nodes.keys())[0];
  }
}
```

**任务**：
- [ ] 创建 WorkflowEngine 类
- [ ] 集成各个组件
- [ ] 编写集成测试

#### 2.3 简化 Thread（2天）

**修改文件**：`src/domain/threads/entities/thread.ts`

**移除内容**：
- 删除 `restoreFromCheckpoint` 方法
- 删除 `getStateSnapshot` 方法
- 删除 `restoreExecution` 方法
- 删除 `getExecutionSnapshot` 方法

**保留内容**：
- 基本属性（id、status、progress等）
- 生命周期方法（start、pause、resume、complete、fail、cancel）
- 进度更新方法

**任务**：
- [ ] 删除检查点相关方法
- [ ] 更新单元测试
- [ ] 验证向后兼容

### 阶段三：集成与优化（1周）

#### 3.1 集成到应用层（3天）

**修改文件**：`src/application/threads/services/thread-execution-service.ts`

```typescript
export class ThreadExecutionService {
  constructor(
    private workflowEngine: WorkflowEngine
  ) {}
  
  async executeThread(thread: Thread, workflow: Workflow): Promise<void> {
    const initialState = {
      input: thread.definition.input,
      variables: {}
    };
    
    await this.workflowEngine.execute(workflow, thread, initialState);
  }
}
```

**任务**：
- [ ] 修改 ThreadExecutionService
- [ ] 集成 WorkflowEngine
- [ ] 编写集成测试

#### 3.2 添加配置支持（2天）

**修改文件**：`configs/global.toml`

```toml
[workflow.engine]
enable_checkpoints = true
checkpoint_interval = 1000  # 毫秒

[workflow.expressions]
max_depth = 10
timeout = 5000  # 毫秒
```

**任务**：
- [ ] 添加工作流引擎配置
- [ ] 添加表达式评估配置
- [ ] 更新配置加载逻辑

#### 3.3 性能优化（2天）

**优化内容**：
- 状态缓存：在 StateManager 中添加 LRU 缓存
- 检查点批量写入：批量创建检查点
- 表达式预编译：缓存编译后的表达式

**任务**：
- [ ] 实现状态缓存
- [ ] 实现批量检查点
- [ ] 测试性能提升

## 实施优先级

### 立即开始（高价值，低难度）

1. **表达式评估器**：3天
   - 快速实现，立即提升条件表达能力
   - 为后续路由控制打基础

2. **状态管理器**：3天
   - 解耦 Thread 的状态管理
   - 为检查点管理做准备

### 第二周（高价值，中难度）

3. **通用路由器**：3天
   - 基于表达式评估器
   - 实现灵活的路由控制

4. **检查点管理器**：3天
   - 基于状态管理器
   - 实现工作流持久化

### 第三-四周（核心价值，较高难度）

5. **工作流引擎**：5天
   - 整合所有组件
   - 提供统一的执行入口

6. **简化 Thread**：2天
   - 清理遗留代码
   - 验证向后兼容

## 关键决策点

### 决策1：是否引入第三方表达式库？

**建议**：使用 `expr-eval`
- **优点**：成熟稳定，功能完善，社区活跃
- **成本**：增加一个依赖，体积约 10KB
- **替代方案**：自研表达式解析器（成本高，不推荐）

### 决策2：状态存储在内存还是数据库？

**建议**：第一阶段内存存储，第二阶段支持数据库存储
- **内存**：实现简单，性能高，适合短期执行
- **数据库**：支持长期持久化，适合长时间运行的工作流
- **演进路径**：先实现内存版本，后续抽象存储接口

### 决策3：是否保持向后兼容？

**建议**：保持 Thread 的 API 兼容
- **保留**：所有公共方法签名不变
- **移除**：内部实现细节（检查点恢复逻辑）
- **迁移**：提供迁移指南，逐步替换内部实现

## 成功标准

### 功能标准
- [ ] 支持复杂的条件表达式（`state.errors.length > 0 && state.retryCount < 3`）
- [ ] 支持工作流检查点和恢复
- [ ] Thread 代码行数减少 30%
- [ ] 执行性能不下降

### 代码质量标准
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试覆盖主要流程
- [ ] 代码复杂度降低（SonarQube 评分提升）

## 风险与应对

### 风险1：Thread 重构影响现有功能

**概率**：中
**影响**：高
**应对**：
- 充分单元测试覆盖
- 集成测试验证主要流程
- 灰度发布，逐步替换

### 风险2：表达式评估性能问题

**概率**：低
**影响**：中
**应对**：
- 预编译常用表达式
- 添加表达式缓存
- 设置评估超时时间

### 风险3：检查点数据一致性问题

**概率**：低
**影响**：高
**应对**：
- 状态序列化时加版本号
- 恢复时验证数据完整性
- 提供数据迁移工具

## 总结
n
本方案通过 3 个阶段、6 个核心组件的改进，解决当前项目工作流实现的 3 个核心问题：

1. **执行引擎缺失** → 创建 WorkflowEngine
2. **状态管理混乱** → 创建 StateManager 和 CheckpointManager
3. **路由控制不足** → 创建 ExpressionEvaluator 和 ConditionalRouter

总工期：5 周
核心价值：提升灵活性、可维护性、可扩展性
风险控制：分阶段实施，充分测试，保持兼容