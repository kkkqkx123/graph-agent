# SubWorkflowValidator重新设计

## 问题分析

当前 [`SubWorkflowValidator`](src/services/workflow/validators/subworkflow-validator.ts) 存在以下问题：

1. **依赖外部传入的标准**
   - `validateSubWorkflow` 方法接收 `standards: SubWorkflowStandards` 参数
   - 这意味着标准是从配置文件读取的，与设计原则冲突

2. **设计原则冲突**
   - 子工作流标准应该由验证模块根据配置计算
   - 不应该在配置文件中声明标准

## 重新设计

### 核心原则

1. **完全基于图结构计算**
   - 从工作流的图结构中计算入度、出度
   - 不依赖配置文件中的标准声明

2. **静态分析**
   - 在加载时进行验证
   - 不依赖运行时信息

3. **自动确定工作流类型**
   - 根据计算出的入度、出度自动确定工作流类型
   - 不需要手动指定

### 新的接口设计

```typescript
/**
 * 子工作流验证结果
 */
export interface SubWorkflowValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 子工作流类型 */
  workflowType: 'start' | 'middle' | 'end' | 'flexible' | 'independent' | 'invalid';
  /** 入口节点信息 */
  entryNodes: NodeInfo[];
  /** 出口节点信息 */
  exitNodes: NodeInfo[];
  /** 入度标准 */
  entryStandards: DegreeStandards;
  /** 出度标准 */
  exitStandards: DegreeStandards;
}

/**
 * 节点信息
 */
export interface NodeInfo {
  /** 节点ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: string;
  /** 入度 */
  inDegree: number;
  /** 出度 */
  outDegree: number;
}

/**
 * 度标准
 */
export interface DegreeStandards {
  /** 最大入度/出度 */
  maxDegree: number;
  /** 最小入度/出度 */
  minDegree: number;
  /** 节点类型列表 */
  nodeTypes: string[];
}
```

### 实现逻辑

