# WorkflowMerger 合并逻辑分析

## 当前合并逻辑

### 1. 合并流程

```
mergeWorkflow()
  ↓
recursiveMerge()
  ↓
  ├─ 复制非子工作流节点
  ├─ 处理子工作流节点
  │   ├─ 加载子工作流
  │   ├─ 验证子工作流标准
  │   ├─ 递归合并子工作流
  │   ├─ mergeSubWorkflowNodes() - 合并节点
  │   ├─ mergeSubWorkflowEdges() - 合并边
  │   └─ connectSubWorkflowToParent() - 连接到父工作流
  └─ 创建合并后的工作流
```

### 2. 关键方法分析

#### 2.1 findEntryNode() - 查找入口节点

```typescript
private findEntryNode(workflow: Workflow, referenceId: string): Node | null {
  const graph = workflow.getGraph();
  const nodes = Array.from(graph.nodes.values());

  // 计算入度
  const nodeInDegrees = new Map<string, number>();
  nodes.forEach((node) => nodeInDegrees.set(node.id.toString(), 0));
  graph.edges.forEach((edge) => {
    const targetId = edge.toNodeId.toString();
    nodeInDegrees.set(targetId, (nodeInDegrees.get(targetId) || 0) + 1);
  });

  // 找到入度为0的节点作为入口节点
  const entryNodes = nodes.filter((node) => nodeInDegrees.get(node.id.toString()) === 0);

  if (entryNodes.length === 0) {
    return null;
  }

  // 如果有多个入口节点，返回第一个
  const node = entryNodes[0];
  return node || null;
}
```

**问题**：
- `referenceId` 参数没有被使用
- 在整个工作流中查找入度为0的节点，而不是在子工作流中查找
- 这会导致错误的节点被识别为入口节点

#### 2.2 findExitNode() - 查找出口节点

```typescript
private findExitNode(workflow: Workflow, referenceId: string): Node | null {
  const graph = workflow.getGraph();
  const nodes = Array.from(graph.nodes.values());

  // 计算出度
  const nodeOutDegrees = new Map<string, number>();
  nodes.forEach((node) => nodeOutDegrees.set(node.id.toString(), 0));
  graph.edges.forEach((edge) => {
    const sourceId = edge.fromNodeId.toString();
    nodeOutDegrees.set(sourceId, (nodeOutDegrees.get(sourceId) || 0) + 1);
  });

  // 找到出度为0的节点作为出口节点
  const exitNodes = nodes.filter((node) => nodeOutDegrees.get(node.id.toString()) === 0);

  if (exitNodes.length === 0) {
    return null;
  }

  // 如果有多个出口节点，返回最后一个
  const node = exitNodes[exitNodes.length - 1];
  return node || null;
}
```

**问题**：
- `referenceId` 参数没有被使用
- 在整个工作流中查找出度为0的节点，而不是在子工作流中查找
- 这会导致错误的节点被识别为出口节点

#### 2.3 connectSubWorkflowToParent() - 连接子工作流到父工作流

```typescript
private connectSubWorkflowToParent(
  parentWorkflow: Workflow,
  referenceId: string,
  nodeIdMappings: NodeIdMapping[],
  newEdges: Map<string, EdgeValueObject>
): void {
  // 找到子工作流的入口和出口节点
  const entryNode = this.findEntryNode(parentWorkflow, referenceId);
  const exitNode = this.findExitNode(parentWorkflow, referenceId);

  if (!entryNode || !exitNode) {
    throw new Error(`无法找到子工作流的入口或出口节点：${referenceId}`);
  }

  // 找到子工作流合并后的入口和出口节点
  const subWorkflowEntryMapping = nodeIdMappings.find((m) => m.originalId === entryNode.id.toString());
  const subWorkflowExitMapping = nodeIdMappings.find((m) => m.originalId === exitNode.id.toString());

  if (!subWorkflowEntryMapping || !subWorkflowExitMapping) {
    throw new Error(`无法找到子工作流入口或出口节点的映射：${referenceId}`);
  }

  // 连接父工作流的边到子工作流
  const parentEdges = parentWorkflow.getEdges();
  for (const [edgeId, edge] of parentEdges) {
    // 如果边的目标是子工作流节点，重定向到子工作流的入口节点
    if (edge.toNodeId.toString() === referenceId) {
      const newEdge = EdgeValueObject.create({
        id: EdgeId.fromString(`${referenceId}.in.${edgeId}`),
        type: edge.type,
        fromNodeId: edge.fromNodeId,
        toNodeId: NodeId.fromString(subWorkflowEntryMapping.mergedId),
        condition: edge.condition,
        weight: edge.weight,
        properties: edge.properties,
      });
      newEdges.set(newEdge.id.toString(), newEdge);
    }

    // 如果边的源是子工作流节点，重定向到子工作流的出口节点
    if (edge.fromNodeId.toString() === referenceId) {
      const newEdge = EdgeValueObject.create({
        id: EdgeId.fromString(`${referenceId}.out.${edgeId}`),
        type: edge.type,
        fromNodeId: NodeId.fromString(subWorkflowExitMapping.mergedId),
        toNodeId: edge.toNodeId,
        condition: edge.condition,
        weight: edge.weight,
        properties: edge.properties,
      });
      newEdges.set(newEdge.id.toString(), newEdge);
    }
  }
}
```

