# 预处理阶段ID映射方案设计

## 用户提出的核心思想

### 方案概述

1. **扩展graph定义**：完全替代预处理图，在包含图结构的同时包含workflow的完整定义
2. **预处理阶段完成ID映射**：在预处理阶段就直接完成所有ID映射
3. **使用自增整数作为索引**：避免UUID生成和子图的命名冲突
4. **临时数据**：把映射作为构建阶段的临时数据
5. **完成所有配置更新**：依照该临时数据完成所有配置的更新（包括触发器、节点配置等）

### 代码结构改进

1. **避免分散的if判断**：不使用 `if (node.type === NodeType.JOIN)` 这样的分散判断
2. **集中判断逻辑**：把判断逻辑集中在一起
3. **提供工具函数**：为每种节点类型提供专门的ID映射工具函数
4. **Builder/函数式设计**：采用类似builder设计模式或函数式的思想
5. **分离关注点**：方便把工具函数与构建逻辑分离

## 详细设计

### 1. 扩展的Graph定义

```typescript
/**
 * 预处理后的工作流定义
 * 包含完整的图结构和所有配置
 */
interface PreprocessedWorkflow {
  /** 工作流ID */
  id: ID;
  
  /** 原始工作流定义 */
  originalWorkflow: WorkflowDefinition;
  
  /** 图数据 */
  graph: GraphData;
  
  /** ID映射表（构建阶段临时数据） */
  idMapping: IdMapping;
  
  /** 预处理后的节点配置（已更新ID引用） */
  nodeConfigs: Map<ID, any>;
  
  /** 预处理后的触发器配置（已更新ID引用） */
  triggerConfigs: Map<ID, any>;
  
  /** 子工作流关系 */
  subgraphRelationships: SubgraphRelationship[];
}

/**
 * ID映射表
 */
interface IdMapping {
  /** 节点ID映射：原始ID -> 索引ID */
  nodeIds: Map<ID, number>;
  
  /** 边ID映射：原始ID -> 索引ID */
  edgeIds: Map<ID, number>;
  
  /** 反向映射：索引ID -> 原始ID */
  reverseNodeIds: Map<number, ID>;
  reverseEdgeIds: Map<number, ID>;
  
  /** 子图命名空间映射 */
  subgraphNamespaces: Map<ID, string>;
}

/**
 * 节点配置更新器接口
 */
interface NodeConfigUpdater {
  /** 节点类型 */
  nodeType: NodeType;
  
  /** 检查配置是否包含ID引用 */
  containsIdReferences(config: any): boolean;
  
  /** 更新配置中的ID引用 */
  updateIdReferences(config: any, idMapping: IdMapping): any;
}
```

### 2. 节点配置更新器注册表

```typescript
/**
 * 节点配置更新器注册表
 * 集中管理所有节点类型的ID更新逻辑
 */
class NodeConfigUpdaterRegistry {
  private updaters: Map<NodeType, NodeConfigUpdater> = new Map();
  
  /**
   * 注册节点配置更新器
   */
  register(updater: NodeConfigUpdater): void {
    this.updaters.set(updater.nodeType, updater);
  }
  
  /**
   * 获取节点配置更新器
   */
  get(nodeType: NodeType): NodeConfigUpdater | undefined {
    return this.updaters.get(nodeType);
  }
  
  /**
   * 检查节点配置是否包含ID引用
   */
  containsIdReferences(node: Node): boolean {
    const updater = this.get(node.type);
    if (!updater) {
      return false;
    }
    return updater.containsIdReferences(node.config);
  }
  
  /**
   * 更新节点配置中的ID引用
   */
  updateIdReferences(node: Node, idMapping: IdMapping): Node {
    const updater = this.get(node.type);
    if (!updater) {
      return node;
    }
    
    const updatedConfig = updater.updateIdReferences(node.config, idMapping);
    
    return {
      ...node,
      config: updatedConfig
    };
  }
}

// 全局单例
export const nodeConfigUpdaterRegistry = new NodeConfigUpdaterRegistry();
```

### 3. 具体节点配置更新器实现

#### 3.1 ROUTE节点配置更新器

