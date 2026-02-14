# PreprocessedGraph重构方案

## 1. 问题分析

### 1.1 当前架构问题

#### 问题1：ProcessedWorkflowDefinition的冗余性
- [`ProcessedWorkflowDefinition`](packages/types/src/workflow/preprocess.ts:49)包装了原始的[`WorkflowDefinition`](packages/types/src/workflow/definition.ts:20)
- 实际上预处理后的graph已经包含了所有必要信息
- 原始的WorkflowDefinition应该保持不变，作为输入
- 预处理的输出应该是一个"增强的Graph"，而不是包装后的WorkflowDefinition

#### 问题2：Thread对workflowRegistry的依赖
- [`Thread`](packages/types/src/thread/definition.ts:16)持有`graph: Graph`，但还需要`workflowRegistry`来获取工作流信息
- [`ThreadContext`](sdk/core/execution/context/thread-context.ts:44)依赖`workflowRegistry`，说明graph不包含完整信息
- 这违反了单一职责原则：Thread应该只关注执行，不应该知道工作流注册表的存在

#### 问题3：GraphData的职责不清晰
- [`GraphData`](sdk/core/entities/graph-data.ts:41)只包含图结构（节点、边、邻接表）
- 缺少预处理相关的元数据（ID映射、节点配置、触发器等）
- 需要额外的ProcessedWorkflowDefinition来存储这些信息

### 1.2 设计文档的真正意图

根据设计文档`docs/plan/preprocessing-id-mapping-design.md`：

> 1. **扩展graph定义**：完全替代预处理图，在包含图结构的同时包含workflow的完整定义
> 2. **预处理阶段完成ID映射**：在预处理阶段就直接完成所有ID映射

这意味着：
- 不需要ProcessedWorkflowDefinition这个包装类
- 直接扩展Graph接口，让它包含所有预处理相关的信息
- 预处理的结果就是一个`PreprocessedGraph`，包含图结构和所有元数据

## 2. 重构方案

### 2.1 创建PreprocessedGraph接口

```typescript
/**
 * 预处理后的图接口
 * 扩展Graph接口，添加预处理相关的元数据
 */
export interface PreprocessedGraph extends Graph {
  // ========== ID映射相关 ==========
  /** ID映射表（构建阶段临时数据） */
  idMapping: IdMapping;
  
  /** 预处理后的节点配置（已更新ID引用） */
  nodeConfigs: Map<ID, any>;
  
  /** 预处理后的触发器配置（已更新ID引用） */
  triggerConfigs: Map<ID, any>;
  
  /** 子工作流关系 */
  subgraphRelationships: SubgraphRelationship[];
  
  // ========== 预处理元数据 ==========
  /** 图分析结果 */
  graphAnalysis: GraphAnalysisResult;
  
  /** 预处理验证结果 */
  validationResult: PreprocessValidationResult;
  
  /** 拓扑排序后的节点ID列表 */
  topologicalOrder: ID[];
  
  /** 子工作流合并日志 */
  subgraphMergeLogs: SubgraphMergeLog[];
  
  /** 预处理时间戳 */
  processedAt: Timestamp;
  
  // ========== 工作流元数据 ==========
  /** 工作流ID */
  workflowId: ID;
  
  /** 工作流版本 */
  workflowVersion: Version;
  
  /** 触发器（已展开，不包含引用） */
  triggers?: WorkflowTrigger[];
  
  /** 工作流变量定义 */
  variables?: WorkflowVariable[];
  
  /** 是否包含子工作流 */
  hasSubgraphs: boolean;
  
  /** 子工作流ID集合 */
  subworkflowIds: Set<ID>;
}
```

### 2.2 创建PreprocessedGraphData类

