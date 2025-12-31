# 图工作流性能优化实施指南

## 概述

本文档提供了图工作流系统的性能优化实施指南。当前实现已经具备了良好的基础架构，包括表达式评估、状态管理、检查点管理和路由控制等核心功能。本文档将指导如何进一步优化系统性能。

## 当前实现的性能特点

### 已实现的优化

1. **表达式缓存**
   - [`ExpressionEvaluator`](../../src/domain/workflow/services/expression-evaluator.ts) 已实现表达式缓存
   - 使用 `Map` 存储已评估的表达式结果
   - 避免重复计算相同的表达式

2. **状态缓存**
   - [`StateManager`](../../src/domain/workflow/services/state-manager.ts) 使用 LRU 缓存策略
   - 最大缓存 1000 个状态
   - 自动清理最旧的状态

3. **检查点管理**
   - [`CheckpointManager`](../../src/domain/workflow/services/checkpoint-manager.ts) 实现了自动清理机制
   - 每个线程最多保留 10 个检查点
   - 全局最多保留 1000 个检查点

4. **路由历史记录**
   - [`ConditionalRouter`](../../src/domain/workflow/services/conditional-router.ts) 支持路由历史记录
   - 可配置是否记录历史
   - 便于调试和性能分析

## 性能优化方向

### 1. 表达式预编译

#### 优化目标
- 减少表达式解析时间
- 提高重复表达式的执行效率

#### 实施方案

```typescript
// 在 ExpressionEvaluator 中添加预编译功能
export class ExpressionEvaluator {
  private readonly compiledExpressions: Map<string, any>;

  /**
   * 预编译表达式
   * @param expression 表达式字符串
   * @returns 编译后的表达式
   */
  precompile(expression: string): any {
    if (this.compiledExpressions.has(expression)) {
      return this.compiledExpressions.get(expression);
    }

    const compiled = this.jexl.compile(expression);
    this.compiledExpressions.set(expression, compiled);
    return compiled;
  }

  /**
   * 使用预编译的表达式进行评估
   * @param compiled 预编译的表达式
   * @param context 上下文对象
   * @returns 评估结果
   */
  async evaluateCompiled(compiled: any, context: Record<string, any>): Promise<EvaluationResult> {
    try {
      const value = await compiled(context);
      return {
        success: true,
        value,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
```

#### 预期效果
- 表达式解析时间减少 50-70%
- 重复表达式执行速度提升 30-50%

#### 实施优先级
- **高优先级**：对于频繁使用的条件表达式
- **中优先级**：对于工作流定义中的静态表达式

---

### 2. 状态管理优化

#### 优化目标
- 减少状态序列化/反序列化开销
- 优化状态更新性能
- 支持增量状态更新

#### 实施方案

##### 2.1 增量状态更新

```typescript
// 在 StateManager 中添加增量更新支持
export class StateManager {
  /**
   * 增量更新状态
   * @param threadId 线程ID
   * @param updates 状态更新
   * @param options 更新选项
   * @returns 更新后的状态
   */
  updateStateIncremental(
    threadId: string,
    updates: Record<string, any>,
    options: StateUpdateOptions = {}
  ): WorkflowState {
    const currentState = this.getState(threadId);
    if (!currentState) {
      throw new Error(`线程 ${threadId} 的状态不存在`);
    }

    // 只更新发生变化的部分
    const changedKeys = Object.keys(updates).filter(key => {
      const currentValue = currentState.getData(key);
      const newValue = updates[key];
      return currentValue !== newValue;
    });

    if (changedKeys.length === 0) {
      return currentState; // 没有变化，直接返回
    }

    // 创建增量更新
    const incrementalUpdates: Record<string, any> = {};
    changedKeys.forEach(key => {
      incrementalUpdates[key] = updates[key];
    });

    return this.updateState(threadId, incrementalUpdates, options);
  }
}
```

##### 2.2 状态压缩