```typescript
/**
 * ROUTE节点配置更新器
 */
class RouteNodeConfigUpdater implements NodeConfigUpdater {
  nodeType = NodeType.ROUTE;
  
  /**
   * 检查配置是否包含ID引用
   */
  containsIdReferences(config: any): boolean {
    if (!config || !config.routes) {
      return false;
    }
    
    // 检查routes中的targetNodeId
    for (const route of config.routes) {
      if (route.targetNodeId) {
        return true;
      }
    }
    
    // 检查defaultTargetNodeId
    if (config.defaultTargetNodeId) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 更新配置中的ID引用
   */
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedRoutes = config.routes?.map((route: any) => ({
      ...route,
      targetNodeId: this.mapNodeId(route.targetNodeId, idMapping)
    })) || [];
    
    const updatedDefaultTargetNodeId = config.defaultTargetNodeId 
      ? this.mapNodeId(config.defaultTargetNodeId, idMapping)
      : undefined;
    
    return {
      ...config,
      routes: updatedRoutes,
      defaultTargetNodeId: updatedDefaultTargetNodeId
    };
  }
  
  /**
   * 映射节点ID
   */
  private mapNodeId(originalId: ID, idMapping: IdMapping): ID {
    const index = idMapping.nodeIds.get(originalId);
    if (index === undefined) {
      return originalId;
    }
    return index.toString();
  }
}

// 注册更新器
nodeConfigUpdaterRegistry.register(new RouteNodeConfigUpdater());
```

#### 3.2 FORK节点配置更新器

```typescript
/**
 * FORK节点配置更新器
 */
class ForkNodeConfigUpdater implements NodeConfigUpdater {
  nodeType = NodeType.FORK;
  
  containsIdReferences(config: any): boolean {
    if (!config || !config.forkPaths) {
      return false;
    }
    
    for (const forkPath of config.forkPaths) {
      if (forkPath.pathId) {
        return true;
      }
    }
    
    return false;
  }
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedForkPaths = config.forkPaths?.map((forkPath: any) => ({
      ...forkPath,
      pathId: this.mapPathId(forkPath.pathId, idMapping)
    })) || [];
    
    return {
      ...config,
      forkPaths: updatedForkPaths
    };
  }
  
  private mapPathId(originalId: ID, idMapping: IdMapping): ID {
    const index = idMapping.edgeIds.get(originalId);
    if (index === undefined) {
      return originalId;
    }
    return index.toString();
  }
}

nodeConfigUpdaterRegistry.register(new ForkNodeConfigUpdater());
```

#### 3.3 JOIN节点配置更新器

```typescript
/**
 * JOIN节点配置更新器
 */
class JoinNodeConfigUpdater implements NodeConfigUpdater {
  nodeType = NodeType.JOIN;
  
  containsIdReferences(config: any): boolean {
    if (!config) {
      return false;
    }
    
    if (config.forkPathIds && config.forkPathIds.length > 0) {
      return true;
    }
    
    if (config.mainPathId) {
      return true;
    }
    
    return false;
  }
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    const updatedForkPathIds = config.forkPathIds?.map((id: ID) => 
      this.mapPathId(id, idMapping)
    ) || [];
    
    const updatedMainPathId = config.mainPathId 
      ? this.mapPathId(config.mainPathId, idMapping)
      : undefined;
    
    return {
      ...config,
      forkPathIds: updatedForkPathIds,
      mainPathId: updatedMainPathId
    };
  }
  
  private mapPathId(originalId: ID, idMapping: IdMapping): ID {
    const index = idMapping.edgeIds.get(originalId);
    if (index === undefined) {
      return originalId;
    }
    return index.toString();
  }
}

nodeConfigUpdaterRegistry.register(new JoinNodeConfigUpdater());
```

#### 3.4 SUBGRAPH节点配置更新器

```typescript
/**
 * SUBGRAPH节点配置更新器
 */
class SubgraphNodeConfigUpdater implements NodeConfigUpdater {
  nodeType = NodeType.SUBGRAPH;
  
  containsIdReferences(config: any): boolean {
    if (!config || !config.subgraphId) {
      return false;
    }
    return true;
  }
  
  updateIdReferences(config: any, idMapping: IdMapping): any {
    if (!config) {
      return config;
    }
    
    // SUBGRAPH节点的subgraphId不需要映射，因为它引用的是工作流ID，不是节点ID
    return config;
  }
}

nodeConfigUpdaterRegistry.register(new SubgraphNodeConfigUpdater());
```