```typescript
export class SubWorkflowValidator {
  /**
   * 验证子工作流
   * @param workflow 工作流实例
   * @returns 验证结果
   */
  async validateSubWorkflow(workflow: Workflow): Promise<SubWorkflowValidationResult> {
    this.logger.info('开始验证子工作流', {
      workflowId: workflow.workflowId.toString(),
      workflowName: workflow.name,
    });

    const result: SubWorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      workflowType: 'invalid',
      entryNodes: [],
      exitNodes: [],
      entryStandards: { maxDegree: 0, minDegree: 0, nodeTypes: [] },
      exitStandards: { maxDegree: 0, minDegree: 0, nodeTypes: [] },
    };

    // 1. 计算所有节点的入度和出度
    const nodeDegrees = this.calculateNodeDegrees(workflow);

    // 2. 找到入口节点（入度为0的节点）
    result.entryNodes = this.findEntryNodes(workflow, nodeDegrees);

    // 3. 找到出口节点（出度为0的节点）
    result.exitNodes = this.findExitNodes(workflow, nodeDegrees);

    // 4. 计算入口标准
    result.entryStandards = this.calculateEntryStandards(result.entryNodes);

    // 5. 计算出口标准
    result.exitStandards = this.calculateExitStandards(result.exitNodes);

    // 6. 验证入度标准（子工作流入口节点的入度必须<=1）
    this.validateEntryDegreeStandards(result);

    // 7. 验证出度标准（子工作流出口节点的出度必须<=1）
    this.validateExitDegreeStandards(result);

    // 8. 确定子工作流类型
    result.workflowType = this.determineWorkflowType(result);

    // 9. 检查是否可以作为子工作流
    this.checkSubWorkflowEligibility(result);

    this.logger.info('子工作流验证完成', {
      workflowId: workflow.workflowId.toString(),
      isValid: result.isValid,
      workflowType: result.workflowType,
      entryNodeCount: result.entryNodes.length,
      exitNodeCount: result.exitNodes.length,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });

    return result;
  }

  /**
   * 计算所有节点的入度和出度
   * @param workflow 工作流
   * @returns 节点度数映射
   */
  private calculateNodeDegrees(workflow: Workflow): Map<string, NodeInfo> {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());
    const nodeDegrees = new Map<string, NodeInfo>();

    // 初始化所有节点的度数
    nodes.forEach((node) => {
      nodeDegrees.set(node.nodeId.toString(), {
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString(),
        inDegree: 0,
        outDegree: 0,
      });
    });

    // 计算入度
    graph.edges.forEach((edge) => {
      const targetId = edge.toNodeId.toString();
      const degrees = nodeDegrees.get(targetId);
      if (degrees) {
        degrees.inDegree++;
      }
    });

    // 计算出度
    graph.edges.forEach((edge) => {
      const sourceId = edge.fromNodeId.toString();
      const degrees = nodeDegrees.get(sourceId);
      if (degrees) {
        degrees.outDegree++;
      }
    });

    return nodeDegrees;
  }

  /**
   * 找到入口节点（入度为0的节点）
   * @param workflow 工作流
   * @param nodeDegrees 节点度数映射
   * @returns 入口节点列表
   */
  private findEntryNodes(
    workflow: Workflow,
    nodeDegrees: Map<string, NodeInfo>
  ): NodeInfo[] {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 入口节点：入度为0的节点
    const entryNodes = nodes
      .map((node) => nodeDegrees.get(node.nodeId.toString())!)
      .filter((nodeInfo) => nodeInfo.inDegree === 0);

    return entryNodes;
  }

  /**
   * 找到出口节点（出度为0的节点）
   * @param workflow 工作流
   * @param nodeDegrees 节点度数映射
   * @returns 出口节点列表
   */
  private findExitNodes(
    workflow: Workflow,
    nodeDegrees: Map<string, NodeInfo>
  ): NodeInfo[] {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 出口节点：出度为0的节点
    const exitNodes = nodes
      .map((node) => nodeDegrees.get(node.nodeId.toString())!)
      .filter((nodeInfo) => nodeInfo.outDegree === 0);

    return exitNodes;
  }

  /**
   * 计算入口标准
   * @param entryNodes 入口节点列表
   * @returns 入口标准
   */
  private calculateEntryStandards(entryNodes: NodeInfo[]): DegreeStandards {
    if (entryNodes.length === 0) {
      return { maxDegree: 0, minDegree: 0, nodeTypes: [] };
    }

    const inDegrees = entryNodes.map((node) => node.inDegree);
    const nodeTypes = entryNodes.map((node) => node.nodeType);

    return {
      maxDegree: Math.max(...inDegrees),
      minDegree: Math.min(...inDegrees),
      nodeTypes: [...new Set(nodeTypes)], // 去重
    };
  }

  /**
   * 计算出口标准
   * @param exitNodes 出口节点列表
   * @returns 出口标准
   */
  private calculateExitStandards(exitNodes: NodeInfo[]): DegreeStandards {
    if (exitNodes.length === 0) {
      return { maxDegree: 0, minDegree: 0, nodeTypes: [] };
    }

    const outDegrees = exitNodes.map((node) => node.outDegree);
    const nodeTypes = exitNodes.map((node) => node.nodeType);

    return {
      maxDegree: Math.max(...outDegrees),
      minDegree: Math.min(...outDegrees),
      nodeTypes: [...new Set(nodeTypes)], // 去重
    };
  }

  /**
   * 验证入度标准
   * 子工作流入口节点的入度必须<=1
   * @param result 验证结果
   */
  private validateEntryDegreeStandards(result: SubWorkflowValidationResult): void {
    // 检查是否有入口节点
    if (result.entryNodes.length === 0) {
      result.errors.push('工作流没有入口节点（入度为0的节点）');
      return;
    }

    // 检查入口节点数量
    if (result.entryNodes.length > 1) {
      result.warnings.push(
        `找到${result.entryNodes.length}个入口节点，建议使用单一入口节点`
      );
    }

    // 验证入口节点的入度（必须<=1）
    const invalidEntryNodes = result.entryNodes.filter((node) => node.inDegree > 1);
    if (invalidEntryNodes.length > 0) {
      result.errors.push(
        `入口节点的入度不能超过1。节点：${invalidEntryNodes.map((n) => n.nodeId).join(', ')}`
      );
    }
  }

  /**
   * 验证出度标准
   * 子工作流出口节点的出度必须<=1
   * @param result 验证结果
   */
  private validateExitDegreeStandards(result: SubWorkflowValidationResult): void {
    // 检查是否有出口节点
    if (result.exitNodes.length === 0) {
      result.errors.push('工作流没有出口节点（出度为0的节点）');
      return;
    }

    // 检查出口节点数量
    if (result.exitNodes.length > 1) {
      result.warnings.push(
        `找到${result.exitNodes.length}个出口节点，建议使用单一出口节点`
      );
    }

    // 验证出口节点的出度（必须<=1）
    const invalidExitNodes = result.exitNodes.filter((node) => node.outDegree > 1);
    if (invalidExitNodes.length > 0) {
      result.errors.push(
        `出口节点的出度不能超过1。节点：${invalidExitNodes.map((n) => n.nodeId).join(', ')}`
      );
    }
  }

  /**
   * 确定子工作流类型
   * @param result 验证结果
   * @returns 工作流类型
   */
  private determineWorkflowType(result: SubWorkflowValidationResult): SubWorkflowType {
    const entryMaxDegree = result.entryStandards.maxDegree;
    const exitMaxDegree = result.exitStandards.maxDegree;

    // 独立工作流：入度0，出度0
    if (entryMaxDegree === 0 && exitMaxDegree === 0) {
      return 'independent';
    }

    // 起始子工作流：入度0，出度1
    if (entryMaxDegree === 0 && exitMaxDegree === 1) {
      return 'start';
    }

    // 结束子工作流：入度1，出度0
    if (entryMaxDegree === 1 && exitMaxDegree === 0) {
      return 'end';
    }

    // 中间子工作流：入度1，出度1
    if (entryMaxDegree === 1 && exitMaxDegree === 1) {
      return 'middle';
    }

    // 灵活子工作流：入度0-1，出度0-1
    if (entryMaxDegree <= 1 && exitMaxDegree <= 1) {
      return 'flexible';
    }

    // 无效工作流：入度或出度超过1
    return 'invalid';
  }

  /**
   * 检查是否可以作为子工作流
   * @param result 验证结果
   */
  private checkSubWorkflowEligibility(result: SubWorkflowValidationResult): void {
    // 独立工作流不能作为子工作流引用
    if (result.workflowType === 'independent') {
      result.isValid = false;
      result.errors.push('独立工作流（入度0，出度0）不能作为子工作流引用');
    }

    // 无效工作流不能作为子工作流引用
    if (result.workflowType === 'invalid') {
      result.isValid = false;
      result.errors.push(
        `工作流不符合子工作流标准（入口入度：${result.entryStandards.maxDegree}，出口出度：${result.exitStandards.maxDegree}）`
      );
    }

    // 如果有错误，标记为无效
    if (result.errors.length > 0) {
      result.isValid = false;
    }
  }
}
```