```typescript
/**
 * 预处理后的图数据类
 * 继承GraphData，实现PreprocessedGraph接口
 */
export class PreprocessedGraphData extends GraphData implements PreprocessedGraph {
  // ID映射相关
  public idMapping: IdMapping;
  public nodeConfigs: Map<ID, any>;
  public triggerConfigs: Map<ID, any>;
  public subgraphRelationships: SubgraphRelationship[];
  
  // 预处理元数据
  public graphAnalysis: GraphAnalysisResult;
  public validationResult: PreprocessValidationResult;
  public topologicalOrder: ID[];
  public subgraphMergeLogs: SubgraphMergeLog[];
  public processedAt: Timestamp;
  
  // 工作流元数据
  public workflowId: ID;
  public workflowVersion: Version;
  public triggers?: WorkflowTrigger[];
  public variables?: WorkflowVariable[];
  public hasSubgraphs: boolean;
  public subworkflowIds: Set<ID>;
  
  constructor() {
    super();
    // 初始化所有字段
    this.idMapping = {
      nodeIds: new Map(),
      edgeIds: new Map(),
      reverseNodeIds: new Map(),
      reverseEdgeIds: new Map(),
      subgraphNamespaces: new Map()
    };
    this.nodeConfigs = new Map();
    this.triggerConfigs = new Map();
    this.subgraphRelationships = [];
    this.graphAnalysis = {} as GraphAnalysisResult;
    this.validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validatedAt: 0
    };
    this.topologicalOrder = [];
    this.subgraphMergeLogs = [];
    this.processedAt = 0;
    this.workflowId = '';
    this.workflowVersion = '1.0.0';
    this.hasSubgraphs = false;
    this.subworkflowIds = new Set();
  }
}
```

### 2.3 创建GraphRegistry类

```typescript
/**
 * 图注册表
 * 管理预处理后的图
 */
export class GraphRegistry {
  private graphs: Map<ID, PreprocessedGraph> = new Map();
  
  /**
   * 注册预处理后的图
   */
  register(graph: PreprocessedGraph): void {
    this.graphs.set(graph.workflowId, graph);
  }
  
  /**
   * 获取预处理后的图
   */
  get(workflowId: ID): PreprocessedGraph | undefined {
    return this.graphs.get(workflowId);
  }
  
  /**
   * 检查图是否存在
   */
  has(workflowId: ID): boolean {
    return this.graphs.has(workflowId);
  }
  
  /**
   * 移除图
   */
  unregister(workflowId: ID): void {
    this.graphs.delete(workflowId);
  }
  
  /**
   * 清空所有图
   */
  clear(): void {
    this.graphs.clear();
  }
  
  /**
   * 获取所有工作流ID
   */
  getAllWorkflowIds(): ID[] {
    return Array.from(this.graphs.keys());
  }
  
  /**
   * 获取图数量
   */
  size(): number {
    return this.graphs.size;
  }
}

/**
 * 全局单例实例
 */
export const graphRegistry = new GraphRegistry();
```

### 2.4 修改Thread接口

```typescript
export interface Thread {
  /** 线程唯一标识符 */
  id: ID;
  
  /** 关联的工作流ID */
  workflowId: ID;
  
  /** 工作流版本 */
  workflowVersion: Version;
  
  /** 线程状态 */
  status: ThreadStatus;
  
  /** 当前执行节点ID */
  currentNodeId: ID;
  
  /** 预处理后的工作流图结构（使用 PreprocessedGraph 接口） */
  graph: PreprocessedGraph;  // 从 Graph 改为 PreprocessedGraph
  
  // ... 其他字段保持不变
}
```

### 2.5 修改ThreadContext

```typescript
export class ThreadContext implements LifecycleCapable {
  public readonly thread: Thread;
  public readonly conversationManager: ConversationManager;
  private readonly variableCoordinator: VariableCoordinator;
  private readonly variableStateManager: VariableStateManager;
  public readonly triggerStateManager: TriggerStateManager;
  public readonly triggerManager: TriggerCoordinator;
  private navigator?: GraphNavigator;
  private readonly executionState: ExecutionState;
  private statefulTools: Map<string, any> = new Map();
  private factories: Map<string, StatefulToolFactory> = new Map();
  
  // 移除 workflowRegistry 依赖
  private readonly threadRegistry: ThreadRegistry;
  private readonly eventManager: EventManager;
  private readonly toolService: ToolService;
  private readonly llmExecutor: LLMExecutor;
  public readonly interruptionManager: InterruptionManager;
  private availableTools: Set<string> = new Set();
  
  constructor(
    thread: Thread,
    conversationManager: ConversationManager,
    threadRegistry: ThreadRegistry,
    eventManager: EventManager,
    toolService: ToolService,
    llmExecutor: LLMExecutor
  ) {
    this.thread = thread;
    this.conversationManager = conversationManager;
    this.threadRegistry = threadRegistry;
    this.eventManager = eventManager;
    this.toolService = toolService;
    this.llmExecutor = llmExecutor;
    
    // 从 PreprocessedGraph 获取可用工具
    this.availableTools = this.thread.graph.availableTools?.initial || new Set();
    
    // ... 其他初始化代码
  }
  
  // 移除所有使用 workflowRegistry 的方法
  // 所有工作流相关信息都从 thread.graph 获取
}
```