**问题**：
- 调用 `findEntryNode(parentWorkflow, referenceId)` 时，传入的是父工作流
- 但实际上应该在子工作流中查找入口/出口节点
- 这会导致查找错误的节点

## CONFIGURATION_GUIDE.md 中的设计

### 工作流类型

1. **业务工作流（business/）**
   - 必须包含 start 和 end 节点
   - start 节点负责初始化上下文和状态
   - end 节点负责收集结果和清理资源
   - 可引用基础子工作流和功能工作流

2. **基础子工作流（base/）**
   - 不需要 start 和 end 节点
   - 通过入度/出度确定入口和出口节点
   - 必须符合子工作流标准（入度/出度 <= 1）

3. **功能工作流（features/）**
   - 可引用基础子工作流
   - 如果作为独立工作流执行，需要包含 start/end 节点
   - 如果作为子工作流引用，不需要 start/end 节点

### 合并场景示例

#### 场景 1：业务工作流引用基础子工作流

```
业务工作流 (business/chat.toml):
  start → llm_call (subworkflow) → end

基础子工作流 (base/llm-call.toml):
  llm_node (入度0, 出度1)

合并后:
  start → llm_node → end
```

#### 场景 2：业务工作流引用多个子工作流

```
业务工作流 (business/complex-chat.toml):
  start → llm_call (subworkflow) → tool_execution (subworkflow) → end

基础子工作流 1 (base/llm-call.toml):
  llm_node (入度0, 出度1)

基础子工作流 2 (base/tool-execution.toml):
  tool_node (入度1, 出度0)

合并后:
  start → llm_node → tool_node → end
```

## 当前逻辑的问题

### 问题 1：查找入口/出口节点的范围错误

**当前逻辑**：
```typescript
const entryNode = this.findEntryNode(parentWorkflow, referenceId);
```

**问题**：
- 在父工作流中查找入度为0的节点
- 但实际上应该在子工作流中查找
- 这会导致找到父工作流的 start 节点，而不是子工作流的入口节点

**正确逻辑**：
```typescript
const entryNode = this.findEntryNode(subWorkflow, referenceId);
```

### 问题 2：referenceId 参数未被使用

**当前逻辑**：
```typescript
private findEntryNode(workflow: Workflow, referenceId: string): Node | null {
  // referenceId 参数没有被使用
  const graph = workflow.getGraph();
  const nodes = Array.from(graph.nodes.values());
  // ...
}
```

**问题**：
- `referenceId` 参数没有被使用
- 无法区分不同的子工作流引用

### 问题 3：无法处理子工作流的 start/end 节点

**场景**：
如果子工作流包含 start/end 节点（虽然不应该），当前逻辑会错误地识别它们。

## 解决方案

### 方案 1：修改 findEntryNode 和 findExitNode

