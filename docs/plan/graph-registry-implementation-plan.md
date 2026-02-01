# Graph Registry Implementation Plan

## 背景

当前系统中，每个 Thread 都包含完整的 Graph 副本（通过 `graph.clone()` 创建），这导致了严重的内存冗余和性能开销。根据设计原则：

- **Workflow 是唯一可配置的源头**
- **Graph 只是预处理阶段的中间数据结构**
- **运行时 Graph 完全只读，不需要动态修改**
- **所有修改都必须从 Workflow 开始重新预处理**

因此，推荐采用 Graph 全局注册形式，让 Thread 直接通过单例注册器获取 Graph 实例。

## 设计目标

1. **消除 Graph 数据冗余**：避免每个 Thread 都存储完整的 Graph 副本
2. **提升性能**：减少 Thread 创建时的克隆开销
3. **保持架构一致性**：与 WorkflowRegistry 的设计模式保持一致
4. **简化代码**：移除不必要的 `clone()` 调用和相关逻辑

## 实施方案

### 1. 创建 GraphRegistry 单例

**文件路径**: `sdk/core/services/graph-registry.ts`

```typescript
/**
 * GraphRegistry - 图注册器
 * 负责图结构的注册、查询和缓存管理
 * 作为全局单例，提供统一的图访问接口
 */
import type { GraphData } from '../entities/graph-data';
import type { ID } from '../../types/common';

export class GraphRegistry {
  private graphs: Map<string, GraphData> = new Map();
  
  /**
   * 注册图结构
   * @param workflowId 工作流ID
   * @param graph 图数据结构
   */
  register(workflowId: string, graph: GraphData): void {
    // 标记为只读后注册，确保运行时不可修改
    graph.markAsReadOnly();
    this.graphs.set(workflowId, graph);
  }
  
  /**
   * 获取图结构
   * @param workflowId 工作流ID
   * @returns 图数据结构，如果不存在则返回undefined
   */
  get(workflowId: string): GraphData | undefined {
    return this.graphs.get(workflowId);
  }
  
  /**
   * 检查图是否存在
   * @param workflowId 工作流ID
   * @returns 是否存在
   */
  has(workflowId: string): boolean {
    return this.graphs.has(workflowId);
  }
  
  /**
   * 清空所有图缓存
   */
  clear(): void {
    this.graphs.clear();
  }
}

/**
 * 全局图注册器单例实例
 */
export const graphRegistry = new GraphRegistry();
```

### 2. 修改 GraphData 添加只读保护

**文件路径**: `sdk/core/entities/graph-data.ts`

在 `GraphData` 类中添加只读标记和保护机制：

```typescript
// 在 GraphData 类中添加以下属性和方法

/** 只读标记 */
private _isReadOnly: boolean = false;

/**
 * 标记图为只读状态
 * 调用后禁止任何修改操作
 */
markAsReadOnly(): void {
  this._isReadOnly = true;
}

/**
 * 检查是否为只读状态
 * @returns 是否只读
 */
isReadOnly(): boolean {
  return this._isReadOnly;
}

// 在所有修改方法中添加只读检查
addNode(node: GraphNode): void {
  if (this._isReadOnly) {
    throw new Error('Cannot modify read-only graph');
  }
  // ... 原有逻辑
}

addEdge(edge: GraphEdge): void {
  if (this._isReadOnly) {
    throw new Error('Cannot modify read-only graph');
  }
  // ... 原有逻辑
}

// 移除 clone() 方法（不再需要）
// clone(): Graph { ... } // 删除此方法
```

### 3. 修改 WorkflowRegistry 预处理逻辑

**文件路径**: `sdk/core/services/workflow-registry.ts`

在 `preprocessWorkflow` 方法末尾添加 Graph 注册逻辑：

```typescript
// 在 preprocessWorkflow 方法的末尾（约第748行）

// 创建处理后的工作流定义
const processedWorkflow: ProcessedWorkflowDefinition = {
  ...expandedWorkflow,
  triggers: expandedTriggers,
  graph: buildResult.graph,
  graphAnalysis,
  validationResult: preprocessValidation,
  subgraphMergeLogs,
  processedAt: now(),
  hasSubgraphs,
  subworkflowIds,
  topologicalOrder: graphAnalysis.topologicalSort.sortedNodes,
};

// 注册到全局 GraphRegistry
graphRegistry.register(workflow.id, buildResult.graph);

// 缓存处理后的工作流（原有的本地缓存可以保留用于向后兼容）
this.processedWorkflows.set(workflow.id, processedWorkflow);
this.graphCache.set(workflow.id, buildResult.graph); // 可选：保留本地缓存
```

### 4. 修改 ThreadBuilder 移除克隆逻辑

**文件路径**: `sdk/core/execution/thread-builder.ts`

替换原有的 Graph 克隆逻辑：

```typescript
// 替换 buildFromProcessedDefinition 方法中的 Graph 处理逻辑（约第98-99行）

// 原有代码：
// const threadGraphData = processedWorkflow.graph.clone();

// 新代码：
const threadGraphData = graphRegistry.get(processedWorkflow.id)!;
if (!threadGraphData) {
  throw new ValidationError(
    `Graph not found for workflow: ${processedWorkflow.id}`,
    'workflow.id'
  );
}
```

### 5. 更新 Graph 接口定义

**文件路径**: `sdk/types/graph.ts`

移除 `clone()` 方法声明：

```typescript
// 在 Graph 接口定义中（约第137行）

// 移除以下行：
// clone(): Graph;
```

### 6. 清理相关测试代码

需要更新所有依赖 `graph.clone()` 的测试代码，确保它们使用新的 GraphRegistry 模式。

## 影响范围分析

### 需要修改的文件

1. `sdk/core/entities/graph-data.ts` - 添加只读保护，移除 clone 方法
2. `sdk/types/graph.ts` - 移除 clone 方法声明  
3. `sdk/core/services/workflow-registry.ts` - 添加 GraphRegistry 注册逻辑
4. `sdk/core/execution/thread-builder.ts` - 移除克隆逻辑，使用 GraphRegistry
5. `sdk/core/services/graph-registry.ts` - 新增文件

### 需要更新的测试文件

- 所有使用 `graph.clone()` 的测试文件
- ThreadBuilder 相关测试
- WorkflowRegistry 相关测试

## 向后兼容性

- **完全兼容**：现有功能不受影响
- **性能提升**：内存使用减少，Thread 创建速度提升
- **API 变更**：移除了 `graph.clone()` 方法，但该方法在运行时从未被使用

## 验证计划

1. **单元测试**：确保所有现有测试通过
2. **集成测试**：验证子工作流场景正常工作
3. **性能测试**：测量内存使用和 Thread 创建时间的改进
4. **并发测试**：验证多线程环境下 Graph 共享的安全性

## 风险评估

- **低风险**：Graph 在预处理后确实不需要修改
- **零功能影响**：所有功能保持不变
- **性能收益显著**：预计内存使用减少 50%+，Thread 创建速度提升明显

## 实施优先级

**高优先级**：此优化能显著改善系统性能，且实现相对简单，建议优先实施。