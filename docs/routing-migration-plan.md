# 节点路由和边评估功能迁移方案

## 概述

在重构过程中，我们删除了以下文件：
- `src/infrastructure/workflow/routing/node-router.ts` - 节点路由器
- `src/infrastructure/workflow/evaluation/edge-evaluator.ts` - 边评估器

这些功能需要迁移到新架构中。根据DDD原则和重构方案，这些功能应该属于基础设施层，作为Thread执行引擎的一部分。

## 当前架构分析

### 重构后的职责划分

**Workflow（Domain层）**
- 纯粹的图结构定义
- 节点和边的管理
- 业务验证逻辑
- ❌ 不负责路由和评估

**Thread（Domain层）**
- 完整的执行状态管理
- 节点级状态管理
- 执行上下文管理
- ❌ 不负责路由决策

**基础设施层**
- ✅ 路由决策逻辑
- ✅ 边条件评估
- ✅ 执行引擎协调

## 迁移方案

### 方案1：创建 ThreadExecutionEngine（推荐）

在基础设施层创建一个专门的执行引擎来协调路由和评估。

#### 目录结构
```
src/infrastructure/workflow/execution/
├── thread-execution-engine.ts      # 线程执行引擎
├── node-router.ts                   # 节点路由器（重构版）
├── edge-evaluator.ts                # 边评估器（重构版）
└── index.ts
```

#### 核心设计

**ThreadExecutionEngine**
```typescript
export class ThreadExecutionEngine {
  private readonly workflow: Workflow;
  private readonly thread: Thread;
  private readonly nodeRouter: NodeRouter;
  private readonly edgeEvaluator: EdgeEvaluator;

  constructor(
    workflow: Workflow,
    thread: Thread,
    nodeRouter: NodeRouter,
    edgeEvaluator: EdgeEvaluator
  ) {
    this.workflow = workflow;
    this.thread = thread;
    this.nodeRouter = nodeRouter;
    this.edgeEvaluator = edgeEvaluator;
  }

  /**
   * 执行下一个节点
   */
  async executeNextNode(): Promise<void> {
    const currentNodeId = this.getCurrentNodeId();
    const nodeExecution = this.thread.execution.getNodeExecution(currentNodeId);
    
    if (!nodeExecution) {
      throw new Error('节点执行状态不存在');
    }

    // 执行节点
    const result = await this.executeNode(currentNodeId);
    
    // 更新节点执行状态
    const updatedNodeExecution = nodeExecution.complete(result);
    const updatedThreadExecution = this.thread.execution.updateNodeExecution(updatedNodeExecution);
    
    // 确定下一个节点
    const nextNodeId = await this.determineNextNode(currentNodeId, result);
    
    if (nextNodeId) {
      // 创建下一个节点的执行状态
      const nextNodeExecution = NodeExecution.create(nextNodeId);
      const newThreadExecution = updatedThreadExecution.addNodeExecution(nextNodeExecution);
      // 更新Thread...
    }
  }

  /**
   * 确定下一个节点
   */
  private async determineNextNode(
    currentNodeId: NodeId,
    nodeResult: unknown
  ): Promise<NodeId | null> {
    const outgoingEdges = this.workflow.getOutgoingEdges(currentNodeId);
    
    if (outgoingEdges.length === 0) {
      return null;
    }

    // 评估所有出边
    const satisfiedEdges = await this.edgeEvaluator.evaluateEdges(
      outgoingEdges,
      this.thread.execution.context
    );

    if (satisfiedEdges.length === 0) {
      return null;
    }

    // 返回第一个满足条件的边的目标节点
    return satisfiedEdges[0].toNodeId;
  }

  /**
   * 执行节点
   */
  private async executeNode(nodeId: NodeId): Promise<unknown> {
    // 节点执行逻辑
    const node = this.workflow.getNode(nodeId);
    // ... 执行节点
    return {};
  }

  /**
   * 获取当前节点ID
   */
  private getCurrentNodeId(): NodeId {
    // 从Thread执行状态中获取当前节点
    const nodeExecutions = this.thread.execution.nodeExecutions;
    // ... 逻辑
    return { toString: () => '' } as NodeId;
  }
}
```

**NodeRouter（重构版）**
```typescript
export class NodeRouter {
  /**
   * 获取起始节点
   */
  getStartNodes(workflow: Workflow): NodeId[] {
    const nodeIdsWithIncomingEdges = new Set<string>();
    
    for (const edge of workflow.getEdges().values()) {
      nodeIdsWithIncomingEdges.add(edge.toNodeId.toString());
    }
    
    const startNodes: NodeId[] = [];
    for (const node of workflow.getNodes().values()) {
      if (!nodeIdsWithIncomingEdges.has(node.id.toString())) {
        startNodes.push(node.id);
      }
    }
    
    return startNodes;
  }

  /**
   * 获取结束节点
   */
  getEndNodes(workflow: Workflow): NodeId[] {
    const nodeIdsWithOutgoingEdges = new Set<string>();
    
    for (const edge of workflow.getEdges().values()) {
      nodeIdsWithOutgoingEdges.add(edge.fromNodeId.toString());
    }
    
    const endNodes: NodeId[] = [];
    for (const node of workflow.getNodes().values()) {
      if (!nodeIdsWithOutgoingEdges.has(node.id.toString())) {
        endNodes.push(node.id);
      }
    }
    
    return endNodes;
  }

  /**
   * 检查是否为结束节点
   */
  isEndNode(workflow: Workflow, nodeId: NodeId): boolean {
    return workflow.getOutgoingEdges(nodeId).length === 0;
  }

  /**
   * 检查是否为起始节点
   */
  isStartNode(workflow: Workflow, nodeId: NodeId): boolean {
    return workflow.getIncomingEdges(nodeId).length === 0;
  }
}
```