```typescript
// 在 WorkflowState 中添加压缩方法
export class WorkflowState {
  /**
   * 压缩状态数据
   * @returns 压缩后的状态数据
   */
  compress(): string {
    const data = JSON.stringify(this.toProps());
    // 使用简单的压缩算法（如 gzip）
    return compress(data);
  }

  /**
   * 解压状态数据
   * @param compressed 压缩的状态数据
   * @returns 解压后的状态
   */
  static decompress(compressed: string): WorkflowState {
    const data = decompress(compressed);
    const props = JSON.parse(data);
    return WorkflowState.fromProps(props);
  }
}
```

#### 预期效果
- 状态更新时间减少 20-30%
- 内存使用减少 30-40%
- 检查点存储空间减少 40-50%

#### 实施优先级
- **高优先级**：增量状态更新
- **中优先级**：状态压缩

---

### 3. 检查点优化

#### 优化目标
- 减少检查点创建时间
- 优化检查点存储
- 支持批量检查点创建

#### 实施方案

##### 3.1 批量检查点创建

```typescript
// 在 CheckpointManager 中添加批量创建功能
export class CheckpointManager {
  /**
   * 批量创建检查点
   * @param checkpoints 检查点数组
   * @returns 创建的检查点ID数组
   */
  createBatch(checkpoints: Array<{
    threadId: string;
    workflowId: ID;
    currentNodeId: ID;
    state: WorkflowState;
    metadata?: Record<string, any>;
  }>): string[] {
    const checkpointIds: string[] = [];

    // 批量创建检查点
    checkpoints.forEach(cp => {
      const checkpointId = this.create(
        cp.threadId,
        cp.workflowId,
        cp.currentNodeId,
        cp.state,
        cp.metadata
      );
      checkpointIds.push(checkpointId);
    });

    return checkpointIds;
  }
}
```

##### 3.2 异步检查点创建

```typescript
// 在 WorkflowEngine 中添加异步检查点支持
export class WorkflowEngine {
  private checkpointQueue: Array<() => Promise<void>> = [];
  private isProcessingCheckpoint = false;

  /**
   * 异步创建检查点
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param currentNodeId 当前节点ID
   * @param state 当前状态
   * @param metadata 元数据
   */
  private async createCheckpointAsync(
    threadId: string,
    workflowId: ID,
    currentNodeId: ID,
    state: WorkflowState,
    metadata?: Record<string, any>
  ): Promise<void> {
    // 将检查点创建任务加入队列
    this.checkpointQueue.push(async () => {
      this.checkpointManager.create(
        threadId,
        workflowId,
        currentNodeId,
        state,
        metadata
      );
    });

    // 处理队列
    this.processCheckpointQueue();
  }

  /**
   * 处理检查点队列
   */
  private async processCheckpointQueue(): Promise<void> {
    if (this.isProcessingCheckpoint || this.checkpointQueue.length === 0) {
      return;
    }

    this.isProcessingCheckpoint = true;

    while (this.checkpointQueue.length > 0) {
      const task = this.checkpointQueue.shift();
      if (task) {
        await task();
      }
    }

    this.isProcessingCheckpoint = false;
  }
}
```

#### 预期效果
- 检查点创建时间减少 40-60%
- 工作流执行时间减少 10-20%
- 支持更高频率的检查点创建

#### 实施优先级
- **高优先级**：异步检查点创建
- **中优先级**：批量检查点创建

---

### 4. 路由优化

#### 优化目标
- 减少路由决策时间
- 优化条件表达式评估
- 支持路由缓存

#### 实施方案

##### 4.1 路由缓存

```typescript
// 在 ConditionalRouter 中添加路由缓存
export class ConditionalRouter {
  private readonly routeCache: Map<string, RoutingResult>;

  /**
   * 带缓存的路由决策
   * @param edges 边集合
   * @param state 工作流状态
   * @param options 路由选项
   * @returns 路由结果
   */
  async routeWithCache(
    edges: EdgeValueObject[],
    state: WorkflowState,
    options: RoutingOptions = {}
  ): Promise<RoutingResult | null> {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(edges, state);

    // 检查缓存
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!;
    }

    // 执行路由决策
    const result = await this.route(edges, state, options);

    // 缓存结果
    if (result) {
      this.routeCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 生成缓存键
   * @param edges 边集合
   * @param state 工作流状态
   * @returns 缓存键
   */
  private generateCacheKey(edges: EdgeValueObject[], state: WorkflowState): string {
    const edgeIds = edges.map(e => e.edgeId.value).join(',');
    const stateHash = this.hashState(state);
    return `${edgeIds}:${stateHash}`;
  }

  /**
   * 计算状态哈希
   * @param state 工作流状态
   * @returns 哈希值
   */
  private hashState(state: WorkflowState): string {
    const stateStr = JSON.stringify(state.data);
    return simpleHash(stateStr);
  }
}
```