```typescript
/**
 * 查找子工作流的入口节点
 * @param subWorkflow 子工作流
 * @param referenceId 引用ID（用于日志）
 * @returns 入口节点
 */
private findEntryNode(subWorkflow: Workflow, referenceId: string): Node | null {
  const graph = subWorkflow.getGraph();
  const nodes = Array.from(graph.nodes.values());

  // 计算入度
  const nodeInDegrees = new Map<string, number>();
  nodes.forEach((node) => nodeInDegrees.set(node.id.toString(), 0));
  graph.edges.forEach((edge) => {
    const targetId = edge.toNodeId.toString();
    nodeInDegrees.set(targetId, (nodeInDegrees.get(targetId) || 0) + 1);
  });

  // 找到入度为0的节点作为入口节点
  const entryNodes = nodes.filter((node) => nodeInDegrees.get(node.id.toString()) === 0);

  if (entryNodes.length === 0) {
    this.logger.warn('子工作流没有入口节点', {
      referenceId,
      workflowId: subWorkflow.workflowId.toString(),
    });
    return null;
  }

  // 如果有多个入口节点，返回第一个
  const node = entryNodes[0];
  this.logger.debug('找到子工作流入口节点', {
    referenceId,
    nodeId: node.nodeId.toString(),
    inDegree: 0,
  });
  return node || null;
}

/**
 * 查找子工作流的出口节点
 * @param subWorkflow 子工作流
 * @param referenceId 引用ID（用于日志）
 * @returns 出口节点
 */
private findExitNode(subWorkflow: Workflow, referenceId: string): Node | null {
  const graph = subWorkflow.getGraph();
  const nodes = Array.from(graph.nodes.values());

  // 计算出度
  const nodeOutDegrees = new Map<string, number>();
  nodes.forEach((node) => nodeOutDegrees.set(node.id.toString(), 0));
  graph.edges.forEach((edge) => {
    const sourceId = edge.fromNodeId.toString();
    nodeOutDegrees.set(sourceId, (nodeOutDegrees.get(sourceId) || 0) + 1);
  });

  // 找到出度为0的节点作为出口节点
  const exitNodes = nodes.filter((node) => nodeOutDegrees.get(node.id.toString()) === 0);

  if (exitNodes.length === 0) {
    this.logger.warn('子工作流没有出口节点', {
      referenceId,
      workflowId: subWorkflow.workflowId.toString(),
    });
    return null;
  }

  // 如果有多个出口节点，返回最后一个
  const node = exitNodes[exitNodes.length - 1];
  this.logger.debug('找到子工作流出口节点', {
    referenceId,
    nodeId: node.nodeId.toString(),
    outDegree: 0,
  });
  return node || null;
}
```

### 方案 2：修改 connectSubWorkflowToParent

```typescript
private connectSubWorkflowToParent(
  parentWorkflow: Workflow,
  subWorkflow: Workflow,
  referenceId: string,
  nodeIdMappings: NodeIdMapping[],
  newEdges: Map<string, EdgeValueObject>
): void {
  // 在子工作流中查找入口和出口节点
  const entryNode = this.findEntryNode(subWorkflow, referenceId);
  const exitNode = this.findExitNode(subWorkflow, referenceId);

  if (!entryNode || !exitNode) {
    throw new Error(
      `无法找到子工作流的入口或出口节点：${referenceId}。` +
      `入口节点：${entryNode ? entryNode.nodeId.toString() : '未找到'}，` +
      `出口节点：${exitNode ? exitNode.nodeId.toString() : '未找到'}`
    );
  }

  // 找到子工作流合并后的入口和出口节点
  const subWorkflowEntryMapping = nodeIdMappings.find((m) => m.originalId === entryNode.nodeId.toString());
  const subWorkflowExitMapping = nodeIdMappings.find((m) => m.originalId === exitNode.nodeId.toString());

  if (!subWorkflowEntryMapping || !subWorkflowExitMapping) {
    throw new Error(
      `无法找到子工作流入口或出口节点的映射：${referenceId}。` +
      `入口映射：${subWorkflowEntryMapping ? subWorkflowEntryMapping.mergedId : '未找到'}，` +
      `出口映射：${subWorkflowExitMapping ? subWorkflowExitMapping.mergedId : '未找到'}`
    );
  }

  this.logger.debug('连接子工作流到父工作流', {
    referenceId,
    entryNode: entryNode.nodeId.toString(),
    exitNode: exitNode.nodeId.toString(),
    entryMapping: subWorkflowEntryMapping.mergedId,
    exitMapping: subWorkflowExitMapping.mergedId,
  });

  // 连接父工作流的边到子工作流
  const parentEdges = parentWorkflow.getEdges();
  for (const [edgeId, edge] of parentEdges) {
    // 如果边的目标是子工作流节点，重定向到子工作流的入口节点
    if (edge.toNodeId.toString() === referenceId) {
      const newEdge = EdgeValueObject.create({
        id: EdgeId.fromString(`${referenceId}.in.${edgeId}`),
        type: edge.type,
        fromNodeId: edge.fromNodeId,
        toNodeId: NodeId.fromString(subWorkflowEntryMapping.mergedId),
        condition: edge.condition,
        weight: edge.weight,
        properties: edge.properties,
      });
      newEdges.set(newEdge.id.toString(), newEdge);
      this.logger.debug('创建输入边', {
        edgeId: newEdge.id.toString(),
        from: edge.fromNodeId.toString(),
        to: subWorkflowEntryMapping.mergedId,
      });
    }

    // 如果边的源是子工作流节点，重定向到子工作流的出口节点
    if (edge.fromNodeId.toString() === referenceId) {
      const newEdge = EdgeValueObject.create({
        id: EdgeId.fromString(`${referenceId}.out.${edgeId}`),
        type: edge.type,
        fromNodeId: NodeId.fromString(subWorkflowExitMapping.mergedId),
        toNodeId: edge.toNodeId,
        condition: edge.condition,
        weight: edge.weight,
        properties: edge.properties,
      });
      newEdges.set(newEdge.id.toString(), newEdge);
      this.logger.debug('创建输出边', {
        edgeId: newEdge.id.toString(),
        from: subWorkflowExitMapping.mergedId,
        to: edge.toNodeId.toString(),
      });
    }
  }
}
```