**EdgeEvaluator（重构版）**
```typescript
export class EdgeEvaluator {
  /**
   * 评估边条件
   */
  async evaluateEdge(
    edge: EdgeValueObject,
    context: ExecutionContext
  ): Promise<{ satisfied: boolean; error?: string }> {
    // 如果没有条件，默认满足
    if (!edge.condition) {
      return { satisfied: true };
    }

    try {
      // 使用上下文中的变量评估条件
      const variables = context.variables;
      const result = this.evaluateCondition(edge.condition, variables);
      return { satisfied: Boolean(result) };
    } catch (error) {
      return {
        satisfied: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量评估边
   */
  async evaluateEdges(
    edges: EdgeValueObject[],
    context: ExecutionContext
  ): Promise<EdgeValueObject[]> {
    const results: EdgeValueObject[] = [];
    
    for (const edge of edges) {
      const evaluation = await this.evaluateEdge(edge, context);
      if (evaluation.satisfied) {
        results.push(edge);
      }
    }
    
    return results;
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(
    condition: string,
    variables: Map<string, unknown>
  ): unknown {
    // 简化的表达式评估
    const context = Object.fromEntries(variables);
    const func = new Function('context', `with(context) { return ${condition} }`);
    return func(context);
  }
}
```

### 方案2：在 Thread 中添加路由方法（不推荐）

在 Thread 实体中添加路由方法，但这违反了DDD原则，因为路由逻辑属于基础设施层的职责。

### 方案3：创建独立的 RoutingService（备选）

在应用层创建一个独立的服务来处理路由逻辑。

```typescript
export class RoutingService {
  async calculateNextNode(
    workflow: Workflow,
    currentNodeId: NodeId,
    context: ExecutionContext
  ): Promise<NodeId | null> {
    const outgoingEdges = workflow.getOutgoingEdges(currentNodeId);
    // ... 路由逻辑
  }
}
```

## 推荐实现步骤

### 阶段1：创建基础组件

1. 创建 `src/infrastructure/workflow/execution/` 目录
2. 创建重构版的 `NodeRouter`
3. 创建重构版的 `EdgeEvaluator`

### 阶段2：创建执行引擎

1. 创建 `ThreadExecutionEngine`
2. 实现节点执行协调逻辑
3. 实现路由决策逻辑

### 阶段3：集成到 Thread 服务

1. 在 `ThreadCoordinatorService` 中使用 `ThreadExecutionEngine`
2. 更新 Thread 执行流程
3. 测试路由和评估功能

### 阶段4：清理和优化

1. 删除旧的引用
2. 更新类型定义
3. 添加单元测试

## 关键设计决策

### 1. 路由逻辑的位置

**决策**：路由逻辑应该在基础设施层，作为执行引擎的一部分

**理由**：
- 路由是执行时的技术细节
- 需要访问执行上下文
- 不属于业务规则

### 2. 边条件评估的方式

**决策**：使用简化的表达式评估器

**理由**：
- 避免引入复杂的表达式解析库
- 满足基本需求
- 易于测试和维护

### 3. 与 Thread 的集成方式

**决策**：ThreadExecutionEngine 作为 Thread 的执行器

**理由**：
- Thread 保持纯粹的状态管理
- 执行引擎负责协调执行流程
- 职责清晰分离

## 依赖关系

```
ThreadExecutionEngine (Infrastructure)
  ├── Workflow (Domain)
  ├── Thread (Domain)
  ├── NodeRouter (Infrastructure)
  └── EdgeEvaluator (Infrastructure)

Thread (Domain)
  ├── ThreadExecution (ValueObject)
  └── ExecutionContext (ValueObject)

Workflow (Domain)
  ├── NodeValueObject (ValueObject)
  └── EdgeValueObject (ValueObject)
```

## 测试策略

### 单元测试

1. NodeRouter 测试
   - 测试起始节点识别
   - 测试结束节点识别
   - 测试节点类型判断

2. EdgeEvaluator 测试
   - 测试无条件边
   - 测试有条件边
   - 测试表达式评估

3. ThreadExecutionEngine 测试
   - 测试节点执行流程
   - 测试路由决策
   - 测试错误处理

### 集成测试

1. 测试完整的执行流程
2. 测试复杂的工作流图
3. 测试边界情况

## 迁移检查清单

- [ ] 创建基础设施层执行引擎目录
- [ ] 重构 NodeRouter
- [ ] 重构 EdgeEvaluator
- [ ] 创建 ThreadExecutionEngine
- [ ] 集成到 ThreadCoordinatorService
- [ ] 更新类型定义
- [ ] 删除旧引用
- [ ] 添加单元测试
- [ ] 添加集成测试
- [ ] 更新文档

## 风险和缓解措施

### 风险1：路由逻辑复杂度高

**缓解措施**：
- 从简单实现开始
- 逐步增加复杂度
- 充分的单元测试

### 风险2：表达式评估安全性

**缓解措施**：
- 限制表达式复杂度
- 添加沙箱机制
- 严格的输入验证

### 飀险3：性能问题

**缓解措施**：
- 缓存路由结果
- 优化表达式评估
- 性能测试和优化

## 总结

推荐采用方案1，创建 `ThreadExecutionEngine` 作为基础设施层的执行引擎，负责协调节点执行和路由决策。这样可以：

1. 保持 Domain 层的纯粹性
2. 将执行逻辑集中在基础设施层
3. 提供清晰的职责分离
4. 便于测试和维护

迁移应该分阶段进行，先创建基础组件，再创建执行引擎，最后集成到现有系统中。