##### 4.2 并行条件评估

```typescript
// 在 ConditionalRouter 中添加并行评估
export class ConditionalRouter {
  /**
   * 并行评估所有条件边
   * @param edges 边集合
   * @param state 工作流状态
   * @param options 路由选项
   * @returns 路由结果
   */
  async routeParallel(
    edges: EdgeValueObject[],
    state: WorkflowState,
    options: RoutingOptions = {}
  ): Promise<RoutingResult | null> {
    // 过滤出条件边
    const conditionalEdges = edges.filter(e => e.type.isConditional());

    if (conditionalEdges.length === 0) {
      // 没有条件边，返回默认边
      return this.findDefaultEdge(edges);
    }

    // 并行评估所有条件
    const evaluations = await Promise.all(
      conditionalEdges.map(async (edge) => {
        const result = await this.evaluator.evaluate(
          edge.condition!,
          state.data
        );
        return { edge, result };
      })
    );

    // 找到第一个满足条件的边
    for (const { edge, result } of evaluations) {
      if (result.success && result.value === true) {
        return {
          targetNodeId: edge.targetNodeId,
          edgeId: edge.edgeId,
          condition: edge.condition,
          matched: true
        };
      }
    }

    // 没有匹配的条件边，返回默认边
    return this.findDefaultEdge(edges);
  }
}
```

#### 预期效果
- 路由决策时间减少 30-50%
- 多条件路由性能提升 50-70%
- 支持更复杂的路由逻辑

#### 实施优先级
- **高优先级**：路由缓存
- **中优先级**：并行条件评估

---

### 5. 节点执行优化

#### 优化目标
- 减少节点执行开销
- 支持节点并行执行
- 优化节点上下文构建

#### 实施方案

##### 5.1 节点上下文缓存

```typescript
// 在 WorkflowEngine 中添加上下文缓存
export class WorkflowEngine {
  private readonly contextCache: Map<string, any>;

  /**
   * 构建节点执行上下文（带缓存）
   * @param state 工作流状态
   * @returns 节点执行上下文
   */
  private buildNodeContextWithCache(state: WorkflowState): any {
    const cacheKey = this.generateContextCacheKey(state);

    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey);
    }

    const context = this.buildNodeContext(state);
    this.contextCache.set(cacheKey, context);
    return context;
  }

  /**
   * 生成上下文缓存键
   * @param state 工作流状态
   * @returns 缓存键
   */
  private generateContextCacheKey(state: WorkflowState): string {
    return JSON.stringify(state.data);
  }
}
```

##### 5.2 节点并行执行

```typescript
// 在 WorkflowEngine 中添加并行执行支持
export class WorkflowEngine {
  /**
   * 并行执行多个节点
   * @param workflow 工作流
   * @param threadId 线程ID
   * @param nodeIds 节点ID数组
   * @returns 执行结果数组
   */
  async executeNodesParallel(
    workflow: Workflow,
    threadId: string,
    nodeIds: string[]
  ): Promise<Array<{ nodeId: string; result: any }>> {
    const currentState = this.stateManager.getState(threadId);
    if (!currentState) {
      throw new Error(`线程 ${threadId} 的状态不存在`);
    }

    // 并行执行所有节点
    const results = await Promise.all(
      nodeIds.map(async (nodeId) => {
        const node = workflow.getNode(NodeId.fromString(nodeId));
        if (!node) {
          throw new Error(`节点 ${nodeId} 不存在`);
        }

        const nodeContext = this.buildNodeContextWithCache(currentState);
        const result = await this.nodeExecutor.execute(node, nodeContext);

        return { nodeId, result };
      })
    );

    return results;
  }
}
```