### 4. 预处理工作流构建器

```typescript
/**
 * 预处理工作流构建器
 * 负责构建预处理后的工作流，完成所有ID映射和配置更新
 */
class PreprocessedWorkflowBuilder {
  private nodeIndexCounter = 0;
  private edgeIndexCounter = 0;
  private idMapping: IdMapping = {
    nodeIds: new Map(),
    edgeIds: new Map(),
    reverseNodeIds: new Map(),
    reverseEdgeIds: new Map(),
    subgraphNamespaces: new Map()
  };
  
  /**
   * 构建预处理后的工作流
   */
  async build(
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<PreprocessedWorkflow> {
    // 步骤1：构建图结构
    const graph = await this.buildGraph(workflow, workflowRegistry);
    
    // 步骤2：更新节点配置
    const nodeConfigs = await this.updateNodeConfigs(workflow);
    
    // 步骤3：更新触发器配置
    const triggerConfigs = await this.updateTriggerConfigs(workflow);
    
    // 步骤4：构建子图关系
    const subgraphRelationships = await this.buildSubgraphRelationships(workflow, workflowRegistry);
    
    return {
      id: workflow.id,
      originalWorkflow: workflow,
      graph,
      idMapping: this.idMapping,
      nodeConfigs,
      triggerConfigs,
      subgraphRelationships
    };
  }
  
  /**
   * 构建图结构
   */
  private async buildGraph(
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<GraphData> {
    const graph = new GraphData();
    
    // 添加节点（分配索引ID）
    for (const node of workflow.nodes) {
      const indexId = this.allocateNodeId(node.id);
      
      const graphNode: GraphNode = {
        id: indexId.toString(),
        type: node.type,
        name: node.name,
        description: node.description,
        originalNode: node,
        workflowId: workflow.id,
      };
      
      graph.addNode(graphNode);
      
      // 记录START和END节点
      if (node.type === NodeType.START) {
        graph.startNodeId = indexId.toString();
      } else if (node.type === NodeType.END) {
        graph.endNodeIds.add(indexId.toString());
      }
    }
    
    // 添加边（分配索引ID）
    for (const edge of workflow.edges) {
      const indexId = this.allocateEdgeId(edge.id);
      const sourceIndexId = this.idMapping.nodeIds.get(edge.sourceNodeId)?.toString() || edge.sourceNodeId;
      const targetIndexId = this.idMapping.nodeIds.get(edge.targetNodeId)?.toString() || edge.targetNodeId;
      
      const graphEdge: GraphEdge = {
        id: indexId.toString(),
        sourceNodeId: sourceIndexId,
        targetNodeId: targetIndexId,
        type: edge.type,
        label: edge.label,
        description: edge.description,
        weight: edge.weight,
        originalEdge: edge,
      };
      
      graph.addEdge(graphEdge);
    }
    
    // 处理子图
    await this.processSubgraphs(graph, workflow, workflowRegistry);
    
    return graph;
  }
  
  /**
   * 处理子图
   */
  private async processSubgraphs(
    graph: GraphData,
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<void> {
    const subgraphNodes = workflow.nodes.filter(n => n.type === NodeType.SUBGRAPH);
    
    for (const subgraphNode of subgraphNodes) {
      const subgraphConfig = subgraphNode.config as any;
      if (!subgraphConfig || !subgraphConfig.subgraphId) {
        continue;
      }
      
      const subworkflowId = subgraphConfig.subgraphId;
      const subworkflow = workflowRegistry.get(subworkflowId);
      if (!subworkflow) {
        continue;
      }
      
      // 生成子图命名空间
      const namespace = this.generateSubgraphNamespace(subworkflowId, subgraphNode.id);
      this.idMapping.subgraphNamespaces.set(subworkflowId, namespace);
      
      // 递归处理子工作流
      const preprocessedSubworkflow = await this.build(subworkflow, workflowRegistry);
      
      // 合并子图
      this.mergeSubgraph(graph, preprocessedSubworkflow, subgraphNode.id, namespace);
    }
  }
  
  /**
   * 合并子图
   */
  private mergeSubgraph(
    mainGraph: GraphData,
    subworkflow: PreprocessedWorkflow,
    subgraphNodeId: ID,
    namespace: string
  ): void {
    // 添加子图节点
    for (const node of subworkflow.graph.nodes.values()) {
      const newNode: GraphNode = {
        ...node,
        workflowId: subworkflow.id,
        parentWorkflowId: mainGraph.nodes.get(subworkflow.graph.startNodeId!)?.workflowId,
      };
      
      mainGraph.addNode(newNode);
    }
    
    // 添加子图边
    for (const edge of subworkflow.graph.edges.values()) {
      mainGraph.addEdge(edge);
    }
    
    // 连接SUBGRAPH节点的入边到子图的START节点
    const incomingEdges = mainGraph.getIncomingEdges(subgraphNodeId);
    const subgraphStartId = subworkflow.graph.startNodeId;
    if (subgraphStartId) {
      for (const incomingEdge of incomingEdges) {
        const newEdge: GraphEdge = {
          ...incomingEdge,
          id: this.allocateEdgeId(`${incomingEdge.id}_merged`).toString(),
          targetNodeId: subgraphStartId,
        };
        mainGraph.addEdge(newEdge);
      }
    }
    
    // 连接子图的END节点到SUBGRAPH节点的出边
    const outgoingEdges = mainGraph.getOutgoingEdges(subgraphNodeId);
    for (const endNodeId of subworkflow.graph.endNodeIds) {
      for (const outgoingEdge of outgoingEdges) {
        const newEdge: GraphEdge = {
          ...outgoingEdge,
          id: this.allocateEdgeId(`${outgoingEdge.id}_merged`).toString(),
          sourceNodeId: endNodeId,
        };
        mainGraph.addEdge(newEdge);
      }
    }
    
    // 移除SUBGRAPH节点
    mainGraph.nodes.delete(subgraphNodeId);
  }
  
  /**
   * 更新节点配置
   */
  private async updateNodeConfigs(workflow: WorkflowDefinition): Promise<Map<ID, any>> {
    const nodeConfigs = new Map<ID, any>();
    
    for (const node of workflow.nodes) {
      const indexId = this.idMapping.nodeIds.get(node.id);
      if (indexId === undefined) {
        continue;
      }
      
      // 使用注册的更新器更新配置
      const updatedNode = nodeConfigUpdaterRegistry.updateIdReferences(node, this.idMapping);
      nodeConfigs.set(indexId.toString(), updatedNode.config);
    }
    
    return nodeConfigs;
  }
  
  /**
   * 更新触发器配置
   */
  private async updateTriggerConfigs(workflow: WorkflowDefinition): Promise<Map<ID, any>> {
    const triggerConfigs = new Map<ID, any>();
    
    if (!workflow.triggers) {
      return triggerConfigs;
    }
    
    for (const trigger of workflow.triggers) {
      // 更新触发器配置中的ID引用
      const updatedTrigger = this.updateTriggerIdReferences(trigger);
      triggerConfigs.set(trigger.id, updatedTrigger);
    }
    
    return triggerConfigs;
  }
  
  /**
   * 更新触发器配置中的ID引用
   */
  private updateTriggerIdReferences(trigger: any): any {
    // TODO: 实现触发器配置的ID更新逻辑
    return trigger;
  }
  
  /**
   * 构建子图关系
   */
  private async buildSubgraphRelationships(
    workflow: WorkflowDefinition,
    workflowRegistry: any
  ): Promise<SubgraphRelationship[]> {
    // TODO: 实现子图关系构建逻辑
    return [];
  }
  
  /**
   * 分配节点索引ID
   */
  private allocateNodeId(originalId: ID): number {
    const index = this.nodeIndexCounter++;
    this.idMapping.nodeIds.set(originalId, index);
    this.idMapping.reverseNodeIds.set(index, originalId);
    return index;
  }
  
  /**
   * 分配边索引ID
   */
  private allocateEdgeId(originalId: ID): number {
    const index = this.edgeIndexCounter++;
    this.idMapping.edgeIds.set(originalId, index);
    this.idMapping.reverseEdgeIds.set(index, originalId);
    return index;
  }
  
  /**
   * 生成子图命名空间
   */
  private generateSubgraphNamespace(subworkflowId: ID, subgraphNodeId: ID): string {
    const combined = `${subworkflowId}_${subgraphNodeId}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sg_${Math.abs(hash).toString(16)}`;
  }
}
```