## 关键改进

### 1. 移除外部标准依赖

**之前**：
```typescript
async validateSubWorkflow(
  workflow: Workflow,
  standards: SubWorkflowStandards  // 从外部传入
): Promise<SubWorkflowValidationResult>
```

**之后**：
```typescript
async validateSubWorkflow(
  workflow: Workflow  // 只需要工作流实例
): Promise<SubWorkflowValidationResult>
```

### 2. 完全基于图结构计算

**入口节点定义**：
- 入度为0的节点
- 可以有多个入口节点（警告）

**出口节点定义**：
- 出度为0的节点
- 可以有多个出口节点（警告）

**子工作流标准**：
- 入口节点的入度必须<=1
- 出口节点的出度必须<=1

### 3. 自动确定工作流类型

根据计算出的入度、出度自动确定：

| 入度 | 出度 | 类型 |
|------|------|------|
| 0 | 0 | independent |
| 0 | 1 | start |
| 1 | 0 | end |
| 1 | 1 | middle |
| 0-1 | 0-1 | flexible |
| >1 | >1 | invalid |

### 4. 详细的验证结果

返回详细的验证结果，包括：
- 入口节点信息（ID、类型、入度、出度）
- 出口节点信息（ID、类型、入度、出度）
- 入口标准（最大入度、最小入度、节点类型）
- 出口标准（最大出度、最小出度、节点类型）

