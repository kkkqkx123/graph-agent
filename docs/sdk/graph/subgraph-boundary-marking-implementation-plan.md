# 子图边界标记实现方案

## 概述

本文档提供了基于修订版设计方案的具体实现步骤，采用混合方案：结构化属性 + 轻量级metadata + WorkflowRegistry关系管理。

## 一、核心修改清单

### 1. 类型定义修改

#### 文件：`sdk/types/graph.ts`
**修改内容**：增强GraphNode接口

```typescript
// 在GraphNode接口中添加以下字段
/** 节点所属的原始工作流ID */
workflowId: ID;
/** 父工作流ID（如果是子图展开的节点） */
parentWorkflowId?: ID;
```

**影响范围**：
- GraphNode创建处需要设置workflowId
- 所有使用GraphNode的地方需要处理新字段

#### 文件：`sdk/types/subgraph.ts`（新建）
**内容**：定义边界标记常量

```typescript
/**
 * 子图边界标记常量
 * 定义metadata中使用的key，避免命名冲突
 */

export const SUBGRAPH_METADATA_KEYS = {
  /** 边界类型：'entry' | 'exit' | 'internal' */
  BOUNDARY_TYPE: 'subgraphBoundaryType',
  /** 对应的原始SUBGRAPH节点ID */
  ORIGINAL_NODE_ID: 'originalSubgraphNodeId',
  /** 子图命名空间 */
  NAMESPACE: 'subgraphNamespace',
  /** 子图深度 */
  DEPTH: 'subgraphDepth'
} as const;

export type SubgraphBoundaryType = 'entry' | 'exit' | 'internal';

export interface SubgraphBoundaryMetadata {
  /** 边界类型 */
  boundaryType: SubgraphBoundaryType;
  /** 对应的原始SUBGRAPH节点ID */
  originalSubgraphNodeId: ID;
  /** 子图命名空间 */
  namespace: string;
  /** 子图深度 */
  depth: number;
}
```

#### 文件：`sdk/types/workflow.ts`
**修改内容**：添加工作流关系类型

```typescript
// 在文件末尾添加

/**
 * 工作流关系信息
 */
export interface WorkflowRelationship {
  /** 工作流ID */
  workflowId: ID;
  /** 父工作流ID（如果有） */
  parentWorkflowId?: ID;
  /** 子工作流ID列表 */
  childWorkflowIds: Set<ID>;
  /** 引用此工作流的SUBGRAPH节点ID映射 */
  referencedBy: Map<ID, ID>; // key: SUBGRAPH节点ID, value: 父工作流ID
  /** 关系深度 */
  depth: number;
}

/**
 * 工作流层次结构信息
 */
export interface WorkflowHierarchy {
  /** 祖先链（从根到父） */
  ancestors: ID[];
  /** 后代链（从子到孙） */
  descendants: ID[];
  /** 在层次结构中的深度 */
  depth: number;
  /** 根工作流ID */
  rootWorkflowId: ID;
}
```

### 2. WorkflowRegistry增强

#### 文件：`sdk/core/registry/workflow-registry.ts`
**修改内容**：添加关系管理功能

**步骤1**：添加私有字段
```typescript
// 在WorkflowRegistry类中添加
private workflowRelationships: Map<ID, WorkflowRelationship> = new Map();
```