### 2.6 修改workflow-processor

```typescript
/**
 * 预处理工作流
 * 返回 PreprocessedGraph 而不是 ProcessedWorkflowDefinition
 */
export async function processWorkflow(
  workflow: WorkflowDefinition,
  options: ProcessOptions = {}
): Promise<PreprocessedGraph> {
  // ... 预处理逻辑
  
  // 使用 PreprocessedWorkflowBuilder 构建预处理工作流
  const preprocessedBuilder = new PreprocessedWorkflowBuilder();
  const preprocessedResult = await preprocessedBuilder.build(expandedWorkflow, options.workflowRegistry);
  
  // 创建 PreprocessedGraphData
  const preprocessedGraph = new PreprocessedGraphData();
  
  // 复制图结构
  preprocessedGraph.nodes = preprocessedResult.graph.nodes;
  preprocessedGraph.edges = preprocessedResult.graph.edges;
  preprocessedGraph.adjacencyList = preprocessedResult.graph.adjacencyList;
  preprocessedGraph.reverseAdjacencyList = preprocessedResult.graph.reverseAdjacencyList;
  preprocessedGraph.startNodeId = preprocessedResult.graph.startNodeId;
  preprocessedGraph.endNodeIds = preprocessedResult.graph.endNodeIds;
  
  // 设置预处理元数据
  preprocessedGraph.idMapping = preprocessedResult.idMapping;
  preprocessedGraph.nodeConfigs = preprocessedResult.nodeConfigs;
  preprocessedGraph.triggerConfigs = preprocessedResult.triggerConfigs;
  preprocessedGraph.subgraphRelationships = preprocessedResult.subgraphRelationships;
  preprocessedGraph.graphAnalysis = graphAnalysis;
  preprocessedGraph.validationResult = preprocessValidation;
  preprocessedGraph.topologicalOrder = graphAnalysis.topologicalSort.sortedNodes;
  preprocessedGraph.subgraphMergeLogs = subgraphMergeLogs;
  preprocessedGraph.processedAt = now();
  
  // 设置工作流元数据
  preprocessedGraph.workflowId = expandedWorkflow.id;
  preprocessedGraph.workflowVersion = expandedWorkflow.version;
  preprocessedGraph.triggers = expandedTriggers;
  preprocessedGraph.variables = expandedWorkflow.variables;
  preprocessedGraph.hasSubgraphs = hasSubgraphs;
  preprocessedGraph.subworkflowIds = subworkflowIds;
  
  return preprocessedGraph;
}
```

### 2.7 修改workflow-registry

```typescript
class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private processedGraphs: Map<string, PreprocessedGraph> = new Map();  // 从 ProcessedWorkflowDefinition 改为 PreprocessedGraph
  
  /**
   * 获取处理后的图
   */
  getProcessedGraph(workflowId: string): PreprocessedGraph | undefined {
    return this.processedGraphs.get(workflowId);
  }
  
  /**
   * 预处理工作流并存储
   */
  async preprocessAndStore(workflow: WorkflowDefinition): Promise<PreprocessedGraph> {
    const existing = this.processedGraphs.get(workflow.id);
    if (existing) {
      return existing;
    }
    
    const processOptions: ProcessOptions = {
      workflowRegistry: this,
      maxRecursionDepth: this.maxRecursionDepth,
      validate: true,
      computeTopologicalOrder: true,
      detectCycles: true,
      analyzeReachability: true,
    };
    
    const preprocessedGraph = await processWorkflow(workflow, processOptions);
    
    this.processedGraphs.set(workflow.id, preprocessedGraph);
    
    return preprocessedGraph;
  }
  
  /**
   * 确保工作流已预处理
   */
  async ensureProcessed(workflowId: string): Promise<PreprocessedGraph> {
    let processed = this.getProcessedGraph(workflowId);
    if (processed) return processed;
    
    const workflow = this.get(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(
        `Workflow with ID '${workflowId}' not found`,
        workflowId
      );
    }
    
    processed = await this.preprocessAndStore(workflow);
    return processed;
  }
}
```