### 方案 3：修改 recursiveMerge 调用

```typescript
// 处理子工作流节点
for (const [referenceId, reference] of subWorkflowReferences) {
  // 加载子工作流
  const subWorkflow = await this.workflowRepository.findById(reference.workflowId);
  if (!subWorkflow) {
    throw new Error(`子工作流不存在：${reference.workflowId.toString()}`);
  }

  // 验证子工作流标准
  const validationResult = await this.subWorkflowValidator.validateSubWorkflow(subWorkflow);

  if (!validationResult.isValid) {
    throw new Error(
      `子工作流验证失败（${reference.workflowId.toString()}）：${validationResult.errors.join(', ')}`
    );
  }

  // 递归合并子工作流
  const mergedSubWorkflow = await this.recursiveMerge(subWorkflow, new Set(processedWorkflowIds));

  // 合并子工作流的节点和边
  const subWorkflowMappings = this.mergeSubWorkflowNodes(
    mergedSubWorkflow,
    referenceId,
    newNodes,
    newEdges
  );

  nodeIdMappings.push(...subWorkflowMappings);

  // 合并子工作流的边
  this.mergeSubWorkflowEdges(
    mergedSubWorkflow,
    referenceId,
    subWorkflowMappings,
    newEdges
  );

  // 连接子工作流到父工作流（传入子工作流）
  this.connectSubWorkflowToParent(
    workflow,
    mergedSubWorkflow,  // 传入子工作流
    referenceId,
    subWorkflowMappings,
    newEdges
  );
}
```

## 测试场景

### 场景 1：简单业务工作流引用基础子工作流

**业务工作流**：
```toml
[[workflow.nodes]]
id = "start"
type = "start"

[[workflow.nodes]]
id = "llm_call"
type = "subworkflow"
[workflow.nodes.config]
workflowId = "base_llm_call"

[[workflow.nodes]]
id = "end"
type = "end"

[[workflow.edges]]
from = "start"
to = "llm_call"

[[workflow.edges]]
from = "llm_call"
to = "end"
```

**基础子工作流**：
```toml
[[workflow.nodes]]
id = "llm_node"
type = "llm"

[[workflow.edges]]
from = "llm_node"
to = "end"  # 这个 end 会被忽略
```

**预期合并结果**：
```
start → llm_node → end
```

### 场景 2：业务工作流引用多个子工作流

**业务工作流**：
```toml
[[workflow.nodes]]
id = "start"
type = "start"

[[workflow.nodes]]
id = "llm_call"
type = "subworkflow"
[workflow.nodes.config]
workflowId = "base_llm_call"

[[workflow.nodes]]
id = "tool_execution"
type = "subworkflow"
[workflow.nodes.config]
workflowId = "base_tool_execution"

[[workflow.nodes]]
id = "end"
type = "end"

[[workflow.edges]]
from = "start"
to = "llm_call"

[[workflow.edges]]
from = "llm_call"
to = "tool_execution"

[[workflow.edges]]
from = "tool_execution"
to = "end"
```

**预期合并结果**：
```
start → llm_node → tool_node → end
```

## 结论

### 当前问题

1. **查找范围错误**：在父工作流中查找入口/出口节点，而不是在子工作流中查找
2. **参数未使用**：`referenceId` 参数没有被使用
3. **无法正确处理**：无法正确处理 CONFIGURATION_GUIDE.md 中设计的结构

### 必须修改

1. 修改 `findEntryNode()` 和 `findExitNode()` 方法，在子工作流中查找
2. 修改 `connectSubWorkflowToParent()` 方法，传入子工作流参数
3. 添加详细的日志记录，便于调试

### 优先级

**P0 - 必须立即修复**：
- 修改查找入口/出口节点的逻辑
- 修改连接子工作流的逻辑

**P1 - 建议修复**：
- 添加详细的日志记录
- 添加单元测试验证合并逻辑