### 5. 使用示例

```typescript
// 创建预处理工作流构建器
const builder = new PreprocessedWorkflowBuilder();

// 构建预处理后的工作流
const preprocessedWorkflow = await builder.build(workflow, workflowRegistry);

// 获取图数据
const graph = preprocessedWorkflow.graph;

// 获取更新后的节点配置
const routeNodeConfig = preprocessedWorkflow.nodeConfigs.get('2'); // 索引ID
console.log(routeNodeConfig);
// {
//   routes: [
//     { condition: { expression: 'true' }, targetNodeId: '3' }  // 已更新为索引ID
//   ]
// }

// 获取ID映射
const idMapping = preprocessedWorkflow.idMapping;
console.log(idMapping.nodeIds.get('llm'));  // 3
console.log(idMapping.reverseNodeIds.get(3));  // 'llm'
```

## 方案优势

### 1. 性能优势

| 维度 | 方案3（运行时映射） | 方案4（预处理映射） |
|------|------------------|------------------|
| 运行时开销 | ❌ 高（每次查找映射） | ✅ 无（预处理完成） |
| ID生成 | ❌ UUID生成开销 | ✅ 自增整数，无开销 |
| 内存占用 | ⚠️ 中（需要维护映射） | ✅ 低（临时数据） |
| 缓存友好 | ❌ 差（Map查找） | ✅ 好（数组索引） |