**步骤2**：添加关系管理方法
```typescript
/**
 * 注册子图关系
 * @param parentWorkflowId 父工作流ID
 * @param subgraphNodeId SUBGRAPH节点ID
 * @param childWorkflowId 子工作流ID
 */
registerSubgraphRelationship(
  parentWorkflowId: ID,
  subgraphNodeId: ID,
  childWorkflowId: ID
): void {
  // 1. 更新父工作流关系
  const parentRelationship = this.workflowRelationships.get(parentWorkflowId);
  if (parentRelationship) {
    parentRelationship.childWorkflowIds.add(childWorkflowId);
    parentRelationship.referencedBy.set(subgraphNodeId, childWorkflowId);
  } else {
    this.workflowRelationships.set(parentWorkflowId, {
      workflowId: parentWorkflowId,
      childWorkflowIds: new Set([childWorkflowId]),
      referencedBy: new Map([[subgraphNodeId, childWorkflowId]]),
      depth: 0
    });
  }
  
  // 2. 更新子工作流关系
  const childRelationship = this.workflowRelationships.get(childWorkflowId);
  if (!childRelationship) {
    this.workflowRelationships.set(childWorkflowId, {
      workflowId: childWorkflowId,
      parentWorkflowId,
      childWorkflowIds: new Set(),
      referencedBy: new Map(),
      depth: this.calculateDepth(parentWorkflowId) + 1
    });
  }
}

/**
 * 获取工作流层次结构
 * @param workflowId 工作流ID
 * @returns 层次结构信息
 */
getWorkflowHierarchy(workflowId: ID): WorkflowHierarchy {
  const ancestors: ID[] = [];
  const descendants: ID[] = [];
  
  // 构建祖先链
  let currentId = workflowId;
  while (currentId) {
    const relationship = this.workflowRelationships.get(currentId);
    if (relationship?.parentWorkflowId) {
      ancestors.unshift(relationship.parentWorkflowId);
      currentId = relationship.parentWorkflowId;
    } else {
      break;
    }
  }
  
  // 构建后代链（递归）
  this.collectDescendants(workflowId, descendants);
  
  const relationship = this.workflowRelationships.get(workflowId);
  return {
    ancestors,
    descendants,
    depth: relationship?.depth || 0,
    rootWorkflowId: ancestors[0] || workflowId
  };
}

/**
 * 获取父工作流
 * @param workflowId 工作流ID
 * @returns 父工作流ID或null
 */
getParentWorkflow(workflowId: ID): ID | null {
  const relationship = this.workflowRelationships.get(workflowId);
  return relationship?.parentWorkflowId || null;
}

/**
 * 获取子工作流
 * @param workflowId 工作流ID
 * @returns 子工作流ID数组
 */
getChildWorkflows(workflowId: ID): ID[] {
  const relationship = this.workflowRelationships.get(workflowId);
  return relationship ? Array.from(relationship.childWorkflowIds) : [];
}

// 私有辅助方法
private collectDescendants(workflowId: ID, result: ID[]): void {
  const relationship = this.workflowRelationships.get(workflowId);
  if (!relationship) return;
  
  for (const childId of relationship.childWorkflowIds) {
    if (!result.includes(childId)) {
      result.push(childId);
      this.collectDescendants(childId, result);
    }
  }
}

private calculateDepth(workflowId: ID): number {
  const relationship = this.workflowRelationships.get(workflowId);
  return relationship?.depth || 0;
}
```

### 3. GraphBuilder修改

#### 文件：`sdk/core/graph/graph-builder.ts`
**修改内容**：在mergeGraph方法中添加工作流信息和边界标记

**步骤1**：修改mergeGraph方法签名
```typescript
private static mergeGraph(
  mainGraph: GraphData,
  subgraph: GraphData,
  subgraphNodeId: ID,
  options: SubgraphMergeOptions & {
    subworkflowId: ID;
    parentWorkflowId: ID;
    depth: number;
    workflowRegistry?: any;
  }
): SubgraphMergeResult
```

**步骤2**：修改节点合并逻辑
```typescript
// 在添加子工作流节点的循环中
for (const node of subgraph.nodes.values()) {
  const newId = generateNamespacedNodeId(options.nodeIdPrefix || '', node.id);
  const newNode: GraphNode = {
    ...node,
    id: newId,
    originalNode: node.originalNode,
    // 新增：设置工作流信息
    workflowId: options.subworkflowId,
    parentWorkflowId: options.parentWorkflowId,
  };
  
  // 为边界节点添加metadata标记
  if (node.type === 'START' as NodeType) {
    newNode.metadata = {
      ...newNode.metadata,
      [SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]: 'entry',
      [SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID]: subgraphNodeId,
      [SUBGRAPH_METADATA_KEYS.NAMESPACE]: options.nodeIdPrefix,
      [SUBGRAPH_METADATA_KEYS.DEPTH]: options.depth
    };
  } else if (node.type === 'END' as NodeType) {
    newNode.metadata = {
      ...newNode.metadata,
      [SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]: 'exit',
      [SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID]: subgraphNodeId,
      [SUBGRAPH_METADATA_KEYS.NAMESPACE]: options.nodeIdPrefix,
      [SUBGRAPH_METADATA_KEYS.DEPTH]: options.depth
    };
  }
  
  mainGraph.addNode(newNode);
  // ... 其余逻辑
}
```

**步骤3**：注册工作流关系
```typescript
// 在方法末尾，返回结果前
if (options.workflowRegistry) {
  options.workflowRegistry.registerSubgraphRelationship(
    options.parentWorkflowId,
    subgraphNodeId,
    options.subworkflowId
  );
}
```

**步骤4**：修改processSubgraphs方法调用
```typescript
// 在processSubgraphs方法中，调用mergeGraph时传递额外参数
const mergeResult = this.mergeGraph(
  graph,
  subgraphBuildResult.graph,
  subgraphNode.id,
  {
    ...mergeOptions,
    subworkflowId: subworkflowId,
    parentWorkflowId: workflow.id, // 需要传递父工作流ID
    depth: currentDepth + 1,
    workflowRegistry: workflowRegistry
  }
);
```