## WorkflowType移除

### 移除原因

1. **工作流协调不是workflow的职责**
   - WorkflowType定义了执行模式（sequential、parallel等）
   - 但执行模式应该由执行引擎根据图拓扑结构决定
   - Workflow实体不应该关心如何执行

2. **容易导致不一致**
   - WorkflowType可能与实际图结构不一致
   - 例如：type=sequential但图中有条件边

3. **违反单一职责原则**
   - Workflow应该只负责定义图结构
   - 执行模式是执行引擎的职责

### 移除方案

**步骤1：从WorkflowDefinition移除WorkflowType**

```typescript
// src/domain/workflow/value-objects/workflow-definition.ts
export interface WorkflowDefinitionProps {
  id: ID;
  name: string;
  description?: string;
  status: WorkflowStatus;
  // type: WorkflowType;  // 移除
  config: WorkflowConfig;
  errorHandlingStrategy: ErrorHandlingStrategy;
  executionStrategy: ExecutionStrategy;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
  createdBy?: ID;
  updatedBy?: ID;
}
```

**步骤2：从Workflow实体移除WorkflowType**

```typescript
// src/domain/workflow/entities/workflow.ts
export class Workflow extends Entity {
  // 移除 type 属性和相关方法
  // public get type(): WorkflowType { ... }
  // public updateType(type: WorkflowType, updatedBy?: ID): Workflow { ... }
}
```

**步骤3：从配置文件移除type字段**

```toml
# configs/workflows/base/llm-call.toml
[workflow]
id = "base_llm_call"
name = "LLM调用基础操作"
description = "封装LLM调用和工具执行的基础操作"
# type = "sequential"  # 移除
version = "1.0.0"
```

**步骤4：执行引擎基于图拓扑结构**

```typescript
// src/services/workflow/workflow-execution.ts
export class WorkflowExecutionEngine {
  /**
   * 执行工作流
   * @param workflow 工作流
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(workflow: Workflow, context: WorkflowExecutionContext): Promise<ExecutionResult> {
    // 根据图拓扑结构决定执行模式
    const executionMode = this.determineExecutionMode(workflow);

    switch (executionMode) {
      case 'sequential':
        return this.executeSequential(workflow, context);
      case 'parallel':
        return this.executeParallel(workflow, context);
      case 'conditional':
        return this.executeConditional(workflow, context);
      default:
        throw new Error(`不支持的执行模式: ${executionMode}`);
    }
  }

  /**
   * 根据图拓扑结构确定执行模式
   * @param workflow 工作流
   * @returns 执行模式
   */
  private determineExecutionMode(workflow: Workflow): ExecutionMode {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());
    const edges = Array.from(graph.edges.values());

    // 检查是否有条件边
    const hasConditionalEdges = edges.some(edge => edge.condition !== undefined);
    if (hasConditionalEdges) {
      return 'conditional';
    }

    // 检查是否有并行分支
    const hasParallelBranches = this.hasParallelBranches(graph);
    if (hasParallelBranches) {
      return 'parallel';
    }

    // 默认顺序执行
    return 'sequential';
  }

  /**
   * 检查是否有并行分支
   * @param graph 工作流图
   * @returns 是否有并行分支
   */
  private hasParallelBranches(graph: WorkflowGraphData): boolean {
    // 实现并行分支检测逻辑
    // 例如：检查是否有节点有多个出边且没有条件
    return false;
  }
}
```

## 总结

### SubWorkflowValidator改进

1. ✅ 移除外部标准依赖
2. ✅ 完全基于图结构计算入度、出度
3. ✅ 自动确定工作流类型
4. ✅ 返回详细的验证结果

### WorkflowType移除

1. ✅ 从WorkflowDefinition移除
2. ✅ 从Workflow实体移除
3. ✅ 从配置文件移除
4. ✅ 执行引擎基于图拓扑结构决定执行模式

### 设计原则

1. **单一职责**：Workflow只负责定义图结构，不关心执行模式
2. **静态分析**：子工作流标准由验证模块根据配置计算
3. **自动推断**：工作流类型和执行模式由系统自动推断
4. **避免不一致**：不依赖手动指定的类型，避免与实际结构不一致