## 3. 重构步骤

### 阶段1：创建新的类型和类（1天）
- [ ] 创建PreprocessedGraph接口
- [ ] 创建PreprocessedGraphData类
- [ ] 创建GraphRegistry类
- [ ] 更新types包导出

### 阶段2：修改核心组件（2天）
- [ ] 修改workflow-processor返回PreprocessedGraph
- [ ] 修改workflow-registry使用PreprocessedGraph
- [ ] 修改Thread接口使用PreprocessedGraph
- [ ] 修改ThreadContext移除workflowRegistry依赖

### 阶段3：更新构建器（1天）
- [ ] 修改PreprocessedWorkflowBuilder返回PreprocessedGraphData
- [ ] 更新GraphBuilder支持PreprocessedGraph

### 阶段4：删除旧代码（0.5天）
- [ ] 删除ProcessedWorkflowDefinition类
- [ ] 清理相关引用

### 阶段5：测试和验证（1天）
- [ ] 更新单元测试
- [ ] 运行集成测试
- [ ] 性能测试

## 4. 优势分析

### 4.1 概念清晰
- **Graph就是预处理后的结果**：不再需要ProcessedWorkflowDefinition包装
- **职责单一**：WorkflowDefinition是输入，PreprocessedGraph是输出
- **避免冗余**：不需要同时维护Graph和ProcessedWorkflowDefinition

### 4.2 依赖简化
- **ThreadContext不再依赖workflowRegistry**：所有信息都从PreprocessedGraph获取
- **减少运行时查询**：不需要在执行时查询workflowRegistry
- **性能优化**：预处理阶段完成所有准备工作

### 4.3 架构清晰
- **GraphRegistry管理图**：专门负责预处理后的图管理
- **WorkflowRegistry管理定义**：专门负责原始工作流定义管理
- **职责分离**：每个组件职责明确

### 4.4 扩展性好
- **易于添加新的预处理元数据**：直接在PreprocessedGraph接口添加
- **易于实现新的图类型**：继承PreprocessedGraphData
- **易于测试**：每个组件独立测试

## 5. 风险评估

### 5.1 兼容性风险
- **影响范围大**：Thread、ThreadContext、workflow-processor等核心组件都需要修改
- **测试覆盖**：需要确保所有现有测试通过
- **迁移成本**：需要更新所有使用ProcessedWorkflowDefinition的代码

### 5.2 性能风险
- **内存占用**：PreprocessedGraph包含更多信息，可能增加内存占用
- **构建时间**：预处理阶段需要更多时间来构建PreprocessedGraph
- **缓存策略**：需要优化PreprocessedGraph的缓存策略

### 5.3 维护风险
- **代码复杂度**：PreprocessedGraph接口包含大量字段，可能增加维护成本
- **文档更新**：需要更新所有相关文档
- **团队培训**：需要培训团队了解新的架构

## 6. 总结

### 6.1 核心改进
1. **删除ProcessedWorkflowDefinition**：避免冗余包装
2. **创建PreprocessedGraph**：扩展Graph接口，包含所有预处理信息
3. **创建GraphRegistry**：专门管理预处理后的图
4. **简化ThreadContext**：移除workflowRegistry依赖

### 6.2 关键优势
1. ✅ **概念清晰**：Graph就是预处理后的结果
2. ✅ **依赖简化**：ThreadContext不再依赖workflowRegistry
3. ✅ **性能优化**：预处理阶段完成所有准备工作
4. ✅ **架构清晰**：职责分离，易于维护

### 6.3 推荐方案
**采用完整重构方案**：创建PreprocessedGraph、GraphRegistry，简化ThreadContext

这是最优的解决方案，虽然重构成本较高，但长期收益明显。