### 4. ThreadContext增强

#### 文件：`sdk/core/execution/context/thread-context.ts`
**修改内容**：添加子图执行堆栈跟踪

**步骤1**：添加类型定义
```typescript
/**
 * 子图执行上下文
 */
interface SubgraphContext {
  /** 子工作流ID */
  workflowId: ID;
  /** 父工作流ID */
  parentWorkflowId: ID;
  /** 开始时间 */
  startTime: number;
  /** 输入数据 */
  input: any;
  /** 当前深度 */
  depth: number;
}
```

**步骤2**：添加私有字段
```typescript
// 在ThreadContext类中添加
private subgraphStack: SubgraphContext[] = [];
```

**步骤3**：添加子图管理方法
```typescript
/**
 * 进入子图
 * @param workflowId 子工作流ID
 * @param parentWorkflowId 父工作流ID
 * @param input 输入数据
 */
enterSubgraph(workflowId: ID, parentWorkflowId: ID, input: any): void {
  this.subgraphStack.push({
    workflowId,
    parentWorkflowId,
    startTime: Date.now(),
    input,
    depth: this.subgraphStack.length
  });
}

/**
 * 退出子图
 */
exitSubgraph(): void {
  this.subgraphStack.pop();
}

/**
 * 获取当前子图上下文
 */
getCurrentSubgraphContext(): SubgraphContext | null {
  return this.subgraphStack.length > 0 
    ? this.subgraphStack[this.subgraphStack.length - 1]
    : null;
}

/**
 * 获取子图执行堆栈
 */
getSubgraphStack(): SubgraphContext[] {
  return [...this.subgraphStack];
}

/**
 * 检查是否在子图中执行
 */
isInSubgraph(): boolean {
  return this.subgraphStack.length > 0;
}

/**
 * 获取当前工作流ID（考虑子图上下文）
 */
getCurrentWorkflowId(): ID {
  const context = this.getCurrentSubgraphContext();
  return context ? context.workflowId : this.getWorkflowId();
}
```

### 5. ThreadExecutor增强

#### 文件：`sdk/core/execution/thread-executor.ts`
**修改内容**：识别子图边界并触发相应事件

**步骤1**：导入必要的类型
```typescript
import { SUBGRAPH_METADATA_KEYS, SubgraphBoundaryType } from '../../types/subgraph';
```

**步骤2**：修改executeNode方法
```typescript
private async executeNode(
  threadContext: ThreadContext,
  node: Node
): Promise<NodeExecutionResult> {
  const nodeId = node.id;
  const nodeType = node.type;
  
  // 获取GraphNode以检查边界信息
  const navigator = threadContext.getNavigator();
  const graphNode = navigator.getGraph().getNode(nodeId);
  
  // 检查是否是子图边界节点
  if (graphNode?.metadata?.[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE]) {
    const boundaryType = graphNode.metadata[SUBGRAPH_METADATA_KEYS.BOUNDARY_TYPE] as SubgraphBoundaryType;
    const originalNodeId = graphNode.metadata[SUBGRAPH_METADATA_KEYS.ORIGINAL_NODE_ID];
    
    if (boundaryType === 'entry') {
      // 进入子图
      const input = this.getSubgraphInput(threadContext, originalNodeId);
      threadContext.enterSubgraph(
        graphNode.workflowId,
        graphNode.parentWorkflowId!,
        input
      );
      
      // 触发子图开始事件
      await this.eventManager.emit({
        type: EventType.SUBGRAPH_STARTED,
        threadId: threadContext.getThreadId(),
        workflowId: threadContext.getWorkflowId(),
        subgraphId: graphNode.workflowId,
        parentWorkflowId: graphNode.parentWorkflowId,
        input,
        timestamp: now()
      });
    } else if (boundaryType === 'exit') {
      // 退出子图
      const subgraphContext = threadContext.getCurrentSubgraphContext();
      if (subgraphContext) {
        const output = this.getSubgraphOutput(threadContext, originalNodeId);
        
        // 触发子图完成事件
        await this.eventManager.emit({
          type: EventType.SUBGRAPH_COMPLETED,
          threadId: threadContext.getThreadId(),
          workflowId: threadContext.getWorkflowId(),
          subgraphId: subgraphContext.workflowId,
          output,
          executionTime: Date.now() - subgraphContext.startTime,
          timestamp: now()
        });
        
        threadContext.exitSubgraph();
      }
    }
  }
  
  // 执行节点逻辑...
}
```