#### 预期效果
- 节点执行时间减少 20-30%
- 并行节点执行性能提升 50-80%
- 上下文构建时间减少 40-50%

#### 实施优先级
- **高优先级**：节点上下文缓存
- **中优先级**：节点并行执行

---

## 性能监控

### 监控指标

1. **执行时间**
   - 工作流总执行时间
   - 单个节点执行时间
   - 路由决策时间
   - 状态更新时间
   - 检查点创建时间

2. **资源使用**
   - 内存使用量
   - CPU 使用率
   - 缓存命中率
   - 检查点数量

3. **吞吐量**
   - 每秒执行的工作流数量
   - 每秒执行的节点数量
   - 每秒创建的检查点数量

### 监控实施

```typescript
// 创建性能监控服务
export class WorkflowPerformanceMonitor {
  private readonly metrics: Map<string, number> = new Map();

  /**
   * 记录指标
   * @param name 指标名称
   * @param value 指标值
   */
  recordMetric(name: string, value: number): void {
    const currentValue = this.metrics.get(name) || 0;
    this.metrics.set(name, currentValue + value);
  }

  /**
   * 获取指标
   * @param name 指标名称
   * @returns 指标值
   */
  getMetric(name: string): number {
    return this.metrics.get(name) || 0;
  }

  /**
   * 获取所有指标
   * @returns 所有指标
   */
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics.clear();
  }
}
```

---

## 配置优化

### 配置参数

在 [`configs/global.toml`](../../configs/global.toml) 中已添加以下配置：

```toml
# 工作流引擎配置
[workflow]
default_timeout = 300000
default_max_steps = 1000
default_checkpoint_interval = 5
default_enable_checkpoints = true

# 状态管理器配置
[workflow.state_manager]
max_cache_size = 1000
max_history_size = 100

# 检查点管理器配置
[workflow.checkpoint_manager]
max_checkpoints_per_thread = 10
max_total_checkpoints = 1000
checkpoint_expiration_hours = 24

# 表达式评估器配置
[workflow.expression_evaluator]
enable_cache = true
max_cache_size = 1000
evaluation_timeout = 5000

# 路由器配置
[workflow.router]
record_routing_history = true
max_routing_history = 100
use_default_edge = true
```

### 配置调优建议

1. **高并发场景**
   - 增加 `max_cache_size` 到 2000-5000
   - 减少 `checkpoint_interval` 到 2-3
   - 启用异步检查点创建

2. **内存受限场景**
   - 减少 `max_cache_size` 到 500-1000
   - 减少 `max_checkpoints_per_thread` 到 5
   - 启用状态压缩

3. **低延迟场景**
   - 减少 `default_timeout` 到 60000
   - 减少 `checkpoint_interval` 到 1
   - 启用路由缓存和节点上下文缓存

---

## 实施优先级

### 第一阶段（高优先级）
1. 表达式预编译
2. 增量状态更新
3. 异步检查点创建
4. 路由缓存
5. 节点上下文缓存

### 第二阶段（中优先级）
1. 状态压缩
2. 批量检查点创建
3. 并行条件评估
4. 节点并行执行

### 第三阶段（低优先级）
1. 性能监控
2. 配置优化
3. 性能测试和基准测试

---

## 预期效果

### 整体性能提升
- 工作流执行时间减少 30-50%
- 内存使用减少 20-40%
- 吞吐量提升 50-100%

### 具体指标
- 表达式评估速度提升 50-70%
- 状态更新速度提升 20-30%
- 检查点创建速度提升 40-60%
- 路由决策速度提升 30-50%
- 节点执行速度提升 20-30%

---

## 总结

本文档提供了图工作流系统的性能优化实施指南。通过实施这些优化措施，可以显著提升系统的性能和可扩展性。建议按照优先级逐步实施，并在每个阶段进行性能测试和验证。

所有优化措施都应该：
1. 保持向后兼容性
2. 提供配置选项
3. 包含完整的测试
4. 进行性能基准测试
5. 监控实际效果

通过持续的性能优化，可以确保图工作流系统在各种场景下都能提供高性能和可靠的服务。