### 2. 代码质量优势

| 维度 | 当前方案 | 新方案 |
|------|---------|--------|
| 判断逻辑分散 | ❌ 是（多个if判断） | ✅ 否（集中管理） |
| 代码可维护性 | ❌ 低 | ✅ 高 |
| 扩展性 | ❌ 差 | ✅ 好 |
| 关注点分离 | ❌ 否 | ✅ 是 |

### 3. 架构优势

| 维度 | 当前方案 | 新方案 |
|------|---------|--------|
| 职责单一 | ❌ 否 | ✅ 是 |
| 依赖关系 | ❌ 复杂 | ✅ 清晰 |
| 测试友好 | ⚠️ 中 | ✅ 高 |

## 实施计划

### 阶段1：设计接口和注册表（1天）

- [ ] 定义`NodeConfigUpdater`接口
- [ ] 实现`NodeConfigUpdaterRegistry`
- [ ] 实现基础节点配置更新器

### 阶段2：实现具体更新器（2-3天）

- [ ] 实现`RouteNodeConfigUpdater`
- [ ] 实现`ForkNodeConfigUpdater`
- [ ] 实现`JoinNodeConfigUpdater`
- [ ] 实现`SubgraphNodeConfigUpdater`
- [ ] 实现其他节点类型的更新器

### 阶段3：实现预处理构建器（2-3天）

- [ ] 实现`PreprocessedWorkflowBuilder`
- [ ] 实现图构建逻辑
- [ ] 实现子图合并逻辑
- [ ] 实现配置更新逻辑

### 阶段4：集成和测试（2-3天）

- [ ] 集成到工作流注册表
- [ ] 更新相关测试
- [ ] 性能测试
- [ ] 回归测试

### 阶段5：文档和示例（1天）

- [ ] 更新API文档
- [ ] 添加代码示例
- [ ] 更新开发指南

## 总结

### 核心改进

1. **预处理阶段完成ID映射**：避免运行时开销
2. **使用自增整数**：避免UUID生成开销和命名冲突
3. **集中管理更新逻辑**：使用注册表模式
4. **分离关注点**：工具函数与构建逻辑分离
5. **Builder/函数式设计**：提高代码可维护性

### 关键优势

1. ✅ **性能最优**：无运行时映射开销
2. ✅ **代码质量高**：集中管理，易于维护
3. ✅ **扩展性好**：易于添加新的节点类型
4. ✅ **测试友好**：每个更新器独立测试
5. ✅ **架构清晰**：职责单一，依赖关系清晰

### 推荐方案

**采用方案4：预处理阶段ID映射 + 节点配置更新器注册表**

这是最优的解决方案，兼顾了性能、代码质量和架构设计。