**步骤3**：添加辅助方法
```typescript
/**
 * 获取子图输入
 */
private getSubgraphInput(threadContext: ThreadContext, originalSubgraphNodeId: ID): any {
  // 从SUBGRAPH节点配置中获取输入映射
  const navigator = threadContext.getNavigator();
  const graphNode = navigator.getGraph().getNode(originalSubgraphNodeId);
  const node = graphNode?.originalNode;
  
  if (node?.type === 'SUBGRAPH' as NodeType) {
    const config = node.config as SubgraphNodeConfig;
    const input: Record<string, any> = {};
    
    // 应用输入映射
    for (const [childVar, parentPath] of Object.entries(config.inputMapping)) {
      input[childVar] = this.resolveVariablePath(threadContext, parentPath);
    }
    
    return input;
  }
  
  return {};
}

/**
 * 获取子图输出
 */
private getSubgraphOutput(threadContext: ThreadContext, originalSubgraphNodeId: ID): any {
  // 从子图执行结果中提取输出
  const subgraphContext = threadContext.getCurrentSubgraphContext();
  if (!subgraphContext) return {};
  
  // 获取子图的END节点输出
  const navigator = threadContext.getNavigator();
  const endNodes = navigator.getGraph().endNodeIds;
  
  for (const endNodeId of endNodes) {
    const graphNode = navigator.getGraph().getNode(endNodeId);
    if (graphNode?.workflowId === subgraphContext.workflowId) {
      // 找到子图的END节点，获取其输出
      const nodeResult = threadContext.getNodeResults()
        .find(r => r.nodeId === endNodeId);
      return nodeResult?.data || {};
    }
  }
  
  return {};
}

/**
 * 解析变量路径
 */
private resolveVariablePath(threadContext: ThreadContext, path: string): any {
  // 支持嵌套路径，如 'variables.user.name' 或 'input.data'
  const parts = path.split('.');
  let current: any = {
    variables: threadContext.getAllVariables(),
    input: threadContext.getInput(),
    output: threadContext.getOutput()
  };
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}
```

## 二、实施优先级

### 高优先级（必须完成）
1. **类型定义修改** - 基础数据结构
2. **WorkflowRegistry增强** - 关系管理核心
3. **GraphBuilder修改** - 边界标记核心逻辑

### 中优先级（重要功能）
4. **ThreadContext增强** - 运行时跟踪
5. **ThreadExecutor增强** - 边界识别和事件触发

### 低优先级（优化和扩展）
6. **检查点系统增强** - 持久化支持
7. **流式传输增强** - 高级功能
8. **监控和调试工具** - 开发者体验

## 三、测试策略

### 单元测试
- GraphNode类型定义测试
- WorkflowRegistry关系管理测试
- GraphBuilder边界标记测试
- ThreadContext子图堆栈测试
- ThreadExecutor边界识别测试

### 集成测试
- 端到端子图执行测试
- 多级子图嵌套测试
- 边界事件触发测试
- 错误处理和恢复测试

### 性能测试
- 大规模图构建性能
- 子图边界识别性能
- 关系查询性能
- 内存占用测试

## 四、风险评估

### 高风险
- **类型定义冲突**：可能影响现有代码
  - **缓解**：充分测试，提供类型兼容层

### 中风险
- **性能下降**：关系管理增加开销
  - **缓解**：性能测试，优化关键路径
- **向后兼容性**：旧数据格式不兼容
  - **缓解**：提供数据迁移工具

### 低风险
- **代码复杂度**：增加维护成本
  - **缓解**：完善文档，代码审查

## 五、成功标准

1. **功能完整性**：所有边界节点正确标记
2. **类型安全性**：编译时类型检查通过
3. **性能要求**：性能下降不超过10%
4. **向后兼容**：现有功能不受影响
5. **测试覆盖**：单元测试覆盖率 > 80%

## 六、后续工作

完成基础实现后，可以继续：

1. **检查点系统增强**：支持子图级检查点
2. **流式传输支持**：区分父子图输出
3. **监控工具**：可视化子图执行流程
4. **调试工具**：子图边界调试信息
5. **性能优化**：针对大规模图优化

## 七、总结

本实现方案通过明确的修改步骤和优先级，确保子图边界标记功能能够：

1. **保持向后兼容**：不影响现有功能
2. **提供类型安全**：核心信息有明确类型
3. **性能优越**：关键路径优化
4. **易于维护**：清晰的代码结构
5. **可扩展**：支持未来增强

实施过程中应遵循"小步快跑、充分测试"的原则，确保每个阶段的修改都经过充分验证后再进入下一阶段。